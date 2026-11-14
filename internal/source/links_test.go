package source

import (
	"reflect"
	"testing"

	"github.com/ullbergm/startpunkt/internal/tile"
)

func TestSecondaryLinksFromSpecAndAnnotations(t *testing.T) {
	for _, kind := range []string{"application", "bookmark"} {
		var src Source = Application{}
		if kind == "bookmark" {
			src = Bookmark{}
		}
		t.Run(kind, func(t *testing.T) {
			obj := object(t, `
metadata:
  name: grafana
  namespace: monitoring
  annotations:
    startpunkt.ullberg.us/links: '[{"name":"Ignored", "url":"https://ignored.example.com"}]'
spec:
  name: Grafana
  group: monitoring
  url: https://grafana.example.com
  links:
    - name: ' Documentation '
      url: ' https://docs.example.com '
`)
			got, err := src.Tiles(obj, nil)
			if err != nil {
				t.Fatal(err)
			}
			want := []tile.Link{{Name: "Documentation", URL: "https://docs.example.com"}}
			if len(got) != 1 || !reflect.DeepEqual(got[0].Links, want) {
				t.Fatalf("links: %+v, want %+v", got, want)
			}
			obj.Object["spec"].(map[string]any)["links"] = []any{}
			got, err = src.Tiles(obj, nil)
			if err != nil || len(got) != 1 || len(got[0].Links) != 0 {
				t.Fatalf("empty spec links must override annotation: %+v, %v", got, err)
			}
			delete(obj.Object["spec"].(map[string]any), "links")
			got, err = src.Tiles(obj, nil)
			if err != nil || len(got) != 1 || got[0].Links[0].Name != "Ignored" {
				t.Fatalf("annotation fallback: %+v, %v", got, err)
			}
		})
	}
}

func TestAnnotatedSecondaryLinks(t *testing.T) {
	obj := object(t, `metadata: {name: grafana, namespace: monitoring}`)
	obj.SetAnnotations(map[string]string{annLinks: `[{"name":"Logs","url":"https://logs.example.com"}]`})
	got, err := annotatedTiles(obj, Annotated{}, "https", []endpoint{{host: "grafana.example.com"}})
	if err != nil || len(got) != 1 || len(got[0].Links) != 1 || got[0].Links[0].Name != "Logs" {
		t.Fatalf("annotated links: %+v, %v", got, err)
	}
	for _, links := range []string{`[{"name":"Logs","url":"javascript:alert(1)"}]`, `[{"name":"Logs","url":"https://logs.example.com","typo":true}]`, `[] []`, `not json`} {
		obj.SetAnnotations(map[string]string{annLinks: links})
		if got, err := annotatedTiles(obj, Annotated{}, "https", []endpoint{{host: "grafana.example.com"}}); err == nil {
			t.Errorf("invalid links %q produced %+v", links, got)
		}
	}
}

func TestSourceRejectsNonHTTPAddresses(t *testing.T) {
	for _, src := range []Source{Application{}, Bookmark{}} {
		obj := object(t, `metadata: {name: a, namespace: ns}
spec: {name: A, group: apps, url: 'javascript:alert(1)'}`)
		if got, err := src.Tiles(obj, nil); err == nil {
			t.Errorf("%T accepted invalid URL: %+v", src, got)
		}
	}
	obj := object(t, `metadata: {name: a, namespace: ns}`)
	for _, annotations := range []map[string]string{{annURL: "javascript:alert(1)"}, {annProtocol: "ftp"}} {
		obj.SetAnnotations(annotations)
		if got, err := annotatedTiles(obj, Annotated{}, "http", []endpoint{{host: "example.com"}}); err == nil {
			t.Errorf("annotations %+v accepted invalid URL: %+v", annotations, got)
		}
	}
}
