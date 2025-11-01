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
}
