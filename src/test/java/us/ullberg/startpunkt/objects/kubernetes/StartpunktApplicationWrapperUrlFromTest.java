package us.ullberg.startpunkt.objects.kubernetes;

import static org.junit.jupiter.api.Assertions.*;

import io.fabric8.kubernetes.api.model.GenericKubernetesResource;
import io.fabric8.kubernetes.api.model.ObjectMetaBuilder;
import io.fabric8.kubernetes.api.model.apiextensions.v1.CustomResourceDefinition;
import io.fabric8.kubernetes.client.NamespacedKubernetesClient;
import io.fabric8.kubernetes.client.dsl.base.CustomResourceDefinitionContext;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.kubernetes.client.KubernetesServer;
import io.quarkus.test.kubernetes.client.KubernetesTestServer;
import io.quarkus.test.kubernetes.client.WithKubernetesTestServer;
import java.net.HttpURLConnection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import us.ullberg.startpunkt.crd.v1alpha4.Application;
import us.ullberg.startpunkt.crd.v1alpha4.ApplicationSpec;
import us.ullberg.startpunkt.crd.v1alpha4.UrlFrom;

@QuarkusTest
@WithKubernetesTestServer
class StartpunktApplicationWrapperUrlFromTest {

  @KubernetesTestServer KubernetesServer server;
  private NamespacedKubernetesClient client;

  @BeforeEach
  public void setUp() {
    // Create the Application CRD
    CustomResourceDefinition appCrd =
        CustomResourceDefinitionContext.v1CRDFromCustomResourceType(Application.class).build();

    // Set up the mock server to expect a POST request for creating the CRD
    server
        .expect()
        .post()
        .withPath("/apis/apiextensions.k8s.io/v1/customresourcedefinitions")
        .andReturn(HttpURLConnection.HTTP_OK, appCrd)
        .once();

    client = server.getClient();

    // Create the CRD in the mock Kubernetes cluster
    CustomResourceDefinition createdApplicationCrd =
        client.apiextensions().v1().customResourceDefinitions().resource(appCrd).create();

    assertNotNull(createdApplicationCrd);
  }

  @Test
  void testUrlFromWithConfigMap() {
    String namespace = "test1";

    // Create a ConfigMap that will be referenced
    Map<String, Object> configMapProps = new HashMap<>();
    Map<String, Object> configMapData = new HashMap<>();
    configMapData.put("endpoint", "https://app.example.com");
    configMapProps.put("data", configMapData);

    GenericKubernetesResource configMap = new GenericKubernetesResource();
    configMap.setApiVersion("v1");
    configMap.setKind("ConfigMap");
    configMap.setMetadata(
        new ObjectMetaBuilder().withName("app-config").withNamespace(namespace).build());
    configMap.setAdditionalProperties(configMapProps);

    client.resource(configMap).inNamespace(namespace).create();

    // Create an Application with urlFrom
    ApplicationSpec appSpec = new ApplicationSpec();
    appSpec.setName("Test App");

    UrlFrom urlFrom = new UrlFrom();
    urlFrom.setApiVersion("v1");
    urlFrom.setKind("ConfigMap");
    urlFrom.setName("app-config");
    urlFrom.setProperty("data.endpoint");
    appSpec.setUrlFrom(urlFrom);

    Application app = new Application();
    app.setMetadata(new ObjectMetaBuilder().withName("test-app").withNamespace(namespace).build());
    app.setSpec(appSpec);

    client.resources(Application.class).inNamespace(namespace).resource(app).create();

    // Test the wrapper
    StartpunktApplicationWrapper wrapper = new StartpunktApplicationWrapper();
    List<ApplicationSpec> specs = wrapper.getApplicationSpecs(client, false, List.of(namespace));

    assertEquals(1, specs.size());
    ApplicationSpec spec = specs.get(0);
    assertEquals("test app", spec.getName());
    assertEquals("https://app.example.com", spec.getUrl());
  }

  @Test
  void testUrlFromFallsBackToDirectUrl() {
    String namespace = "test2";

    // Create an Application with both url and urlFrom (urlFrom reference doesn't exist)
    ApplicationSpec appSpec = new ApplicationSpec();
    appSpec.setName("Fallback App");
    appSpec.setUrl("https://fallback.example.com");

    UrlFrom urlFrom = new UrlFrom();
    urlFrom.setApiVersion("v1");
    urlFrom.setKind("ConfigMap");
    urlFrom.setName("nonexistent-config");
    urlFrom.setProperty("data.endpoint");
    appSpec.setUrlFrom(urlFrom);

    Application app = new Application();
    app.setMetadata(
        new ObjectMetaBuilder().withName("fallback-app").withNamespace(namespace).build());
    app.setSpec(appSpec);

    client.resources(Application.class).inNamespace(namespace).resource(app).create();

    // Test the wrapper
    StartpunktApplicationWrapper wrapper = new StartpunktApplicationWrapper();
    List<ApplicationSpec> specs = wrapper.getApplicationSpecs(client, false, List.of(namespace));

    assertEquals(1, specs.size());
    ApplicationSpec spec = specs.get(0);
    assertEquals("fallback app", spec.getName());
    assertEquals("https://fallback.example.com", spec.getUrl());
  }

  @Test
  void testCheckAvailabilityFromSpec() {
    String namespace = "test-check-availability";

    ApplicationSpec skippedSpec = new ApplicationSpec();
    skippedSpec.setName("Skipped App");
    skippedSpec.setUrl("https://skipped.example.com");
    skippedSpec.setCheckAvailability(false);

    Application skipped = new Application();
    skipped.setMetadata(
        new ObjectMetaBuilder().withName("skipped-app").withNamespace(namespace).build());
    skipped.setSpec(skippedSpec);

    ApplicationSpec defaultSpec = new ApplicationSpec();
    defaultSpec.setName("Default App");
    defaultSpec.setUrl("https://default.example.com");

    Application defaultApp = new Application();
    defaultApp.setMetadata(
        new ObjectMetaBuilder().withName("default-app").withNamespace(namespace).build());
    defaultApp.setSpec(defaultSpec);

    client.resources(Application.class).inNamespace(namespace).resource(skipped).create();
    client.resources(Application.class).inNamespace(namespace).resource(defaultApp).create();

    StartpunktApplicationWrapper wrapper = new StartpunktApplicationWrapper();
    List<ApplicationSpec> specs = wrapper.getApplicationSpecs(client, false, List.of(namespace));

    assertEquals(2, specs.size());
    for (ApplicationSpec spec : specs) {
      if ("skipped app".equals(spec.getName())) {
        assertEquals(Boolean.FALSE, spec.getCheckAvailability());
      } else {
        assertEquals("default app", spec.getName());
        assertNull(spec.getCheckAvailability(), "Unset checkAvailability should stay null");
      }
    }
  }

  @Test
  void testUrlFromWithNestedProperty() {
    String namespace = "test3";

    // Create a Service with nested properties
    Map<String, Object> serviceProps = new HashMap<>();
    Map<String, Object> serviceSpec = new HashMap<>();
    serviceSpec.put("clusterIP", "10.0.0.100");
    serviceProps.put("spec", serviceSpec);

    GenericKubernetesResource service = new GenericKubernetesResource();
    service.setApiVersion("v1");
    service.setKind("Service");
    service.setMetadata(
        new ObjectMetaBuilder().withName("my-service").withNamespace(namespace).build());
    service.setAdditionalProperties(serviceProps);

    client.resource(service).inNamespace(namespace).create();

    // Create an Application with urlFrom referencing the Service
    ApplicationSpec appSpec = new ApplicationSpec();
    appSpec.setName("Service App");

    UrlFrom urlFrom = new UrlFrom();
    urlFrom.setApiVersion("v1");
    urlFrom.setKind("Service");
    urlFrom.setName("my-service");
    urlFrom.setProperty("spec.clusterIP");
    appSpec.setUrlFrom(urlFrom);

    Application app = new Application();
    app.setMetadata(
        new ObjectMetaBuilder().withName("service-app").withNamespace(namespace).build());
    app.setSpec(appSpec);

    client.resources(Application.class).inNamespace(namespace).resource(app).create();

    // Test the wrapper
    StartpunktApplicationWrapper wrapper = new StartpunktApplicationWrapper();
    List<ApplicationSpec> specs = wrapper.getApplicationSpecs(client, false, List.of(namespace));

    assertEquals(1, specs.size());
    ApplicationSpec spec = specs.get(0);
    assertEquals("service app", spec.getName());
    assertEquals("10.0.0.100", spec.getUrl());
  }

  @Test
  void testUrlFromWithUrlTemplate() {
    String namespace = "test4";

    // Create a Service with nested properties
    Map<String, Object> serviceProps = new HashMap<>();
    Map<String, Object> serviceSpec = new HashMap<>();
    serviceSpec.put("clusterIP", "10.0.0.200");
    serviceProps.put("spec", serviceSpec);

    GenericKubernetesResource service = new GenericKubernetesResource();
    service.setApiVersion("v1");
    service.setKind("Service");
    service.setMetadata(
        new ObjectMetaBuilder().withName("grafana-svc").withNamespace(namespace).build());
    service.setAdditionalProperties(serviceProps);

    client.resource(service).inNamespace(namespace).create();

    // Create an Application with urlFrom referencing the Service and a URL template
    ApplicationSpec appSpec = new ApplicationSpec();
    appSpec.setName("Grafana");

    UrlFrom urlFrom = new UrlFrom();
    urlFrom.setApiVersion("v1");
    urlFrom.setKind("Service");
    urlFrom.setName("grafana-svc");
    urlFrom.setProperty("spec.clusterIP");
    urlFrom.setUrlTemplate("https://{0}/dashboard/");
    appSpec.setUrlFrom(urlFrom);

    Application app = new Application();
    app.setMetadata(
        new ObjectMetaBuilder().withName("grafana-app").withNamespace(namespace).build());
    app.setSpec(appSpec);

    client.resources(Application.class).inNamespace(namespace).resource(app).create();

    // Test the wrapper
    StartpunktApplicationWrapper wrapper = new StartpunktApplicationWrapper();
    List<ApplicationSpec> specs = wrapper.getApplicationSpecs(client, false, List.of(namespace));

    assertEquals(1, specs.size());
    ApplicationSpec spec = specs.get(0);
    assertEquals("grafana", spec.getName());
    assertEquals("https://10.0.0.200/dashboard/", spec.getUrl());
  }
}
