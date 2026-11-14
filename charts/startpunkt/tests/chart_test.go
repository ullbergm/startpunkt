package chart_test

import (
	"encoding/json"
	"os/exec"
	"path/filepath"
	"strings"
	"testing"

	"sigs.k8s.io/yaml"
)

func render(t *testing.T, args ...string) ([]byte, error) {
	t.Helper()
	helm, err := exec.LookPath("helm")
	if err != nil {
		t.Skip("helm is required for chart rendering checks")
	}
	return exec.Command(helm, append([]string{"template", "test", filepath.Clean(".."), "--namespace", "startpunkt"}, args...)...).CombinedOutput()
}
func TestValuesRejectMisspellings(t *testing.T) {
	for _, setting := range []string{"imag.tag=oops", "image.pullPolcy=Always", "ingress.enabld=true", "resources.ap.requests.cpu=10m", "config.web.titel=Oops", "metrics.serviceMonitor.intervl=30s", "sources.presets[0]=unknown", "sources.presets[0]=traefik,sources.presets[1]=traefik"} {
		t.Run(setting, func(t *testing.T) {
			out, err := render(t, "--set", setting)
			if err == nil || !strings.Contains(string(out), "schema") {
				t.Fatalf("invalid values accepted or failed outside schema: %v\n%s", err, out)
			}
		})
	}
}
func TestMonitoringAndPresets(t *testing.T) {
	for _, mode := range []string{"single", "split"} {
		for _, resources := range []string{"true", "false"} {
			t.Run(mode+"/resources="+resources, func(t *testing.T) {
				out, err := render(t, "--set", "mode="+mode, "--set", "customResources.enabled="+resources, "--set", "metrics.serviceMonitor.enabled=true", "--set", "metrics.grafanaDashboard.enabled=true", "--set", "metrics.grafanaDashboard.operator.enabled=true", "--set", "metrics.grafanaDashboard.operator.matchLabels.dashboards=startpunkt", "--set", "sources.presets[0]=traefik,sources.presets[1]=contour", "--set-string", "podAnnotations.example\\.com/note=hello", "--set", "resources.all.requests.cpu=10m")
				if err != nil {
					t.Fatalf("render: %v\n%s", err, out)
				}
				foundMonitor, foundDashboard, foundOperator := false, false, false
				for _, doc := range strings.Split(string(out), "\n---") {
					var v struct {
						Kind string            `json:"kind"`
						Data map[string]string `json:"data"`
						Spec map[string]any    `json:"spec"`
					}
					if err := yaml.Unmarshal([]byte(doc), &v); err != nil {
						t.Fatalf("invalid YAML: %v", err)
					}
					switch v.Kind {
					case "ServiceMonitor":
						foundMonitor = true
						selector := v.Spec["selector"].(map[string]any)
						expressions := selector["matchExpressions"].([]any)
						roles := expressions[0].(map[string]any)["values"].([]any)
						if mode == "single" && (len(roles) != 1 || roles[0] != "all") {
							t.Fatalf("single scrape roles %v", roles)
						}
						if mode == "split" && (len(roles) != 2 || roles[0] != "controller" || roles[1] != "api") {
							t.Fatalf("split scrape roles %v", roles)
						}
					case "ConfigMap":
						if raw, ok := v.Data["startpunkt.json"]; ok {
							var dashboard map[string]any
							if err := json.Unmarshal([]byte(raw), &dashboard); err != nil {
								t.Fatalf("dashboard JSON: %v", err)
							}
							foundDashboard = true
							if len(dashboard["panels"].([]any)) < 5 {
								t.Fatal("dashboard has no useful panels")
							}
						}
					case "GrafanaDashboard":
						foundOperator = true
					}
				}
				if !foundMonitor || !foundDashboard || !foundOperator {
					t.Fatalf("monitoring resources missing: monitor=%v dashboard=%v operator=%v", foundMonitor, foundDashboard, foundOperator)
				}
				if !strings.Contains(string(out), "traefik.io") || !strings.Contains(string(out), "projectcontour.io") {
					t.Fatal("preset RBAC missing")
				}
				if resources == "false" && !strings.Contains(string(out), "STARTPUNKT_SOURCES_PRESETS") {
					t.Fatal("environment preset setting missing")
				}
			})
		}
	}
}
