package chart_test

import (
	"reflect"
	"strconv"
	"strings"
	"testing"

	"sigs.k8s.io/yaml"
)

type policyRule struct {
	APIGroups     []string `json:"apiGroups"`
	Resources     []string `json:"resources"`
	ResourceNames []string `json:"resourceNames"`
	Verbs         []string `json:"verbs"`
}
type scopeEnv struct {
	Name      string `json:"name"`
	Value     string `json:"value"`
	ValueFrom struct {
		FieldRef struct {
			FieldPath string `json:"fieldPath"`
		} `json:"fieldRef"`
	} `json:"valueFrom"`
}
type scopeDocument struct {
	Kind     string                                   `json:"kind"`
	Metadata struct{ Name, Namespace string }         `json:"metadata"`
	Rules    []policyRule                             `json:"rules"`
	RoleRef  struct{ Kind, Name string }              `json:"roleRef"`
	Subjects []struct{ Kind, Name, Namespace string } `json:"subjects"`
	Spec     struct {
		Workloads *struct {
			Enabled    bool   `json:"enabled"`
			ConsoleURL string `json:"consoleURL"`
		} `json:"workloads"`
		LeaderElection any `json:"leaderElection"`
		Template       struct {
			Spec struct {
				ServiceAccountName           string `json:"serviceAccountName"`
				AutomountServiceAccountToken bool   `json:"automountServiceAccountToken"`
				Containers                   []struct {
					Args []string   `json:"args"`
					Env  []scopeEnv `json:"env"`
				} `json:"containers"`
			} `json:"spec"`
		} `json:"template"`
	} `json:"spec"`
}

func scopeRender(t *testing.T, args ...string) []scopeDocument {
	t.Helper()
	out, err := render(t, args...)
	if err != nil {
		t.Fatalf("render: %v\n%s", err, out)
	}
	var docs []scopeDocument
	for _, raw := range strings.Split(string(out), "\n---") {
		var doc scopeDocument
		if err := yaml.Unmarshal([]byte(raw), &doc); err != nil {
			t.Fatal(err)
		}
		docs = append(docs, doc)
	}
	return docs
}
func contains(values []string, want string) bool {
	for _, v := range values {
		if v == want {
			return true
		}
	}
	return false
}
func environment(t *testing.T, doc scopeDocument) (string, map[string]scopeEnv) {
	t.Helper()
	pod := doc.Spec.Template.Spec
	if len(pod.Containers) != 1 || len(pod.Containers[0].Args) != 1 {
		t.Fatalf("unexpected container roles in %s", doc.Metadata.Name)
	}
	role := pod.Containers[0].Args[0]
	kube := role == "all" || role == "controller"
	if pod.AutomountServiceAccountToken != kube {
		t.Fatalf("%s token mount=%v; only Kubernetes roles may receive a token", role, pod.AutomountServiceAccountToken)
	}
	vars := map[string]scopeEnv{}
	for _, v := range pod.Containers[0].Env {
		if _, duplicate := vars[v.Name]; duplicate {
			t.Fatalf("duplicate environment variable %s in %s", v.Name, role)
		}
		vars[v.Name] = v
	}
	return role, vars
}

func TestWorkloadConfigurationAndReadPermissions(t *testing.T) {
	const console = "https://console.example.test"
	for _, mode := range []string{"single", "split"} {
		for _, resources := range []bool{false, true} {
			for _, enabled := range []bool{false, true} {
				name := mode + "/resources=" + strconv.FormatBool(resources) + "/enabled=" + strconv.FormatBool(enabled)
				t.Run(name, func(t *testing.T) {
					docs := scopeRender(t, "--set", "mode="+mode, "--set", "customResources.enabled="+strconv.FormatBool(resources), "--set", "workloads.enabled="+strconv.FormatBool(enabled), "--set-string", "workloads.consoleURL="+console)
					foundSettings, deployments, serviceRead, workloadRead := false, 0, false, false
					for _, doc := range docs {
						switch doc.Kind {
						case "Startpunkt":
							foundSettings = true
							if doc.Spec.Workloads == nil || doc.Spec.Workloads.Enabled != enabled || doc.Spec.Workloads.ConsoleURL != console {
								t.Fatalf("workload settings lost in resource: %+v", doc.Spec.Workloads)
							}
						case "Deployment":
							deployments++
							role, vars := environment(t, doc)
							kube := role == "all" || role == "controller"
							gotEnabled, hasEnabled := vars["STARTPUNKT_WORKLOADS_ENABLED"]
							gotConsole, hasConsole := vars["STARTPUNKT_WORKLOADS_CONSOLEURL"]
							if kube && !resources {
								if !hasEnabled || gotEnabled.Value != strconv.FormatBool(enabled) || !hasConsole || gotConsole.Value != console {
									t.Fatalf("workload environment missing for %s: %v", role, vars)
								}
							} else if hasEnabled || hasConsole {
								t.Fatalf("workload bootstrap values leaked to %s or override resource settings", role)
							}
						case "ClusterRole":
							for _, rule := range doc.Rules {
								services := contains(rule.APIGroups, "") && contains(rule.Resources, "services")
								workloads := contains(rule.APIGroups, "apps") && (contains(rule.Resources, "deployments") || contains(rule.Resources, "statefulsets"))
								if services || workloads {
									if !enabled {
										t.Fatal("console-only configuration unnecessarily grants workload reads")
									}
									if !reflect.DeepEqual(rule.Verbs, []string{"get", "list", "watch"}) {
										t.Fatalf("workload permissions include writes: %+v", rule)
									}
									if services {
										serviceRead = true
									}
									if workloads {
										workloadRead = contains(rule.Resources, "deployments") && contains(rule.Resources, "statefulsets")
									}
								}
							}
						}
					}
					wantDeployments := 1
					if mode == "split" {
						wantDeployments = 3
					}
					if deployments != wantDeployments || foundSettings != resources || serviceRead != enabled || workloadRead != enabled {
						t.Fatalf("incomplete workload wiring: deployments=%d settings=%v services=%v workloads=%v", deployments, foundSettings, serviceRead, workloadRead)
					}
				})
			}
		}
	}
}
func TestWorkloadValuesRejectMisspellings(t *testing.T) {
	out, err := render(t, "--set", "workloads.enabld=true")
	if err == nil || !strings.Contains(string(out), "schema") {
		t.Fatalf("workload typo accepted: %v\n%s", err, out)
	}
}
