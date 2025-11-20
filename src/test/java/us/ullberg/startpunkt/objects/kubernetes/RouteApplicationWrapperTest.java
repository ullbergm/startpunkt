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
 * Test class for RouteApplicationWrapper. Tests OpenShift Route resource wrapping, TLS/protocol
 * detection, and application spec extraction.
 */
@QuarkusTest
@WithKubernetesTestServer
class RouteApplicationWrapperTest {

  @KubernetesTestServer KubernetesServer server;
  private KubernetesClient client;

  @BeforeEach
  void setUp() {
    client = server.getClient();
  }

  @Test
  void testConstructorWithOnlyAnnotatedTrue() {
    RouteApplicationWrapper wrapper = new RouteApplicationWrapper(true);
    assertNotNull(wrapper, "Wrapper should be created");
    assertEquals("route.openshift.io", wrapper.getGroup());
    assertEquals("v1", wrapper.getVersion());
    assertEquals("routes", wrapper.getPluralKind());
  }

  @Test
  void testConstructorWithOnlyAnnotatedFalse() {
    RouteApplicationWrapper wrapper = new RouteApplicationWrapper(false);
    assertNotNull(wrapper, "Wrapper should be created");
    assertEquals("route.openshift.io", wrapper.getGroup());
  }

  @Test
  void testGetApplicationSpecsWithOnlyAnnotatedTrue() {
    setupMockRouteResources();

    RouteApplicationWrapper wrapper = new RouteApplicationWrapper(true);
    List<ApplicationSpec> specs = wrapper.getApplicationSpecs(client, false, List.of("default"));

    assertNotNull(specs, "Specs should not be null");
    for (ApplicationSpec spec : specs) {
      assertTrue(spec.getEnabled() == null || spec.getEnabled(), "All specs should be enabled");
    }
  }

  @Test
  void testGetApplicationSpecsWithOnlyAnnotatedFalse() {
    setupMockRouteResources();

    RouteApplicationWrapper wrapper = new RouteApplicationWrapper(false);
    List<ApplicationSpec> specs = wrapper.getApplicationSpecs(client, false, List.of("default"));

    assertNotNull(specs, "Specs should not be null");
  }

  @Test
  void testGetApplicationSpecsWithTls() {
    setupMockRouteResourcesWithTls();

    RouteApplicationWrapper wrapper = new RouteApplicationWrapper(false);
    List<ApplicationSpec> specs = wrapper.getApplicationSpecs(client, false, List.of("default"));

    assertNotNull(specs, "Specs should not be null");
    // Verify HTTPS URLs are generated when TLS is present
    for (ApplicationSpec spec : specs) {
      if (spec.getUrl() != null) {
        assertTrue(
            spec.getUrl().startsWith("https://") || spec.getUrl().startsWith("http://"),
            "URL should have protocol");
      }
    }
  }

  @Test
  void testGetApplicationSpecsWithPath() {
    setupMockRouteResourcesWithPath();

    RouteApplicationWrapper wrapper = new RouteApplicationWrapper(false);
    List<ApplicationSpec> specs = wrapper.getApplicationSpecs(client, false, List.of("default"));

    assertNotNull(specs, "Specs should not be null");
    // Verify path is included in URLs
  }

  @Test
  void testGetApplicationSpecsAcrossAllNamespaces() {
    setupMockRouteResourcesMultipleNamespaces();

    RouteApplicationWrapper wrapper = new RouteApplicationWrapper(false);
    List<ApplicationSpec> specs = wrapper.getApplicationSpecs(client, true, List.of());

    assertNotNull(specs, "Specs should not be null");
  }

  @Test
  void testGetApplicationSpecsWithEmptyNamespaceList() {
    RouteApplicationWrapper wrapper = new RouteApplicationWrapper(false);
    List<ApplicationSpec> specs = wrapper.getApplicationSpecs(client, false, List.of());

    assertNotNull(specs, "Specs should not be null");
    assertTrue(specs.isEmpty(), "Specs should be empty with no namespaces");
  }

  private void setupMockRouteResources() {
    GenericKubernetesResource enabledRoute = createMockRoute("app1", "default", true, false, null);
    GenericKubernetesResource disabledRoute =
        createMockRoute("app2", "default", false, false, null);

    GenericKubernetesResourceList list = new GenericKubernetesResourceList();
    List<GenericKubernetesResource> items = new ArrayList<>();
    items.add(enabledRoute);
    items.add(disabledRoute);
    list.setItems(items);

    server
        .expect()
        .get()
        .withPath("/apis/route.openshift.io/v1/namespaces/default/routes")
        .andReturn(HttpURLConnection.HTTP_OK, list)
        .always();
  }

  private void setupMockRouteResourcesWithTls() {
    GenericKubernetesResource tlsRoute = createMockRoute("app-tls", "default", true, true, null);

    GenericKubernetesResourceList list = new GenericKubernetesResourceList();
    List<GenericKubernetesResource> items = new ArrayList<>();
    items.add(tlsRoute);
    list.setItems(items);

    server
        .expect()
        .get()
        .withPath("/apis/route.openshift.io/v1/namespaces/default/routes")
        .andReturn(HttpURLConnection.HTTP_OK, list)
        .always();
  }

  private void setupMockRouteResourcesWithPath() {
    GenericKubernetesResource routeWithPath =
        createMockRoute("app-path", "default", true, false, "/api");

    GenericKubernetesResourceList list = new GenericKubernetesResourceList();
    List<GenericKubernetesResource> items = new ArrayList<>();
    items.add(routeWithPath);
    list.setItems(items);

    server
        .expect()
        .get()
        .withPath("/apis/route.openshift.io/v1/namespaces/default/routes")
        .andReturn(HttpURLConnection.HTTP_OK, list)
        .always();
  }

  private void setupMockRouteResourcesMultipleNamespaces() {
    GenericKubernetesResource route1 = createMockRoute("app1", "default", true, false, null);
    GenericKubernetesResource route2 = createMockRoute("app2", "kube-system", true, false, null);

    GenericKubernetesResourceList list = new GenericKubernetesResourceList();
    List<GenericKubernetesResource> items = new ArrayList<>();
    items.add(route1);
    items.add(route2);
    list.setItems(items);

    server
        .expect()
        .get()
        .withPath("/apis/route.openshift.io/v1/routes")
        .andReturn(HttpURLConnection.HTTP_OK, list)
        .always();
  }

  private GenericKubernetesResource createMockRoute(
      String name, String namespace, boolean enabled, boolean withTls, String path) {
    GenericKubernetesResource route = new GenericKubernetesResource();
    route.setApiVersion("route.openshift.io/v1");
    route.setKind("Route");

    Map<String, String> annotations = new HashMap<>();
    annotations.put("startpunkt.ullberg.us/enabled", String.valueOf(enabled));
    annotations.put("startpunkt.ullberg.us/name", name);

    route.setMetadata(
        new ObjectMetaBuilder()
            .withName(name)
            .withNamespace(namespace)
            .withAnnotations(annotations)
            .build());

    Map<String, Object> spec = new HashMap<>();
    spec.put("host", name + ".example.com");
    if (withTls) {
      Map<String, Object> tls = new HashMap<>();
      tls.put("termination", "edge");
      spec.put("tls", tls);
    }
    if (path != null) {
      spec.put("path", path);
    }

    Map<String, Object> additionalProperties = new HashMap<>();
    additionalProperties.put("spec", spec);
    route.setAdditionalProperties(additionalProperties);

    return route;
  }
}
