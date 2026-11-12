package kube

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strings"
	"testing"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

	"github.com/ullbergm/startpunkt/internal/edit"
)

func editorFor(c *cluster) *Editor {
	return &Editor{
		Dynamic: c.dynamic, Discovery: lockedDiscovery{c}, Namespace: "home",
		Allowed: func(namespace string) bool { return namespace != "secret-place" },
	}
}

func statusOf(err error) int {
	var e *edit.Error
	if errors.As(err, &e) {
		return e.Status
	}
	return 0
}

func TestEditorWritesWhatTheControllerShows(t *testing.T) {
	c := newCluster()
	c.serve("v1")
	tiles := c.run(t)
	e := editorFor(c)
	ctx := context.Background()

	created, err := e.Create(ctx, edit.Applications, edit.Resource{Spec: json.RawMessage(`{"name":"Home Assistant","url":"https://ha.example.com","group":"Home"}`)})
	if err != nil || created.Namespace != "home" || created.Name != "home-assistant" {
		t.Fatalf("create: %+v, %v", created, err)
	}
	eventually(t, "the new tile", func() bool { return len(tiles.Snapshot().Tiles) == 1 })
	if tile := tiles.Snapshot().Tiles[0]; tile.Name != "Home Assistant" || tile.URL != "https://ha.example.com" || tile.Source.Version != "v1" {
		t.Errorf("tile = %+v", tile)
	}

	// The same title again gets a name of its own.
	second, err := e.Create(ctx, edit.Applications, edit.Resource{Spec: json.RawMessage(`{"name":"Home Assistant","url":"https://ha2.example.com"}`)})
	if err != nil || second.Name != "home-assistant-2" {
		t.Errorf("second: %+v, %v", second, err)
	}
	// A name that was asked for is not changed behind the caller's back.
	if _, err := e.Create(ctx, edit.Applications, edit.Resource{Name: "home-assistant", Spec: json.RawMessage(`{"name":"x","url":"https://x.example.com"}`)}); statusOf(err) != http.StatusConflict {
		t.Errorf("taken name: %v", err)
	}

	// Reading gives the spec as it is stored, to edit and send back.
	got, err := e.Get(ctx, edit.Applications, "home", "home-assistant")
	if err != nil || !strings.Contains(string(got.Spec), `"group":"Home"`) {
		t.Fatalf("get: %s, %v", got.Spec, err)
	}
	if _, err := e.Update(ctx, edit.Applications, edit.Resource{Namespace: "home", Name: "home-assistant", Spec: json.RawMessage(`{"name":"HA","url":"https://ha.example.com/new"}`)}); err != nil {
		t.Fatal(err)
	}
	eventually(t, "the changed tile", func() bool {
		for _, tile := range tiles.Snapshot().Tiles {
			if tile.Name == "HA" && tile.URL == "https://ha.example.com/new" && tile.Group == "home" {
				return true
			}
		}
		return false
	})

	if err := e.Delete(ctx, edit.Applications, "home", "home-assistant-2"); err != nil {
		t.Fatal(err)
	}
	eventually(t, "the deleted tile to go", func() bool { return len(tiles.Snapshot().Tiles) == 1 })

	// Bookmarks the same way.
	if b, err := e.Create(ctx, edit.Bookmarks, edit.Resource{Namespace: "links", Spec: json.RawMessage(`{"name":"Docs","group":"Reference","url":"https://example.com/docs"}`)}); err != nil || b.Namespace != "links" || b.Name != "docs" {
		t.Errorf("bookmark: %+v, %v", b, err)
	}
	eventually(t, "the bookmark", func() bool { return len(tiles.Snapshot().Tiles) == 2 })
}

func TestEditorRefusals(t *testing.T) {
	c := newCluster(app("v1", "home", "existing", "https://existing.example.com"))
	c.serve("v1")
	e := editorFor(c)
	ctx := context.Background()
	valid := json.RawMessage(`{"name":"x","url":"https://x.example.com"}`)

	for name, c := range map[string]struct {
		err  func() error
		want int
	}{
		"invalid spec on create": {func() error {
			_, err := e.Create(ctx, edit.Applications, edit.Resource{Spec: json.RawMessage(`{"name":"x","url":"javascript:alert(1)"}`)})
			return err
		}, http.StatusBadRequest},
		"invalid spec on update": {func() error {
			_, err := e.Update(ctx, edit.Applications, edit.Resource{Namespace: "home", Name: "existing", Spec: json.RawMessage(`{"url":"https://x.example.com"}`)})
			return err
		}, http.StatusBadRequest},
		"a namespace that is not read": {func() error {
			_, err := e.Create(ctx, edit.Applications, edit.Resource{Namespace: "secret-place", Spec: valid})
			return err
		}, http.StatusForbidden},
		"deleting from a namespace that is not read": {func() error { return e.Delete(ctx, edit.Applications, "secret-place", "x") }, http.StatusForbidden},
		"a namespace that is not a name": {func() error {
			_, err := e.Create(ctx, edit.Applications, edit.Resource{Namespace: "../kube-system", Spec: valid})
			return err
		}, http.StatusBadRequest},
		"a resource name that is not a name": {func() error {
			_, err := e.Create(ctx, edit.Applications, edit.Resource{Name: "Not A Name", Spec: valid})
			return err
		}, http.StatusBadRequest},
		"another kind": {func() error {
			_, err := e.Create(ctx, "secrets", edit.Resource{Spec: valid})
			return err
		}, http.StatusNotFound},
		"updating what is not there": {func() error {
			_, err := e.Update(ctx, edit.Applications, edit.Resource{Namespace: "home", Name: "none", Spec: valid})
			return err
		}, http.StatusNotFound},
		"deleting what is not there": {func() error { return e.Delete(ctx, edit.Bookmarks, "home", "none") }, http.StatusNotFound},
		"reading what is not there": {func() error {
			_, err := e.Get(ctx, edit.Applications, "home", "none")
			return err
		}, http.StatusNotFound},
	} {
		if got := statusOf(c.err()); got != c.want {
			t.Errorf("%s: status %d, want %d", name, got, c.want)
		}
	}
	// Nothing was touched along the way.
	list, err := c.dynamic.Resource(gvr("v1", "applications")).Namespace("").List(ctx, metav1.ListOptions{})
	if err != nil || len(list.Items) != 1 || list.Items[0].GetName() != "existing" {
		t.Errorf("resources after the refusals: %v, %v", list, err)
	}
}

func TestEditorNextToFourX(t *testing.T) {
	c := newCluster()
	// Only the definitions of 4.x.
	c.serve("v1alpha4")
	e := editorFor(c)
	ctx := context.Background()
	if _, err := e.Create(ctx, edit.Applications, edit.Resource{Spec: json.RawMessage(`{"name":"Old style","url":"https://old.example.com"}`)}); err != nil {
		t.Fatal(err)
	}
	obj, err := c.dynamic.Resource(gvr("v1alpha4", "applications")).Namespace("home").Get(ctx, "old-style", metav1.GetOptions{})
	if err != nil || obj.GetAPIVersion() != group+"/v1alpha4" {
		t.Errorf("written at %v, %v", obj, err)
	}

	// And with neither, a clear answer.
	c.serve()
	if _, err := e.Create(ctx, edit.Applications, edit.Resource{Spec: json.RawMessage(`{"name":"x","url":"https://x.example.com"}`)}); statusOf(err) != http.StatusServiceUnavailable {
		t.Errorf("without the resource type: %v", err)
	}
}
