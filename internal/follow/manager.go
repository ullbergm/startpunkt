package follow

import (
	"context"
	"encoding/json"
	"log/slog"
	"sync"

	"github.com/ullbergm/startpunkt/internal/store"
)

// RemoteConfig is one remote to follow.
type RemoteConfig struct {
	Name    string
	URL     string
	Headers map[string]string
	Filter  Filter
}

// Manager runs one follower per configured remote and keeps that set in
// step with the configuration: a new remote is followed, a removed one is
// stopped and its tiles are taken away, and one that changed is restarted.
type Manager struct {
	Store *store.Store
	Log   *slog.Logger
	// Start overrides how a follower is run, for tests.
	Start func(ctx context.Context, f *Follower)

	mu      sync.Mutex
	running map[string]running
}

type running struct {
	follower    *Follower
	fingerprint string
	feed        string
	cancel      context.CancelFunc
	done        chan struct{}
}

// Sync makes the running followers match remotes. It returns when followers
// that are no longer wanted have stopped and their tiles are gone.
func (m *Manager) Sync(ctx context.Context, remotes []RemoteConfig) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.running == nil {
		m.running = map[string]running{}
	}
	wanted := map[string]RemoteConfig{}
	prints := map[string]string{}
	for _, r := range remotes {
		print, _ := json.Marshal(r)
		wanted[r.Name], prints[r.Name] = r, string(print)
	}
	for name, r := range m.running {
		if prints[name] == r.fingerprint {
			continue
		}
		// Removed or changed. Stop it and wait, so that it cannot write
		// to the store after its tiles have been taken away.
		r.cancel()
		<-r.done
		m.Store.DropFeed(r.feed)
		delete(m.running, name)
		if _, still := wanted[name]; !still {
			m.Log.Info("remote removed", "remote", name)
		}
	}
	for name, r := range wanted {
		if _, ok := m.running[name]; ok {
			continue
		}
		f := &Follower{URL: r.URL, Remote: r.Name, Headers: r.Headers, Filter: r.Filter, Store: m.Store, Log: m.Log}
		followCtx, cancel := context.WithCancel(ctx)
		done := make(chan struct{})
		start := m.Start
		if start == nil {
			start = func(ctx context.Context, f *Follower) { f.Run(ctx) }
		}
		go func() {
			defer close(done)
			start(followCtx, f)
		}()
		m.running[name] = running{follower: f, fingerprint: prints[name], feed: f.feed(), cancel: cancel, done: done}
		m.Log.Info("following remote", "remote", name, "url", r.URL)
	}
}

// Problems says, for each remote that is not connected, why. A remote that
// is connected, or whose first attempt is still under way, is not in it.
func (m *Manager) Problems() map[string]string {
	m.mu.Lock()
	defer m.mu.Unlock()
	out := map[string]string{}
	for name, r := range m.running {
		if problem := r.follower.Problem(); problem != "" {
			out[name] = problem
		}
	}
	return out
}
