package source

import (
	"errors"
	"testing"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
)

const urlFromApp = `
apiVersion: startpunkt.ullberg.us/v1alpha4
kind: Application
metadata: {name: console, namespace: apps}
spec:
  name: Console
  rootPath: /ui
  urlFrom:
    apiGroup: route.openshift.io
    apiVersion: v1
    kind: Route
    name: console
    property: spec.host
    urlTemplate: "https://{0}"
`

func TestURLFromResolves(t *testing.T) {
	var asked Ref
	lookup := func(ref Ref) (*unstructured.Unstructured, error) {
		asked = ref
		return object(t, `{metadata: {name: console}, spec: {host: console.example.com}}`), nil
	}
	got, err := Application{}.Tiles(object(t, urlFromApp), lookup)
	if err != nil || len(got) != 1 || got[0].URL != "https://console.example.com/ui" {
		t.Fatalf("got %v, %v", got, err)
	}
	want := Ref{APIVersion: "route.openshift.io/v1", Kind: "Route", Namespace: "apps", Name: "console"}
	if asked != want {
		t.Errorf("looked up %+v, want %+v", asked, want)
	}
}

func TestURLFromFailures(t *testing.T) {
	cases := map[string]Lookup{
		"missing object":   func(Ref) (*unstructured.Unstructured, error) { return nil, nil },
		"lookup error":     func(Ref) (*unstructured.Unstructured, error) { return nil, errors.New("forbidden") },
		"missing property": func(Ref) (*unstructured.Unstructured, error) { return object(t, `{spec: {}}`), nil },
	}
	for name, lookup := range cases {
		if got, err := (Application{}).Tiles(object(t, urlFromApp), lookup); err == nil {
			t.Errorf("%s: expected an error, got %v", name, got)
		}
	}
}

func TestURLFromFallsBackToURL(t *testing.T) {
	manifest := `
metadata: {name: a, namespace: ns}
spec:
  name: A
  url: https://fallback.example.com
  urlFrom: {apiVersion: v1, kind: ConfigMap, name: cm, property: data.url}
`
	missing := func(Ref) (*unstructured.Unstructured, error) { return nil, nil }
	got, err := Application{}.Tiles(object(t, manifest), missing)
	if err != nil || len(got) != 1 || got[0].URL != "https://fallback.example.com" {
		t.Errorf("unresolved: got %v, %v", got, err)
	}
	found := func(ref Ref) (*unstructured.Unstructured, error) {
		if ref.APIVersion != "v1" || ref.Namespace != "ns" {
			t.Errorf("unexpected ref %+v", ref)
		}
		return object(t, `{data: {url: "https://from-cm.example.com"}}`), nil
	}
	got, err = Application{}.Tiles(object(t, manifest), found)
	if err != nil || len(got) != 1 || got[0].URL != "https://from-cm.example.com" {
		t.Errorf("resolved: got %v, %v", got, err)
	}
}

func TestApplicationAnnotationFallbacks(t *testing.T) {
	got, err := Application{}.Tiles(object(t, `
metadata:
  name: a
  namespace: ns
  annotations:
    startpunkt.ullberg.us/rootPath: /from-annotation
    startpunkt.ullberg.us/tags: admin
spec: {name: A, url: "https://a.example.com"}
`), nil)
	if err != nil || len(got) != 1 || got[0].URL != "https://a.example.com/from-annotation" ||
		len(got[0].Tags) != 1 || got[0].Tags[0] != "admin" {
		t.Errorf("got %+v, %v", got, err)
	}
}

func TestProperty(t *testing.T) {
	obj := object(t, `
spec: {host: h, port: 8080, secure: true}
status:
  ingress:
    - {host: first}
    - {host: second}
  matrix: [[a, b], [c, d]]
`).Object
	cases := map[string]string{
		"spec.host":              "h",
		"spec.port":              "8080",
		"spec.secure":            "true",
		"status.ingress[1].host": "second",
		"status.matrix[1][0]":    "c",
	}
	for path, want := range cases {
		if got, ok := property(obj, path); !ok || got != want {
			t.Errorf("%s: got %q, %v; want %q", path, got, ok, want)
		}
	}
	for _, path := range []string{"", "spec", "spec.missing", "status.ingress[5].host",
		"status.ingress[x].host", "status.ingress[0", "spec.host.deeper", "spec..host"} {
		if got, ok := property(obj, path); ok {
			t.Errorf("%q: expected no value, got %q", path, got)
		}
	}
}
