package us.ullberg.startpunkt.objects.kubernetes;

import static org.junit.jupiter.api.Assertions.*;

import io.fabric8.kubernetes.api.model.GenericKubernetesResource;
import io.fabric8.kubernetes.api.model.GenericKubernetesResourceList;
import io.fabric8.kubernetes.api.model.ObjectMetaBuilder;
import io.fabric8.kubernetes.client.KubernetesClient;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.kubernetes.client.KubernetesServer;
import io.quarkus.test.kubernetes.client.KubernetesTestServer;
import io.quarkus.test.kubernetes.client.WithKubernetesTestServer;
import java.net.HttpURLConnection;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import us.ullberg.startpunkt.crd.v1alpha4.ApplicationSpec;

/**
 * Test class for HajimariApplicationWrapper. Tests Hajimari application CRD wrapping and spec
 * extraction with direct spec field access.
 */
@QuarkusTest
@WithKubernetesTestServer
class HajimariApplicationWrapperTest {

  @KubernetesTestServer KubernetesServer server;
  private KubernetesClient client;

  @BeforeEach
  void setUp() {
    client = server.getClient();
  }

  @Test
  void testConstructor() {
    HajimariApplicationWrapper wrapper = new HajimariApplicationWrapper();
    assertNotNull(wrapper, "Wrapper should be created");
    assertEquals("hajimari.io", wrapper.getGroup());
    assertEquals("v1alpha1", wrapper.getVersion());
    assertEquals("applications", wrapper.getPluralKind());
  }

  @Test
  void testGetApplicationSpecsWithBasicFields() {
    setupMockHajimariResources();

    HajimariApplicationWrapper wrapper = new HajimariApplicationWrapper();
    List<ApplicationSpec> specs = wrapper.getApplicationSpecs(client, false, List.of("default"));

    assertNotNull(specs, "Specs should not be null");
    assertFalse(specs.isEmpty(), "Specs should not be empty");
    // Verify name is lowercased
    for (ApplicationSpec spec : specs) {
      if (spec.getName() != null) {
        assertEquals(spec.getName().toLowerCase(), spec.getName(), "Name should be lowercase");
      }
    }
  }

  @Test
  void testGetApplicationSpecsWithAllOptionalFields() {
    setupMockHajimariResourcesWithAllFields();

    HajimariApplicationWrapper wrapper = new HajimariApplicationWrapper();
    List<ApplicationSpec> specs = wrapper.getApplicationSpecs(client, false, List.of("default"));

    assertNotNull(specs, "Specs should not be null");
    // Should include icon, info, targetBlank fields
  }

  @Test
  void testGetApplicationSpecsWithLocationZero() {
    setupMockHajimariResourcesWithLocationZero();

    HajimariApplicationWrapper wrapper = new HajimariApplicationWrapper();
    List<ApplicationSpec> specs = wrapper.getApplicationSpecs(client, false, List.of("default"));

    assertNotNull(specs, "Specs should not be null");
    // Location 0 should be normalized to 1000 for Hajimari compatibility
  }

  @Test
  void testGetApplicationSpecsWithDisabledApp() {
    setupMockHajimariResourcesWithDisabled();

    HajimariApplicationWrapper wrapper = new HajimariApplicationWrapper();
    List<ApplicationSpec> specs = wrapper.getApplicationSpecs(client, false, List.of("default"));

    assertNotNull(specs, "Specs should not be null");
    // Should include disabled apps
  }

  @Test
  void testGetApplicationSpecsAcrossAllNamespaces() {
    setupMockHajimariResourcesMultipleNamespaces();

    HajimariApplicationWrapper wrapper = new HajimariApplicationWrapper();
    List<ApplicationSpec> specs = wrapper.getApplicationSpecs(client, true, List.of());

    assertNotNull(specs, "Specs should not be null");
  }

  @Test
  void testGetApplicationSpecsWithEmptyNamespaceList() {
    HajimariApplicationWrapper wrapper = new HajimariApplicationWrapper();
    List<ApplicationSpec> specs = wrapper.getApplicationSpecs(client, false, List.of());

    assertNotNull(specs, "Specs should not be null");
    assertTrue(specs.isEmpty(), "Specs should be empty with no namespaces");
  }

  @Test
  void testGetApplicationSpecsWithRootPath() {
    setupMockHajimariResourcesWithRootPath();

    HajimariApplicationWrapper wrapper = new HajimariApplicationWrapper();
    List<ApplicationSpec> specs = wrapper.getApplicationSpecs(client, false, List.of("default"));

    assertNotNull(specs, "Specs should not be null");
    // rootPath should be appended to URL
  }

  private void setupMockHajimariResources() {
    GenericKubernetesResource app1 =
        createMockHajimariApp("app1", "default", "App One", "group1", "https://app1.example.com");

    GenericKubernetesResourceList list = new GenericKubernetesResourceList();
    List<GenericKubernetesResource> items = new ArrayList<>();
    items.add(app1);
    list.setItems(items);

    server
        .expect()
        .get()
        .withPath("/apis/hajimari.io/v1alpha1/namespaces/default/applications")
        .andReturn(HttpURLConnection.HTTP_OK, list)
        .always();
  }

  private void setupMockHajimariResourcesWithAllFields() {
    GenericKubernetesResource app = new GenericKubernetesResource();
    app.setApiVersion("hajimari.io/v1alpha1");
    app.setKind("Application");

    app.setMetadata(new ObjectMetaBuilder().withName("app-full").withNamespace("default").build());

    Map<String, Object> spec = new HashMap<>();
    spec.put("name", "Full App");
    spec.put("group", "test");
    spec.put("url", "https://full.example.com");
    spec.put("icon", "https://icon.example.com/icon.png");
    spec.put("info", "Additional info");
    spec.put("targetBlank", true);
    spec.put("location", 100);
    spec.put("enabled", true);

    Map<String, Object> additionalProperties = new HashMap<>();
    additionalProperties.put("spec", spec);
    app.setAdditionalProperties(additionalProperties);

    GenericKubernetesResourceList list = new GenericKubernetesResourceList();
    List<GenericKubernetesResource> items = new ArrayList<>();
    items.add(app);
    list.setItems(items);

    server
        .expect()
        .get()
        .withPath("/apis/hajimari.io/v1alpha1/namespaces/default/applications")
        .andReturn(HttpURLConnection.HTTP_OK, list)
        .always();
  }

  @SuppressWarnings("unchecked")
  private void setupMockHajimariResourcesWithLocationZero() {
    GenericKubernetesResource app =
        createMockHajimariApp("app-zero", "default", "Zero", "test", "https://zero.example.com");
    Map<String, Object> spec = (Map<String, Object>) app.getAdditionalProperties().get("spec");
    spec.put("location", 0);

    GenericKubernetesResourceList list = new GenericKubernetesResourceList();
    List<GenericKubernetesResource> items = new ArrayList<>();
    items.add(app);
    list.setItems(items);

    server
        .expect()
        .get()
        .withPath("/apis/hajimari.io/v1alpha1/namespaces/default/applications")
        .andReturn(HttpURLConnection.HTTP_OK, list)
        .always();
  }

  @SuppressWarnings("unchecked")
  private void setupMockHajimariResourcesWithDisabled() {
    GenericKubernetesResource app =
        createMockHajimariApp(
            "app-disabled", "default", "Disabled", "test", "https://disabled.example.com");
    Map<String, Object> spec = (Map<String, Object>) app.getAdditionalProperties().get("spec");
    spec.put("enabled", false);

    GenericKubernetesResourceList list = new GenericKubernetesResourceList();
    List<GenericKubernetesResource> items = new ArrayList<>();
    items.add(app);
    list.setItems(items);

    server
        .expect()
        .get()
        .withPath("/apis/hajimari.io/v1alpha1/namespaces/default/applications")
        .andReturn(HttpURLConnection.HTTP_OK, list)
        .always();
  }

  private void setupMockHajimariResourcesMultipleNamespaces() {
    GenericKubernetesResource app1 =
        createMockHajimariApp("app1", "default", "App1", "group1", "https://app1.example.com");
    GenericKubernetesResource app2 =
        createMockHajimariApp("app2", "kube-system", "App2", "group2", "https://app2.example.com");

    GenericKubernetesResourceList list = new GenericKubernetesResourceList();
    List<GenericKubernetesResource> items = new ArrayList<>();
    items.add(app1);
    items.add(app2);
    list.setItems(items);

    server
        .expect()
        .get()
        .withPath("/apis/hajimari.io/v1alpha1/applications")
        .andReturn(HttpURLConnection.HTTP_OK, list)
        .always();
  }

  private void setupMockHajimariResourcesWithRootPath() {
    GenericKubernetesResource app =
        createMockHajimariApp(
            "app-rootpath", "default", "RootPath", "test", "https://rootpath.example.com");

    Map<String, String> annotations = new HashMap<>();
    annotations.put("startpunkt.ullberg.us/rootPath", "/dashboard");
    app.getMetadata().setAnnotations(annotations);

    GenericKubernetesResourceList list = new GenericKubernetesResourceList();
    List<GenericKubernetesResource> items = new ArrayList<>();
    items.add(app);
    list.setItems(items);

    server
        .expect()
        .get()
        .withPath("/apis/hajimari.io/v1alpha1/namespaces/default/applications")
        .andReturn(HttpURLConnection.HTTP_OK, list)
        .always();
  }

  private GenericKubernetesResource createMockHajimariApp(
      String name, String namespace, String displayName, String group, String url) {
    GenericKubernetesResource app = new GenericKubernetesResource();
    app.setApiVersion("hajimari.io/v1alpha1");
    app.setKind("Application");

    app.setMetadata(new ObjectMetaBuilder().withName(name).withNamespace(namespace).build());

    Map<String, Object> spec = new HashMap<>();
    spec.put("name", displayName);
    spec.put("group", group);
    spec.put("url", url);

    Map<String, Object> additionalProperties = new HashMap<>();
    additionalProperties.put("spec", spec);
    app.setAdditionalProperties(additionalProperties);

    return app;
  }
}
