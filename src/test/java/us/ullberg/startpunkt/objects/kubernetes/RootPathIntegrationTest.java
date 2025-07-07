package us.ullberg.startpunkt.objects.kubernetes;

import static org.junit.jupiter.api.Assertions.*;

import io.fabric8.kubernetes.api.model.GenericKubernetesResource;
import io.fabric8.kubernetes.api.model.ObjectMeta;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;

/** Integration test demonstrating the rootPath functionality with different wrapper classes. */
class RootPathIntegrationTest {

  @Test
  void testRouteApplicationWrapperWithRootPath() {
    // Create a mock Route resource with rootPath annotation
    GenericKubernetesResource resource = new GenericKubernetesResource();
    ObjectMeta metadata = new ObjectMeta();
    Map<String, String> annotations = new HashMap<>();
    annotations.put("startpunkt.ullberg.us/rootPath", "/web/index.html");
    metadata.setAnnotations(annotations);
    resource.setMetadata(metadata);

    // Create spec for OpenShift Route
    Map<String, Object> spec = new HashMap<>();
    spec.put("host", "myapp.example.com");
    spec.put("tls", Map.of("termination", "edge")); // This will make it https

    Map<String, Object> additionalProperties = new HashMap<>();
    additionalProperties.put("spec", spec);
    resource.setAdditionalProperties(additionalProperties);

    RouteApplicationWrapper wrapper = new RouteApplicationWrapper(false);
    String result = wrapper.getAppUrl(resource);

    assertEquals("https://myapp.example.com/web/index.html", result);
  }

  @Test
  void testGatewayApiHttpRouteWrapperWithRootPath() {
    // Create a mock HTTPRoute resource with rootPath annotation
    GenericKubernetesResource resource = new GenericKubernetesResource();
    ObjectMeta metadata = new ObjectMeta();
    Map<String, String> annotations = new HashMap<>();
    annotations.put("startpunkt.ullberg.us/rootPath", "/api/v1");
    metadata.setAnnotations(annotations);
    resource.setMetadata(metadata);

    // Create spec for Gateway API HTTPRoute
    Map<String, Object> spec = new HashMap<>();
    java.util.ArrayList<String> hostnames = new java.util.ArrayList<>();
    hostnames.add("api.example.com");
    spec.put("hostnames", hostnames);

    Map<String, Object> additionalProperties = new HashMap<>();
    additionalProperties.put("spec", spec);
    resource.setAdditionalProperties(additionalProperties);

    GatewayApiHttpRouteWrapper wrapper = new GatewayApiHttpRouteWrapper(false, "https");
    String result = wrapper.getAppUrl(resource);

    assertEquals("https://api.example.com/api/v1", result);
  }

  @Test
  void testAnnotationUrlWithRootPath() {
    // Test that rootPath works with explicit URL annotations too
    GenericKubernetesResource resource = new GenericKubernetesResource();
    ObjectMeta metadata = new ObjectMeta();
    Map<String, String> annotations = new HashMap<>();
    annotations.put("startpunkt.ullberg.us/url", "https://custom.example.com");
    annotations.put("startpunkt.ullberg.us/rootPath", "/dashboard");
    metadata.setAnnotations(annotations);
    resource.setMetadata(metadata);

    // Use a test class that extends AnnotatedKubernetesObject
    class TestWrapper extends AnnotatedKubernetesObject {
      public TestWrapper() {
        super("test.example.com", "v1", "testresources");
      }
    }

    TestWrapper wrapper = new TestWrapper();
    String result = wrapper.getAppUrl(resource);

    assertEquals("https://custom.example.com/dashboard", result);
  }

  @Test
  void testHajimariApplicationWrapperWithRootPath() {
    // Create a mock Hajimari Application resource with rootPath annotation
    GenericKubernetesResource resource = new GenericKubernetesResource();
    ObjectMeta metadata = new ObjectMeta();
    Map<String, String> annotations = new HashMap<>();
    annotations.put("startpunkt.ullberg.us/rootPath", "/ui");
    metadata.setAnnotations(annotations);
    resource.setMetadata(metadata);

    // Create spec for Hajimari Application
    Map<String, Object> spec = new HashMap<>();
    spec.put("url", "https://grafana.example.com");

    Map<String, Object> additionalProperties = new HashMap<>();
    additionalProperties.put("spec", spec);
    resource.setAdditionalProperties(additionalProperties);

    HajimariApplicationWrapper wrapper = new HajimariApplicationWrapper();
    String result = wrapper.getAppUrl(resource);

    assertEquals("https://grafana.example.com/ui", result);
  }

  @Test
  void testComplexRootPathWithTrailingSlashes() {
    // Test edge case: URL with trailing slash + rootPath without leading slash
    GenericKubernetesResource resource = new GenericKubernetesResource();
    ObjectMeta metadata = new ObjectMeta();
    Map<String, String> annotations = new HashMap<>();
    annotations.put("startpunkt.ullberg.us/url", "https://example.com/");
    annotations.put("startpunkt.ullberg.us/rootPath", "app/dashboard/");
    metadata.setAnnotations(annotations);
    resource.setMetadata(metadata);

    class TestWrapper extends AnnotatedKubernetesObject {
      public TestWrapper() {
        super("test.example.com", "v1", "testresources");
      }
    }

    TestWrapper wrapper = new TestWrapper();
    String result = wrapper.getAppUrl(resource);

    assertEquals("https://example.com/app/dashboard/", result);
  }

  @Test
  void testStartpunktApplicationWrapperWithSpecRootPath() {
    // Test that StartpunktApplicationWrapper uses spec.rootPath property
    GenericKubernetesResource resource = new GenericKubernetesResource();
    ObjectMeta metadata = new ObjectMeta();
    metadata.setName("test-app");
    resource.setMetadata(metadata);

    // Create spec for Startpunkt Application with rootPath in spec
    Map<String, Object> spec = new HashMap<>();
    spec.put("name", "Test Application");
    spec.put("url", "https://app.example.com");
    spec.put("rootPath", "/admin/dashboard");

    Map<String, Object> additionalProperties = new HashMap<>();
    additionalProperties.put("spec", spec);
    resource.setAdditionalProperties(additionalProperties);

    StartpunktApplicationWrapper wrapper = new StartpunktApplicationWrapper();
    String result = wrapper.getAppUrl(resource);

    assertEquals("https://app.example.com/admin/dashboard", result);
  }

  @Test
  void testStartpunktApplicationWrapperWithAnnotationFallback() {
    // Test that StartpunktApplicationWrapper falls back to annotation when spec.rootPath is not set
    GenericKubernetesResource resource = new GenericKubernetesResource();
    ObjectMeta metadata = new ObjectMeta();
    metadata.setName("test-app");
    Map<String, String> annotations = new HashMap<>();
    annotations.put("startpunkt.ullberg.us/rootPath", "/fallback/path");
    metadata.setAnnotations(annotations);
    resource.setMetadata(metadata);

    // Create spec for Startpunkt Application WITHOUT rootPath in spec
    Map<String, Object> spec = new HashMap<>();
    spec.put("name", "Test Application");
    spec.put("url", "https://app.example.com");

    Map<String, Object> additionalProperties = new HashMap<>();
    additionalProperties.put("spec", spec);
    resource.setAdditionalProperties(additionalProperties);

    StartpunktApplicationWrapper wrapper = new StartpunktApplicationWrapper();
    String result = wrapper.getAppUrl(resource);

    assertEquals("https://app.example.com/fallback/path", result);
  }

  @Test
  void testStartpunktApplicationWrapperSpecTakesPrecedence() {
    // Test that spec.rootPath takes precedence over annotation when both are present
    GenericKubernetesResource resource = new GenericKubernetesResource();
    ObjectMeta metadata = new ObjectMeta();
    metadata.setName("test-app");
    Map<String, String> annotations = new HashMap<>();
    annotations.put("startpunkt.ullberg.us/rootPath", "/annotation/path");
    metadata.setAnnotations(annotations);
    resource.setMetadata(metadata);

    // Create spec for Startpunkt Application with rootPath in spec
    Map<String, Object> spec = new HashMap<>();
    spec.put("name", "Test Application");
    spec.put("url", "https://app.example.com");
    spec.put("rootPath", "/spec/path");

    Map<String, Object> additionalProperties = new HashMap<>();
    additionalProperties.put("spec", spec);
    resource.setAdditionalProperties(additionalProperties);

    StartpunktApplicationWrapper wrapper = new StartpunktApplicationWrapper();
    String result = wrapper.getAppUrl(resource);

    assertEquals("https://app.example.com/spec/path", result);
  }
}
