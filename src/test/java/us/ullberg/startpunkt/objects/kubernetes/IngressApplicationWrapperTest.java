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
 * Test class for IngressApplicationWrapper. Tests Kubernetes Ingress resource wrapping, annotation
 * processing, and application spec extraction.
 */
@QuarkusTest
@WithKubernetesTestServer
class IngressApplicationWrapperTest {

  @KubernetesTestServer KubernetesServer server;
  private KubernetesClient client;

  @BeforeEach
  void setUp() {
    client = server.getClient();
  }

  @Test
  void testConstructorWithOnlyAnnotatedTrue() {
    IngressApplicationWrapper wrapper = new IngressApplicationWrapper(true);
    assertNotNull(wrapper, "Wrapper should be created");
    assertEquals("networking.k8s.io", wrapper.getGroup());
    assertEquals("v1", wrapper.getVersion());
    assertEquals("ingresses", wrapper.getPluralKind());
  }

  @Test
  void testConstructorWithOnlyAnnotatedFalse() {
    IngressApplicationWrapper wrapper = new IngressApplicationWrapper(false);
    assertNotNull(wrapper, "Wrapper should be created");
    assertEquals("networking.k8s.io", wrapper.getGroup());
  }

  @Test
  void testGetApplicationSpecsWithOnlyAnnotatedTrue() {
    // Set up mock server with ingresses
    setupMockIngressResources();

    IngressApplicationWrapper wrapper = new IngressApplicationWrapper(true);
    List<ApplicationSpec> specs = wrapper.getApplicationSpecs(client, false, List.of("default"));

    // With onlyAnnotated=true, should only get applications with explicit enable=true annotation
    assertNotNull(specs, "Specs should not be null");
    assertEquals(1, specs.size(), "Should only get one enabled application");
    // Verify all returned specs have enabled=true
    for (ApplicationSpec spec : specs) {
      assertTrue(
          Boolean.TRUE.equals(spec.getEnabled()),
          "All specs should be explicitly enabled when onlyAnnotated=true");
    }
  }

  @Test
  void testGetApplicationSpecsWithOnlyAnnotatedFalse() {
    // Set up mock server with ingresses
    setupMockIngressResources();

    IngressApplicationWrapper wrapper = new IngressApplicationWrapper(false);
    List<ApplicationSpec> specs = wrapper.getApplicationSpecs(client, false, List.of("default"));

    // With onlyAnnotated=false, should get all applications (enabled, disabled, and unannotated)
    assertNotNull(specs, "Specs should not be null");
    assertEquals(
        3,
        specs.size(),
        "Should get all three applications: enabled, disabled, and without annotation");
  }

  @Test
  void testGetApplicationSpecsAcrossAllNamespaces() {
    // Set up mock server with ingresses in multiple namespaces
    setupMockIngressResourcesMultipleNamespaces();

    IngressApplicationWrapper wrapper = new IngressApplicationWrapper(false);
    List<ApplicationSpec> specs = wrapper.getApplicationSpecs(client, true, List.of());

    assertNotNull(specs, "Specs should not be null");
    // Specs from multiple namespaces should be included
  }

  @Test
  void testGetApplicationSpecsWithEmptyNamespaceList() {
    IngressApplicationWrapper wrapper = new IngressApplicationWrapper(false);
    List<ApplicationSpec> specs = wrapper.getApplicationSpecs(client, false, List.of());

    assertNotNull(specs, "Specs should not be null");
    assertTrue(specs.isEmpty(), "Specs should be empty with no namespaces");
  }

  @Test
  void testGetApplicationSpecsWithNonExistentNamespace() {
    setupMockIngressResources();

    IngressApplicationWrapper wrapper = new IngressApplicationWrapper(false);
    List<ApplicationSpec> specs =
        wrapper.getApplicationSpecs(client, false, List.of("non-existent-namespace"));

    assertNotNull(specs, "Specs should not be null");
  }

  private void setupMockIngressResources() {
    // Create enabled ingress (with annotation enable=true)
    GenericKubernetesResource enabledIngress = createMockIngress("app1", "default", true);

    // Create disabled ingress (with annotation enable=false)
    GenericKubernetesResource disabledIngress = createMockIngress("app2", "default", false);

    // Create unannotated ingress (without the enable annotation)
    GenericKubernetesResource unannotatedIngress =
        createMockIngressWithoutAnnotation("app3", "default");

    GenericKubernetesResourceList list = new GenericKubernetesResourceList();
    List<GenericKubernetesResource> items = new ArrayList<>();
    items.add(enabledIngress);
    items.add(disabledIngress);
    items.add(unannotatedIngress);
    list.setItems(items);

    server
        .expect()
        .get()
        .withPath("/apis/networking.k8s.io/v1/namespaces/default/ingresses")
        .andReturn(HttpURLConnection.HTTP_OK, list)
        .always();
  }

  private void setupMockIngressResourcesMultipleNamespaces() {
    // Create ingresses in different namespaces
    GenericKubernetesResource ingress1 = createMockIngress("app1", "default", true);
    GenericKubernetesResource ingress2 = createMockIngress("app2", "kube-system", true);

    GenericKubernetesResourceList list = new GenericKubernetesResourceList();
    List<GenericKubernetesResource> items = new ArrayList<>();
    items.add(ingress1);
    items.add(ingress2);
    list.setItems(items);

    server
        .expect()
        .get()
        .withPath("/apis/networking.k8s.io/v1/ingresses")
        .andReturn(HttpURLConnection.HTTP_OK, list)
        .always();
  }

  private GenericKubernetesResource createMockIngress(
      String name, String namespace, boolean enabled) {
    GenericKubernetesResource ingress = new GenericKubernetesResource();
    ingress.setApiVersion("networking.k8s.io/v1");
    ingress.setKind("Ingress");

    Map<String, String> annotations = new HashMap<>();
    // Use the correct annotation key: 'enable' not 'enabled'
    annotations.put("startpunkt.ullberg.us/enable", String.valueOf(enabled));
    annotations.put("startpunkt.ullberg.us/appName", name);

    ingress.setMetadata(
        new ObjectMetaBuilder()
            .withName(name)
            .withNamespace(namespace)
            .withAnnotations(annotations)
            .build());

    // Add spec with rules
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

  private GenericKubernetesResource createMockIngressWithoutAnnotation(
      String name, String namespace) {
    GenericKubernetesResource ingress = new GenericKubernetesResource();
    ingress.setApiVersion("networking.k8s.io/v1");
    ingress.setKind("Ingress");

    // No annotations at all
    ingress.setMetadata(new ObjectMetaBuilder().withName(name).withNamespace(namespace).build());

    // Add spec with rules
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
}
