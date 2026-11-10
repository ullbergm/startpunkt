// Package settings holds the configuration that can change while the process
// runs. It starts as what the environment and the configuration file say,
// and is replaced when the Startpunkt and Remote resources change.
package settings

import (
	"reflect"
	"sync"

	"github.com/ullbergm/startpunkt/internal/config"
)

// Holder is safe for concurrent use.
type Holder struct {
	mu   sync.RWMutex
	cfg  config.Config
	next int
	subs map[int]chan struct{}
}

// New returns a holder with the given configuration.
func New(cfg config.Config) *Holder {
	return &Holder{cfg: cfg, subs: map[int]chan struct{}{}}
}

// Get returns the configuration in use.
func (h *Holder) Get() config.Config {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return h.cfg
}

// Set replaces the configuration and reports whether anything changed.
// Subscribers are told only when it did.
func (h *Holder) Set(cfg config.Config) bool {
	h.mu.Lock()
	defer h.mu.Unlock()
	if reflect.DeepEqual(h.cfg, cfg) {
		return false
	}
	h.cfg = cfg
	for _, ch := range h.subs {
		// One pending signal is enough: a subscriber reads the current
		// configuration when it gets round to it.
		select {
		case ch <- struct{}{}:
		default:
		}
	}
	return true
}

// Subscribe returns a channel that gets a signal after every change.
func (h *Holder) Subscribe() (changed <-chan struct{}, cancel func()) {
	h.mu.Lock()
	defer h.mu.Unlock()
	id := h.next
	h.next++
	ch := make(chan struct{}, 1)
	h.subs[id] = ch
	return ch, func() {
		h.mu.Lock()
		defer h.mu.Unlock()
		delete(h.subs, id)
	}
}
