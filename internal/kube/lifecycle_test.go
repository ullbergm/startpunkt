package kube

import (
	"context"
	"io"
	"log/slog"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/ullbergm/startpunkt/internal/source"
	"github.com/ullbergm/startpunkt/internal/store"
	"github.com/ullbergm/startpunkt/internal/tile"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

type delayedVersionSource struct {
	source.Application
	entered, release chan struct{}
	once             sync.Once
}

func (s *delayedVersionSource) Tiles(obj *unstructured.Unstructured, lookup source.Lookup) ([]tile.Tile, error) {
	if strings.HasSuffix(obj.GetAPIVersion(), "v1alpha4") {
		s.once.Do(func() { close(s.entered) })
		<-s.release
	}
	return s.Application.Tiles(obj, lookup)
}
func TestCanceledWatcherCannotOverwriteReplacement(t *testing.T) {
	for _, removed := range []bool{false, true} {
		t.Run(map[bool]string{false: "replacement", true: "removed"}[removed], func(t *testing.T) {
			c := newCluster(app("v1alpha4", "ns", "a", "https://old.test"), app("v1", "ns", "a", "https://new.test"))
			c.serve("v1alpha4")
			src := &delayedVersionSource{entered: make(chan struct{}), release: make(chan struct{})}
			var released sync.Once
			defer released.Do(func() { close(src.release) })
			s := store.New()
			ctx, cancel := context.WithCancel(context.Background())
			defer cancel()
			ctrl := &Controller{Cluster: "test", Store: s, Sources: []source.Source{src}, Discovery: lockedDiscovery{c}, Dynamic: c.dynamic, DiscoveryInterval: 10 * time.Millisecond, Log: slog.New(slog.NewTextHandler(io.Discard, nil))}
			go ctrl.Run(ctx)
			select {
			case <-src.entered:
			case <-time.After(5 * time.Second):
				t.Fatal("old conversion never started")
			}
			if removed {
				c.serve()
			} else {
				c.serve("v1", "v1alpha4")
			}
			eventually(t, "watcher change", func() bool {
				ctrl.mu.Lock()
				defer ctrl.mu.Unlock()
				w := ctrl.watches[statusType]
				return removed && w == nil || !removed && w != nil && w.version == "v1"
			})
			if !removed {
				eventually(t, "replacement tile", func() bool { return urlOf(s, appID) == "https://new.test" })
			}
			released.Do(func() { close(src.release) })
			// Every conversion holds life until its final mutation; taking the write
			// lock establishes that the released old conversion has fully returned.
			ctrl.life.Lock()
			ctrl.life.Unlock()
			want := "https://new.test"
			if removed {
				want = ""
			}
			if got := urlOf(s, appID); got != want {
				t.Fatalf("late old conversion changed active state: got %q want %q", got, want)
			}
		})
	}
}
