package source

import "testing"

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
