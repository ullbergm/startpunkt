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

func TestLeaderElectionIsScopedToControllerAndNamespace(t *testing.T) {
	for _, mode := range []string{"single", "split"} {
		for _, resources := range []bool{false, true} {
			for _, customLease := range []bool{false, true} {
				t.Run(mode+"/resources="+strconv.FormatBool(resources)+"/customLease="+strconv.FormatBool(customLease), func(t *testing.T) {
					args := []string{"--set", "mode=" + mode, "--set", "customResources.enabled=" + strconv.FormatBool(resources), "--set", "leaderElection.enabled=true"}
					leaseName := "test-startpunkt"
					if customLease {
						leaseName = "shared-probes"
						args = append(args, "--set", "leaderElection.leaseName="+leaseName)
					}
					docs := scopeRender(t, args...)
					var leaseRole, leaseBinding, serviceAccount string
					permissions := map[string]bool{}
					deployments := 0
					for _, doc := range docs {
						switch doc.Kind {
						case "Startpunkt":
							if doc.Spec.LeaderElection != nil {
								t.Fatal("pod-specific election bootstrap settings leaked into Startpunkt resource")
							}
						case "Deployment":
							deployments++
							role, vars := environment(t, doc)
							kube := role == "all" || role == "controller"
							serviceAccount = doc.Spec.Template.Spec.ServiceAccountName
							if kube {
								if vars["STARTPUNKT_LEADERELECTION_ENABLED"].Value != "true" || vars["STARTPUNKT_LEADERELECTION_LEASENAME"].Value != leaseName {
									t.Fatalf("election not configured for %s: %v", role, vars)
								}
								if vars["STARTPUNKT_LEADERELECTION_NAMESPACE"].ValueFrom.FieldRef.FieldPath != "metadata.namespace" || vars["STARTPUNKT_LEADERELECTION_PODIP"].ValueFrom.FieldRef.FieldPath != "status.podIP" {
									t.Fatalf("election address/namespace are not pod-specific in %s", role)
								}
							} else {
								for name := range vars {
									if strings.HasPrefix(name, "STARTPUNKT_LEADERELECTION_") {
										t.Fatalf("%s unnecessarily participates in leader election", role)
									}
								}
							}
						case "Role", "ClusterRole":
							for _, rule := range doc.Rules {
								if !contains(rule.APIGroups, "coordination.k8s.io") || !contains(rule.Resources, "leases") {
									continue
								}
								if doc.Kind != "Role" || doc.Metadata.Namespace != "startpunkt" {
									t.Fatalf("Lease permissions escape the release namespace: %s %s", doc.Kind, doc.Metadata.Namespace)
								}
								leaseRole = doc.Metadata.Name
								for _, verb := range rule.Verbs {
									if !contains([]string{"create", "get", "update", "list", "watch"}, verb) {
										t.Fatalf("unnecessary Lease privilege %q", verb)
									}
									permissions[verb] = true
									if (verb == "get" || verb == "update") && !reflect.DeepEqual(rule.ResourceNames, []string{leaseName}) {
										t.Fatalf("Lease %s is not limited to %s: %+v", verb, leaseName, rule)
									}
									if verb == "create" && len(rule.ResourceNames) > 0 {
										t.Fatal("create cannot be limited by resourceNames")
									}
								}
							}
						case "RoleBinding":
							if strings.HasSuffix(doc.Metadata.Name, "-leader") {
								leaseBinding = doc.RoleRef.Name
								if doc.Metadata.Namespace != "startpunkt" || doc.RoleRef.Kind != "Role" || len(doc.Subjects) != 1 || doc.Subjects[0].Kind != "ServiceAccount" || doc.Subjects[0].Namespace != "startpunkt" {
									t.Fatalf("incorrect Lease RoleBinding: %+v", doc)
								}
								if doc.Subjects[0].Name != "test-startpunkt" {
									t.Fatal("Lease binding does not name the release's service account")
								}
							}
						}
					}
					wantDeployments := 1
					if mode == "split" {
						wantDeployments = 3
					}
					if deployments != wantDeployments || serviceAccount != "test-startpunkt" || leaseRole == "" || leaseBinding != leaseRole || len(permissions) != 5 {
						t.Fatalf("incomplete election wiring: pods=%d role=%q binding=%q permissions=%v", deployments, leaseRole, leaseBinding, permissions)
					}
				})
			}
		}
	}
}
func TestElectionDisabledHasNoLeaseAccessOrBootstrap(t *testing.T) {
	docs := scopeRender(t, "--set", "mode=split", "--set", "leaderElection.enabled=false")
	for _, doc := range docs {
		for _, rule := range doc.Rules {
			if contains(rule.APIGroups, "coordination.k8s.io") && contains(rule.Resources, "leases") {
				t.Fatal("disabled election grants Lease access")
			}
		}
		if doc.Kind == "Deployment" {
			role, vars := environment(t, doc)
			for name := range vars {
				if strings.HasPrefix(name, "STARTPUNKT_LEADERELECTION_") {
					t.Fatalf("disabled election configured on %s", role)
				}
			}
		}
	}
}
func TestElectionDoesNotCreateRBACWhenExternallyManaged(t *testing.T) {
	docs := scopeRender(t, "--set", "leaderElection.enabled=true", "--set", "rbac.create=false")
	for _, doc := range docs {
		if doc.Kind == "Role" || doc.Kind == "RoleBinding" || doc.Kind == "ClusterRole" || doc.Kind == "ClusterRoleBinding" {
			t.Fatalf("rbac.create=false produced %s", doc.Kind)
		}
	}
}
func TestLeaderElectionValuesRejectMisspellings(t *testing.T) {
	out, err := render(t, "--set", "leaderElection.enabld=true")
	if err == nil || !strings.Contains(string(out), "schema") {
		t.Fatalf("election typo accepted: %v\n%s", err, out)
	}
}
