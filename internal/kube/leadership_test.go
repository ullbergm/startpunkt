package kube

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strconv"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	coordinationv1 "k8s.io/api/coordination/v1"
	apierrors "k8s.io/apimachinery/pkg/api/errors"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime/schema"
	k8swatch "k8s.io/apimachinery/pkg/watch"
	coordinationclient "k8s.io/client-go/kubernetes/typed/coordination/v1"

	"github.com/ullbergm/startpunkt/internal/api"
	"github.com/ullbergm/startpunkt/internal/follow"
	"github.com/ullbergm/startpunkt/internal/probe"
	"github.com/ullbergm/startpunkt/internal/source"
	"github.com/ullbergm/startpunkt/internal/store"
	"github.com/ullbergm/startpunkt/internal/tile"
)

// memoryLeaseClient is a fake API with real optimistic concurrency: the
// client-go object tracker does not reject stale resourceVersion updates.
type memoryLeaseClient struct {
	coordinationclient.CoordinationV1Interface
	lease *memoryLease
}

func (c memoryLeaseClient) IsWatchListSemanticsUnSupported() bool           { return true }
func (c memoryLeaseClient) Leases(string) coordinationclient.LeaseInterface { return c.lease }

type memoryLease struct {
	coordinationclient.LeaseInterface
	mu       sync.Mutex
	object   *coordinationv1.Lease
	version  int
	watchers []*k8swatch.RaceFreeFakeWatcher
}

func (m *memoryLease) Get(ctx context.Context, name string, _ metav1.GetOptions) (*coordinationv1.Lease, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	if m.object == nil {
		return nil, apierrors.NewNotFound(schema.GroupResource{Group: "coordination.k8s.io", Resource: "leases"}, name)
	}
	return m.object.DeepCopy(), nil
}
func (m *memoryLease) Create(ctx context.Context, obj *coordinationv1.Lease, _ metav1.CreateOptions) (*coordinationv1.Lease, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	if m.object != nil {
		return nil, apierrors.NewAlreadyExists(schema.GroupResource{Group: "coordination.k8s.io", Resource: "leases"}, obj.Name)
	}
	m.version++
	m.object = obj.DeepCopy()
	m.object.ResourceVersion = strconv.Itoa(m.version)
	for _, w := range m.watchers {
		w.Add(m.object.DeepCopy())
	}
	return m.object.DeepCopy(), nil
}
func (m *memoryLease) Update(ctx context.Context, obj *coordinationv1.Lease, _ metav1.UpdateOptions) (*coordinationv1.Lease, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	if m.object == nil || obj.ResourceVersion != m.object.ResourceVersion {
		return nil, apierrors.NewConflict(schema.GroupResource{Group: "coordination.k8s.io", Resource: "leases"}, obj.Name, fmt.Errorf("stale lease"))
	}
	m.version++
	m.object = obj.DeepCopy()
	m.object.ResourceVersion = strconv.Itoa(m.version)
	for _, w := range m.watchers {
		w.Modify(m.object.DeepCopy())
	}
	return m.object.DeepCopy(), nil
}
func (m *memoryLease) List(ctx context.Context, _ metav1.ListOptions) (*coordinationv1.LeaseList, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if err := ctx.Err(); err != nil {
		return nil, err
	}
	list := &coordinationv1.LeaseList{ListMeta: metav1.ListMeta{ResourceVersion: strconv.Itoa(m.version)}}
	if m.object != nil {
		list.Items = []coordinationv1.Lease{*m.object.DeepCopy()}
	}
	return list, nil
}
func (m *memoryLease) Watch(ctx context.Context, _ metav1.ListOptions) (k8swatch.Interface, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	w := k8swatch.NewRaceFreeFake()
	m.watchers = append(m.watchers, w)
	go func() { <-ctx.Done(); w.Stop() }()
	return w, nil
}

func TestLeadershipFailoverAndProbeReplication(t *testing.T) {
	client := memoryLeaseClient{lease: &memoryLease{}}
	var active, maxActive, requests atomic.Int32
	service := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) { requests.Add(1); w.WriteHeader(http.StatusOK) }))
	defer service.Close()
	leaders := make([]*Leadership, 2)
	stores := make([]*store.Store, 2)
	cancel := make([]context.CancelFunc, 2)
	done := make([]chan error, 2)
	for i := range 2 {
		stores[i] = store.New()
		stores[i].SetCluster(store.Cluster{Name: "test", Local: true, State: store.StateConnected})
		stores[i].Upsert(tile.Tile{ID: "test/routes.route.openshift.io/ns/a", Kind: tile.KindApplication, Cluster: "test", Name: "A", URL: service.URL, Source: tile.Source{Type: "routes.route.openshift.io", Version: "v1", Namespace: "ns", Name: "a"}, Tags: []string{}})
		server := httptest.NewServer((&api.Server{Store: stores[i]}).Handler())
		defer server.Close()
		leaders[i] = &Leadership{Client: client, Namespace: "ns", Name: "startpunkt", Identity: fmt.Sprintf("pod-%d", i), AdvertiseURL: server.URL, LeaseDuration: 2 * time.Second, RenewDeadline: time.Second, RetryPeriod: 100 * time.Millisecond, Log: slog.New(slog.NewTextHandler(io.Discard, nil))}
		ctx, stop := context.WithCancel(context.Background())
		cancel[i] = stop
		defer stop()
		done[i] = make(chan error, 1)
		go func(i int) { done[i] <- leaders[i].Run(ctx) }(i)
		go leaders[i].MirrorProbes(ctx, stores[i], "test")
		go leaders[i].RunWork(ctx, func(term context.Context) {
			n := active.Add(1)
			for old := maxActive.Load(); n > old; old = maxActive.Load() {
				if maxActive.CompareAndSwap(old, n) {
					break
				}
			}
			defer active.Add(-1)
			options := probe.DefaultOptions()
			options.Interval = time.Hour
			options.InitialBackoff = time.Second
			options.Timeout = time.Second
			prober := &probe.Prober{Store: stores[i], Cluster: "test", Options: options, Log: leaders[i].Log}
			prober.Run(term)
		})
	}
	eventually(t, "one elected worker and availability on both replicas", func() bool {
		if active.Load() != 1 {
			return false
		}
		for _, s := range stores {
			tiles := s.Snapshot().Tiles
			if len(tiles) != 1 || tiles[0].Available == nil || !*tiles[0].Available {
				return false
			}
		}
		return true
	})
	if got := requests.Load(); got != 1 {
		t.Fatalf("replicas duplicated probes: %d requests", got)
	}
	initial := 0
	if leaders[1].IsLeader() {
		initial = 1
	}
	cancel[initial]()
	select {
	case err := <-done[initial]:
		if err != nil {
			t.Fatal(err)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("leader failed to stop/release")
	}
	eventually(t, "follower becomes leader", func() bool { return leaders[1-initial].IsLeader() && active.Load() == 1 && requests.Load() >= 2 })
	if maxActive.Load() != 1 {
		t.Fatalf("overlapping leader workers: %d", maxActive.Load())
	}
	cancel[1-initial]()
	select {
	case err := <-done[1-initial]:
		if err != nil {
			t.Fatal(err)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("replacement failed to stop")
	}
	if active.Load() != 0 {
		t.Fatal("worker remained active after shutdown")
	}
}

func TestLeadershipCopiesOnlyMatchingLocalProbeResults(t *testing.T) {
	sourceStore := store.New()
	sourceStore.SetCluster(store.Cluster{Name: "test", Local: true, State: store.StateConnected})
	yes := true
	at := time.Now()
	sourceStore.Upsert(tile.Tile{ID: appID, Kind: tile.KindApplication, Cluster: "test", URL: "https://wrong.test", Available: &yes, LastProbe: &at}, tile.Tile{ID: appID + "/matching", Kind: tile.KindApplication, Cluster: "test", URL: "https://matching.test", Available: &yes, LastProbe: &at})
	server := httptest.NewServer((&api.Server{Store: sourceStore}).Handler())
	defer server.Close()
	own := store.New()
	own.Upsert(tile.Tile{ID: appID, Kind: tile.KindApplication, Cluster: "test", URL: "https://own.test", Name: "Unchanged"}, tile.Tile{ID: appID + "/matching", Kind: tile.KindApplication, Cluster: "test", URL: "https://matching.test"})
	l := &Leadership{Log: slog.New(slog.NewTextHandler(io.Discard, nil))}
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go l.followProbes(ctx, own, "test", server.URL)
	eventually(t, "control result received", func() bool {
		for _, t := range own.Snapshot().Tiles {
			if t.ID == appID+"/matching" {
				return t.Available != nil && *t.Available
			}
		}
		return false
	})
	var got tile.Tile
	for _, t := range own.Snapshot().Tiles {
		if t.ID == appID {
			got = t
		}
	}
	if got.Available != nil || got.URL != "https://own.test" || got.Name != "Unchanged" {
		t.Fatalf("leader source overwrote local data: %+v", got)
	}
}

func TestNonleaderStatusWorkIsFlushedOnTakeover(t *testing.T) {
	c := newCluster(withGeneration(app("v1alpha4", "ns", "a", "https://a.test"), 1))
	c.serve("v1alpha4")
	patches := c.countPatches()
	l := &Leadership{}
	s := store.New()
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	ctrl := &Controller{Cluster: "test", Store: s, Sources: []source.Source{source.Application{}}, Discovery: lockedDiscovery{c}, Dynamic: c.dynamic, DiscoveryInterval: 10 * time.Millisecond, WriteStatus: true, Leadership: l, Log: slog.New(slog.NewTextHandler(io.Discard, nil))}
	go ctrl.Run(ctx)
	eventually(t, "nonleader source sync", s.Ready)
	if patches.Load() != 0 {
		t.Fatalf("nonleader wrote status: %d", patches.Load())
	}
	l.startTerm(ctx)
	eventually(t, "status write on takeover", func() bool { return condition(c.status(t, "ns", "a"), "Resolved")["status"] == "True" })
	l.stopTerm()
}

func TestRemoteReportsForwardOnceToLeader(t *testing.T) {
	received := make(chan []follow.RemoteReport, 1)
	var marked atomic.Bool
	leader := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		marked.Store(r.Header.Get("X-Startpunkt-Forwarded") == "1")
		follow.ReportHandler(func(reports []follow.RemoteReport) { received <- reports }).ServeHTTP(w, r)
	}))
	defer leader.Close()
	l := &Leadership{leaderURL: leader.URL, Log: slog.New(slog.NewTextHandler(io.Discard, nil))}
	var localReports atomic.Int32
	follower := httptest.NewServer(l.RemoteReportHandler(func([]follow.RemoteReport) { localReports.Add(1) }))
	defer follower.Close()
	l.AdvertiseURL = follower.URL
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	go l.forwardReports(ctx)
	reports := []follow.RemoteReport{{Name: "remote", State: store.StateConnected, Tiles: 3, LastSeen: "2026-01-01T00:00:00Z"}}
	if err := follow.PostReports(follower.URL)(ctx, reports); err != nil {
		t.Fatal(err)
	}
	select {
	case got := <-received:
		if len(got) != 1 || got[0].Name != "remote" || got[0].LastSeen != reports[0].LastSeen {
			t.Fatalf("forwarded report changed: %+v", got)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("report not forwarded")
	}
	if !marked.Load() || localReports.Load() != 1 {
		t.Fatal("forwarded report marker or local report missing")
	}
	body, _ := json.Marshal(reports)
	req := httptest.NewRequest(http.MethodPut, follow.ReportPath, bytes.NewReader(body))
	req.Header.Set("X-Startpunkt-Forwarded", "1")
	rec := httptest.NewRecorder()
	l.RemoteReportHandler(func([]follow.RemoteReport) { localReports.Add(1) }).ServeHTTP(rec, req)
	l.mu.Lock()
	queued := len(l.reports)
	l.mu.Unlock()
	if rec.Code != http.StatusNoContent || queued != 0 || localReports.Load() != 2 {
		t.Fatalf("forwarded report relayed again: status=%d queue=%d received=%d", rec.Code, queued, localReports.Load())
	}
}
