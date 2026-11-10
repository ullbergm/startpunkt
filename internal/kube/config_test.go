package kube

import (
	"context"
	"io"
	"log/slog"
	"strings"
	"testing"
	"time"

	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/apis/meta/v1/unstructured"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/runtime/schema"
	dynamicfake "k8s.io/client-go/dynamic/fake"

	"github.com/ullbergm/startpunkt/internal/config"
	"github.com/ullbergm/startpunkt/internal/settings"
)

type servedTypes struct{ resources []string }

func (s *servedTypes) ServerResourcesForGroupVersion(gv string) (*metav1.APIResourceList, error) {
	list := &metav1.APIResourceList{GroupVersion: gv}
	if gv == "startpunkt.ullberg.us/v1" {
		for _, name := range s.resources {
			list.APIResources = append(list.APIResources, metav1.APIResource{Name: name})
		}
	}
	return list, nil
}

func startpunkt(name string, spec map[string]any) *unstructured.Unstructured {
	return &unstructured.Unstructured{Object: map[string]any{
		"apiVersion": "startpunkt.ullberg.us/v1", "kind": "Startpunkt",
		"metadata": map[string]any{"namespace": "home", "name": name, "generation": int64(1)},
		"spec":     spec,
	}}
}

func remoteResource(name, url string, exclude map[string]any) *unstructured.Unstructured {
	spec := map[string]any{"url": url}
	if exclude != nil {
		spec["exclude"] = exclude
	}
	return &unstructured.Unstructured{Object: map[string]any{
		"apiVersion": "startpunkt.ullberg.us/v1", "kind": "Remote",
		"metadata": map[string]any{"namespace": "home", "name": name},
		"spec":     spec,
	}}
}

func watchConfig(t *testing.T, base config.Config, served []string, objects ...runtime.Object) (*settings.Holder, *dynamicfake.FakeDynamicClient) {
	t.Helper()
	client := dynamicfake.NewSimpleDynamicClientWithCustomListKinds(runtime.NewScheme(), map[schema.GroupVersionResource]string{
		startpunktGVR: "StartpunktList", remoteGVR: "RemoteList",
	}, objects...)
	holder := settings.New(base)
	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)
	go (&ConfigWatcher{
		Base: base, Holder: holder, Dynamic: client, Discovery: &servedTypes{resources: served},
		Namespace: "home", Name: "mine", Interval: 10 * time.Millisecond,
		Log: slog.New(slog.NewTextHandler(io.Discard, nil)),
	}).Run(ctx)
	return holder, client
}

func configured(t *testing.T, client *dynamicfake.FakeDynamicClient) map[string]any {
	t.Helper()
	obj, err := client.Resource(startpunktGVR).Namespace("home").Get(context.Background(), "mine", metav1.GetOptions{})
	if err != nil {
		t.Fatal(err)
	}
	conditions, _, _ := unstructured.NestedSlice(obj.Object, "status", "conditions")
	if len(conditions) == 0 {
		return map[string]any{}
	}
	return conditions[0].(map[string]any)
}

var bothTypes = []string{"startpunkts", "remotes"}

func TestSettingsComeFromTheResources(t *testing.T) {
	base := config.Default()
	base.Web.Title = "From the environment"
	holder, client := watchConfig(t, base, bothTypes,
		startpunkt("mine", map[string]any{"web": map[string]any{"title": "From the cluster"}}),
		startpunkt("someone-elses", map[string]any{"web": map[string]any{"title": "Not mine"}}),
		remoteResource("prod", "https://prod.example.com", map[string]any{"tags": []any{"private"}}),
	)
	eventually(t, "the settings to be read", func() bool { return holder.Get().Web.Title == "From the cluster" })
	cfg := holder.Get()
	if cfg.Web.SearchEngine != base.Web.SearchEngine {
		t.Error("what the resource leaves out must keep its value")
	}
	if r := cfg.Federation.Remotes; len(r) != 1 || r[0].Name != "prod" || r[0].URL != "https://prod.example.com" || r[0].Exclude.Tags[0] != "private" {
		t.Errorf("remotes = %+v", r)
	}
	eventually(t, "the status", func() bool { return configured(t, client)["status"] == "True" })
	if c := configured(t, client); c["reason"] != "InUse" || c["observedGeneration"] != int64(1) {
		t.Errorf("condition = %v", c)
	}

	// A change is applied while running.
	ctx := context.Background()
	changed := startpunkt("mine", map[string]any{"web": map[string]any{"title": "Changed"}, "sources": map[string]any{"route": map[string]any{"enabled": false}}})
	changed.SetGeneration(2)
	if _, err := client.Resource(startpunktGVR).Namespace("home").Update(ctx, changed, metav1.UpdateOptions{}); err != nil {
		t.Fatal(err)
	}
	eventually(t, "the change", func() bool { c := holder.Get(); return c.Web.Title == "Changed" && !c.Sources.Route.Enabled })

	// Remotes come and go with their resources.
	if _, err := client.Resource(remoteGVR).Namespace("home").Create(ctx, remoteResource("dev", "https://dev.example.com", nil), metav1.CreateOptions{}); err != nil {
		t.Fatal(err)
	}
	eventually(t, "the new remote", func() bool { return len(holder.Get().Federation.Remotes) == 2 })
	if r := holder.Get().Federation.Remotes; r[0].Name != "dev" || r[1].Name != "prod" {
		t.Errorf("remotes are kept in a stable order: %+v", r)
	}
	for _, name := range []string{"dev", "prod"} {
		if err := client.Resource(remoteGVR).Namespace("home").Delete(ctx, name, metav1.DeleteOptions{}); err != nil {
			t.Fatal(err)
		}
	}
	eventually(t, "the remotes to go", func() bool { return len(holder.Get().Federation.Remotes) == 0 })

	// Deleting the resource goes back to the environment.
	if err := client.Resource(startpunktGVR).Namespace("home").Delete(ctx, "mine", metav1.DeleteOptions{}); err != nil {
		t.Fatal(err)
	}
	eventually(t, "the environment's settings", func() bool { return holder.Get().Web.Title == "From the environment" })
}

func TestInvalidSettingsAreReportedAndNotUsed(t *testing.T) {
	base := config.Default()
	holder, client := watchConfig(t, base, bothTypes,
		startpunkt("mine", map[string]any{"web": map[string]any{"title": "Good"}}))
	eventually(t, "the valid settings", func() bool { return holder.Get().Web.Title == "Good" })

	bad := startpunkt("mine", map[string]any{"web": map[string]any{"title": "Bad", "searchEngine": "javascript:alert(1)"}})
	bad.SetGeneration(2)
	if _, err := client.Resource(startpunktGVR).Namespace("home").Update(context.Background(), bad, metav1.UpdateOptions{}); err != nil {
		t.Fatal(err)
	}
	eventually(t, "the problem to be reported", func() bool { return configured(t, client)["status"] == "False" })
	c := configured(t, client)
	if c["reason"] != "Invalid" || !strings.Contains(c["message"].(string), "searchEngine") {
		t.Errorf("condition = %v", c)
	}
	if holder.Get().Web.Title != "Good" {
		t.Error("the last valid settings must stay in use")
	}

	// Fixed again.
	good := startpunkt("mine", map[string]any{"web": map[string]any{"title": "Fixed"}})
	good.SetGeneration(3)
	if _, err := client.Resource(startpunktGVR).Namespace("home").Update(context.Background(), good, metav1.UpdateOptions{}); err != nil {
		t.Fatal(err)
	}
	eventually(t, "the fix", func() bool { return holder.Get().Web.Title == "Fixed" && configured(t, client)["status"] == "True" })
}

func TestEnvironmentRemotesAreUsedUntilThereIsAResource(t *testing.T) {
	base := config.Default()
	base.Federation.Remotes = []config.Remote{{Name: "legacy", URL: "http://legacy", Headers: map[string]string{"X-Token": "abc"}}}
	holder, client := watchConfig(t, base, bothTypes, startpunkt("mine", map[string]any{}))
	eventually(t, "the status", func() bool { return configured(t, client)["status"] == "True" })
	if r := holder.Get().Federation.Remotes; len(r) != 1 || r[0].Name != "legacy" {
		t.Fatalf("remotes = %+v", r)
	}
	// A resource of the same name takes over, keeping the headers.
	if _, err := client.Resource(remoteGVR).Namespace("home").Create(context.Background(),
		remoteResource("legacy", "https://new.example.com", nil), metav1.CreateOptions{}); err != nil {
		t.Fatal(err)
	}
	eventually(t, "the resource to take over", func() bool { return holder.Get().Federation.Remotes[0].URL == "https://new.example.com" })
	if h := holder.Get().Federation.Remotes[0].Headers; h["X-Token"] != "abc" {
		t.Errorf("headers = %v", h)
	}
}

func TestWithoutTheResourceTypesTheEnvironmentIsUsed(t *testing.T) {
	base := config.Default()
	base.Web.Title = "From the environment"
	holder, _ := watchConfig(t, base, nil)
	time.Sleep(60 * time.Millisecond)
	if holder.Get().Web.Title != "From the environment" {
		t.Error("the environment's settings must be in use")
	}
}
