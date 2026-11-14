package metrics

import (
	"net/http/httptest"
	"strings"
	"sync"
	"testing"

	"github.com/ullbergm/startpunkt/internal/store"
	"github.com/ullbergm/startpunkt/internal/tile"
)

func TestRegistryBoundsAndHistogram(t *testing.T) {
	// No tests run in parallel: instrumentation uses the process registry.
	global = newRegistry()
	Inc("startpunkt_probes_total", "result", "available")
	Inc("startpunkt_probes_total", "result", "https://untrusted.example")
	Inc("unknown_metric")
	Add("startpunkt_probes_total", -1, "result", "available")
	Add("startpunkt_event_streams", 2)
	Add("startpunkt_event_streams", -1)
	Observe("startpunkt_probe_duration_seconds", .075, "result", "available")
	Observe("startpunkt_probe_duration_seconds", .25, "result", "available")
	Observe("startpunkt_probe_duration_seconds", -1, "result", "available")
	var b strings.Builder
	global.write(&b)
	body := b.String()
	for _, want := range []string{
		`startpunkt_probes_total{result="available"} 1`,
		`startpunkt_event_streams 1`,
		`startpunkt_probe_duration_seconds_bucket{result="available",le="0.05"} 0`,
		`startpunkt_probe_duration_seconds_bucket{result="available",le="0.1"} 1`,
		`startpunkt_probe_duration_seconds_bucket{result="available",le="0.25"} 2`,
		`startpunkt_probe_duration_seconds_bucket{result="available",le="+Inf"} 2`,
		`startpunkt_probe_duration_seconds_count{result="available"} 2`,
	} {
		if !strings.Contains(body, want+"\n") {
			t.Errorf("missing sample %s in\n%s", want, body)
		}
	}
	if strings.Contains(body, "untrusted") || strings.Contains(body, "unknown_metric") {
		t.Fatal("unbounded labels or metrics accepted")
	}
}

func TestHandlerSnapshot(t *testing.T) {
	tiles := store.New()
	tiles.Upsert(tile.Tile{ID: "a", Cluster: "local", Source: tile.Source{Type: "applications"}}, tile.Tile{ID: "b", Cluster: "local", Source: tile.Source{Type: "applications"}})
	tiles.SetCluster(store.Cluster{Name: "local", Local: true, State: store.StateConnected})
	w := httptest.NewRecorder()
	Handler(tiles).ServeHTTP(w, httptest.NewRequest("GET", "/metrics", nil))
	if w.Code != 200 || !strings.HasPrefix(w.Header().Get("Content-Type"), "text/plain; version=0.0.4") {
		t.Fatalf("response: %d %v", w.Code, w.Header())
	}
	for _, want := range []string{
		`startpunkt_tiles{cluster="local",source="applications"} 2`,
		`startpunkt_cluster_state{cluster="local",state="connected",local="true"} 1`,
		`startpunkt_cluster_state{cluster="local",state="stale",local="true"} 0`,
		`startpunkt_ready 1`,
	} {
		if !strings.Contains(w.Body.String(), want+"\n") {
			t.Errorf("missing %s", want)
		}
	}
	if got := quote("a\"b\\c\nd"); got != `"a\"b\\c\nd"` {
		t.Fatalf("escaping: %s", got)
	}
	w = httptest.NewRecorder()
	Handler(nil).ServeHTTP(w, httptest.NewRequest("GET", "/metrics", nil))
	if strings.Contains(w.Body.String(), "startpunkt_ready") {
		t.Fatal("web role claims readiness of a store")
	}
}

func TestConcurrentUpdates(t *testing.T) {
	global = newRegistry()
	var wg sync.WaitGroup
	for range 100 {
		wg.Go(func() {
			for range 100 {
				Inc("startpunkt_probes_total", "result", "available")
			}
		})
	}
	wg.Wait()
	var b strings.Builder
	global.write(&b)
	if !strings.Contains(b.String(), `startpunkt_probes_total{result="available"} 10000`+"\n") {
		t.Fatal("lost increments")
	}
}
