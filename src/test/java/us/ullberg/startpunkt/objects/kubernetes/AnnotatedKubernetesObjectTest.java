package us.ullberg.startpunkt.objects.kubernetes;

import static org.junit.jupiter.api.Assertions.*;

import io.fabric8.kubernetes.api.model.GenericKubernetesResource;
import io.fabric8.kubernetes.api.model.ObjectMeta;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;

class AnnotatedKubernetesObjectTest {

  // Test implementation of AnnotatedKubernetesObject for testing
  private static class TestAnnotatedKubernetesObject extends AnnotatedKubernetesObject {
    public TestAnnotatedKubernetesObject() {
      super("test.example.com", "v1", "testresources");
    }

    // Expose the protected methods for testing
    public String testAppendRootPath(String url, GenericKubernetesResource item) {
      return appendRootPath(url, item);
    }

    public String testGetAppRootPath(GenericKubernetesResource item) {
      return getAppRootPath(item);
    }

    public String testBuildUrlWithPort(String protocol, String host, Integer port, String path) {
      return buildUrlWithPort(protocol, host, port, path);
    }
  }

  @Test
  void testAppendRootPathWithValidRootPath() {
    // Create a mock resource with rootPath annotation
    GenericKubernetesResource resource = new GenericKubernetesResource();
    ObjectMeta metadata = new ObjectMeta();
    Map<String, String> annotations = new HashMap<>();
    annotations.put("startpunkt.ullberg.us/rootPath", "/web/index.html");
    metadata.setAnnotations(annotations);
    resource.setMetadata(metadata);

    TestAnnotatedKubernetesObject testObj = new TestAnnotatedKubernetesObject();
    String result = testObj.testAppendRootPath("https://example.com", resource);

    assertEquals("https://example.com/web/index.html", result);
  }

  @Test
  void testAppendRootPathWithTrailingSlashInUrl() {
    // Create a mock resource with rootPath annotation
    GenericKubernetesResource resource = new GenericKubernetesResource();
    ObjectMeta metadata = new ObjectMeta();
    Map<String, String> annotations = new HashMap<>();
    annotations.put("startpunkt.ullberg.us/rootPath", "/web/index.html");
    metadata.setAnnotations(annotations);
    resource.setMetadata(metadata);

    TestAnnotatedKubernetesObject testObj = new TestAnnotatedKubernetesObject();
    String result = testObj.testAppendRootPath("https://example.com/", resource);

    assertEquals("https://example.com/web/index.html", result);
  }

  @Test
  void testAppendRootPathWithoutLeadingSlashInRootPath() {
    // Create a mock resource with rootPath annotation without leading slash
    GenericKubernetesResource resource = new GenericKubernetesResource();
    ObjectMeta metadata = new ObjectMeta();
    Map<String, String> annotations = new HashMap<>();
    annotations.put("startpunkt.ullberg.us/rootPath", "web/index.html");
    metadata.setAnnotations(annotations);
    resource.setMetadata(metadata);

    TestAnnotatedKubernetesObject testObj = new TestAnnotatedKubernetesObject();
    String result = testObj.testAppendRootPath("https://example.com", resource);

    assertEquals("https://example.com/web/index.html", result);
  }

  @Test
  void testAppendRootPathWithNoRootPath() {
    // Create a mock resource without rootPath annotation
    GenericKubernetesResource resource = new GenericKubernetesResource();
    ObjectMeta metadata = new ObjectMeta();
    Map<String, String> annotations = new HashMap<>();
    metadata.setAnnotations(annotations);
    resource.setMetadata(metadata);

    TestAnnotatedKubernetesObject testObj = new TestAnnotatedKubernetesObject();
    String result = testObj.testAppendRootPath("https://example.com", resource);

    assertEquals("https://example.com", result);
  }

  @Test
  void testAppendRootPathWithEmptyRootPath() {
    // Create a mock resource with empty rootPath annotation
    GenericKubernetesResource resource = new GenericKubernetesResource();
    ObjectMeta metadata = new ObjectMeta();
    Map<String, String> annotations = new HashMap<>();
    annotations.put("startpunkt.ullberg.us/rootPath", "");
    metadata.setAnnotations(annotations);
    resource.setMetadata(metadata);

    TestAnnotatedKubernetesObject testObj = new TestAnnotatedKubernetesObject();
    String result = testObj.testAppendRootPath("https://example.com", resource);

    assertEquals("https://example.com", result);
  }

  @Test
  void testAppendRootPathWithNullUrl() {
    // Create a mock resource with rootPath annotation
    GenericKubernetesResource resource = new GenericKubernetesResource();
    ObjectMeta metadata = new ObjectMeta();
    Map<String, String> annotations = new HashMap<>();
    annotations.put("startpunkt.ullberg.us/rootPath", "/web/index.html");
    metadata.setAnnotations(annotations);
    resource.setMetadata(metadata);

    TestAnnotatedKubernetesObject testObj = new TestAnnotatedKubernetesObject();
    String result = testObj.testAppendRootPath(null, resource);

    assertNull(result);
  }

  @Test
  void testGetAppRootPath() {
    // Create a mock resource with rootPath annotation
    GenericKubernetesResource resource = new GenericKubernetesResource();
    ObjectMeta metadata = new ObjectMeta();
    Map<String, String> annotations = new HashMap<>();
    annotations.put("startpunkt.ullberg.us/rootPath", "/web/index.html");
    metadata.setAnnotations(annotations);
    resource.setMetadata(metadata);

    TestAnnotatedKubernetesObject testObj = new TestAnnotatedKubernetesObject();
    String result = testObj.testGetAppRootPath(resource);

    assertEquals("/web/index.html", result);
  }

  @Test
  void testGetAppRootPathWithNoAnnotation() {
    // Create a mock resource without rootPath annotation
    GenericKubernetesResource resource = new GenericKubernetesResource();
    ObjectMeta metadata = new ObjectMeta();
    Map<String, String> annotations = new HashMap<>();
    metadata.setAnnotations(annotations);
    resource.setMetadata(metadata);

    TestAnnotatedKubernetesObject testObj = new TestAnnotatedKubernetesObject();
    String result = testObj.testGetAppRootPath(resource);

    assertNull(result);
  }

  @Test
  void testGetAppUrlWithRootPath() {
    // Create a mock resource with URL annotation and rootPath annotation
    GenericKubernetesResource resource = new GenericKubernetesResource();
    ObjectMeta metadata = new ObjectMeta();
    Map<String, String> annotations = new HashMap<>();
    annotations.put("startpunkt.ullberg.us/url", "https://custom.example.com");
    annotations.put("startpunkt.ullberg.us/rootPath", "/web/index.html");
    metadata.setAnnotations(annotations);
    resource.setMetadata(metadata);

    TestAnnotatedKubernetesObject testObj = new TestAnnotatedKubernetesObject();
    String result = testObj.getAppUrl(resource);

    assertEquals("https://custom.example.com/web/index.html", result);
  }

  // ---- Tag Tests ----

  @Test
  void testGetAppTagsWithValidTags() {
    // Create a mock resource with tags annotation
    GenericKubernetesResource resource = new GenericKubernetesResource();
    ObjectMeta metadata = new ObjectMeta();
    Map<String, String> annotations = new HashMap<>();
    annotations.put("startpunkt.ullberg.us/tags", "admin,dev,test");
    metadata.setAnnotations(annotations);
    resource.setMetadata(metadata);

    TestAnnotatedKubernetesObject testObj = new TestAnnotatedKubernetesObject();
    String result = testObj.getAppTags(resource);

    assertEquals("admin,dev,test", result);
  }

  @Test
  void testGetAppTagsWithSingleTag() {
    // Create a mock resource with single tag annotation
    GenericKubernetesResource resource = new GenericKubernetesResource();
    ObjectMeta metadata = new ObjectMeta();
    Map<String, String> annotations = new HashMap<>();
    annotations.put("startpunkt.ullberg.us/tags", "production");
    metadata.setAnnotations(annotations);
    resource.setMetadata(metadata);

    TestAnnotatedKubernetesObject testObj = new TestAnnotatedKubernetesObject();
    String result = testObj.getAppTags(resource);

    assertEquals("production", result);
  }

  @Test
  void testGetAppTagsWithNoAnnotation() {
    // Create a mock resource without tags annotation
    GenericKubernetesResource resource = new GenericKubernetesResource();
    ObjectMeta metadata = new ObjectMeta();
    Map<String, String> annotations = new HashMap<>();
    metadata.setAnnotations(annotations);
    resource.setMetadata(metadata);

    TestAnnotatedKubernetesObject testObj = new TestAnnotatedKubernetesObject();
    String result = testObj.getAppTags(resource);

    assertNull(result);
  }

  @Test
  void testGetAppTagsWithEmptyTags() {
    // Create a mock resource with empty tags annotation
    GenericKubernetesResource resource = new GenericKubernetesResource();
    ObjectMeta metadata = new ObjectMeta();
    Map<String, String> annotations = new HashMap<>();
    annotations.put("startpunkt.ullberg.us/tags", "");
    metadata.setAnnotations(annotations);
    resource.setMetadata(metadata);

    TestAnnotatedKubernetesObject testObj = new TestAnnotatedKubernetesObject();
    String result = testObj.getAppTags(resource);

    assertEquals("", result);
  }

  @Test
  void testGetAppTagsWithWhitespaceInTags() {
    // Create a mock resource with tags containing whitespace
    GenericKubernetesResource resource = new GenericKubernetesResource();
    ObjectMeta metadata = new ObjectMeta();
    Map<String, String> annotations = new HashMap<>();
    annotations.put("startpunkt.ullberg.us/tags", " admin , dev , test ");
    metadata.setAnnotations(annotations);
    resource.setMetadata(metadata);

    TestAnnotatedKubernetesObject testObj = new TestAnnotatedKubernetesObject();
    String result = testObj.getAppTags(resource);

    assertEquals(" admin , dev , test ", result);
  }

  @Test
  void testGetAppTagsWithNoMetadata() {
    // Create a mock resource without metadata
    GenericKubernetesResource resource = new GenericKubernetesResource();
    resource.setMetadata(null);

    TestAnnotatedKubernetesObject testObj = new TestAnnotatedKubernetesObject();
    String result = testObj.getAppTags(resource);

    assertNull(result);
  }

  @Test
  void testGetAppPortWithValidPort() {
    // Create a mock resource with valid port annotation
    GenericKubernetesResource resource = new GenericKubernetesResource();
    ObjectMeta metadata = new ObjectMeta();
    metadata.setName("test-resource");
    metadata.setNamespace("default");
    Map<String, String> annotations = new HashMap<>();
    annotations.put("startpunkt.ullberg.us/port", "8443");
    metadata.setAnnotations(annotations);
    resource.setMetadata(metadata);

    TestAnnotatedKubernetesObject testObj = new TestAnnotatedKubernetesObject();
    Integer result = testObj.getAppPort(resource);

    assertEquals(8443, result);
  }

  @Test
  void testGetAppPortWithNoAnnotation() {
    // Create a mock resource without port annotation
    GenericKubernetesResource resource = new GenericKubernetesResource();
    ObjectMeta metadata = new ObjectMeta();
    metadata.setAnnotations(new HashMap<>());
    resource.setMetadata(metadata);

    TestAnnotatedKubernetesObject testObj = new TestAnnotatedKubernetesObject();
    Integer result = testObj.getAppPort(resource);

    assertNull(result);
  }

  @Test
  void testGetAppPortWithInvalidPortNumber() {
    // Create a mock resource with invalid port (not a number)
    GenericKubernetesResource resource = new GenericKubernetesResource();
    ObjectMeta metadata = new ObjectMeta();
    metadata.setName("test-resource");
    metadata.setNamespace("default");
    Map<String, String> annotations = new HashMap<>();
    annotations.put("startpunkt.ullberg.us/port", "not-a-number");
    metadata.setAnnotations(annotations);
    resource.setMetadata(metadata);

    TestAnnotatedKubernetesObject testObj = new TestAnnotatedKubernetesObject();
    Integer result = testObj.getAppPort(resource);

    assertNull(result); // Should return null for invalid input
  }

  @Test
  void testGetAppPortWithPortTooLow() {
    // Create a mock resource with port below valid range
    GenericKubernetesResource resource = new GenericKubernetesResource();
    ObjectMeta metadata = new ObjectMeta();
    metadata.setName("test-resource");
    metadata.setNamespace("default");
    Map<String, String> annotations = new HashMap<>();
    annotations.put("startpunkt.ullberg.us/port", "0");
    metadata.setAnnotations(annotations);
    resource.setMetadata(metadata);

    TestAnnotatedKubernetesObject testObj = new TestAnnotatedKubernetesObject();
    Integer result = testObj.getAppPort(resource);

    assertNull(result); // Port 0 is invalid
  }

  @Test
  void testGetAppPortWithPortTooHigh() {
    // Create a mock resource with port above valid range
    GenericKubernetesResource resource = new GenericKubernetesResource();
    ObjectMeta metadata = new ObjectMeta();
    metadata.setName("test-resource");
    metadata.setNamespace("default");
    Map<String, String> annotations = new HashMap<>();
    annotations.put("startpunkt.ullberg.us/port", "65536");
    metadata.setAnnotations(annotations);
    resource.setMetadata(metadata);

    TestAnnotatedKubernetesObject testObj = new TestAnnotatedKubernetesObject();
    Integer result = testObj.getAppPort(resource);

    assertNull(result); // Port 65536 is invalid
  }

  @Test
  void testGetAppPortWithValidBoundaryPorts() {
    // Test port 1 (lower boundary)
    GenericKubernetesResource resource1 = new GenericKubernetesResource();
    ObjectMeta metadata1 = new ObjectMeta();
    metadata1.setName("test-resource");
    metadata1.setNamespace("default");
    Map<String, String> annotations1 = new HashMap<>();
    annotations1.put("startpunkt.ullberg.us/port", "1");
    metadata1.setAnnotations(annotations1);
    resource1.setMetadata(metadata1);

    TestAnnotatedKubernetesObject testObj = new TestAnnotatedKubernetesObject();
    assertEquals(1, testObj.getAppPort(resource1));

    // Test port 65535 (upper boundary)
    GenericKubernetesResource resource2 = new GenericKubernetesResource();
    ObjectMeta metadata2 = new ObjectMeta();
    metadata2.setName("test-resource");
    metadata2.setNamespace("default");
    Map<String, String> annotations2 = new HashMap<>();
    annotations2.put("startpunkt.ullberg.us/port", "65535");
    metadata2.setAnnotations(annotations2);
    resource2.setMetadata(metadata2);

    assertEquals(65535, testObj.getAppPort(resource2));
  }

  @Test
  void testGetAppPortWithStandardPorts() {
    // Test standard HTTP port
    GenericKubernetesResource resource1 = new GenericKubernetesResource();
    ObjectMeta metadata1 = new ObjectMeta();
    metadata1.setName("test-resource");
    metadata1.setNamespace("default");
    Map<String, String> annotations1 = new HashMap<>();
    annotations1.put("startpunkt.ullberg.us/port", "80");
    metadata1.setAnnotations(annotations1);
    resource1.setMetadata(metadata1);

    TestAnnotatedKubernetesObject testObj = new TestAnnotatedKubernetesObject();
    assertEquals(80, testObj.getAppPort(resource1)); // Should return 80 (not filtered here)

    // Test standard HTTPS port
    GenericKubernetesResource resource2 = new GenericKubernetesResource();
    ObjectMeta metadata2 = new ObjectMeta();
    metadata2.setName("test-resource");
    metadata2.setNamespace("default");
    Map<String, String> annotations2 = new HashMap<>();
    annotations2.put("startpunkt.ullberg.us/port", "443");
    metadata2.setAnnotations(annotations2);
    resource2.setMetadata(metadata2);

    assertEquals(443, testObj.getAppPort(resource2)); // Should return 443 (not filtered here)
  }

  @Test
  void testBuildUrlWithPortCustomPort() {
    TestAnnotatedKubernetesObject testObj = new TestAnnotatedKubernetesObject();
    String result = testObj.testBuildUrlWithPort("https", "example.com", 8443, null);
    assertEquals("https://example.com:8443", result);
  }

  @Test
  void testBuildUrlWithPortCustomPortAndPath() {
    TestAnnotatedKubernetesObject testObj = new TestAnnotatedKubernetesObject();
    String result = testObj.testBuildUrlWithPort("https", "example.com", 8443, "/api/v1");
    assertEquals("https://example.com:8443/api/v1", result);
  }

  @Test
  void testBuildUrlWithPortOmitsStandardHttpPort() {
    TestAnnotatedKubernetesObject testObj = new TestAnnotatedKubernetesObject();
    String result = testObj.testBuildUrlWithPort("http", "example.com", 80, null);
    assertEquals("http://example.com", result); // Port 80 should be omitted
  }

  @Test
  void testBuildUrlWithPortOmitsStandardHttpsPort() {
    TestAnnotatedKubernetesObject testObj = new TestAnnotatedKubernetesObject();
    String result = testObj.testBuildUrlWithPort("https", "example.com", 443, null);
    assertEquals("https://example.com", result); // Port 443 should be omitted
  }

  @Test
  void testBuildUrlWithPortOmitsStandardHttpPortWithPath() {
    TestAnnotatedKubernetesObject testObj = new TestAnnotatedKubernetesObject();
    String result = testObj.testBuildUrlWithPort("http", "example.com", 80, "/path");
    assertEquals("http://example.com/path", result); // Port 80 should be omitted
  }

  @Test
  void testBuildUrlWithPortOmitsStandardHttpsPortWithPath() {
    TestAnnotatedKubernetesObject testObj = new TestAnnotatedKubernetesObject();
    String result = testObj.testBuildUrlWithPort("https", "example.com", 443, "/path");
    assertEquals("https://example.com/path", result); // Port 443 should be omitted
  }

  @Test
  void testBuildUrlWithPortNullPort() {
    TestAnnotatedKubernetesObject testObj = new TestAnnotatedKubernetesObject();
    String result = testObj.testBuildUrlWithPort("https", "example.com", null, null);
    assertEquals("https://example.com", result);
  }

  @Test
  void testBuildUrlWithPortNullPortWithPath() {
    TestAnnotatedKubernetesObject testObj = new TestAnnotatedKubernetesObject();
    String result = testObj.testBuildUrlWithPort("https", "example.com", null, "/api");
    assertEquals("https://example.com/api", result);
  }

  @Test
  void testBuildUrlWithPortProtocolWithSlashes() {
    TestAnnotatedKubernetesObject testObj = new TestAnnotatedKubernetesObject();
    String result = testObj.testBuildUrlWithPort("https://", "example.com", 8443, null);
    assertEquals("https://example.com:8443", result);
  }

  @Test
  void testBuildUrlWithPortPathWithoutLeadingSlash() {
    TestAnnotatedKubernetesObject testObj = new TestAnnotatedKubernetesObject();
    String result = testObj.testBuildUrlWithPort("https", "example.com", 8443, "api/v1");
    assertEquals("https://example.com:8443/api/v1", result); // Should add leading slash
  }

  @Test
  void testBuildUrlWithPortEmptyPath() {
    TestAnnotatedKubernetesObject testObj = new TestAnnotatedKubernetesObject();
    String result = testObj.testBuildUrlWithPort("https", "example.com", 8443, "");
    assertEquals("https://example.com:8443", result);
  }
}
