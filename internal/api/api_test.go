package api

import (
	"bufio"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"testing/fstest"
	"time"

	"github.com/ullbergm/startpunkt/internal/store"
	"github.com/ullbergm/startpunkt/internal/tile"
)

func newServer() (*Server, *store.Store) {
	s := store.New()
	return &Server{
		Store: s,
		UI:    UIConfig{Title: "Test page"},
		Assets: fstest.MapFS{
			"index.html":    {Data: []byte("<html>index</html>")},
			"assets/app.js": {Data: []byte("console.log(1)")},
		},
		Heartbeat: 20 * time.Millisecond,
	}, s
}

func get(t *testing.T, h http.Handler, path string, header ...string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, path, nil)
	for i := 0; i+1 < len(header); i += 2 {
		req.Header.Set(header[i], header[i+1])
	}
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func TestStateDocument(t *testing.T) {
	srv, s := newServer()
	s.SetCluster(store.Cluster{Name: "prod", Local: true, State: store.StateConnected})
	s.Upsert(tile.Tile{ID: "prod/x/ns/a", Kind: tile.KindApplication, Cluster: "prod",
		Name: "A", Group: "g", URL: "https://a", Location: 1000, Tags: []string{}})

	rec := get(t, srv.Handler(), "/api/v1/state")
	if rec.Code != http.StatusOK || rec.Header().Get("Content-Type") != "application/json" {
		t.Fatalf("status %d, type %q", rec.Code, rec.Header().Get("Content-Type"))
	}
	var doc map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &doc); err != nil {
		t.Fatal(err)
	}
	if doc["schemaVersion"] != float64(1) {
		t.Errorf("schemaVersion = %v", doc["schemaVersion"])
	}
	tiles := doc["tiles"].([]any)
	first := tiles[0].(map[string]any)
	for _, field := range []string{"id", "kind", "cluster", "name", "group", "url",
		"targetBlank", "location", "tags", "source", "editable"} {
		if _, ok := first[field]; !ok {
			t.Errorf("tile is missing %q", field)
		}
	}
	if _, ok := first["available"]; ok {
		t.Error("available must be absent when probing is off")
	}
	cluster := doc["clusters"].([]any)[0].(map[string]any)
	if cluster["name"] != "prod" || cluster["local"] != true || cluster["state"] != "connected" {
		t.Errorf("cluster = %v", cluster)
	}
	if doc["config"].(map[string]any)["title"] != "Test page" {
		t.Errorf("config = %v", doc["config"])
	}
	if doc["editing"].(map[string]any)["available"] != false {
		t.Errorf("editing = %v", doc["editing"])
	}
}

func TestStateIsAListWhenEmpty(t *testing.T) {
	srv, _ := newServer()
	body := get(t, srv.Handler(), "/api/v1/state").Body.String()
	if !strings.Contains(body, `"tiles":[]`) || !strings.Contains(body, `"clusters":[]`) {
		t.Errorf("empty lists must not be null: %s", body)
	}
}

func TestStateETag(t *testing.T) {
	srv, s := newServer()
	h := srv.Handler()
	etag := get(t, h, "/api/v1/state").Header().Get("ETag")
	if etag == "" {
		t.Fatal("no ETag")
	}
	if rec := get(t, h, "/api/v1/state", "If-None-Match", etag); rec.Code != http.StatusNotModified || rec.Body.Len() != 0 {
		t.Errorf("unchanged state: status %d, %d bytes", rec.Code, rec.Body.Len())
	}
	s.Upsert(tile.Tile{ID: "x", Tags: []string{}})
	rec := get(t, h, "/api/v1/state", "If-None-Match", etag)
	if rec.Code != http.StatusOK || rec.Header().Get("ETag") == etag {
		t.Errorf("changed state: status %d, etag %q", rec.Code, rec.Header().Get("ETag"))
	}
}

func TestReadiness(t *testing.T) {
	srv, s := newServer()
	h := srv.Handler()
	if rec := get(t, h, "/readyz"); rec.Code != http.StatusServiceUnavailable {
		t.Errorf("before sync: %d", rec.Code)
	}
	s.SetCluster(store.Cluster{Name: "c", Local: true, State: store.StateConnected})
	if rec := get(t, h, "/readyz"); rec.Code != http.StatusNoContent {
		t.Errorf("after sync: %d", rec.Code)
	}
	if rec := get(t, h, "/healthz"); rec.Code != http.StatusNoContent {
		t.Errorf("healthz: %d", rec.Code)
	}
}

func TestAssets(t *testing.T) {
	srv, _ := newServer()
	h := srv.Handler()
	for _, path := range []string{"/", "/index.html", "/admin", "/admin/ops"} {
		rec := get(t, h, path)
		if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), "index") ||
			rec.Header().Get("Cache-Control") != "no-cache" {
			t.Errorf("%s: status %d, body %q", path, rec.Code, rec.Body.String())
		}
	}
	rec := get(t, h, "/assets/app.js")
	if rec.Code != http.StatusOK || !strings.Contains(rec.Header().Get("Cache-Control"), "immutable") {
		t.Errorf("asset: status %d, cache %q", rec.Code, rec.Header().Get("Cache-Control"))
	}
	if rec := get(t, h, "/assets/missing.js"); rec.Code != http.StatusNotFound {
		t.Errorf("missing asset: %d", rec.Code)
	}
	if rec := get(t, h, "/api/v1/nope"); rec.Code != http.StatusNotFound ||
		!strings.Contains(rec.Body.String(), "error") {
		t.Errorf("unknown api path must not fall back to the page: %d %s", rec.Code, rec.Body.String())
	}
	if csp := get(t, h, "/").Header().Get("Content-Security-Policy"); !strings.Contains(csp, "default-src 'self'") {
		t.Errorf("csp = %q", csp)
	}
}

func TestRolesWithoutStoreOrAssets(t *testing.T) {
	web := (&Server{Assets: fstest.MapFS{"index.html": {Data: []byte("x")}}}).Handler()
	if rec := get(t, web, "/api/v1/state"); rec.Code != http.StatusNotFound {
		t.Errorf("web role must not serve the API: %d", rec.Code)
	}
	if rec := get(t, web, "/readyz"); rec.Code != http.StatusNoContent {
		t.Errorf("web role readiness: %d", rec.Code)
	}
	srv, _ := newServer()
	srv.Assets = nil
	if rec := get(t, srv.Handler(), "/"); rec.Code != http.StatusNotFound {
		t.Errorf("api role must not serve the page: %d", rec.Code)
	}
}

// readEvent returns the next named event on the stream, skipping heartbeats.
func readEvent(t *testing.T, r *bufio.Reader) (name, data string) {
	t.Helper()
	for {
		line, err := r.ReadString('\n')
		if err != nil {
			t.Fatalf("stream ended: %v", err)
		}
		line = strings.TrimRight(line, "\n")
		switch {
		case strings.HasPrefix(line, "event: "):
			name = strings.TrimPrefix(line, "event: ")
		case strings.HasPrefix(line, "data: "):
			data = strings.TrimPrefix(line, "data: ")
		case line == "" && name != "":
			return name, data
		}
	}
}

func TestEventStream(t *testing.T) {
	srv, s := newServer()
	s.SetCluster(store.Cluster{Name: "c", Local: true, State: store.StateSyncing})
	s.Upsert(tile.Tile{ID: "first", Name: "First", Tags: []string{}})
	ts := httptest.NewServer(srv.Handler())
	defer ts.Close()

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, ts.URL+"/api/v1/events", nil)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if ct := resp.Header.Get("Content-Type"); ct != "text/event-stream" {
		t.Fatalf("content type %q", ct)
	}
	r := bufio.NewReader(resp.Body)

	name, data := readEvent(t, r)
	var state State
	if name != "snapshot" || json.Unmarshal([]byte(data), &state) != nil ||
		len(state.Tiles) != 1 || state.Tiles[0].ID != "first" || state.Config.Title != "Test page" {
		t.Fatalf("first event: %s %s", name, data)
	}

	s.Upsert(tile.Tile{ID: "second", Name: "Second", Tags: []string{}})
	if name, data = readEvent(t, r); name != "tile.upsert" || !strings.Contains(data, `"id":"second"`) {
		t.Fatalf("upsert: %s %s", name, data)
	}
	s.Remove("first")
	if name, data = readEvent(t, r); name != "tile.delete" || data != `{"id":"first"}` {
		t.Fatalf("delete: %s %s", name, data)
	}
	s.SetCluster(store.Cluster{Name: "c", Local: true, State: store.StateConnected})
	if name, data = readEvent(t, r); name != "cluster.status" || !strings.Contains(data, `"state":"connected"`) {
		t.Fatalf("cluster: %s %s", name, data)
	}
}

func TestEventStreamHeartbeat(t *testing.T) {
	srv, _ := newServer()
	ts := httptest.NewServer(srv.Handler())
	defer ts.Close()
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, ts.URL+"/api/v1/events", nil)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	r := bufio.NewReader(resp.Body)
	for {
		line, err := r.ReadString('\n')
		if err != nil {
			t.Fatalf("no heartbeat before the stream ended: %v", err)
		}
		if strings.HasPrefix(line, ":") {
			return
		}
	}
}

func TestEditingIsOffUnlessConfigured(t *testing.T) {
	s := store.New()
	off := httptest.NewServer((&Server{Store: s}).Handler())
	defer off.Close()
	on := httptest.NewServer((&Server{
		Store:   s,
		Editing: Editing{Available: true, Namespace: "home"},
		Edit: func(mux *http.ServeMux) {
			mux.HandleFunc("GET /api/v1/unlock", func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusNoContent) })
		},
	}).Handler())
	defer on.Close()

	editing := func(base string) map[string]any {
		resp, err := http.Get(base + "/api/v1/state")
		if err != nil {
			t.Fatal(err)
		}
		defer resp.Body.Close()
		var doc map[string]any
		if err := json.NewDecoder(resp.Body).Decode(&doc); err != nil {
			t.Fatal(err)
		}
		return doc["editing"].(map[string]any)
	}
	status := func(base string) int {
		resp, err := http.Get(base + "/api/v1/unlock")
		if err != nil {
			t.Fatal(err)
		}
		resp.Body.Close()
		return resp.StatusCode
	}
	if e := editing(off.URL); e["available"] != false || e["namespace"] != nil || status(off.URL) != http.StatusNotFound {
		t.Errorf("without a key: editing %v, unlock %d", e, status(off.URL))
	}
	if e := editing(on.URL); e["available"] != true || e["namespace"] != "home" || status(on.URL) != http.StatusNoContent {
		t.Errorf("with a key: editing %v, unlock %d", e, status(on.URL))
	}
}

func TestMetricsEndpointForStoreAndWebRoles(t *testing.T) {
	for _, tiles := range []*store.Store{nil, store.New()} {
		if tiles != nil {
			tiles.SetCluster(store.Cluster{Name: "local", Local: true, State: store.StateConnected})
		}
		rec := get(t, (&Server{Store: tiles}).Handler(), "/metrics")
		if rec.Code != http.StatusOK || !strings.HasPrefix(rec.Header().Get("Content-Type"), "text/plain; version=0.0.4") {
			t.Fatalf("metrics response: %d %v", rec.Code, rec.Header())
		}
		if !strings.Contains(rec.Body.String(), "startpunkt_probes_total") {
			t.Fatal("metrics endpoint missing registry")
		}
		if tiles != nil && !strings.Contains(rec.Body.String(), "startpunkt_ready 1") {
			t.Fatal("store readiness metric missing")
		}
	}
}
