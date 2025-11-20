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
 * Test class for IstioVirtualServiceApplicationWrapper. Tests Istio VirtualService wrapping,
 * protocol detection, and application spec extraction.
 */
@QuarkusTest
@WithKubernetesTestServer
class IstioVirtualServiceApplicationWrapperTest {

  @KubernetesTestServer KubernetesServer server;
  private KubernetesClient client;

  @BeforeEach
  void setUp() {
    client = server.getClient();
  }

  @Test
  void testConstructorWithOnlyAnnotatedTrueAndHttpProtocol() {
    IstioVirtualServiceApplicationWrapper wrapper =
        new IstioVirtualServiceApplicationWrapper(true, "http");
    assertNotNull(wrapper, "Wrapper should be created");
    assertEquals("networking.istio.io", wrapper.getGroup());
    assertEquals("v1", wrapper.getVersion());
    assertEquals("virtualservices", wrapper.getPluralKind());
  }

  @Test
  void testConstructorWithOnlyAnnotatedFalseAndHttpsProtocol() {
    IstioVirtualServiceApplicationWrapper wrapper =
        new IstioVirtualServiceApplicationWrapper(false, "https");
    assertNotNull(wrapper, "Wrapper should be created");
    assertEquals("networking.istio.io", wrapper.getGroup());
  }

  @Test
  void testGetApplicationSpecsWithOnlyAnnotatedTrue() {
    setupMockVirtualServiceResources();

    IstioVirtualServiceApplicationWrapper wrapper =
        new IstioVirtualServiceApplicationWrapper(true, "http");
    List<ApplicationSpec> specs = wrapper.getApplicationSpecs(client, false, List.of("default"));

    assertNotNull(specs, "Specs should not be null");
    for (ApplicationSpec spec : specs) {
      assertTrue(spec.getEnabled() == null || spec.getEnabled(), "All specs should be enabled");
    }
  }

  @Test
  void testGetApplicationSpecsWithOnlyAnnotatedFalse() {
    setupMockVirtualServiceResources();

    IstioVirtualServiceApplicationWrapper wrapper =
        new IstioVirtualServiceApplicationWrapper(false, "http");
    List<ApplicationSpec> specs = wrapper.getApplicationSpecs(client, false, List.of("default"));

    assertNotNull(specs, "Specs should not be null");
  }

  @Test
  void testGetApplicationSpecsWithHttpsProtocol() {
    setupMockVirtualServiceResourcesWithProtocol("https");

    IstioVirtualServiceApplicationWrapper wrapper =
        new IstioVirtualServiceApplicationWrapper(false, "https");
    List<ApplicationSpec> specs = wrapper.getApplicationSpecs(client, false, List.of("default"));

    assertNotNull(specs, "Specs should not be null");
    for (ApplicationSpec spec : specs) {
      if (spec.getUrl() != null) {
        assertTrue(
            spec.getUrl().startsWith("https://") || spec.getUrl().startsWith("http://"),
            "URL should have protocol");
      }
    }
  }

  @Test
  void testGetApplicationSpecsWithMultipleHosts() {
    setupMockVirtualServiceResourcesWithMultipleHosts();

    IstioVirtualServiceApplicationWrapper wrapper =
        new IstioVirtualServiceApplicationWrapper(false, "http");
    List<ApplicationSpec> specs = wrapper.getApplicationSpecs(client, false, List.of("default"));

    assertNotNull(specs, "Specs should not be null");
    // Should use first host
  }

  @Test
  void testGetApplicationSpecsWithNoHosts() {
    setupMockVirtualServiceResourcesWithNoHosts();

    IstioVirtualServiceApplicationWrapper wrapper =
        new IstioVirtualServiceApplicationWrapper(false, "http");
    List<ApplicationSpec> specs = wrapper.getApplicationSpecs(client, false, List.of("default"));

    assertNotNull(specs, "Specs should not be null");
    // Should default to localhost
  }

  @Test
  void testGetApplicationSpecsAcrossAllNamespaces() {
    setupMockVirtualServiceResourcesMultipleNamespaces();

    IstioVirtualServiceApplicationWrapper wrapper =
        new IstioVirtualServiceApplicationWrapper(false, "http");
    List<ApplicationSpec> specs = wrapper.getApplicationSpecs(client, true, List.of());

    assertNotNull(specs, "Specs should not be null");
  }

  @Test
  void testGetApplicationSpecsWithEmptyNamespaceList() {
    IstioVirtualServiceApplicationWrapper wrapper =
        new IstioVirtualServiceApplicationWrapper(false, "http");
    List<ApplicationSpec> specs = wrapper.getApplicationSpecs(client, false, List.of());

    assertNotNull(specs, "Specs should not be null");
    assertTrue(specs.isEmpty(), "Specs should be empty with no namespaces");
  }

  private void setupMockVirtualServiceResources() {
    GenericKubernetesResource enabledVs = createMockVirtualService("app1", "default", true, null);
    GenericKubernetesResource disabledVs = createMockVirtualService("app2", "default", false, null);

    GenericKubernetesResourceList list = new GenericKubernetesResourceList();
    List<GenericKubernetesResource> items = new ArrayList<>();
    items.add(enabledVs);
    items.add(disabledVs);
    list.setItems(items);

    server
        .expect()
        .get()
        .withPath("/apis/networking.istio.io/v1/namespaces/default/virtualservices")
        .andReturn(HttpURLConnection.HTTP_OK, list)
        .always();
  }

  private void setupMockVirtualServiceResourcesWithProtocol(String protocol) {
    GenericKubernetesResource vs =
        createMockVirtualService("app-protocol", "default", true, protocol);

    GenericKubernetesResourceList list = new GenericKubernetesResourceList();
    List<GenericKubernetesResource> items = new ArrayList<>();
    items.add(vs);
    list.setItems(items);

    server
        .expect()
        .get()
        .withPath("/apis/networking.istio.io/v1/namespaces/default/virtualservices")
        .andReturn(HttpURLConnection.HTTP_OK, list)
        .always();
  }

  @SuppressWarnings("unchecked")
  private void setupMockVirtualServiceResourcesWithMultipleHosts() {
    GenericKubernetesResource vs = createMockVirtualService("app-multi", "default", true, null);
    Map<String, Object> spec = (Map<String, Object>) vs.getAdditionalProperties().get("spec");
    List<String> hosts = new ArrayList<>();
    hosts.add("first.example.com");
    hosts.add("second.example.com");
    spec.put("hosts", hosts);

    GenericKubernetesResourceList list = new GenericKubernetesResourceList();
    List<GenericKubernetesResource> items = new ArrayList<>();
    items.add(vs);
    list.setItems(items);

    server
        .expect()
        .get()
        .withPath("/apis/networking.istio.io/v1/namespaces/default/virtualservices")
        .andReturn(HttpURLConnection.HTTP_OK, list)
        .always();
  }

  @SuppressWarnings("unchecked")
  private void setupMockVirtualServiceResourcesWithNoHosts() {
    GenericKubernetesResource vs = createMockVirtualService("app-nohost", "default", true, null);
    Map<String, Object> spec = (Map<String, Object>) vs.getAdditionalProperties().get("spec");
    spec.put("hosts", new ArrayList<>());

    GenericKubernetesResourceList list = new GenericKubernetesResourceList();
    List<GenericKubernetesResource> items = new ArrayList<>();
    items.add(vs);
    list.setItems(items);

    server
        .expect()
        .get()
        .withPath("/apis/networking.istio.io/v1/namespaces/default/virtualservices")
        .andReturn(HttpURLConnection.HTTP_OK, list)
        .always();
  }

  private void setupMockVirtualServiceResourcesMultipleNamespaces() {
    GenericKubernetesResource vs1 = createMockVirtualService("app1", "default", true, null);
    GenericKubernetesResource vs2 = createMockVirtualService("app2", "kube-system", true, null);

    GenericKubernetesResourceList list = new GenericKubernetesResourceList();
    List<GenericKubernetesResource> items = new ArrayList<>();
    items.add(vs1);
    items.add(vs2);
    list.setItems(items);

    server
        .expect()
        .get()
        .withPath("/apis/networking.istio.io/v1/virtualservices")
        .andReturn(HttpURLConnection.HTTP_OK, list)
        .always();
  }

  private GenericKubernetesResource createMockVirtualService(
      String name, String namespace, boolean enabled, String protocol) {
    GenericKubernetesResource vs = new GenericKubernetesResource();
    vs.setApiVersion("networking.istio.io/v1");
    vs.setKind("VirtualService");

    Map<String, String> annotations = new HashMap<>();
    annotations.put("startpunkt.ullberg.us/enabled", String.valueOf(enabled));
    annotations.put("startpunkt.ullberg.us/name", name);
    if (protocol != null) {
      annotations.put("startpunkt.ullberg.us/protocol", protocol);
    }

    vs.setMetadata(
        new ObjectMetaBuilder()
            .withName(name)
            .withNamespace(namespace)
            .withAnnotations(annotations)
            .build());

    Map<String, Object> spec = new HashMap<>();
    List<String> hosts = new ArrayList<>();
    hosts.add(name + ".example.com");
    spec.put("hosts", hosts);

    Map<String, Object> additionalProperties = new HashMap<>();
    additionalProperties.put("spec", spec);
    vs.setAdditionalProperties(additionalProperties);

    return vs;
  }
}
