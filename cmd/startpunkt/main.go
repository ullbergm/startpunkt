// Command startpunkt serves a start page built from the resources of the
// Kubernetes cluster it runs in.
package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"k8s.io/client-go/discovery"
	"k8s.io/client-go/dynamic"
	"k8s.io/client-go/rest"
	"k8s.io/client-go/tools/clientcmd"

	"github.com/ullbergm/startpunkt/internal/api"
	"github.com/ullbergm/startpunkt/internal/config"
	"github.com/ullbergm/startpunkt/internal/follow"
	"github.com/ullbergm/startpunkt/internal/kube"
	"github.com/ullbergm/startpunkt/internal/probe"
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

	palette := func(p config.Palette) api.Palette {
		return api.Palette{
			BodyBgColor: p.BodyBgColor, BodyColor: p.BodyColor, EmphasisColor: p.EmphasisColor,
			TextPrimaryColor: p.TextPrimaryColor, TextAccentColor: p.TextAccentColor,
		}
	}
	handler := &api.Server{UI: api.UIConfig{
		Title:           cfg.Web.Title,
		DefaultLanguage: cfg.Web.DefaultLanguage,
		SearchEngine:    cfg.Web.SearchEngine,
		Theme:           api.Theme{Light: palette(cfg.Web.Theme.Light), Dark: palette(cfg.Web.Theme.Dark)},
	}}
	switch role {
	case roleAll, roleController:
		handler.Store = store.New()
		controller, err := newController(cfg, handler.Store, log)
		if err != nil {
			return err
		}
		go controller.Run(ctx)
		if a := cfg.Availability; a.Enabled {
			go (&probe.Prober{
				Store:   handler.Store,
				Cluster: cfg.Cluster.Name,
				Log:     log,
				Options: probe.Options{
					Interval:           time.Duration(a.Interval),
					Timeout:            time.Duration(a.Timeout),
					InitialBackoff:     time.Duration(a.InitialBackoff),
					MaxBackoff:         time.Duration(a.MaxBackoff),
					Concurrency:        a.Concurrency,
					InsecureSkipVerify: a.InsecureSkipVerify,
					UserAgent:          "startpunkt/" + version,
				},
			}).Run(ctx)
		}
	case roleAPI:
		if cfg.Upstream.URL == "" {
			return errors.New("the api role needs upstream.url (STARTPUNKT_UPSTREAM_URL)")
		}
		handler.Store = store.New()
		go (&follow.Follower{URL: cfg.Upstream.URL, Store: handler.Store, Log: log}).Run(ctx)
	case roleWeb:
	default:
		return fmt.Errorf("unknown role %q", role)
	}
	if handler.Store != nil && role != roleController {
		// The roles a browser talks to are the hub: they show the tiles of
		// the remotes next to their own.
		for _, r := range cfg.Federation.Remotes {
			go (&follow.Follower{
				URL: r.URL, Remote: r.Name, Headers: r.Headers, Store: handler.Store, Log: log,
			}).Run(ctx)
		}
		// Only the roles a browser talks to fetch pictures.
		handler.Background = &api.Background{UserAgent: "startpunkt/" + version}
		handler.Updates = &api.Updates{
			Current: version, Check: cfg.Web.CheckForUpdates, GitHubLink: cfg.Web.GitHubLink,
		}
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

func newController(cfg config.Config, tiles *store.Store, log *slog.Logger) (*kube.Controller, error) {
	restConfig, err := kubeConfig()
	if err != nil {
		return nil, fmt.Errorf("loading Kubernetes configuration: %w", err)
	}
	restConfig.UserAgent = "startpunkt/" + version
	dynamicClient, err := dynamic.NewForConfig(restConfig)
	if err != nil {
		return nil, err
	}
	discoveryClient, err := discovery.NewDiscoveryClientForConfig(restConfig)
	if err != nil {
		return nil, err
	}
	return &kube.Controller{
		Cluster:     cfg.Cluster.Name,
		Store:       tiles,
		Sources:     source.Builtin(sourceOptions(cfg.Sources)),
		Namespaces:  cfg.NamespaceSelector.Namespaces(),
		WriteStatus: cfg.Status.Enabled,
		Discovery:   discoveryClient,
		Dynamic:     dynamicClient,
		Log:         log,
	}, nil
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
