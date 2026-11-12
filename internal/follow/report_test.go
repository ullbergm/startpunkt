package follow

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"reflect"
	"sync"
	"testing"
	"time"

	"github.com/ullbergm/startpunkt/internal/store"
	"github.com/ullbergm/startpunkt/internal/tile"
)

var quiet = slog.New(slog.NewTextHandler(io.Discard, nil))

// inbox collects what a reporter sends.
type inbox struct {
	mu   sync.Mutex
	got  [][]RemoteReport
	fail bool
}

func (i *inbox) send(_ context.Context, reports []RemoteReport) error {
	i.mu.Lock()
	defer i.mu.Unlock()
	if i.fail {
		return errors.New("nobody home")
	}
	i.got = append(i.got, reports)
	return nil
}

func (i *inbox) count() int {
	i.mu.Lock()
	defer i.mu.Unlock()
	return len(i.got)
}

func (i *inbox) last() []RemoteReport {
	i.mu.Lock()
	defer i.mu.Unlock()
	if len(i.got) == 0 {
		return nil
	}
	return i.got[len(i.got)-1]
}

func TestReporterSaysHowTheRemotesAreDoing(t *testing.T) {
	hub := store.New()
	hub.SetCluster(store.Cluster{Name: "home", Local: true, State: store.StateConnected})
	hub.Upsert(tile.Tile{ID: "home/x", Cluster: "home", Tags: []string{}})
	hub.SetClusterFrom("remote:prod", store.Cluster{Name: "prod", State: store.StateSyncing})

	var mu sync.Mutex
	problems := map[string]string{}
	box := &inbox{}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go (&Reporter{
		Store: hub, Send: box.send, Log: quiet, Interval: time.Hour, Settle: 5 * time.Millisecond,
		Problems: func() map[string]string {
			mu.Lock()
			defer mu.Unlock()
			return map[string]string{"prod": problems["prod"]}
		},
	}).Run(ctx)

	// At once, and only about the remotes.
	eventually(t, "the first report", func() bool {
		return reflect.DeepEqual(box.last(), []RemoteReport{{Name: "prod", State: store.StateSyncing}})
	})

	// A change is reported without waiting for the interval.
	hub.MirrorFrom("remote:prod", store.Snapshot{
		Tiles:    []tile.Tile{{ID: "prod/a", Cluster: "prod", Tags: []string{}}, {ID: "prod/b", Cluster: "prod", Tags: []string{}}},
		Clusters: []store.Cluster{{Name: "prod", State: store.StateConnected}},
	})
	eventually(t, "the connected report", func() bool {
		return reflect.DeepEqual(box.last(), []RemoteReport{{Name: "prod", State: store.StateConnected, Tiles: 2}})
	})

	// A change that is not about a remote is not a reason to report.
	sent := box.count()
	hub.Upsert(tile.Tile{ID: "home/y", Cluster: "home", Tags: []string{}})
	time.Sleep(50 * time.Millisecond)
	if box.count() != sent {
		t.Errorf("reported %d more times without a change to a remote", box.count()-sent)
	}

	// Losing the remote is reported with the reason, and its tiles stay.
	mu.Lock()
	problems["prod"] = "connection refused"
	mu.Unlock()
	hub.MarkStaleFrom("remote:prod")
	eventually(t, "the stale report", func() bool {
		return reflect.DeepEqual(box.last(), []RemoteReport{{Name: "prod", State: store.StateStale, Tiles: 2, Problem: "connection refused"}})
	})

	// A removed remote is no longer in the report.
	hub.DropFeed("remote:prod")
	eventually(t, "the empty report", func() bool { r := box.last(); return r != nil && len(r) == 0 })
}

func TestReporterRepeatsAtTheIntervalAndAfterAFailure(t *testing.T) {
	hub := store.New()
	hub.SetClusterFrom("remote:prod", store.Cluster{Name: "prod", State: store.StateConnected})
	box := &inbox{fail: true}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go (&Reporter{Store: hub, Send: box.send, Log: quiet, Interval: 20 * time.Millisecond, Settle: time.Millisecond}).Run(ctx)

	time.Sleep(50 * time.Millisecond)
	box.mu.Lock()
	box.fail = false
	box.mu.Unlock()
	// Nothing changed, yet the report arrives once it can be delivered,
	// and keeps arriving.
	eventually(t, "repeated reports", func() bool { return box.count() >= 3 })
}

func TestReportsTravelBetweenProcesses(t *testing.T) {
	var mu sync.Mutex
	var got []RemoteReport
	server := httptest.NewServer(ReportHandler(func(reports []RemoteReport) {
		mu.Lock()
		got = reports
		mu.Unlock()
	}))
	defer server.Close()

	want := []RemoteReport{{Name: "prod", State: store.StateStale, Tiles: 3, Problem: "timeout"}}
	if err := PostReports(server.URL+"/")(context.Background(), want); err != nil {
		t.Fatal(err)
	}
	mu.Lock()
	defer mu.Unlock()
	if !reflect.DeepEqual(got, want) {
		t.Errorf("got %+v, want %+v", got, want)
	}

	// Anything else is refused.
	resp, err := http.Post(server.URL+ReportPath, "application/json", nil)
	if err != nil {
		t.Fatal(err)
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusMethodNotAllowed {
		t.Errorf("POST: status %d", resp.StatusCode)
	}

	// An instance without Remote resources accepts and drops reports.
	dropping := httptest.NewServer(ReportHandler(nil))
	defer dropping.Close()
	if err := PostReports(dropping.URL)(context.Background(), want); err != nil {
		t.Errorf("a report nobody wants must still be accepted: %v", err)
	}
}

func TestFollowerRemembersWhyItIsNotConnected(t *testing.T) {
	refusing := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		http.Error(w, "no", http.StatusForbidden)
	}))
	defer refusing.Close()
	hub := store.New()
	f := &Follower{URL: refusing.URL, Remote: "prod", Store: hub, Log: quiet, MinBackoff: time.Millisecond, MaxBackoff: 5 * time.Millisecond}
	if f.Problem() != "" {
		t.Error("nothing is wrong before the first attempt")
	}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go f.Run(ctx)
	eventually(t, "the problem", func() bool { return f.Problem() == "unexpected status 403 Forbidden" })
}
