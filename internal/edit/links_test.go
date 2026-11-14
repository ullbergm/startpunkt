package edit

import (
	"encoding/json"
	"testing"
)

func TestValidateSecondaryLinks(t *testing.T) {
	for _, kind := range []string{Applications, Bookmarks} {
		good := json.RawMessage(`{"name":"Grafana","group":"monitoring","url":"https://grafana.example.com","links":[{"name":" Docs ","url":" https://docs.example.com "}]}`)
		spec, err := Validate(kind, good)
		if err != nil {
			t.Fatal(err)
		}
		links := spec["links"].([]any)
		if links[0].(map[string]any)["name"] != "Docs" || links[0].(map[string]any)["url"] != "https://docs.example.com" {
			t.Fatalf("secondary links were not normalized: %+v", spec)
		}
		empty, err := Validate(kind, json.RawMessage(`{"name":"Grafana","group":"monitoring","url":"https://grafana.example.com","links":[]}`))
		if err != nil || empty["links"] == nil || len(empty["links"].([]any)) != 0 {
			t.Fatalf("explicit empty links must be retained: %+v, %v", empty, err)
		}
		bad := json.RawMessage(`{"name":"Grafana","group":"monitoring","url":"https://grafana.example.com","links":[{"name":"Docs","url":"javascript:alert(1)"}]}`)
		if _, err := Validate(kind, bad); err == nil {
			t.Errorf("%s allowed an unsafe secondary destination", kind)
		}
	}
}
