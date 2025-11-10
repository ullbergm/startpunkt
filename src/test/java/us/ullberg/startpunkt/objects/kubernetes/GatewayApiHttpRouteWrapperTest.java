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
 * Test class for GatewayApiHttpRouteWrapper. Tests Gateway API HTTPRoute wrapping, protocol
 * detection, and application spec extraction.
 */
@QuarkusTest
@WithKubernetesTestServer
class GatewayApiHttpRouteWrapperTest {

  @KubernetesTestServer KubernetesServer server;
  private KubernetesClient client;

  @BeforeEach
  void setUp() {
    client = server.getClient();
  }

  @Test
  void testConstructorWithOnlyAnnotatedTrueAndHttpProtocol() {
    GatewayApiHttpRouteWrapper wrapper = new GatewayApiHttpRouteWrapper(true, "http");
    assertNotNull(wrapper, "Wrapper should be created");
    assertEquals("gateway.networking.k8s.io", wrapper.getGroup());
    assertEquals("v1", wrapper.getVersion());
    assertEquals("httproutes", wrapper.getPluralKind());
  }

  @Test
  void testConstructorWithOnlyAnnotatedFalseAndHttpsProtocol() {
    GatewayApiHttpRouteWrapper wrapper = new GatewayApiHttpRouteWrapper(false, "https");
    assertNotNull(wrapper, "Wrapper should be created");
    assertEquals("gateway.networking.k8s.io", wrapper.getGroup());
  }

  @Test
  void testGetApplicationSpecsWithOnlyAnnotatedTrue() {
    setupMockHttpRouteResources();

    GatewayApiHttpRouteWrapper wrapper = new GatewayApiHttpRouteWrapper(true, "http");
    List<ApplicationSpec> specs = wrapper.getApplicationSpecs(client, false, List.of("default"));

    assertNotNull(specs, "Specs should not be null");
    for (ApplicationSpec spec : specs) {
      assertTrue(spec.getEnabled() == null || spec.getEnabled(), "All specs should be enabled");
    }
  }

  @Test
  void testGetApplicationSpecsWithOnlyAnnotatedFalse() {
    setupMockHttpRouteResources();

    GatewayApiHttpRouteWrapper wrapper = new GatewayApiHttpRouteWrapper(false, "http");
    List<ApplicationSpec> specs = wrapper.getApplicationSpecs(client, false, List.of("default"));

    assertNotNull(specs, "Specs should not be null");
  }

  @Test
  void testGetApplicationSpecsWithHttpsProtocol() {
    setupMockHttpRouteResourcesWithProtocol("https");

    GatewayApiHttpRouteWrapper wrapper = new GatewayApiHttpRouteWrapper(false, "https");
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
  void testGetApplicationSpecsWithMultipleHostnames() {
    setupMockHttpRouteResourcesWithMultipleHostnames();

    GatewayApiHttpRouteWrapper wrapper = new GatewayApiHttpRouteWrapper(false, "http");
    List<ApplicationSpec> specs = wrapper.getApplicationSpecs(client, false, List.of("default"));

    assertNotNull(specs, "Specs should not be null");
    // Should use first hostname
  }

  @Test
  void testGetApplicationSpecsWithNoHostnames() {
    setupMockHttpRouteResourcesWithNoHostnames();

    GatewayApiHttpRouteWrapper wrapper = new GatewayApiHttpRouteWrapper(false, "http");
    List<ApplicationSpec> specs = wrapper.getApplicationSpecs(client, false, List.of("default"));

    assertNotNull(specs, "Specs should not be null");
    // Should default to localhost
  }

  @Test
  void testGetApplicationSpecsAcrossAllNamespaces() {
    setupMockHttpRouteResourcesMultipleNamespaces();

    GatewayApiHttpRouteWrapper wrapper = new GatewayApiHttpRouteWrapper(false, "http");
    List<ApplicationSpec> specs = wrapper.getApplicationSpecs(client, true, List.of());

    assertNotNull(specs, "Specs should not be null");
  }

  @Test
  void testGetApplicationSpecsWithEmptyNamespaceList() {
    GatewayApiHttpRouteWrapper wrapper = new GatewayApiHttpRouteWrapper(false, "http");
    List<ApplicationSpec> specs = wrapper.getApplicationSpecs(client, false, List.of());

    assertNotNull(specs, "Specs should not be null");
    assertTrue(specs.isEmpty(), "Specs should be empty with no namespaces");
  }

  private void setupMockHttpRouteResources() {
    GenericKubernetesResource enabledRoute = createMockHttpRoute("app1", "default", true, null);
    GenericKubernetesResource disabledRoute = createMockHttpRoute("app2", "default", false, null);

    GenericKubernetesResourceList list = new GenericKubernetesResourceList();
    List<GenericKubernetesResource> items = new ArrayList<>();
    items.add(enabledRoute);
    items.add(disabledRoute);
    list.setItems(items);

    server
        .expect()
        .get()
        .withPath("/apis/gateway.networking.k8s.io/v1/namespaces/default/httproutes")
        .andReturn(HttpURLConnection.HTTP_OK, list)
        .always();
  }

  private void setupMockHttpRouteResourcesWithProtocol(String protocol) {
    GenericKubernetesResource route =
        createMockHttpRoute("app-protocol", "default", true, protocol);

    GenericKubernetesResourceList list = new GenericKubernetesResourceList();
    List<GenericKubernetesResource> items = new ArrayList<>();
    items.add(route);
    list.setItems(items);

    server
        .expect()
        .get()
        .withPath("/apis/gateway.networking.k8s.io/v1/namespaces/default/httproutes")
        .andReturn(HttpURLConnection.HTTP_OK, list)
        .always();
  }

  private void setupMockHttpRouteResourcesWithMultipleHostnames() {
    GenericKubernetesResource route = createMockHttpRoute("app-multi", "default", true, null);
    Map<String, Object> spec = (Map<String, Object>) route.getAdditionalProperties().get("spec");
    List<String> hostnames = new ArrayList<>();
    hostnames.add("first.example.com");
    hostnames.add("second.example.com");
    spec.put("hostnames", hostnames);

    GenericKubernetesResourceList list = new GenericKubernetesResourceList();
    List<GenericKubernetesResource> items = new ArrayList<>();
    items.add(route);
    list.setItems(items);

    server
        .expect()
        .get()
        .withPath("/apis/gateway.networking.k8s.io/v1/namespaces/default/httproutes")
        .andReturn(HttpURLConnection.HTTP_OK, list)
        .always();
  }

  private void setupMockHttpRouteResourcesWithNoHostnames() {
    GenericKubernetesResource route = createMockHttpRoute("app-nohost", "default", true, null);
    Map<String, Object> spec = (Map<String, Object>) route.getAdditionalProperties().get("spec");
    spec.put("hostnames", new ArrayList<>());

    GenericKubernetesResourceList list = new GenericKubernetesResourceList();
    List<GenericKubernetesResource> items = new ArrayList<>();
    items.add(route);
    list.setItems(items);

    server
        .expect()
        .get()
        .withPath("/apis/gateway.networking.k8s.io/v1/namespaces/default/httproutes")
        .andReturn(HttpURLConnection.HTTP_OK, list)
        .always();
  }

  private void setupMockHttpRouteResourcesMultipleNamespaces() {
    GenericKubernetesResource route1 = createMockHttpRoute("app1", "default", true, null);
    GenericKubernetesResource route2 = createMockHttpRoute("app2", "kube-system", true, null);

    GenericKubernetesResourceList list = new GenericKubernetesResourceList();
    List<GenericKubernetesResource> items = new ArrayList<>();
    items.add(route1);
    items.add(route2);
    list.setItems(items);

    server
        .expect()
        .get()
        .withPath("/apis/gateway.networking.k8s.io/v1/httproutes")
        .andReturn(HttpURLConnection.HTTP_OK, list)
        .always();
  }

  private GenericKubernetesResource createMockHttpRoute(
      String name, String namespace, boolean enabled, String protocol) {
    GenericKubernetesResource route = new GenericKubernetesResource();
    route.setApiVersion("gateway.networking.k8s.io/v1");
    route.setKind("HTTPRoute");

    Map<String, String> annotations = new HashMap<>();
    annotations.put("startpunkt.ullberg.us/enabled", String.valueOf(enabled));
    annotations.put("startpunkt.ullberg.us/name", name);
    if (protocol != null) {
      annotations.put("startpunkt.ullberg.us/protocol", protocol);
    }

    route.setMetadata(
        new ObjectMetaBuilder()
            .withName(name)
            .withNamespace(namespace)
            .withAnnotations(annotations)
            .build());

    Map<String, Object> spec = new HashMap<>();
    List<String> hostnames = new ArrayList<>();
    hostnames.add(name + ".example.com");
    spec.put("hostnames", hostnames);

    Map<String, Object> additionalProperties = new HashMap<>();
    additionalProperties.put("spec", spec);
    route.setAdditionalProperties(additionalProperties);

    return route;
  }
}
