package source

import (
	"reflect"
	"strings"
	"testing"

	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"

	apiv1 "github.com/ullbergm/startpunkt/api/v1"
)

func TestTraefikPreset(t *testing.T) {
	mappings, err := PresetMappings([]string{"traefik"})
	if err != nil {
		t.Fatal(err)
	}
	s := one(t, mappings[0])
	obj := ingressRoute(map[string]any{"startpunkt.ullberg.us/enable": "true"},
		"Host(`one.example.com`, `two.example.com`)",
		"Host(`three.example.com`) || Host(`one.example.com`)",
		"PathPrefix(`/api`)", "Host(`*.example.com`)")
	want := []string{"http://one.example.com", "http://two.example.com", "http://three.example.com"}
	if got := customURLs(t, s, obj); !reflect.DeepEqual(got, want) {
		t.Fatalf("hosts = %v, want %v", got, want)
	}
	obj.Object["spec"].(map[string]any)["tls"] = map[string]any{}
	if got := customURLs(t, s, obj); got[0] != "https://one.example.com" {
		t.Errorf("TLS: %v", got)
	}
	obj.SetAnnotations(nil)
	if got := customURLs(t, s, obj); len(got) != 0 {
		t.Errorf("unannotated route is shown: %v", got)
	}
}

func TestContourPreset(t *testing.T) {
	mappings, err := PresetMappings([]string{"contour"})
	if err != nil {
		t.Fatal(err)
	}
	s := one(t, mappings[0])
	for _, tc := range []struct {
		name string
		spec map[string]any
		want []string
	}{
		{"root", map[string]any{"virtualhost": map[string]any{"fqdn": "console.example.com"}}, []string{"http://console.example.com"}},
		{"TLS", map[string]any{"virtualhost": map[string]any{"fqdn": "console.example.com", "tls": map[string]any{"secretName": "cert"}}}, []string{"https://console.example.com"}},
		{"delegated", map[string]any{"routes": []any{}}, []string{}},
		{"wildcard", map[string]any{"virtualhost": map[string]any{"fqdn": "*.example.com"}}, []string{}},
		{"empty", map[string]any{"virtualhost": map[string]any{}}, []string{}},
	} {
		t.Run(tc.name, func(t *testing.T) {
			obj := &unstructured.Unstructured{Object: map[string]any{
				"apiVersion": "projectcontour.io/v1", "kind": "HTTPProxy",
				"metadata": map[string]any{"namespace": "tools", "name": "console", "annotations": map[string]any{"startpunkt.ullberg.us/enable": "true"}},
				"spec":     tc.spec,
			}}
			if got := customURLs(t, s, obj); !reflect.DeepEqual(got, tc.want) {
				t.Errorf("hosts = %v, want %v", got, tc.want)
			}
		})
	}
}

func TestPresetsAllowMissingFieldsAndURLOverride(t *testing.T) {
	for _, name := range []string{"traefik", "contour"} {
		mappings, _ := PresetMappings([]string{name})
		s := one(t, mappings[0])
		obj := &unstructured.Unstructured{Object: map[string]any{
			"metadata": map[string]any{"namespace": "tools", "name": "empty", "annotations": map[string]any{"startpunkt.ullberg.us/enable": "true"}},
		}}
		if got := customURLs(t, s, obj); len(got) != 0 {
			t.Errorf("%s missing spec: %v", name, got)
		}
		obj.SetAnnotations(map[string]string{"startpunkt.ullberg.us/enable": "true", "startpunkt.ullberg.us/url": "https://override.example.com"})
		if got := customURLs(t, s, obj); !reflect.DeepEqual(got, []string{"https://override.example.com"}) {
			t.Errorf("%s override: %v", name, got)
		}
	}
}

func TestPresetsRejectConflictingMappings(t *testing.T) {
	for _, tc := range []struct {
		presets []string
		custom  []apiv1.CustomSource
		want    string
	}{
		{presets: []string{"missing"}, want: "unknown mapping"},
		{presets: []string{"traefik", "traefik"}, want: "enabled twice"},
		{presets: []string{"traefik"}, custom: []apiv1.CustomSource{traefik(nil)}, want: "name is used twice"},
		{presets: []string{"traefik"}, custom: []apiv1.CustomSource{traefik(func(s *apiv1.CustomSource) { s.Name = "other" })}, want: "one source per resource type"},
	} {
		if _, err := Configured(DefaultOptions(), tc.custom, tc.presets); err == nil || !strings.Contains(err.Error(), tc.want) {
			t.Errorf("%+v: error = %v", tc, err)
		}
	}
}
