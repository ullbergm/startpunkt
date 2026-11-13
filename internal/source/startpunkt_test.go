package source

import (
	"fmt"
	"reflect"
	"testing"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"sigs.k8s.io/yaml"

	"github.com/ullbergm/startpunkt/internal/tile"
)

func object(t *testing.T, manifest string) *unstructured.Unstructured {
	t.Helper()
	u := &unstructured.Unstructured{}
	if err := yaml.Unmarshal([]byte(manifest), &u.Object); err != nil {
		t.Fatal(err)
	}
	return u
}

func TestApplicationFull(t *testing.T) {
	got, err := Application{}.Tiles(object(t, `
apiVersion: startpunkt.ullberg.us/v1alpha4
kind: Application
metadata: {name: grafana, namespace: monitoring}
spec:
  name: Grafana
  group: Observability
  icon: simple-icons:grafana
  iconColor: orange
  url: https://grafana.example.com/
  rootPath: /dashboards
  info: Dashboards and metrics
  targetBlank: true
  location: 5
  enabled: true
  tags: "Admin, ops,admin, "
`), nil)
	if err != nil {
		t.Fatal(err)
	}
	want := []tile.Tile{{
		Kind:        tile.KindApplication,
		Name:        "Grafana",
		Group:       "observability",
		URL:         "https://grafana.example.com/dashboards",
		Icon:        "simple-icons:grafana",
		IconColor:   "orange",
		Info:        "Dashboards and metrics",
		TargetBlank: true,
		Location:    5,
		Tags:        []string{"admin", "ops"},
		Editable:    true,
	}}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("got  %+v\nwant %+v", got, want)
	}
}

func TestApplicationDefaults(t *testing.T) {
	got, err := Application{}.Tiles(object(t, `
apiVersion: startpunkt.ullberg.us/v1alpha1
kind: Application
metadata: {name: plex, namespace: Media}
spec: {name: Plex, url: "http://plex.media.svc:32400"}
`), nil)
	if err != nil {
		t.Fatal(err)
	}
	if len(got) != 1 {
		t.Fatalf("got %d tiles", len(got))
	}
	tl := got[0]
	if tl.Group != "media" || tl.Location != 1000 || tl.TargetBlank || len(tl.Tags) != 0 ||
		tl.Tags == nil || tl.URL != "http://plex.media.svc:32400" {
		t.Errorf("unexpected defaults: %+v", tl)
	}
}

func TestApplicationWithoutTile(t *testing.T) {
	for name, manifest := range map[string]string{
		"disabled": `
metadata: {name: a, namespace: ns}
spec: {name: A, url: "https://a", enabled: false}`,
		"no url": `
metadata: {name: a, namespace: ns}
spec: {name: A}`,
	} {
		got, err := Application{}.Tiles(object(t, manifest), nil)
		if err != nil || len(got) != 0 {
			t.Errorf("%s: got %v, %v; want no tiles and no error", name, got, err)
		}
	}
}

func TestInvalidObjects(t *testing.T) {
	cases := map[string]struct {
		src      Source
		manifest string
	}{
		"application without spec":  {Application{}, `metadata: {name: a, namespace: ns}`},
		"application without name":  {Application{}, `{metadata: {name: a}, spec: {url: "https://a"}}`},
		"application with bad type": {Application{}, `{metadata: {name: a}, spec: {name: A, location: "first"}}`},
		"bookmark without url":      {Bookmark{}, `{metadata: {name: b}, spec: {name: B, group: g}}`},
		"bookmark without name":     {Bookmark{}, `{metadata: {name: b}, spec: {url: "https://b", group: g}}`},
	}
	for name, c := range cases {
		if got, err := c.src.Tiles(object(t, c.manifest), nil); err == nil {
			t.Errorf("%s: expected an error, got tiles %v", name, got)
		}
	}
}

func TestBookmark(t *testing.T) {
	got, err := Bookmark{}.Tiles(object(t, `
apiVersion: startpunkt.ullberg.us/v1alpha4
kind: Bookmark
metadata: {name: docs, namespace: default}
spec:
  name: Kubernetes docs
  group: Reference
  icon: mdi:book
  url: https://kubernetes.io/docs/
  info: Official documentation
  targetBlank: true
`), nil)
	if err != nil {
		t.Fatal(err)
	}
	want := []tile.Tile{{
		Kind:        tile.KindBookmark,
		Name:        "Kubernetes docs",
		Group:       "reference",
		URL:         "https://kubernetes.io/docs/",
		Icon:        "mdi:book",
		Info:        "Official documentation",
		TargetBlank: true,
		Location:    1000,
		Tags:        []string{},
		Editable:    true,
	}}
	if !reflect.DeepEqual(got, want) {
		t.Errorf("got  %+v\nwant %+v", got, want)
	}
}

func TestAppendRootPath(t *testing.T) {
	cases := [][3]string{
		{"https://a", "x", "https://a/x"},
		{"https://a/", "/x", "https://a/x"},
		{"https://a", "", "https://a"},
		{"https://a", "  ", "https://a"},
		{"", "/x", ""},
	}
	for _, c := range cases {
		if got := appendRootPath(c[0], c[1]); got != c[2] {
			t.Errorf("appendRootPath(%q, %q) = %q, want %q", c[0], c[1], got, c[2])
		}
	}
}

func TestType(t *testing.T) {
	if got := Type(Application{}); got != "applications.startpunkt.ullberg.us" {
		t.Errorf("got %q", got)
	}
}

func TestManagedByArgoCDIsNotEditable(t *testing.T) {
	const application = `
apiVersion: startpunkt.ullberg.us/v1alpha4
kind: Application
metadata:
  name: grafana
  namespace: default
  %s
spec: {name: Grafana, url: "https://grafana.example.com"}
`
	const bookmark = `
apiVersion: startpunkt.ullberg.us/v1alpha4
kind: Bookmark
metadata:
  name: docs
  namespace: default
  %s
spec: {name: Docs, group: Reference, url: "https://example.com/docs"}
`
	for name, c := range map[string]struct {
		metadata string
		editable bool
	}{
		"nothing from Argo CD":    {``, true},
		"the tracking annotation": {`annotations: {argocd.argoproj.io/tracking-id: "home:startpunkt.ullberg.us/Application:default/grafana"}`, false},
		"the label of Argo CD":    {`labels: {argocd.argoproj.io/instance: home}`, false},
		// Helm charts set this one too, so it does not say who deploys.
		"the common instance label":  {`labels: {app.kubernetes.io/instance: home}`, true},
		"another Argo CD annotation": {`annotations: {argocd.argoproj.io/sync-wave: "1"}`, true},
	} {
		apps, err := Application{}.Tiles(object(t, fmt.Sprintf(application, c.metadata)), nil)
		if err != nil || len(apps) != 1 || apps[0].Editable != c.editable {
			t.Errorf("application with %s: %+v, %v, want editable %v", name, apps, err, c.editable)
		}
		marks, err := Bookmark{}.Tiles(object(t, fmt.Sprintf(bookmark, c.metadata)), nil)
		if err != nil || len(marks) != 1 || marks[0].Editable != c.editable {
			t.Errorf("bookmark with %s: %+v, %v, want editable %v", name, marks, err, c.editable)
		}
	}
}
