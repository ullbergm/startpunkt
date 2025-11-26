package us.ullberg.startpunkt.objects.kubernetes;

import static org.junit.jupiter.api.Assertions.*;

import io.fabric8.kubernetes.api.model.GenericKubernetesResource;
import io.fabric8.kubernetes.api.model.GenericKubernetesResourceList;
import io.fabric8.kubernetes.api.model.ObjectMetaBuilder;
import io.fabric8.kubernetes.client.KubernetesClient;
import io.fabric8.kubernetes.client.server.mock.KubernetesMockServer;
import java.net.HttpURLConnection;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import us.ullberg.startpunkt.crd.v1alpha4.ApplicationSpec;

/**
 * Test class for IngressApplicationWrapper ingress class filtering. Tests filtering by
 * ingressClassName with exact match support.
 *
 * <p>Each test creates its own mock server to ensure complete isolation.
 */
class IngressApplicationWrapperIngressClassTest {

  private KubernetesMockServer server;
  private KubernetesClient client;

  @BeforeEach
  void setUp() {
    server = new KubernetesMockServer(false);
    server.start();
    client = server.createClient();
  }

  @AfterEach
  void tearDown() {
    if (client != null) {
      client.close();
    }
    if (server != null) {
      server.shutdown();
    }
  }

  @Test
  void testNoFilterReturnsAllIngresses() {
    setupMockIngressResourcesWithClasses();

    // No filter configured (empty list)
    IngressApplicationWrapper wrapper = new IngressApplicationWrapper(false, List.of(), true);
    List<ApplicationSpec> specs = wrapper.getApplicationSpecs(client, false, List.of("default"));

    assertNotNull(specs, "Specs should not be null");
    assertEquals(4, specs.size(), "Should get all four ingresses when no filter is configured");
  }

  @Test
  void testSingleClassFilterReturnsOnlyMatchingIngresses() {
    setupMockIngressResourcesWithClasses();

    // Filter for nginx-internal only
    IngressApplicationWrapper wrapper =
        new IngressApplicationWrapper(false, List.of("nginx-internal"), true);
    List<ApplicationSpec> specs = wrapper.getApplicationSpecs(client, false, List.of("default"));

    assertNotNull(specs, "Specs should not be null");
    // Should get nginx-internal ingress + unclassified (since includeUnclassified=true)
    assertEquals(2, specs.size(), "Should get nginx-internal ingress and unclassified ingress");
  }

  @Test
  void testMultipleClassFiltersReturnsMatchingIngresses() {
    setupMockIngressResourcesWithClasses();

    // Filter for nginx-internal and nginx-external
    IngressApplicationWrapper wrapper =
        new IngressApplicationWrapper(false, List.of("nginx-internal", "nginx-external"), true);
    List<ApplicationSpec> specs = wrapper.getApplicationSpecs(client, false, List.of("default"));

    assertNotNull(specs, "Specs should not be null");
    // Should get nginx-internal, nginx-external, and unclassified (includeUnclassified=true)
    assertEquals(
        3, specs.size(), "Should get nginx-internal, nginx-external, and unclassified ingresses");
  }

  @Test
  void testIncludeUnclassifiedTrueIncludesIngressesWithoutClass() {
    setupMockIngressResourcesWithClasses();

    // Filter for traefik with includeUnclassified=true
    IngressApplicationWrapper wrapper =
        new IngressApplicationWrapper(false, List.of("traefik"), true);
    List<ApplicationSpec> specs = wrapper.getApplicationSpecs(client, false, List.of("default"));

    assertNotNull(specs, "Specs should not be null");
    // Should get traefik ingress + unclassified ingress
    assertEquals(2, specs.size(), "Should get traefik ingress and unclassified ingress");
  }

  @Test
  void testIncludeUnclassifiedFalseExcludesIngressesWithoutClass() {
    setupMockIngressResourcesWithClasses();

    // Filter for traefik with includeUnclassified=false
    IngressApplicationWrapper wrapper =
        new IngressApplicationWrapper(false, List.of("traefik"), false);
    List<ApplicationSpec> specs = wrapper.getApplicationSpecs(client, false, List.of("default"));

    assertNotNull(specs, "Specs should not be null");
    // Should get only traefik ingress
    assertEquals(1, specs.size(), "Should get only traefik ingress");
  }

  @Test
  void testFilterWithIncludeUnclassifiedFalseAndMultipleClasses() {
    setupMockIngressResourcesWithClasses();

    // Filter for nginx-internal and nginx-external with includeUnclassified=false
    IngressApplicationWrapper wrapper =
        new IngressApplicationWrapper(false, List.of("nginx-internal", "nginx-external"), false);
    List<ApplicationSpec> specs = wrapper.getApplicationSpecs(client, false, List.of("default"));

    assertNotNull(specs, "Specs should not be null");
    // Should get nginx-internal and nginx-external only
    assertEquals(2, specs.size(), "Should get only nginx-internal and nginx-external ingresses");
  }

  @Test
  void testFilterWithNonExistentClassReturnsEmpty() {
    setupMockIngressResourcesWithClasses();

    // Filter for non-existent class with includeUnclassified=false
    IngressApplicationWrapper wrapper =
        new IngressApplicationWrapper(false, List.of("non-existent"), false);
    List<ApplicationSpec> specs = wrapper.getApplicationSpecs(client, false, List.of("default"));

    assertNotNull(specs, "Specs should not be null");
    assertEquals(0, specs.size(), "Should get no ingresses for non-existent class");
  }

  @Test
  void testFilterWithNonExistentClassIncludesUnclassified() {
    setupMockIngressResourcesWithClasses();

    // Filter for non-existent class with includeUnclassified=true
    IngressApplicationWrapper wrapper =
        new IngressApplicationWrapper(false, List.of("non-existent"), true);
    List<ApplicationSpec> specs = wrapper.getApplicationSpecs(client, false, List.of("default"));

    assertNotNull(specs, "Specs should not be null");
    assertEquals(1, specs.size(), "Should get only unclassified ingress");
  }

  @Test
  void testClassFilterWithIncludeUnclassifiedFalseReturnsOnlyMatchingClass() {
    setupMockIngressResourcesWithClasses();

    // Filter for nginx-internal with includeUnclassified=false
    // From shared data: app1=nginx-internal, app2=nginx-external, app3=traefik, app4=unclassified
    // Note: First param (onlyAnnotated) is false so all matching class resources are returned
    IngressApplicationWrapper wrapper =
        new IngressApplicationWrapper(false, List.of("nginx-internal"), false);
    List<ApplicationSpec> specs = wrapper.getApplicationSpecs(client, false, List.of("default"));

    assertNotNull(specs, "Specs should not be null");
    // Only app1 (nginx-internal) should match:
    // - app1: nginx-internal class ✓
    // - app2: nginx-external class ✗ (wrong class)
    // - app3: traefik class ✗ (wrong class)
    // - app4: no class ✗ (includeUnclassified=false)
    assertEquals(1, specs.size(), "Should get only the nginx-internal ingress");
  }

  @Test
  void testOnlyAnnotatedWithClassFilterReturnsOnlyEnabledMatchingClass() {
    // Create ingresses with both class and enable annotations
    GenericKubernetesResource nginxEnabled =
        createMockIngressWithClassAndEnabled("nginx-enabled", "default", "nginx-internal", true);
    GenericKubernetesResource nginxDisabled =
        createMockIngressWithClassAndEnabled("nginx-disabled", "default", "nginx-internal", false);
    GenericKubernetesResource externalEnabled =
        createMockIngressWithClassAndEnabled("external-enabled", "default", "nginx-external", true);

    GenericKubernetesResourceList list = new GenericKubernetesResourceList();
    List<GenericKubernetesResource> items = new ArrayList<>();
    items.add(nginxEnabled);
    items.add(nginxDisabled);
    items.add(externalEnabled);
    list.setItems(items);

    server
        .expect()
        .get()
        .withPath("/apis/networking.k8s.io/v1/namespaces/default/ingresses")
        .andReturn(HttpURLConnection.HTTP_OK, list)
        .always();

    // Filter for nginx-internal with onlyAnnotated=true
    IngressApplicationWrapper wrapper =
        new IngressApplicationWrapper(true, List.of("nginx-internal"), false);
    List<ApplicationSpec> specs = wrapper.getApplicationSpecs(client, false, List.of("default"));

    assertNotNull(specs, "Specs should not be null");
    // Only nginx-enabled should match:
    // - nginx-enabled: nginx-internal class ✓, enabled=true ✓
    // - nginx-disabled: nginx-internal class ✓, enabled=false ✗
    // - external-enabled: nginx-external class ✗
    assertEquals(1, specs.size(), "Should get only the enabled nginx-internal ingress");
    assertTrue(
        Boolean.TRUE.equals(specs.get(0).getEnabled()),
        "Returned ingress should be explicitly enabled");
  }

  @Test
  void testExactMatchDoesNotMatchPartialNames() {
    setupMockIngressResourcesWithClasses();

    // Filter for "nginx" should NOT match "nginx-internal" or "nginx-external"
    IngressApplicationWrapper wrapper =
        new IngressApplicationWrapper(false, List.of("nginx"), false);
    List<ApplicationSpec> specs = wrapper.getApplicationSpecs(client, false, List.of("default"));

    assertNotNull(specs, "Specs should not be null");
    assertEquals(0, specs.size(), "Exact match should not match partial names");
  }

  @Test
  void testCaseSensitiveMatching() {
    setupMockIngressResourcesWithClasses();

    // Filter for "NGINX-INTERNAL" should NOT match "nginx-internal"
    IngressApplicationWrapper wrapper =
        new IngressApplicationWrapper(false, List.of("NGINX-INTERNAL"), false);
    List<ApplicationSpec> specs = wrapper.getApplicationSpecs(client, false, List.of("default"));

    assertNotNull(specs, "Specs should not be null");
    assertEquals(0, specs.size(), "Class name matching should be case-sensitive");
  }

  @Test
  void testDefaultConstructorBehavior() {
    setupMockIngressResourcesWithClasses();

    // Using the simple constructor (should have no class filter)
    IngressApplicationWrapper wrapper = new IngressApplicationWrapper(false);
    List<ApplicationSpec> specs = wrapper.getApplicationSpecs(client, false, List.of("default"));

    assertNotNull(specs, "Specs should not be null");
    assertEquals(4, specs.size(), "Default constructor should not filter by class");
  }

  @Test
  void testNullIngressClassNamesHandledGracefully() {
    setupMockIngressResourcesWithClasses();

    // Pass null for ingressClassNames
    IngressApplicationWrapper wrapper = new IngressApplicationWrapper(false, null, true);
    List<ApplicationSpec> specs = wrapper.getApplicationSpecs(client, false, List.of("default"));

    assertNotNull(specs, "Specs should not be null");
    assertEquals(4, specs.size(), "Null ingressClassNames should be treated as no filter");
  }

  private void setupMockIngressResourcesWithClasses() {
    // Create ingress with nginx-internal class
    GenericKubernetesResource nginxInternal =
        createMockIngressWithClass("app1", "default", "nginx-internal");

    // Create ingress with nginx-external class
    GenericKubernetesResource nginxExternal =
        createMockIngressWithClass("app2", "default", "nginx-external");

    // Create ingress with traefik class
    GenericKubernetesResource traefik = createMockIngressWithClass("app3", "default", "traefik");

    // Create ingress without class (unclassified)
    GenericKubernetesResource unclassified = createMockIngressWithoutClass("app4", "default");

    GenericKubernetesResourceList list = new GenericKubernetesResourceList();
    List<GenericKubernetesResource> items = new ArrayList<>();
    items.add(nginxInternal);
    items.add(nginxExternal);
    items.add(traefik);
    items.add(unclassified);
    list.setItems(items);

    server
        .expect()
        .get()
        .withPath("/apis/networking.k8s.io/v1/namespaces/default/ingresses")
        .andReturn(HttpURLConnection.HTTP_OK, list)
        .always();
  }

  private GenericKubernetesResource createMockIngressWithClass(
      String name, String namespace, String ingressClassName) {
    GenericKubernetesResource ingress = new GenericKubernetesResource();
    ingress.setApiVersion("networking.k8s.io/v1");
    ingress.setKind("Ingress");

    ingress.setMetadata(new ObjectMetaBuilder().withName(name).withNamespace(namespace).build());

    // Add spec with ingressClassName and rules
    Map<String, Object> spec = new HashMap<>();
    spec.put("ingressClassName", ingressClassName);
    List<Map<String, Object>> rules = new ArrayList<>();
    Map<String, Object> rule = new HashMap<>();
    rule.put("host", name + ".example.com");
    rules.add(rule);
    spec.put("rules", rules);

    Map<String, Object> additionalProperties = new HashMap<>();
    additionalProperties.put("spec", spec);
    ingress.setAdditionalProperties(additionalProperties);

    return ingress;
  }

  private GenericKubernetesResource createMockIngressWithoutClass(String name, String namespace) {
    GenericKubernetesResource ingress = new GenericKubernetesResource();
    ingress.setApiVersion("networking.k8s.io/v1");
    ingress.setKind("Ingress");

    ingress.setMetadata(new ObjectMetaBuilder().withName(name).withNamespace(namespace).build());

    // Add spec without ingressClassName
    Map<String, Object> spec = new HashMap<>();
    List<Map<String, Object>> rules = new ArrayList<>();
    Map<String, Object> rule = new HashMap<>();
    rule.put("host", name + ".example.com");
    rules.add(rule);
    spec.put("rules", rules);

    Map<String, Object> additionalProperties = new HashMap<>();
    additionalProperties.put("spec", spec);
    ingress.setAdditionalProperties(additionalProperties);

    return ingress;
  }

  private GenericKubernetesResource createMockIngressWithClassAndEnabled(
      String name, String namespace, String ingressClassName, boolean enabled) {
    GenericKubernetesResource ingress = new GenericKubernetesResource();
    ingress.setApiVersion("networking.k8s.io/v1");
    ingress.setKind("Ingress");

    Map<String, String> annotations = new HashMap<>();
    annotations.put("startpunkt.ullberg.us/enable", String.valueOf(enabled));

    ingress.setMetadata(
        new ObjectMetaBuilder()
            .withName(name)
            .withNamespace(namespace)
            .withAnnotations(annotations)
            .build());

    // Add spec with ingressClassName and rules
    Map<String, Object> spec = new HashMap<>();
    spec.put("ingressClassName", ingressClassName);
    List<Map<String, Object>> rules = new ArrayList<>();
    Map<String, Object> rule = new HashMap<>();
    rule.put("host", name + ".example.com");
    rules.add(rule);
    spec.put("rules", rules);

    Map<String, Object> additionalProperties = new HashMap<>();
    additionalProperties.put("spec", spec);
    ingress.setAdditionalProperties(additionalProperties);

    return ingress;
  }
}
