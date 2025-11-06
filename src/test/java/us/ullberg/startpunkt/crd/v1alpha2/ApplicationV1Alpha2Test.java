package us.ullberg.startpunkt.crd.v1alpha2;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

class ApplicationV1Alpha2Test {

  @Test
  void testDefaultConstructor() {
    Application app = new Application();
    assertNotNull(app);
    assertNull(app.getSpec());
    assertNull(app.getStatus());
  }

  @Test
  void testSetAndGetSpec() {
    Application app = new Application();
    ApplicationSpec spec = new ApplicationSpec();
    spec.setName("TestApp");

    app.setSpec(spec);

    assertNotNull(app.getSpec());
    assertEquals("TestApp", app.getSpec().getName());
  }

  @Test
  void testSetAndGetStatus() {
    Application app = new Application();
    ApplicationStatus status = new ApplicationStatus();

    app.setStatus(status);

    assertNotNull(app.getStatus());
  }

  @Test
  void testSetAndGetMetadata() {
    Application app = new Application();
    io.fabric8.kubernetes.api.model.ObjectMeta metadata =
        new io.fabric8.kubernetes.api.model.ObjectMetaBuilder()
            .withName("test-app")
            .withNamespace("default")
            .build();

    app.setMetadata(metadata);

    assertNotNull(app.getMetadata());
    assertEquals("test-app", app.getMetadata().getName());
    assertEquals("default", app.getMetadata().getNamespace());
  }

  @Test
  void testGetKind() {
    Application app = new Application();
    assertEquals("Application", app.getKind());
  }

  @Test
  void testGetApiVersion() {
    Application app = new Application();
    assertEquals("startpunkt.ullberg.us/v1alpha2", app.getApiVersion());
  }
}
