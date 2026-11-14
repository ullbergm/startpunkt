package settings

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/ullbergm/startpunkt/internal/metrics"
	"io"
	"log/slog"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/ullbergm/startpunkt/internal/config"
)

// SharedPath is where the controller serves the settings that the other
// roles of the same instance need. It is under /internal/, which is not
// routed from outside the cluster.
const SharedPath = "/internal/v1/settings"

// Shared is the part of the settings that the api role needs and cannot
// read for itself, because it has no access to the cluster. Request headers
// of remotes are not part of it: they may be secrets, and stay with the
// process that was given them.
type Shared struct {
	Cluster config.Cluster  `json:"cluster"`
	Web     config.Web      `json:"web"`
	Icons   config.Icons    `json:"icons"`
	Remotes []config.Remote `json:"remotes"`
}

func shared(cfg config.Config) Shared {
	remotes := make([]config.Remote, len(cfg.Federation.Remotes))
	for i, r := range cfg.Federation.Remotes {
		r.Headers = nil
		remotes[i] = r
	}
	return Shared{Cluster: cfg.Cluster, Web: cfg.Web, Icons: cfg.Icons, Remotes: remotes}
}

// Handler serves the shared settings as an event stream: the current ones
// at once, and again after every change.
func Handler(h *Holder) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET "+SharedPath, func(w http.ResponseWriter, r *http.Request) {
		changed, cancel := h.Subscribe()
		defer cancel()
		rc := http.NewResponseController(w)
		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		heartbeat := time.NewTicker(15 * time.Second)
		defer heartbeat.Stop()
		for {
			data, err := json.Marshal(shared(h.Get()))
			if err != nil {
				return
			}
			if _, err := fmt.Fprintf(w, "event: settings\ndata: %s\n\n", data); err != nil || rc.Flush() != nil {
				return
			}
		wait:
			for {
				select {
				case <-r.Context().Done():
					return
				case <-changed:
					break wait
				case <-heartbeat.C:
					if _, err := io.WriteString(w, ": keepalive\n\n"); err != nil || rc.Flush() != nil {
						return
					}
				}
			}
		}
	})
	return mux
}

// Follow keeps a holder in step with the shared settings of a controller.
// base is this process's own configuration; the shared sections replace
// those in it, and a remote keeps the headers base has for its name. It
// blocks until ctx is cancelled, reconnecting when the stream ends. Until
// the controller has been reached, and whenever it cannot be, the holder
// keeps what it has.
func Follow(ctx context.Context, upstream string, base config.Config, h *Holder, log *slog.Logger) {
	client := &http.Client{Transport: &http.Transport{
		DialContext:           (&net.Dialer{Timeout: 3 * time.Second}).DialContext,
		ResponseHeaderTimeout: 10 * time.Second,
	}}
	wait := 500 * time.Millisecond
	for ctx.Err() == nil {
		err := followOnce(ctx, client, strings.TrimRight(upstream, "/")+SharedPath, base, h, log)
		if ctx.Err() != nil {
			return
		}
		metrics.Inc("startpunkt_settings_errors_total")
		log.Warn("settings stream ended, reconnecting", "error", err, "wait", wait.String())
		select {
		case <-ctx.Done():
			return
		case <-time.After(wait):
		}
		wait = min(wait*2, 5*time.Second)
	}
}

func followOnce(ctx context.Context, client *http.Client, address string, base config.Config, h *Holder, log *slog.Logger) error {
	ctx, cancel := context.WithCancel(ctx)
	defer cancel()
	idle := time.AfterFunc(45*time.Second, cancel)
	defer idle.Stop()
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, address, nil)
	if err != nil {
		return err
	}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("unexpected status %s", resp.Status)
	}
	reader := bufio.NewReader(resp.Body)
	for {
		line, err := reader.ReadString('\n')
		if err != nil {
			if errors.Is(err, io.EOF) {
				err = errors.New("stream closed by the controller")
			}
			return err
		}
		idle.Reset(45 * time.Second)
		data, ok := strings.CutPrefix(strings.TrimRight(line, "\r\n"), "data: ")
		if !ok {
			continue
		}
		var s Shared
		if err := json.Unmarshal([]byte(data), &s); err != nil {
			return fmt.Errorf("decoding settings: %w", err)
		}
		cfg := base
		if s.Cluster.Name != "" {
			cfg.Cluster = s.Cluster
		}
		cfg.Web, cfg.Icons = s.Web, s.Icons
		headers := map[string]map[string]string{}
		for _, r := range base.Federation.Remotes {
			headers[r.Name] = r.Headers
		}
		cfg.Federation.Remotes = make([]config.Remote, len(s.Remotes))
		for i, r := range s.Remotes {
			r.Headers = headers[r.Name]
			cfg.Federation.Remotes[i] = r
		}
		if err := cfg.Validate(); err != nil {
			metrics.Inc("startpunkt_settings_errors_total")
			log.Warn("the controller sent settings this process cannot use; keeping the last ones", "error", err)
			continue
		}
		if h.Set(cfg) {
			log.Info("settings changed", "remotes", len(cfg.Federation.Remotes))
		}
	}
}
