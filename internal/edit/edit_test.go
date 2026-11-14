package edit

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"
)

const key = "correct horse battery staple"

func TestValidate(t *testing.T) {
	good := map[string]string{
		Applications: `{"name":" Grafana ","url":"https://grafana.example.com","tags":"a,b","targetBlank":true}`,
		Bookmarks:    `{"name":"Docs","group":"Reference","url":"http://example.com/docs"}`,
	}
	for kind, spec := range good {
		out, err := Validate(kind, json.RawMessage(spec))
		if err != nil {
			t.Fatalf("%s: %v", kind, err)
		}
		if strings.TrimSpace(out["name"].(string)) != out["name"] {
			t.Errorf("%s: the name is not trimmed: %q", kind, out["name"])
		}
		if _, set := out["info"]; set {
			t.Errorf("%s: a field that was left out must stay out: %v", kind, out)
		}
	}
	// urlFrom stands in for a URL.
	if _, err := Validate(Applications, json.RawMessage(`{"name":"x","urlFrom":{"apiVersion":"v1","kind":"Service","name":"s","property":"spec.clusterIP"}}`)); err != nil {
		t.Errorf("urlFrom without url: %v", err)
	}

	bad := map[string][2]string{
		"no name":             {Applications, `{"url":"https://x.example.com"}`},
		"no url":              {Applications, `{"name":"x"}`},
		"script url":          {Applications, `{"name":"x","url":"javascript:alert(1)"}`},
		"data url":            {Bookmarks, `{"name":"x","group":"g","url":"data:text/html,hi"}`},
		"relative url":        {Applications, `{"name":"x","url":"/somewhere"}`},
		"unknown field":       {Applications, `{"name":"x","url":"https://x.example.com","nmae":"y"}`},
		"incomplete urlFrom":  {Applications, `{"name":"x","urlFrom":{"kind":"Service"}}`},
		"bookmark no group":   {Bookmarks, `{"name":"x","url":"https://x.example.com"}`},
		"bookmark with tags":  {Bookmarks, `{"name":"x","group":"g","url":"https://x.example.com","tags":"a"}`},
		"not an object":       {Applications, `"hello"`},
		"a kind that is not":  {"secrets", `{"name":"x","url":"https://x.example.com"}`},
		"wrong type of field": {Applications, `{"name":"x","url":"https://x.example.com","location":"first"}`},
	}
	for name, c := range bad {
		_, err := Validate(c[0], json.RawMessage(c[1]))
		var e *Error
		if !errors.As(err, &e) || e.Status < 400 || e.Status >= 500 {
			t.Errorf("%s: want a client error, got %v", name, err)
		}
	}
}

func TestNameFor(t *testing.T) {
	for title, want := range map[string]string{
		"Home Assistant":                 "home-assistant",
		"  Grafana!! ":                   "grafana",
		"Åäö":                            "tile",
		"a--b__c":                        "a-b-c",
		strings.Repeat("long name ", 20): "",
	} {
		got := NameFor(title)
		if want == "" {
			if !ValidName(got) {
				t.Errorf("NameFor(long) = %q, not a valid name", got)
			}
			continue
		}
		if got != want || !ValidName(got) {
			t.Errorf("NameFor(%q) = %q, want %q", title, got, want)
		}
	}
}

// memory is an Editor that keeps resources in a map.
type memory struct {
	items map[string]Resource
	fail  error
}

func (m *memory) Get(_ context.Context, kind, namespace, name string) (Resource, error) {
	r, ok := m.items[kind+"/"+namespace+"/"+name]
	if !ok {
		return r, Errorf(http.StatusNotFound, "%q does not exist", name)
	}
	return r, nil
}

func (m *memory) Create(_ context.Context, kind string, r Resource) (Resource, error) {
	if m.fail != nil {
		return r, m.fail
	}
	if _, err := Validate(kind, r.Spec); err != nil {
		return r, err
	}
	if r.Namespace == "" {
		r.Namespace = "home"
	}
	if r.Name == "" {
		r.Name = "generated"
	}
	m.items[kind+"/"+r.Namespace+"/"+r.Name] = r
	return r, nil
}

func (m *memory) Update(ctx context.Context, kind string, r Resource) (Resource, error) {
	if _, err := m.Get(ctx, kind, r.Namespace, r.Name); err != nil {
		return r, err
	}
	m.items[kind+"/"+r.Namespace+"/"+r.Name] = r
	return r, nil
}

func (m *memory) Delete(ctx context.Context, kind, namespace, name string) error {
	if _, err := m.Get(ctx, kind, namespace, name); err != nil {
		return err
	}
	delete(m.items, kind+"/"+namespace+"/"+name)
	return nil
}

func serve(t *testing.T, h *Handler) *httptest.Server {
	t.Helper()
	mux := http.NewServeMux()
	h.Routes(mux)
	server := httptest.NewServer(mux)
	t.Cleanup(server.Close)
	return server
}

func call(t *testing.T, method, address, bearer, body string) (int, string, http.Header) {
	t.Helper()
	req, err := http.NewRequest(method, address, strings.NewReader(body))
	if err != nil {
		t.Fatal(err)
	}
	if bearer != "" {
		req.Header.Set("Authorization", "Bearer "+bearer)
	}
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	data, _ := io.ReadAll(resp.Body)
	return resp.StatusCode, string(data), resp.Header
}

func TestEndpointsNeedTheKey(t *testing.T) {
	store := &memory{items: map[string]Resource{}}
	// Slowing down wrong keys has a test of its own.
	server := serve(t, &Handler{Editor: store, Key: key, Failures: 1000})
	spec := `{"spec":{"name":"Grafana","url":"https://grafana.example.com"}}`

	for name, bearer := range map[string]string{"no key": "", "a wrong key": "guess", "a prefix of the key": key[:10], "the key and more": key + "!"} {
		for _, c := range [][2]string{
			{http.MethodGet, "/api/v1/unlock"},
			{http.MethodPost, "/api/v1/applications"},
			{http.MethodPut, "/api/v1/applications/home/grafana"},
			{http.MethodDelete, "/api/v1/bookmarks/home/docs"},
			{http.MethodGet, "/api/v1/applications/home/grafana"},
		} {
			code, _, header := call(t, c[0], server.URL+c[1], bearer, spec)
			if code != http.StatusUnauthorized || header.Get("WWW-Authenticate") != "Bearer" {
				t.Errorf("%s, %s %s: status %d", name, c[0], c[1], code)
			}
		}
	}
	if len(store.items) != 0 {
		t.Fatalf("something was written without the key: %v", store.items)
	}

	code, _, header := call(t, http.MethodGet, server.URL+"/api/v1/unlock", key, "")
	if code != http.StatusNoContent || header.Get("Cache-Control") != "no-store" {
		t.Errorf("unlock with the key: status %d, cache %q", code, header.Get("Cache-Control"))
	}
}

func TestEndpointsCreateReadUpdateDelete(t *testing.T) {
	store := &memory{items: map[string]Resource{}}
	server := serve(t, &Handler{Editor: store, Key: key})

	code, body, _ := call(t, http.MethodPost, server.URL+"/api/v1/applications", key,
		`{"name":"grafana","spec":{"name":"Grafana","url":"https://grafana.example.com"}}`)
	if code != http.StatusCreated || !strings.Contains(body, `"namespace":"home"`) {
		t.Fatalf("create: %d %s", code, body)
	}
	code, body, _ = call(t, http.MethodGet, server.URL+"/api/v1/applications/home/grafana", key, "")
	if code != http.StatusOK || !strings.Contains(body, "https://grafana.example.com") {
		t.Errorf("read: %d %s", code, body)
	}
	// The address says which resource is meant, whatever the body claims.
	code, _, _ = call(t, http.MethodPut, server.URL+"/api/v1/applications/home/grafana", key,
		`{"namespace":"elsewhere","name":"other","resourceVersion":"42","spec":{"name":"Grafana 2","url":"https://grafana.example.com"}}`)
	if code != http.StatusOK || store.items["applications/home/grafana"].ResourceVersion != "42" || !strings.Contains(string(store.items["applications/home/grafana"].Spec), "Grafana 2") {
		t.Errorf("update: %d, stored %s", code, store.items["applications/home/grafana"].Spec)
	}
	if code, _, _ := call(t, http.MethodDelete, server.URL+"/api/v1/applications/home/grafana", key, ""); code != http.StatusNoContent || len(store.items) != 0 {
		t.Errorf("delete: %d, left %v", code, store.items)
	}

	// Problems are reported with the status that describes them.
	for name, c := range map[string]struct {
		method, path, body string
		want               int
	}{
		"invalid spec":    {http.MethodPost, "/api/v1/applications", `{"spec":{"name":"x","url":"javascript:alert(1)"}}`, http.StatusBadRequest},
		"not JSON":        {http.MethodPost, "/api/v1/bookmarks", `nope`, http.StatusBadRequest},
		"unknown field":   {http.MethodPost, "/api/v1/bookmarks", `{"spec":{},"extra":1}`, http.StatusBadRequest},
		"missing":         {http.MethodDelete, "/api/v1/bookmarks/home/none", ``, http.StatusNotFound},
		"too large":       {http.MethodPost, "/api/v1/applications", `{"spec":{"name":"` + strings.Repeat("x", 70<<10) + `"}}`, http.StatusBadRequest},
		"unknown kind":    {http.MethodPost, "/api/v1/secrets", `{}`, http.StatusNotFound},
		"missing on read": {http.MethodGet, "/api/v1/applications/home/none", ``, http.StatusNotFound},
	} {
		if code, body, _ := call(t, c.method, server.URL+c.path, key, c.body); code != c.want {
			t.Errorf("%s: status %d, want %d (%s)", name, code, c.want, body)
		}
	}

	// What went wrong inside is not told to the caller.
	store.fail = errors.New("etcd is on fire at 10.0.0.1")
	code, body, _ = call(t, http.MethodPost, server.URL+"/api/v1/applications", key, `{"spec":{"name":"x","url":"https://x.example.com"}}`)
	if code != http.StatusInternalServerError || strings.Contains(body, "10.0.0.1") {
		t.Errorf("internal error: %d %s", code, body)
	}
}

func TestWrongKeysAreSlowedDown(t *testing.T) {
	server := serve(t, &Handler{Editor: &memory{items: map[string]Resource{}}, Key: key, Failures: 3, Refill: 80 * time.Millisecond})
	for i := 0; i < 3; i++ {
		if code, _, _ := call(t, http.MethodGet, server.URL+"/api/v1/unlock", "guess", ""); code != http.StatusUnauthorized {
			t.Fatalf("attempt %d: status %d", i, code)
		}
	}
	// Out of attempts: refused before the key is looked at, even the right
	// one, and told when to come back.
	for _, bearer := range []string{"guess", key} {
		code, _, header := call(t, http.MethodGet, server.URL+"/api/v1/unlock", bearer, "")
		if code != http.StatusTooManyRequests || header.Get("Retry-After") == "" {
			t.Errorf("after too many failures: status %d", code)
		}
	}
	time.Sleep(120 * time.Millisecond)
	if code, _, _ := call(t, http.MethodGet, server.URL+"/api/v1/unlock", key, ""); code != http.StatusNoContent {
		t.Errorf("after waiting: status %d", code)
	}
	// A right key does not use up attempts.
	for i := 0; i < 10; i++ {
		if code, _, _ := call(t, http.MethodGet, server.URL+"/api/v1/unlock", key, ""); code != http.StatusNoContent {
			t.Fatalf("right key, attempt %d: status %d", i, code)
		}
	}
}

func TestForwarderReachesTheControllersEditor(t *testing.T) {
	store := &memory{items: map[string]Resource{}}
	mux := http.NewServeMux()
	mux.Handle(InternalPrefix+"/", Internal(&Handler{Editor: store, Key: key}))
	controller := httptest.NewServer(mux)
	defer controller.Close()
	ctx := context.Background()

	f := NewForwarder(controller.URL+"/", key)
	created, err := f.Create(ctx, Bookmarks, Resource{ResourceVersion: "12", Spec: json.RawMessage(`{"name":"Docs","group":"Reference","url":"https://example.com"}`)})
	if err != nil || created.Namespace != "home" || created.Name != "generated" || created.ResourceVersion != "12" {
		t.Fatalf("create: %+v, %v", created, err)
	}
	if got, err := f.Get(ctx, Bookmarks, "home", "generated"); err != nil || got.ResourceVersion != "12" || !strings.Contains(string(got.Spec), "Docs") {
		t.Errorf("get: %+v, %v", got, err)
	}
	if _, err := f.Update(ctx, Bookmarks, Resource{Namespace: "home", Name: "generated", ResourceVersion: "12", Spec: json.RawMessage(`{"name":"Docs 2","group":"Reference","url":"https://example.com"}`)}); err != nil ||
		store.items["bookmarks/home/generated"].ResourceVersion != "12" || !strings.Contains(string(store.items["bookmarks/home/generated"].Spec), "Docs 2") {
		t.Errorf("update: %v", err)
	}
	// The controller's refusals come through as they are.
	var e *Error
	if _, err := f.Create(ctx, Bookmarks, Resource{Spec: json.RawMessage(`{"name":"x"}`)}); !errors.As(err, &e) || e.Status != http.StatusBadRequest {
		t.Errorf("invalid: %v", err)
	}
	if err := f.Delete(ctx, Bookmarks, "home", "none"); !errors.As(err, &e) || e.Status != http.StatusNotFound {
		t.Errorf("missing: %v", err)
	}
	if err := f.Delete(ctx, Bookmarks, "home", "generated"); err != nil || len(store.items) != 0 {
		t.Errorf("delete: %v, left %v", err, store.items)
	}

	// A controller with another key is a configuration problem, not the
	// visitor's wrong key.
	other := NewForwarder(controller.URL, "another key entirely")
	if err := other.Delete(ctx, Bookmarks, "home", "x"); !errors.As(err, &e) || e.Status != http.StatusBadGateway {
		t.Errorf("different keys: %v", err)
	}
	// So is one that is not there.
	controller.Close()
	if err := f.Delete(ctx, Bookmarks, "home", "x"); !errors.As(err, &e) || e.Status != http.StatusBadGateway {
		t.Errorf("unreachable: %v", err)
	}
}

func TestCheckSaysOnlyWhetherAnAddressAnswers(t *testing.T) {
	const key = "0123456789abcdef-check"
	var asked []string
	check := func(_ context.Context, address string) (bool, error) {
		asked = append(asked, address)
		return strings.Contains(address, "up."), nil
	}
	controller := http.NewServeMux()
	controller.Handle(InternalPrefix+"/", Internal(&Handler{Editor: &memory{}, Check: check, Key: key}))
	inside := httptest.NewServer(controller)
	defer inside.Close()
	// The process a browser talks to asks the controller.
	ts := serve(t, &Handler{Editor: &memory{}, Check: NewForwarder(inside.URL, key).Check, Key: key})

	for body, want := range map[string]string{
		`{"url":"https://up.example.com"}`:     `{"available":true}`,
		`{"url":" https://down.example.com "}`: `{"available":false}`,
	} {
		code, got, _ := call(t, http.MethodPost, ts.URL+"/api/v1/check", key, body)
		if code != http.StatusOK || strings.TrimSpace(got) != want {
			t.Errorf("%s: %d %s, want %s", body, code, got, want)
		}
	}
	if want := []string{"https://up.example.com", "https://down.example.com"}; len(asked) != 2 || (asked[0] != want[0] && asked[0] != want[1]) {
		t.Errorf("asked %v", asked)
	}
	// Not without the key, and not for what is not an http address.
	if code, _, _ := call(t, http.MethodPost, ts.URL+"/api/v1/check", "", `{"url":"https://up.example.com"}`); code != http.StatusUnauthorized {
		t.Errorf("without the key: %d", code)
	}
	before := len(asked)
	for _, body := range []string{`{"url":"file:///etc/passwd"}`, `{"url":"javascript:alert(1)"}`, `{"url":""}`, `not json`} {
		if code, _, _ := call(t, http.MethodPost, ts.URL+"/api/v1/check", key, body); code != http.StatusBadRequest {
			t.Errorf("%s: %d, want 400", body, code)
		}
	}
	if len(asked) != before {
		t.Errorf("an address that is not http was probed: %v", asked[before:])
	}
	// The endpoint is not there when nothing can check.
	plain := serve(t, &Handler{Editor: &memory{}, Key: key})
	if code, _, _ := call(t, http.MethodPost, plain.URL+"/api/v1/check", key, `{"url":"https://up.example.com"}`); code == http.StatusOK {
		t.Errorf("without a checker: %d", code)
	}
}

// A burst of simultaneous failures must not spend future refill tokens.
func TestConcurrentWrongKeysHaveBoundedRetry(t *testing.T) {
	h := &Handler{Key: key, Failures: 3, Refill: time.Hour}
	mux := http.NewServeMux()
	h.Routes(mux)
	var wg sync.WaitGroup
	start := make(chan struct{})
	for range 256 {
		wg.Go(func() {
			<-start
			req := httptest.NewRequest(http.MethodGet, "/api/v1/unlock", nil)
			req.Header.Set("Authorization", "Bearer wrong")
			mux.ServeHTTP(httptest.NewRecorder(), req)
		})
	}
	close(start)
	wg.Wait()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/unlock", nil)
	req.Header.Set("Authorization", "Bearer "+key)
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, req)
	seconds, err := strconv.Atoi(w.Header().Get("Retry-After"))
	if w.Code != http.StatusTooManyRequests || err != nil || seconds > 3601 {
		t.Fatalf("unbounded lockout: status %d, retry %q", w.Code, w.Header().Get("Retry-After"))
	}
}
