package follow

import (
	"context"
	"fmt"
	"github.com/ullbergm/startpunkt/internal/store"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

func TestRedirectNeverForwardsConfiguredHeadersAcrossOrigins(t *testing.T) {
	var reached atomic.Bool
	target := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		reached.Store(true)
		t.Error("cross-origin redirect was followed with", r.Header.Get("X-API-Key"))
	}))
	defer target.Close()
	origin := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, strings.Replace(target.URL, "127.0.0.1", "localhost", 1), http.StatusFound)
	}))
	defer origin.Close()
	f := &Follower{URL: origin.URL, Client: origin.Client(), Headers: map[string]string{"X-API-Key": "test-only-secret"}, Store: store.New(), IdleTimeout: time.Second}
	if _, err := f.stream(context.Background()); err == nil {
		t.Fatal("redirect did not fail")
	}
	if reached.Load() {
		t.Fatal("credential target was reached")
	}
}

func TestSameOriginRedirectCanReachEventStream(t *testing.T) {
	origin := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/stream" {
			http.Redirect(w, r, "/stream", http.StatusTemporaryRedirect)
			return
		}
		if r.Header.Get("X-API-Key") != "test-only-secret" {
			t.Error("same-origin header missing")
		}
		fmt.Fprintf(w, "event: snapshot\ndata: %s\n\n", encoded(t, remoteSnapshot()))
	}))
	defer origin.Close()
	f := &Follower{URL: origin.URL, Client: origin.Client(), Store: store.New(), IdleTimeout: time.Second}
	f.Headers = map[string]string{"X-API-Key": "test-only-secret"}
	f.Log = testLogger()
	connected, _ := f.stream(context.Background())
	if !connected {
		t.Fatal("same-origin redirect rejected")
	}
}
