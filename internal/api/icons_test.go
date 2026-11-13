package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/ullbergm/startpunkt/internal/store"
)

// iconService stands in for the icon service's batch endpoint:
// GET /{set}.json?icons=a,b,c.
func iconService(t *testing.T) (*httptest.Server, *atomic.Int32, *atomic.Int32) {
	t.Helper()
	var hits, status atomic.Int32
	status.Store(http.StatusOK)
	bodies := map[string]map[string]string{
		"mdi": {
			"home":   `<path fill=\"currentColor\" d=\"M1 1\"/>`,
			"wide":   `<path fill=\"currentColor\" d=\"M2 2\"/>`,
			"script": `<script>alert(1)</script>`,
		},
		"logos": {"kubernetes": `<path fill=\"#326de6\" d=\"M1 1\"/>`},
	}
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		hits.Add(1)
		time.Sleep(10 * time.Millisecond)
		if status.Load() != http.StatusOK {
			w.Header().Set("Retry-After", "120")
			w.WriteHeader(int(status.Load()))
			return
		}
		set := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/"), ".json")
		known, ok := bodies[set]
		if !ok {
			w.WriteHeader(http.StatusNotFound)
			return
		}
		var icons, missing []string
		for _, name := range strings.Split(r.URL.Query().Get("icons"), ",") {
			switch body, found := known[name]; {
			case name == "alias":
				// answered below, through the aliases
			case found && name == "wide":
				icons = append(icons, `"wide":{"body":"`+body+`","width":48,"left":2}`)
			case found:
				icons = append(icons, `"`+name+`":{"body":"`+body+`"}`)
			default:
				missing = append(missing, `"`+name+`"`)
			}
		}
		aliases := ""
		if strings.Contains(r.URL.Query().Get("icons"), "alias") {
			aliases = `"alias":{"parent":"home"}`
			icons = append(icons, `"home":{"body":"`+known["home"]+`"}`)
		}
		_, _ = w.Write([]byte(`{"prefix":"` + set + `","width":24,"height":24,"aliases":{` + aliases +
			`},"icons":{` + strings.Join(icons, ",") + `},"not_found":[` + strings.Join(missing, ",") + `]}`))
	}))
	t.Cleanup(ts.Close)
	return ts, &hits, &status
}

func iconHandler(source string) (http.Handler, *Icons) {
	icons := &Icons{Source: source, MissingTTL: 60 * time.Millisecond, BatchDelay: 15 * time.Millisecond}
	return (&Server{Store: store.New(), Icons: icons}).Handler(), icons
}

func TestIconsAreFetchedOnceAndColoured(t *testing.T) {
	ts, hits, _ := iconService(t)
	h, _ := iconHandler(ts.URL)

	rec := get(t, h, "/api/v1/icons/mdi/home.svg")
	if rec.Code != http.StatusOK || rec.Header().Get("Content-Type") != "image/svg+xml" ||
		!strings.HasPrefix(rec.Body.String(), `<svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24">`) ||
		!strings.Contains(rec.Body.String(), `fill="currentColor"`) {
		t.Fatalf("plain: %d %q %s", rec.Code, rec.Header().Get("Content-Type"), rec.Body.String())
	}
	if cc := rec.Header().Get("Cache-Control"); !strings.Contains(cc, "immutable") {
		t.Errorf("cache-control = %q", cc)
	}
	if csp := rec.Header().Get("Content-Security-Policy"); !strings.Contains(csp, "default-src 'none'") || !strings.Contains(csp, "sandbox") {
		t.Errorf("an icon opened on its own must be inert, csp = %q", csp)
	}

	for colour, want := range map[string]string{"%23696969": `fill="#696969"`, "orange": `fill="orange"`} {
		if body := get(t, h, "/api/v1/icons/mdi/home.svg?color="+colour).Body.String(); !strings.Contains(body, want) {
			t.Errorf("colour %s: %s", colour, body)
		}
	}
	// An icon with colours of its own is not recoloured.
	if body := get(t, h, "/api/v1/icons/logos/kubernetes.svg?color=red").Body.String(); !strings.Contains(body, "#326de6") || strings.Contains(body, "red") {
		t.Errorf("multi-colour icon: %s", body)
	}
	if n := hits.Load(); n != 2 {
		t.Errorf("the icon service was asked %d times for two icons", n)
	}

	// An icon with a size and offset of its own, and another name for an icon.
	if body := get(t, h, "/api/v1/icons/mdi/wide.svg").Body.String(); !strings.Contains(body, `viewBox="2 0 48 24"`) {
		t.Errorf("own size: %s", body)
	}
	if rec := get(t, h, "/api/v1/icons/mdi/alias.svg"); rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), "M1 1") {
		t.Errorf("alias: %d %s", rec.Code, rec.Body.String())
	}
}

func TestIconsOfOneSetGoOutAsOneRequest(t *testing.T) {
	ts, hits, _ := iconService(t)
	h, _ := iconHandler(ts.URL)
	var wg sync.WaitGroup
	results := map[string]int{}
	var mu sync.Mutex
	for _, path := range []string{"mdi/home", "mdi/wide", "mdi/nope", "mdi/also-nope", "logos/kubernetes", "nosuchset/x"} {
		wg.Add(1)
		go func() {
			defer wg.Done()
			rec := get(t, h, "/api/v1/icons/"+path+".svg")
			mu.Lock()
			results[path] = rec.Code
			mu.Unlock()
		}()
	}
	wg.Wait()
	want := map[string]int{"mdi/home": 200, "mdi/wide": 200, "mdi/nope": 404, "mdi/also-nope": 404, "logos/kubernetes": 200, "nosuchset/x": 404}
	for path, code := range want {
		if results[path] != code {
			t.Errorf("%s: status %d, want %d", path, results[path], code)
		}
	}
	// Six icons from three sets: three requests.
	if n := hits.Load(); n != 3 {
		t.Errorf("the icon service was asked %d times, want one request per set", n)
	}
}

func TestIconsConcurrentRequestsShareOneFetch(t *testing.T) {
	ts, hits, _ := iconService(t)
	h, _ := iconHandler(ts.URL)
	var wg sync.WaitGroup
	for i := 0; i < 30; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if rec := get(t, h, "/api/v1/icons/mdi/home.svg"); rec.Code != http.StatusOK {
				t.Errorf("status %d", rec.Code)
			}
		}()
	}
	wg.Wait()
	if n := hits.Load(); n != 1 {
		t.Errorf("30 requests for one icon caused %d fetches", n)
	}
}

func TestIconsRejectWhatIsNotAnIconName(t *testing.T) {
	ts, hits, _ := iconService(t)
	h, _ := iconHandler(ts.URL)
	for _, path := range []string{
		"/api/v1/icons/mdi/home.png",
		"/api/v1/icons/mdi/Home.svg",
		"/api/v1/icons/mdi/..%2f..%2fetc.svg",
		"/api/v1/icons/m_d/home.svg",
		"/api/v1/icons/mdi/home.svg?color=red%22%2F%3E%3Cscript%3E",
		"/api/v1/icons/mdi/home.svg?color=url(x)",
	} {
		if rec := get(t, h, path); rec.Code != http.StatusBadRequest {
			t.Errorf("%s: status %d", path, rec.Code)
		}
	}
	if n := hits.Load(); n != 0 {
		t.Errorf("%d requests reached the icon service", n)
	}
}

func TestIconsMissingAndFailing(t *testing.T) {
	ts, hits, status := iconService(t)
	h, _ := iconHandler(ts.URL)

	// A missing icon is remembered as missing for a while.
	for i := 0; i < 3; i++ {
		if rec := get(t, h, "/api/v1/icons/mdi/nope.svg"); rec.Code != http.StatusNotFound {
			t.Fatalf("missing: %d", rec.Code)
		}
	}
	if n := hits.Load(); n != 1 {
		t.Errorf("a missing icon was asked for %d times", n)
	}
	time.Sleep(90 * time.Millisecond)
	get(t, h, "/api/v1/icons/mdi/nope.svg")
	if n := hits.Load(); n != 2 {
		t.Errorf("a missing icon must be asked for again after a while, asked %d times", n)
	}

	// Whatever the service puts in an icon, it is only ever served as an
	// image that may run nothing.
	if rec := get(t, h, "/api/v1/icons/mdi/script.svg"); rec.Code != http.StatusOK ||
		!strings.Contains(rec.Header().Get("Content-Security-Policy"), "sandbox") {
		t.Errorf("odd icon: %d %q", rec.Code, rec.Header().Get("Content-Security-Policy"))
	}

	// The service refuses: that is an error, and not held against the icon
	// for long.
	status.Store(http.StatusTooManyRequests)
	before := hits.Load()
	for i := 0; i < 3; i++ {
		if rec := get(t, h, "/api/v1/icons/mdi/later.svg"); rec.Code != http.StatusBadGateway {
			t.Errorf("refused: %d", rec.Code)
		}
	}
	if n := hits.Load() - before; n != 1 {
		t.Errorf("a refused icon was retried %d times at once", n)
	}

	if rec := get(t, (&Server{Store: store.New()}).Handler(), "/api/v1/icons/mdi/home.svg"); rec.Code != http.StatusNotFound {
		t.Errorf("endpoint must be off without Icons: %d", rec.Code)
	}
}

func TestIconsLimitBatchesAtOnce(t *testing.T) {
	var current, peak atomic.Int32
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		n := current.Add(1)
		for {
			old := peak.Load()
			if n <= old || peak.CompareAndSwap(old, n) {
				break
			}
		}
		time.Sleep(15 * time.Millisecond)
		current.Add(-1)
		_, _ = w.Write([]byte(`{"width":24,"height":24,"icons":{"x":{"body":"<path/>"}}}`))
	}))
	defer ts.Close()
	h := (&Server{Store: store.New(), Icons: &Icons{Source: ts.URL, Limit: 2, BatchDelay: time.Millisecond}}).Handler()
	var wg sync.WaitGroup
	for _, set := range []string{"a", "b", "c", "d", "e", "f", "g"} {
		wg.Add(1)
		go func() {
			defer wg.Done()
			get(t, h, "/api/v1/icons/"+set+"/x.svg")
		}()
	}
	wg.Wait()
	if p := peak.Load(); p > 2 {
		t.Errorf("%d batches were fetched at once, the limit is 2", p)
	}
}

func TestIconsSplitLargeBatches(t *testing.T) {
	var requests atomic.Int32
	var longest atomic.Int32
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		requests.Add(1)
		names := strings.Split(r.URL.Query().Get("icons"), ",")
		if n := int32(len(names)); n > longest.Load() {
			longest.Store(n)
		}
		var icons []string
		for _, name := range names {
			icons = append(icons, `"`+name+`":{"body":"<path/>"}`)
		}
		_, _ = w.Write([]byte(`{"width":24,"height":24,"icons":{` + strings.Join(icons, ",") + `}}`))
	}))
	defer ts.Close()
	h := (&Server{Store: store.New(), Icons: &Icons{Source: ts.URL, BatchDelay: 30 * time.Millisecond}}).Handler()
	var wg sync.WaitGroup
	for n := 0; n < 100; n++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if rec := get(t, h, "/api/v1/icons/mdi/icon-"+strconv.Itoa(n)+".svg"); rec.Code != http.StatusOK {
				t.Errorf("icon %d: status %d", n, rec.Code)
			}
		}()
	}
	wg.Wait()
	if longest.Load() > 40 || requests.Load() > 6 {
		t.Errorf("%d requests, the longest for %d icons", requests.Load(), longest.Load())
	}
}

// When more icons have been asked for than are kept, the kept ones are
// started over. An icon that was waiting for its batch at that moment and is
// asked for again must not bring the process down, and both requests get
// their answer.
func TestIconsSurviveStartingOverWithABatchWaiting(t *testing.T) {
	ts, hits, _ := iconService(t)
	icons := &Icons{Source: ts.URL, MaxEntries: 2, BatchDelay: 100 * time.Millisecond}
	h := (&Server{Store: store.New(), Icons: icons}).Handler()

	var wg sync.WaitGroup
	codes := make([]int, 4)
	for n, path := range []string{
		"/api/v1/icons/mdi/home.svg",
		"/api/v1/icons/logos/kubernetes.svg",
		"/api/v1/icons/logos/nothing.svg", // the third icon starts the kept ones over
		"/api/v1/icons/mdi/home.svg",      // a second entry for an icon that already waits
	} {
		wg.Go(func() { codes[n] = get(t, h, path).Code })
		time.Sleep(10 * time.Millisecond)
	}
	wg.Wait()

	if codes[0] != http.StatusOK || codes[3] != http.StatusOK {
		t.Errorf("both requests for the icon must be answered: %v", codes)
	}
	if codes[1] != http.StatusOK || codes[2] != http.StatusNotFound {
		t.Errorf("the other icons: %v", codes)
	}
	if n := hits.Load(); n != 2 {
		t.Errorf("the icon service was asked %d times for two sets", n)
	}
	// The process is still there, and the icon is kept.
	time.Sleep(150 * time.Millisecond)
	if rec := get(t, h, "/api/v1/icons/mdi/home.svg"); rec.Code != http.StatusOK {
		t.Errorf("afterwards: %d", rec.Code)
	}
}

func TestIconSearch(t *testing.T) {
	var hits atomic.Int32
	var failing atomic.Bool
	service := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		hits.Add(1)
		if r.URL.Path != "/search" || failing.Load() {
			w.WriteHeader(http.StatusServiceUnavailable)
			return
		}
		// What is not an icon name is left out of the answer.
		_ = json.NewEncoder(w).Encode(map[string]any{"icons": []string{
			"mdi:" + r.URL.Query().Get("query"), "simple-icons:grafana", "no-colon", "bad:<script>", "UPPER:case",
		}})
	}))
	defer service.Close()
	h := (&Server{Store: store.New(), Icons: &Icons{Source: service.URL}}).Handler()
	search := func(query string) (int, []string) {
		rec := get(t, h, "/api/v1/icons?query="+query)
		var doc IconSearch
		_ = json.Unmarshal(rec.Body.Bytes(), &doc)
		return rec.Code, doc.Icons
	}
	code, icons := search("Home")
	if want := []string{"mdi:home", "simple-icons:grafana"}; code != http.StatusOK || !reflect.DeepEqual(icons, want) {
		t.Errorf("%d %v, want %v", code, icons, want)
	}
	search("home")
	if n := hits.Load(); n != 1 {
		t.Errorf("the service was asked %d times for one query", n)
	}
	for _, query := range []string{"", "%20", strings.Repeat("a", 51)} {
		if code, _ := search(query); code != http.StatusBadRequest {
			t.Errorf("query %q: %d, want 400", query, code)
		}
	}
	failing.Store(true)
	if code, _ := search("other"); code != http.StatusBadGateway {
		t.Errorf("a failing service: %d, want 502", code)
	}
	// Icons themselves are still served from the same place.
	if rec := get(t, h, "/api/v1/icons/mdi/Home.svg"); rec.Code != http.StatusBadRequest {
		t.Errorf("an icon name that is not one: %d", rec.Code)
	}
}
