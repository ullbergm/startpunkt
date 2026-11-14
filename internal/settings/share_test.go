package settings

import (
	"context"
	"io"
	"log/slog"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/ullbergm/startpunkt/internal/config"
)

func eventually(t *testing.T, what string, cond func() bool) {
	t.Helper()
	deadline := time.Now().Add(5 * time.Second)
	for !cond() {
		if time.Now().After(deadline) {
			t.Fatalf("timed out waiting for %s", what)
		}
		time.Sleep(5 * time.Millisecond)
	}
}

func TestSharedSettingsReachTheOtherRole(t *testing.T) {
	// The controller's settings, which came from resources.
	controller := config.Default()
	controller.Web.Title = "From the cluster"
	controller.Icons.Source = "https://icons.example.com"
	controller.Federation.Remotes = []config.Remote{
		{Name: "prod", URL: "https://prod", Headers: map[string]string{"X-Token": "controller-secret"}},
	}
	upstream := New(controller)
	ts := httptest.NewServer(Handler(upstream))
	defer ts.Close()

	// The api process: its own environment, including a header for "prod".
	base := config.Default()
	base.Server.Address = ":9999"
	base.Upstream.URL = ts.URL
	base.Federation.Remotes = []config.Remote{{Name: "prod", URL: "http://old", Headers: map[string]string{"X-Token": "own"}}}
	local := New(base)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go Follow(ctx, ts.URL+"/", base, local, slog.New(slog.NewTextHandler(io.Discard, nil)))

	eventually(t, "the first settings", func() bool { return local.Get().Web.Title == "From the cluster" })
	got := local.Get()
	if got.Icons.Source != "https://icons.example.com" || got.Server.Address != ":9999" || got.Upstream.URL != ts.URL {
		t.Errorf("got %+v", got)
	}
	r := got.Federation.Remotes
	if len(r) != 1 || r[0].URL != "https://prod" || r[0].Headers["X-Token"] != "own" {
		t.Errorf("a remote takes its address from the controller and its headers from this process: %+v", r)
	}

	// A change on the controller arrives without a new connection.
	controller.Web.Title = "Changed"
	controller.Federation.Remotes = nil
	upstream.Set(controller)
	eventually(t, "the change", func() bool {
		now := local.Get()
		return now.Web.Title == "Changed" && len(now.Federation.Remotes) == 0
	})
}

func TestSharedSettingsLeaveOutHeaders(t *testing.T) {
	cfg := config.Default()
	cfg.Federation.Remotes = []config.Remote{{Name: "prod", URL: "https://prod", Headers: map[string]string{"X-Token": "secret"}}}
	s := shared(cfg)
	if s.Remotes[0].Headers != nil || cfg.Federation.Remotes[0].Headers == nil {
		t.Errorf("headers must not be shared, and the original must be left alone: %+v", s.Remotes)
	}
}

func TestSharedClusterIdentityAllowsRemoteCalledLocal(t *testing.T) {
	controller := config.Default()
	controller.Cluster.Name = "prod"
	controller.Web.Title = "Updated"
	controller.Federation.Remotes = []config.Remote{{Name: "local", URL: "https://remote.test"}}
	if err := controller.Validate(); err != nil {
		t.Fatal(err)
	}
	upstream := New(controller)
	ts := httptest.NewServer(Handler(upstream))
	defer ts.Close()
	base := config.Default()
	local := New(base)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go Follow(ctx, ts.URL, base, local, slog.New(slog.NewTextHandler(io.Discard, nil)))
	eventually(t, "authoritative identity", func() bool { return local.Get().Cluster.Name == "prod" && local.Get().Web.Title == "Updated" })
	if len(local.Get().Federation.Remotes) != 1 || local.Get().Federation.Remotes[0].Name != "local" {
		t.Fatal("valid remote was rejected")
	}
}
