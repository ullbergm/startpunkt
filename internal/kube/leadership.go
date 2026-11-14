package kube

import (
	"bytes"
	"context"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"net/url"
	"os"
	"strings"
	"sync"
	"time"

	coordinationv1 "k8s.io/api/coordination/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	k8swatch "k8s.io/apimachinery/pkg/watch"
	coordinationclient "k8s.io/client-go/kubernetes/typed/coordination/v1"
	"k8s.io/client-go/tools/cache"
	"k8s.io/client-go/tools/leaderelection"
	"k8s.io/client-go/tools/leaderelection/resourcelock"

	"github.com/ullbergm/startpunkt/internal/follow"
	"github.com/ullbergm/startpunkt/internal/store"
	"github.com/ullbergm/startpunkt/internal/tile"
)

const leaderURLAnnotation = "startpunkt.ullberg.us/leader-url"

// Leadership elects one controller for probes and status writes. Read-only
// informers keep running on every replica. A nil *Leadership permits work,
// preserving the non-election behavior without branching at every caller.
type Leadership struct {
	Client                                    coordinationclient.CoordinationV1Interface
	Namespace, Name, Identity, AdvertiseURL   string
	Log                                       *slog.Logger
	LeaseDuration, RenewDeadline, RetryPeriod time.Duration

	mu          sync.Mutex
	term        context.Context
	cancelTerm  context.CancelFunc
	leaderURL   string
	subscribers map[chan struct{}]bool
	operations  sync.WaitGroup
	reports     chan []follow.RemoteReport
}

func (l *Leadership) IsLeader() bool {
	if l == nil {
		return true
	}
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.term != nil && l.term.Err() == nil
}

// WriteContext prevents new work on a nonleader and cancels in-flight work
// on lease loss. done must be called before the lease can be released.
func (l *Leadership) WriteContext(parent context.Context) (ctx context.Context, done func(), allowed bool) {
	if l == nil {
		return parent, func() {}, true
	}
	l.mu.Lock()
	if l.term == nil || l.term.Err() != nil || parent.Err() != nil {
		l.mu.Unlock()
		return parent, func() {}, false
	}
	term := l.term
	l.operations.Add(1)
	l.mu.Unlock()
	ctx, cancel := context.WithCancel(parent)
	stop := context.AfterFunc(term, cancel)
	var once sync.Once
	return ctx, func() { once.Do(func() { stop(); cancel(); l.operations.Done() }) }, true
}

// Subscribe reports leadership or leader-address changes. Every consumer has
// its own channel, so status writers and generation workers all wake up.
func (l *Leadership) Subscribe() (<-chan struct{}, func()) {
	if l == nil {
		return nil, func() {}
	}
	ch := make(chan struct{}, 1)
	l.mu.Lock()
	if l.subscribers == nil {
		l.subscribers = map[chan struct{}]bool{}
	}
	l.subscribers[ch] = true
	l.mu.Unlock()
	return ch, func() { l.mu.Lock(); delete(l.subscribers, ch); l.mu.Unlock() }
}
func (l *Leadership) notifyLocked() {
	for ch := range l.subscribers {
		select {
		case ch <- struct{}{}:
		default:
		}
	}
}
func (l *Leadership) startTerm(ctx context.Context) {
	l.mu.Lock()
	defer l.mu.Unlock()
	if ctx.Err() != nil {
		return
	}
	l.term, l.cancelTerm = context.WithCancel(ctx)
	l.notifyLocked()
}
func (l *Leadership) stopTerm() {
	l.mu.Lock()
	if l.cancelTerm != nil {
		l.cancelTerm()
	}
	l.term, l.cancelTerm = nil, nil
	l.notifyLocked()
	l.mu.Unlock()
	// No new operation can enter once term is nil. Wait before voluntarily
	// releasing the Lease, so the next leader does not overlap with old work.
	l.operations.Wait()
}

// RunWork starts work only during this process's leadership terms. Cancellation
// of the caller also stops it, independently of the lease lifecycle.
func (l *Leadership) RunWork(ctx context.Context, work func(context.Context)) {
	if l == nil {
		work(ctx)
		return
	}
	changed, cancel := l.Subscribe()
	defer cancel()
	for ctx.Err() == nil {
		if term, done, ok := l.WriteContext(ctx); ok {
			work(term)
			done()
		}
		select {
		case <-ctx.Done():
			return
		case <-changed:
		}
	}
}

// Run acquires and renews one Lease until shutdown. A lost lease ends the
// current workers, then this process may compete again. No process exits merely
// because another replica becomes leader.
func (l *Leadership) Run(ctx context.Context) error {
	if l.Log == nil {
		l.Log = slog.Default()
	}
	if l.Identity == "" {
		host, _ := os.Hostname()
		l.Identity = host + "-" + fmt.Sprintf("%x", rand.Text()[:8])
	}
	if l.Name == "" || l.Namespace == "" || l.Client == nil {
		return fmt.Errorf("leader election needs a client, lease name and namespace")
	}
	if !validLeaderURL(l.AdvertiseURL) {
		return fmt.Errorf("leader election advertiseURL must be an absolute http or https address without credentials")
	}
	if l.LeaseDuration <= 0 {
		l.LeaseDuration = 15 * time.Second
	}
	if l.RenewDeadline <= 0 {
		l.RenewDeadline = 10 * time.Second
	}
	if l.RetryPeriod <= 0 {
		l.RetryPeriod = 2 * time.Second
	}
	go l.forwardReports(ctx)
	leases := l.Client.Leases(l.Namespace)
	listWatch := &cache.ListWatch{
		ListWithContextFunc: func(ctx context.Context, options metav1.ListOptions) (runtime.Object, error) {
			options.FieldSelector = "metadata.name=" + l.Name
			return leases.List(ctx, options)
		},
		WatchFuncWithContext: func(ctx context.Context, options metav1.ListOptions) (k8swatch.Interface, error) {
			options.FieldSelector = "metadata.name=" + l.Name
			return leases.Watch(ctx, options)
		},
	}
	informer := cache.NewSharedIndexInformer(cache.ToListWatcherWithWatchListSemantics(listWatch, l.Client), &coordinationv1.Lease{}, 0, cache.Indexers{})
	observe := func(obj any) {
		lease, ok := obj.(*coordinationv1.Lease)
		if !ok || lease.Name != l.Name {
			return
		}
		address := ""
		if lease.Spec.HolderIdentity != nil && *lease.Spec.HolderIdentity != "" {
			address = lease.Annotations[leaderURLAnnotation]
		}
		if address != "" && !validLeaderURL(address) {
			address = ""
		}
		l.mu.Lock()
		if address != l.leaderURL {
			l.leaderURL = address
			l.notifyLocked()
		}
		l.mu.Unlock()
	}
	_, _ = informer.AddEventHandler(cache.ResourceEventHandlerFuncs{AddFunc: observe, UpdateFunc: func(_, obj any) { observe(obj) }, DeleteFunc: func(any) { l.mu.Lock(); l.leaderURL = ""; l.notifyLocked(); l.mu.Unlock() }})
	go informer.RunWithContext(ctx)
	for ctx.Err() == nil {
		lock := &resourcelock.LeaseLock{LeaseMeta: metav1.ObjectMeta{Namespace: l.Namespace, Name: l.Name}, Client: advertisedLeases{LeasesGetter: l.Client, address: l.AdvertiseURL}, LockConfig: resourcelock.ResourceLockConfig{Identity: l.Identity}}
		elector, err := leaderelection.NewLeaderElector(leaderelection.LeaderElectionConfig{
			Lock: lock, LeaseDuration: l.LeaseDuration, RenewDeadline: l.RenewDeadline, RetryPeriod: l.RetryPeriod,
			// Release below, after canceling and joining current operations.
			ReleaseOnCancel: false, Name: l.Name,
			Callbacks: leaderelection.LeaderCallbacks{OnStartedLeading: func(term context.Context) {
				l.startTerm(term)
				l.Log.Info("became probe and status leader", "lease", l.Name)
			}, OnStoppedLeading: func() { l.stopTerm() }},
		})
		if err != nil {
			return err
		}
		elector.Run(ctx)
		// Release only if we still own the current version. CAS in Update keeps
		// this from clearing a replacement leader's Lease.
		releaseCtx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		if record, _, err := lock.Get(releaseCtx); err == nil && record.HolderIdentity == l.Identity {
			record.HolderIdentity = ""
			_ = lock.Update(releaseCtx, *record)
		}
		cancel()
	}
	return nil
}

func validLeaderURL(address string) bool {
	u, err := url.Parse(address)
	return err == nil && tile.ValidURL(address) && u.User == nil && u.RawQuery == "" && u.Fragment == ""
}

type advertisedLeases struct {
	coordinationclient.LeasesGetter
	address string
}

func (a advertisedLeases) Leases(namespace string) coordinationclient.LeaseInterface {
	return advertisedLease{LeaseInterface: a.LeasesGetter.Leases(namespace), address: a.address}
}

type advertisedLease struct {
	coordinationclient.LeaseInterface
	address string
}

func (a advertisedLease) publish(lease *coordinationv1.Lease) *coordinationv1.Lease {
	lease = lease.DeepCopy()
	if lease.Annotations == nil {
		lease.Annotations = map[string]string{}
	}
	lease.Annotations[leaderURLAnnotation] = a.address
	return lease
}
func (a advertisedLease) Create(ctx context.Context, lease *coordinationv1.Lease, options metav1.CreateOptions) (*coordinationv1.Lease, error) {
	return a.LeaseInterface.Create(ctx, a.publish(lease), options)
}
func (a advertisedLease) Update(ctx context.Context, lease *coordinationv1.Lease, options metav1.UpdateOptions) (*coordinationv1.Lease, error) {
	return a.LeaseInterface.Update(ctx, a.publish(lease), options)
}

// MirrorProbes copies only known, URL-matched probe results from the current
// leader. It never mirrors source content, ownership, or remote clusters, and
// therefore preserves this replica's own informer state and workload metadata.
func (l *Leadership) MirrorProbes(ctx context.Context, tiles *store.Store, cluster string) {
	if l == nil {
		return
	}
	changed, cancel := l.Subscribe()
	defer cancel()
	var stop context.CancelFunc
	defer func() {
		if stop != nil {
			stop()
		}
	}()
	current := ""
	for {
		l.mu.Lock()
		address := l.leaderURL
		leader := l.term != nil && l.term.Err() == nil
		l.mu.Unlock()
		if leader || address == l.AdvertiseURL {
			address = ""
		}
		if address != current {
			if stop != nil {
				stop()
				stop = nil
			}
			current = address
			if address != "" {
				followerCtx, cancel := context.WithCancel(ctx)
				done := make(chan struct{})
				stop = func() { cancel(); <-done }
				go func() { defer close(done); l.followProbes(followerCtx, tiles, cluster, address) }()
			}
		}
		select {
		case <-ctx.Done():
			return
		case <-changed:
		}
	}
}
func (l *Leadership) followProbes(ctx context.Context, tiles *store.Store, cluster, address string) {
	shadow := store.New()
	follower := &follow.Follower{URL: strings.TrimRight(address, "/"), Store: shadow, Log: l.Log}
	go follower.Run(ctx)
	for ctx.Err() == nil {
		_, localEvents, localCancel := tiles.Subscribe()
		_, probeEvents, probeCancel := shadow.Subscribe()
		reconcile := func() {
			// Serialize the last result copy with startTerm: an old leader's
			// stream must not overwrite this replica's first elected probe.
			l.mu.Lock()
			defer l.mu.Unlock()
			if l.term != nil || ctx.Err() != nil {
				return
			}
			results := map[string]tile.Tile{}
			for _, t := range shadow.Snapshot().Tiles {
				if t.Cluster == cluster && t.Available != nil && t.LastProbe != nil {
					results[t.ID] = t
				}
			}
			for _, t := range tiles.Snapshot().Tiles {
				if r, ok := results[t.ID]; ok && t.Cluster == cluster && r.URL == t.URL {
					tiles.SetProbe([]string{t.ID}, *r.Available, *r.LastProbe)
				}
			}
		}
		reconcile()
	stream:
		for {
			select {
			case <-ctx.Done():
				localCancel()
				probeCancel()
				return
			case _, ok := <-localEvents:
				if !ok {
					break stream
				}
				reconcile()
			case _, ok := <-probeEvents:
				if !ok {
					break stream
				}
				reconcile()
			}
		}
		localCancel()
		probeCancel()
	}
}

// QueueRemoteReports forwards reports delivered to a nonleader controller by
// a load-balanced Service. One queued report bounds work while retaining the
// newest state; all-role replicas do not use this internal reporting path.
func (l *Leadership) QueueRemoteReports(reports []follow.RemoteReport) {
	if l == nil || l.IsLeader() {
		return
	}
	l.mu.Lock()
	if l.reports == nil {
		l.reports = make(chan []follow.RemoteReport, 1)
	}
	queue := l.reports
	l.mu.Unlock()
	copy := append([]follow.RemoteReport(nil), reports...)
	select {
	case queue <- copy:
	default:
		select {
		case <-queue:
		default:
		}
		select {
		case queue <- copy:
		default:
		}
	}
}

// RemoteReportHandler forwards reports at most once. A stale lease view can
// target a former leader; that receiver keeps the report but does not relay it
// again, so inconsistent watches cannot create a forwarding loop.
func (l *Leadership) RemoteReportHandler(receive func([]follow.RemoteReport)) http.Handler {
	if l == nil {
		return follow.ReportHandler(receive)
	}
	forwarded := follow.ReportHandler(receive)
	original := follow.ReportHandler(func(reports []follow.RemoteReport) {
		if receive != nil {
			receive(reports)
		}
		l.QueueRemoteReports(reports)
	})
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("X-Startpunkt-Forwarded") == "1" {
			forwarded.ServeHTTP(w, r)
		} else {
			original.ServeHTTP(w, r)
		}
	})
}
func (l *Leadership) forwardReports(ctx context.Context) {
	l.mu.Lock()
	if l.reports == nil {
		l.reports = make(chan []follow.RemoteReport, 1)
	}
	queue := l.reports
	l.mu.Unlock()
	client := &http.Client{Timeout: 10 * time.Second, Transport: &http.Transport{DialContext: (&net.Dialer{Timeout: 3 * time.Second}).DialContext, IdleConnTimeout: time.Minute}, CheckRedirect: func(*http.Request, []*http.Request) error { return http.ErrUseLastResponse }}
	defer client.CloseIdleConnections()
	for {
		select {
		case <-ctx.Done():
			return
		case reports := <-queue:
			l.mu.Lock()
			target := l.leaderURL
			l.mu.Unlock()
			if target == "" || target == l.AdvertiseURL || l.IsLeader() {
				continue
			}
			body, err := json.Marshal(reports)
			if err == nil {
				var req *http.Request
				req, err = http.NewRequestWithContext(ctx, http.MethodPut, strings.TrimRight(target, "/")+follow.ReportPath, bytes.NewReader(body))
				if err == nil {
					req.Header.Set("Content-Type", "application/json")
					req.Header.Set("X-Startpunkt-Forwarded", "1")
					var response *http.Response
					response, err = client.Do(req)
					if err == nil {
						_, _ = io.Copy(io.Discard, io.LimitReader(response.Body, 1<<16))
						response.Body.Close()
						if response.StatusCode != http.StatusNoContent {
							err = fmt.Errorf("unexpected status %s", response.Status)
						}
					}
				}
			}
			if err != nil && ctx.Err() == nil {
				l.Log.Warn("forwarding remote reports to the leader failed", "error", err)
			}
		}
	}
}
