// Command startpunkt serves a start page built from the resources of the
// Kubernetes cluster it runs in.
package main

import (
	"context"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"slices"
	"strings"
	"sync"
	"syscall"
	"time"

	"k8s.io/client-go/discovery"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"

	startpunkt "github.com/ullbergm/startpunkt"
	"github.com/ullbergm/startpunkt/internal/api"
	"github.com/ullbergm/startpunkt/internal/config"
	"github.com/ullbergm/startpunkt/internal/edit"
	"github.com/ullbergm/startpunkt/internal/follow"
	"github.com/ullbergm/startpunkt/internal/kube"
	"github.com/ullbergm/startpunkt/internal/probe"
	"github.com/ullbergm/startpunkt/internal/settings"
	"github.com/ullbergm/startpunkt/internal/source"
	"github.com/ullbergm/startpunkt/internal/store"
	"github.com/ullbergm/startpunkt/web"
)

// version is set at build time with -ldflags "-X main.version=...".
var version = "dev"

const defaultConfigPath = "/etc/startpunkt/config.yaml"

func main() {
	if err := run(); err != nil {
		fmt.Fprintln(os.Stderr, "startpunkt:", err)
		os.Exit(1)
	}
}

// Roles select which parts of Startpunkt a process runs. Every role is the
// same binary; "all" runs them in one process, the others split them up.
const (
	roleAll        = "all"
	roleController = "controller"
	roleAPI        = "api"
	roleWeb        = "web"
)

func usage() {
	fmt.Fprint(flag.CommandLine.Output(), `Usage: startpunkt [flags] [role]

Roles:
  all         watch the cluster, serve the API and the frontend (default)
  controller  watch the cluster and serve the API for other roles
  api         serve the API from the state of a controller (upstream.url)
  web         serve the frontend only

The role can also be set with STARTPUNKT_ROLE.

Flags:
`)
	flag.PrintDefaults()
}

func run() error {
	configPath := flag.String("config", "",
		"path to the YAML configuration file (default "+defaultConfigPath+" when it exists)")
	showVersion := flag.Bool("version", false, "print the version and exit")
	flag.Usage = usage
	flag.Parse()
	if *showVersion {
		fmt.Println(version)
		return nil
	}
	role := flag.Arg(0)
	if role == "" {
		role = os.Getenv(config.EnvPrefix + "ROLE")
	}
	if role == "" {
		role = roleAll
	}
	if flag.NArg() > 1 {
		return fmt.Errorf("expected at most one role, got %q", flag.Args())
	}

	path, required := *configPath, true
	if path == "" {
		path = os.Getenv(config.EnvPrefix + "CONFIG")
	}
	if path == "" {
		path, required = defaultConfigPath, false
	}
	cfg, err := config.Load(path, required, os.Getenv)
	if err != nil {
		return err
	}
	log := newLogger(cfg.Log).With("role", role)
	slog.SetDefault(log)

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	// The settings in use. They start as what the environment says and are
	// replaced when the Startpunkt and Remote resources change.
	holder := settings.New(cfg)
	handler := &api.Server{
		UIFunc:  func() api.UIConfig { return uiConfig(holder.Get().Web) },
		Changed: holder.Subscribe,
	}
	// How the state of the remotes reaches the Remote resources: handed to
	// the writer in the process that has access to the cluster, and sent
	// there by the one that follows the remotes when that is another.
	var remoteStatus func([]follow.RemoteReport)
	var reportRemotes func(context.Context, []follow.RemoteReport) error
	// Editing is on when there is a key. The resources are written by the
	// process that has access to the cluster; the one a browser talks to
	// hands the requests on when that is another.
	var editor edit.Editor
	// check says whether something answers at an address, for the editor.
	var check func(ctx context.Context, address string) (bool, error)
	editNamespace := cfg.Editing.Namespace
	if editNamespace == "" {
		editNamespace = ownNamespace()
	}
	switch role {
	case roleAll, roleController:
		handler.Store = store.New()
		restConfig, err := kubeConfig()
		if err != nil {
			return fmt.Errorf("loading Kubernetes configuration: %w", err)
		}
		restConfig.UserAgent = "startpunkt/" + version
		dynamicClient, err := dynamic.NewForConfig(restConfig)
		if err != nil {
			return err
		}
		discoveryClient, err := discovery.NewDiscoveryClientForConfig(restConfig)
		if err != nil {
			return err
		}
		if cfg.Resources.Name != "" {
			namespace := cfg.Resources.Namespace
			if namespace == "" {
				namespace = ownNamespace()
			}
			statuses := &kube.RemoteStatusWriter{Dynamic: dynamicClient, Namespace: namespace, Log: log}
			go statuses.Run(ctx)
			remoteStatus = statuses.Report
			go (&kube.ConfigWatcher{
				Base: cfg, Holder: holder, Dynamic: dynamicClient, Discovery: discoveryClient,
				Namespace: namespace, Name: cfg.Resources.Name, Log: log,
			}).Run(ctx)
		}
		go watchCluster(ctx, holder, handler.Store, dynamicClient, discoveryClient, log)
		editor = &kube.Editor{
			Dynamic: dynamicClient, Discovery: discoveryClient, Namespace: editNamespace,
			Allowed: func(namespace string) bool {
				selector := holder.Get().NamespaceSelector
				return selector.Any || slices.Contains(selector.MatchNames, namespace)
			},
		}
		check = func(ctx context.Context, address string) (bool, error) {
			a := holder.Get().Availability
			return probe.Check(ctx, address, probe.Options{
				Timeout: time.Duration(a.Timeout), InsecureSkipVerify: a.InsecureSkipVerify, UserAgent: "startpunkt/" + version,
			}), nil
		}
		if role == roleController {
			// Only here: in this role the process is not reachable from
			// outside the cluster. The api role reads the settings from
			// it and tells it how the remotes are doing.
			internal := http.NewServeMux()
			internal.Handle(settings.SharedPath, settings.Handler(holder))
			internal.Handle(follow.ReportPath, follow.ReportHandler(remoteStatus))
			if cfg.Editing.Key != "" {
				internal.Handle(edit.InternalPrefix+"/", edit.Internal(&edit.Handler{Editor: editor, Check: check, Key: cfg.Editing.Key}))
			}
			handler.Internal = internal
		} else if remoteStatus != nil {
			reportRemotes = func(_ context.Context, reports []follow.RemoteReport) error {
				remoteStatus(reports)
				return nil
			}
		}
	case roleAPI:
		if cfg.Upstream.URL == "" {
			return errors.New("the api role needs upstream.url (STARTPUNKT_UPSTREAM_URL)")
		}
		handler.Store = store.New()
		go (&follow.Follower{URL: cfg.Upstream.URL, Store: handler.Store, Log: log}).Run(ctx)
		go settings.Follow(ctx, cfg.Upstream.URL, cfg, holder, log)
		reportRemotes = follow.PostReports(cfg.Upstream.URL)
		forwarder := edit.NewForwarder(cfg.Upstream.URL, cfg.Editing.Key)
		editor, check = forwarder, forwarder.Check
	case roleWeb:
	default:
		return fmt.Errorf("unknown role %q", role)
	}
	if handler.Store != nil && role != roleController {
		// The roles a browser talks to are the hub: they show the tiles of
		// the remotes next to their own, and follow the list of remotes as
		// it changes.
		go followRemotes(ctx, holder, handler.Store, reportRemotes, log)
		if cfg.Editing.Key != "" {
			handler.Edit = (&edit.Handler{Editor: editor, Check: check, Key: cfg.Editing.Key}).Routes
			handler.Editing = api.Editing{Available: true, Namespace: editNamespace}
			log.Info("editing is on", "namespace", editNamespace)
		}
		// Only these roles fetch pictures and icons and look for updates.
		handler.Background = &api.Background{UserAgent: "startpunkt/" + version}
		handler.Icons = &api.Icons{SourceFunc: func() string { return holder.Get().Icons.Source }, UserAgent: "startpunkt"}
		handler.Updates = &api.Updates{Current: version, Changelog: api.ParseChangelog(startpunkt.Changelog), Flags: func() (bool, bool) {
			web := holder.Get().Web
			return web.CheckForUpdates, web.GitHubLink
		}}
	}
	if role == roleAll || role == roleWeb {
		handler.Assets = web.Assets()
	}
	log.Info("starting", "version", version, "cluster", cfg.Cluster.Name)

	server := &http.Server{
		Addr:              cfg.Server.Address,
		Handler:           handler.Handler(),
		ReadHeaderTimeout: 10 * time.Second,
		BaseContext:       func(net.Listener) context.Context { return ctx },
	}
	failed := make(chan error, 1)
	go func() { failed <- server.ListenAndServe() }()
	log.Info("listening", "address", cfg.Server.Address)

	select {
	case err := <-failed:
		return err
	case <-ctx.Done():
	}
	log.Info("shutting down")
	// Event streams end with the base context, so this only waits for
	// ordinary requests.
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownCtx); err != nil && !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}

func uiConfig(w config.Web) api.UIConfig {
	palette := func(p config.Palette) api.Palette {
		return api.Palette{
			BodyBgColor: p.BodyBgColor, BodyColor: p.BodyColor, EmphasisColor: p.EmphasisColor,
			TextPrimaryColor: p.TextPrimaryColor, TextAccentColor: p.TextAccentColor,
		}
	}
	return api.UIConfig{
		Title:           w.Title,
		DefaultLanguage: w.DefaultLanguage,
		SearchEngine:    w.SearchEngine,
		ShowAllClusters: w.ShowAllClusters,
		Theme:           api.Theme{Light: palette(w.Theme.Light), Dark: palette(w.Theme.Dark)},
		// A null in the resource means none, as leaving it out does.
		DefaultPreferences: preferences(w.DefaultPreferences),
	}
}

// preferences returns the default preferences as they are passed to the
// page, or nil when there are none.
func preferences(raw json.RawMessage) api.RawJSON {
	text := strings.TrimSpace(string(raw))
	if text == "" || text == "null" || text == "{}" {
		return ""
	}
	return api.RawJSON(text)
}

// ownNamespace is the namespace the process runs in, or "default" outside a
// cluster.
func ownNamespace() string {
	if data, err := os.ReadFile("/var/run/secrets/kubernetes.io/serviceaccount/namespace"); err == nil {
		if namespace := strings.TrimSpace(string(data)); namespace != "" {
			return namespace
		}
	}
	return "default"
}

// clusterSettings is the part of the configuration that decides how the
// cluster is read. A change to it means reading the cluster again.
func clusterSettings(cfg config.Config) string {
	key, _ := json.Marshal([]any{cfg.Cluster, cfg.NamespaceSelector, cfg.Sources, cfg.Availability, cfg.Status})
	return string(key)
}

// watchCluster reads the cluster with the settings in use and keeps the
// store in step with it. When the settings that decide how the cluster is
// read change, it stops, clears what it had read, and starts again with the
// new ones. Changes to other settings do not interrupt it.
func watchCluster(
	ctx context.Context, holder *settings.Holder, tiles *store.Store,
	dynamicClient dynamic.Interface, discoveryClient discovery.DiscoveryInterface, log *slog.Logger,
) {
	changed, cancel := holder.Subscribe()
	defer cancel()
	for ctx.Err() == nil {
		cfg := holder.Get()
		key := clusterSettings(cfg)
		runCtx, stop := context.WithCancel(ctx)
		sources, err := source.All(sourceOptions(cfg.Sources), cfg.Sources.Custom)
		if err != nil {
			// Settings are validated before they are put to use, so this
			// is not expected. Carry on with the built-in sources.
			log.Error("the custom sources cannot be used", "error", err)
			sources = source.Builtin(sourceOptions(cfg.Sources))
		}
		controller := &kube.Controller{
			Cluster:     cfg.Cluster.Name,
			Store:       tiles,
			Sources:     sources,
			Namespaces:  cfg.NamespaceSelector.Namespaces(),
			WriteStatus: cfg.Status.Enabled,
			Discovery:   discoveryClient,
			Dynamic:     dynamicClient,
			Log:         log,
		}
		var running sync.WaitGroup
		running.Go(func() { controller.Run(runCtx) })
		if a := cfg.Availability; a.Enabled {
			prober := &probe.Prober{
				Store: tiles, Cluster: cfg.Cluster.Name, Log: log,
				Options: probe.Options{
					Interval:           time.Duration(a.Interval),
					Timeout:            time.Duration(a.Timeout),
					InitialBackoff:     time.Duration(a.InitialBackoff),
					MaxBackoff:         time.Duration(a.MaxBackoff),
					Concurrency:        a.Concurrency,
					InsecureSkipVerify: a.InsecureSkipVerify,
					UserAgent:          "startpunkt/" + version,
				},
			}
			running.Go(func() { prober.Run(runCtx) })
		}
	wait:
		for {
			select {
			case <-ctx.Done():
				break wait
			case <-changed:
				if clusterSettings(holder.Get()) != key {
					log.Info("settings for reading the cluster changed; reading it again")
					break wait
				}
			}
		}
		stop()
		running.Wait()
		controller.Close()
		if ctx.Err() == nil {
			tiles.DropOwned()
		}
	}
}

// followRemotes keeps one follower per configured remote, as the list of
// remotes changes. With report set, it also says how the remotes are doing.
func followRemotes(
	ctx context.Context, holder *settings.Holder, tiles *store.Store,
	report func(context.Context, []follow.RemoteReport) error, log *slog.Logger,
) {
	manager := &follow.Manager{Store: tiles, Log: log}
	if report != nil {
		go (&follow.Reporter{Store: tiles, Problems: manager.Problems, Send: report, Log: log}).Run(ctx)
	}
	changed, cancel := holder.Subscribe()
	defer cancel()
	for {
		var remotes []follow.RemoteConfig
		for _, r := range holder.Get().Federation.Remotes {
			selector := func(s config.Selector) follow.Selector {
				return follow.Selector{Names: s.Names, Groups: s.Groups, Tags: s.Tags, Kinds: s.Kinds}
			}
			remotes = append(remotes, follow.RemoteConfig{
				Name: r.Name, URL: r.URL, Headers: r.Headers, InsecureSkipVerify: r.InsecureSkipVerify,
				Filter: follow.Filter{Include: selector(r.Include), Exclude: selector(r.Exclude)},
			})
		}
		manager.Sync(ctx, remotes)
		select {
		case <-ctx.Done():
			return
		case <-changed:
		}
	}
}

func sourceOptions(s config.Sources) source.Options {
	annotated := func(a config.Annotated) source.Annotated {
		return source.Annotated{Enabled: a.Enabled, OnlyAnnotated: a.OnlyAnnotated}
	}
	return source.Options{
		Application: source.Toggle{Enabled: s.Application.Enabled},
		Bookmark:    source.Toggle{Enabled: s.Bookmark.Enabled},
		Route:       annotated(s.Route),
		Ingress: source.IngressOptions{
			Annotated:           annotated(s.Ingress.Annotated),
			ClassNames:          s.Ingress.ClassNames,
			IncludeUnclassified: s.Ingress.IncludeUnclassified,
		},
		HTTPRoute: source.Routed{
			Annotated:       annotated(s.HTTPRoute.Annotated),
			DefaultProtocol: s.HTTPRoute.DefaultProtocol,
		},
		VirtualService: source.Routed{
			Annotated:       annotated(s.VirtualService.Annotated),
			DefaultProtocol: s.VirtualService.DefaultProtocol,
		},
	}
}

// kubeConfig uses the service account inside a cluster and the usual
// kubeconfig lookup outside of one.
func kubeConfig() (*rest.Config, error) {
	if cfg, err := rest.InClusterConfig(); err == nil {
		return cfg, nil
	}
	return clientcmd.NewNonInteractiveDeferredLoadingClientConfig(
		clientcmd.NewDefaultClientConfigLoadingRules(), nil).ClientConfig()
}

func newLogger(cfg config.Log) *slog.Logger {
	var level slog.Level
	_ = level.UnmarshalText([]byte(cfg.Level))
	opts := &slog.HandlerOptions{Level: level}
	if cfg.Format == "text" {
		return slog.New(slog.NewTextHandler(os.Stdout, opts))
	}
	return slog.New(slog.NewJSONHandler(os.Stdout, opts))
}
