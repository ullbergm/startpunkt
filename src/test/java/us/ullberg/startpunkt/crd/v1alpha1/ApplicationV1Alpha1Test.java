package us.ullberg.startpunkt.crd.v1alpha1;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.fabric8.kubernetes.api.model.ObjectMetaBuilder;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

/**
 * Test class for v1alpha1 Application CustomResource. Tests serialization, equality, hashCode,
 * toString, and resource creation.
 */
@QuarkusTest
class ApplicationV1Alpha1Test {

  private final ObjectMapper mapper = new ObjectMapper();

  @Test
  void testApplicationCreationWithDefaultConstructor() {
    Application app = new Application();
    assertNotNull(app, "Application should be created");
    assertNull(app.getSpec(), "Spec should be null initially");
    assertNull(app.getStatus(), "Status should be null initially");
  }

  @Test
  void testApplicationCreationWithParameterizedConstructor() {
    Application app =
        new Application(
            "Test App",
            "Development",
            "mdi:rocket",
            "blue",
            "https://test.example.com",
            "Test application",
            true,
            100,
            true);

    assertNotNull(app.getSpec(), "Spec should be initialized");
    assertEquals("Test App", app.getSpec().getName());
    assertEquals("Development", app.getSpec().getGroup());
    assertEquals("mdi:rocket", app.getSpec().getIcon());
    assertEquals("blue", app.getSpec().getIconColor());
    assertEquals("https://test.example.com", app.getSpec().getUrl());
    assertEquals("Test application", app.getSpec().getInfo());
    assertTrue(app.getSpec().getTargetBlank());
    assertEquals(100, app.getSpec().getLocation());
    assertTrue(app.getSpec().getEnabled());
  }

  @Test
  void testApplicationEqualityReflexive() {
    Application app = createSampleApplication();
    assertEquals(app, app, "Application should equal itself");
  }

  @Test
  void testApplicationEqualitySymmetric() {
    Application app1 = createSampleApplication();
    Application app2 = createSampleApplication();
    assertEquals(app1, app2, "Identical applications should be equal");
    assertEquals(app2, app1, "Equality should be symmetric");
  }

  @Test
  void testApplicationInequalityDifferentSpec() {
    Application app1 = createSampleApplication();
    Application app2 =
        new Application(
            "Different App",
            "Development",
            "mdi:rocket",
            "blue",
            "https://test.example.com",
            "Test application",
            true,
            100,
            true);
    app2.setMetadata(new ObjectMetaBuilder().withName("app2").withNamespace("default").build());

    assertNotEquals(app1, app2, "Applications with different specs should not be equal");
  }

  @Test
  void testApplicationInequalityWithNull() {
    Application app = createSampleApplication();
    assertNotEquals(app, null, "Application should not equal null");
  }

  @Test
  void testApplicationInequalityWithDifferentType() {
    Application app = createSampleApplication();
    assertNotEquals(app, "Not an Application", "Application should not equal other type");
  }

  @Test
  void testApplicationHashCodeConsistency() {
    Application app = createSampleApplication();
    int hash1 = app.hashCode();
    int hash2 = app.hashCode();
    assertEquals(hash1, hash2, "Hash code should be consistent");
  }

  @Test
  void testApplicationHashCodeEquality() {
    Application app1 = createSampleApplication();
    Application app2 = createSampleApplication();
    assertEquals(app1.hashCode(), app2.hashCode(), "Equal objects should have equal hash codes");
  }

  @Test
  void testApplicationToString() {
    Application app = createSampleApplication();
    String str = app.toString();
    assertNotNull(str, "toString should return non-null");
    assertTrue(str.contains("spec="), "toString should include spec");
  }

  @Test
  void testApplicationSerialization() throws JsonProcessingException {
    Application app = createSampleApplication();
    String json = mapper.writeValueAsString(app);

    assertNotNull(json, "JSON should not be null");
    assertTrue(json.contains("Test App"), "JSON should contain application name");
    assertTrue(json.contains("Development"), "JSON should contain group");
  }

  @Test
  void testApplicationDeserialization() throws JsonProcessingException {
    String json =
        """
            {
              "apiVersion": "startpunkt.ullberg.us/v1alpha1",
              "kind": "Application",
              "metadata": {
                "name": "test-app",
                "namespace": "default"
              },
              "spec": {
                "name": "Test App",
                "group": "Development",
                "icon": "mdi:rocket",
                "iconColor": "blue",
                "url": "https://test.example.com",
                "info": "Test application",
                "targetBlank": true,
                "location": 100,
                "enabled": true
              }
            }
            """;

    Application app = mapper.readValue(json, Application.class);

    assertNotNull(app, "Application should be deserialized");
    assertNotNull(app.getSpec(), "Spec should be deserialized");
    assertEquals("Test App", app.getSpec().getName());
    assertEquals("Development", app.getSpec().getGroup());
  }

  @Test
  void testApplicationWithStatus() {
    Application app = createSampleApplication();
    ApplicationStatus status = new ApplicationStatus();
    app.setStatus(status);

    assertNotNull(app.getStatus(), "Status should be set");
    assertEquals(status, app.getStatus());
  }

  @Test
  void testApplicationKubernetesMetadata() {
    Application app = createSampleApplication();
    assertEquals("test-app", app.getMetadata().getName());
    assertEquals("default", app.getMetadata().getNamespace());
  }

  @Test
  void testApplicationAnnotations() {
    Application app = new Application();
    app.setMetadata(
        new ObjectMetaBuilder()
            .withName("annotated-app")
            .withNamespace("test")
            .addToAnnotations("startpunkt.ullberg.us/rootPath", "/custom")
            .build());

    assertNotNull(app.getMetadata().getAnnotations());
    assertEquals(
        "/custom", app.getMetadata().getAnnotations().get("startpunkt.ullberg.us/rootPath"));
  }

  private Application createSampleApplication() {
    Application app =
        new Application(
            "Test App",
            "Development",
            "mdi:rocket",
            "blue",
            "https://test.example.com",
            "Test application",
            true,
            100,
            true);
    app.setMetadata(new ObjectMetaBuilder().withName("test-app").withNamespace("default").build());
    return app;
  }
}
