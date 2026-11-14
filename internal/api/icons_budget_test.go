package api

import (
	"context"
	"net/http"
	"net/http/httptest"
	"sync"
	"testing"
	"time"
)

func TestConcurrentMissingIconResultsArePublishedSafely(t *testing.T) {
	upstream := httptest.NewServer(http.NotFoundHandler())
	defer upstream.Close()
	i := &Icons{Source: upstream.URL, BatchDelay: time.Nanosecond, MissingTTL: time.Nanosecond}
	i.init()
	var wg sync.WaitGroup
	for range 30 {
		wg.Go(func() {
			for range 60 {
				_, _ = i.get(context.Background(), "set", "missing")
			}
		})
	}
	wg.Wait()
}
