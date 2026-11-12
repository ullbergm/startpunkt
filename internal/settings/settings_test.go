package settings

import (
	"testing"

	"github.com/ullbergm/startpunkt/internal/config"
)

func TestHolder(t *testing.T) {
	h := New(config.Default())
	changed, cancel := h.Subscribe()
	defer cancel()

	if h.Set(config.Default()) {
		t.Error("setting the same configuration must not count as a change")
	}
	select {
	case <-changed:
		t.Error("no signal is expected without a change")
	default:
	}

	next := config.Default()
	next.Web.Title = "Other"
	if !h.Set(next) || h.Get().Web.Title != "Other" {
		t.Error("the new configuration must be in use")
	}
	// Several changes before the subscriber looks leave one signal.
	next.Web.Title = "Third"
	h.Set(next)
	<-changed
	select {
	case <-changed:
		t.Error("signals must not pile up")
	default:
	}
	if h.Get().Web.Title != "Third" {
		t.Error("the subscriber reads the latest configuration")
	}

	cancel()
	next.Web.Title = "Fourth"
	h.Set(next) // must not block or panic after cancel
}
