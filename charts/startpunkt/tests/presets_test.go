package chart_test

import (
	"encoding/json"
	"reflect"
	"strings"
	"testing"

	"sigs.k8s.io/yaml"
)

func TestPresetSelectionAndRBAC(t *testing.T) {
	presets := []struct{ name, group, resource string }{
		{"traefik", "traefik.io", "ingressroutes"},
		{"contour", "projectcontour.io", "httpproxies"},
		{"knative", "serving.knative.dev", "services"},
		{"nginx", "k8s.nginx.org", "virtualservers"},
		{"apisix", "apisix.apache.org", "apisixroutes"},
	}
	for _, mode := range []string{"single", "split"} {
		for _, resources := range []string{"true", "false"} {
			for _, selection := range []string{"default", "all", "none"} {
				t.Run(mode+"/"+resources+"/"+selection, func(t *testing.T) {
					args := []string{"--set", "mode=" + mode, "--set", "customResources.enabled=" + resources}
					want := []string{"traefik"}
					switch selection {
					case "all":
						want = []string{"traefik", "contour", "knative", "nginx", "apisix"}
						args = append(args, "--set-json", `sources.presets=["traefik","contour","knative","nginx","apisix"]`)
					case "none":
						want = []string{}
						args = append(args, "--set-json", "sources.presets=[]")
					}
					out, err := render(t, args...)
					if err != nil {
						t.Fatalf("render: %v %s", err, out)
					}
					foundSelection := false
					grants := map[string]bool{}
					for _, doc := range strings.Split(string(out), "\n---") {
						var v struct {
							Kind  string
							Rules []policyRule
							Spec  struct {
								Sources  struct{ Presets []string }
								Template struct {
									Spec struct {
										Containers []struct {
											Args []string
											Env  []scopeEnv
										}
									}
								}
							}
						}
						if err := yaml.Unmarshal([]byte(doc), &v); err != nil {
							t.Fatal(err)
						}
						if v.Kind == "ClusterRole" {
							for _, rule := range v.Rules {
								for _, group := range rule.APIGroups {
									for _, resource := range rule.Resources {
										grants[group+"/"+resource] = true
									}
								}
							}
						}
						if resources == "true" && v.Kind == "Startpunkt" {
							if !reflect.DeepEqual(v.Spec.Sources.Presets, want) {
								t.Fatalf("settings presets: %v want %v", v.Spec.Sources.Presets, want)
							}
							foundSelection = true
						}
						if resources == "false" && v.Kind == "Deployment" {
							for _, c := range v.Spec.Template.Spec.Containers {
								if len(c.Args) == 0 || (c.Args[0] != "all" && c.Args[0] != "controller") {
									continue
								}
								for _, env := range c.Env {
									if env.Name != "STARTPUNKT_SOURCES_PRESETS" {
										continue
									}
									expected := strings.Join(want, ",")
									if len(want) == 0 {
										expected = "[]"
									}
									if env.Value != expected {
										t.Fatalf("environment presets: %q want %q", env.Value, expected)
									}
									foundSelection = true
								}
							}
						}
					}
					if !foundSelection {
						t.Fatal("preset selection not passed to controller")
					}
					for _, preset := range presets {
						enabled := false
						for _, name := range want {
							if name == preset.name {
								enabled = true
							}
						}
						if grants[preset.group+"/"+preset.resource] != enabled {
							raw, _ := json.Marshal(grants)
							t.Fatalf("%s RBAC enabled=%v, grants=%s", preset.name, enabled, raw)
						}
					}
				})
			}
		}
	}
}
