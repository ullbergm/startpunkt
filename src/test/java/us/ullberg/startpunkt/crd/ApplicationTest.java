package us.ullberg.startpunkt.crd.v1alpha4;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

class ApplicationTest {

  @Test
  void testDefaultConstructor() {
    Application app = new Application();
    assertNull(app.getSpec());
    assertNull(app.getStatus());
  }

  @Test
  void testParameterizedConstructor() {
    Application app =
        new Application(
            "AppName",
            "Utilities",
            "mdi:test",
            "blue",
            "https://example.com",
            "Test Info",
            true,
            5,
            true);

    ApplicationSpec spec = app.getSpec();
    assertNotNull(spec);
    assertEquals("AppName", spec.getName());
    assertEquals("Utilities", spec.getGroup());
    assertEquals("mdi:test", spec.getIcon());
    assertEquals("blue", spec.getIconColor());
    assertEquals("https://example.com", spec.getUrl());
    assertEquals("Test Info", spec.getInfo());
    assertTrue(spec.getTargetBlank());
    assertEquals(5, spec.getLocation());
    assertTrue(spec.getEnabled());
  }

  @Test
  void testEqualityAndHashCode() {
    Application app1 =
        new Application("AppA", "GroupA", "icon", "red", "https://a.com", "info", true, 0, true);
    Application app2 =
        new Application("AppA", "GroupA", "icon", "red", "https://a.com", "info", true, 0, true);

    assertEquals(app1, app2);
    assertEquals(app1.hashCode(), app2.hashCode());
  }

  @Test
  void testInequality() {
    Application app1 =
        new Application("App1", "Group1", "icon", "blue", "url1", "info1", true, 0, true);
    Application app2 =
        new Application("App2", "Group2", "icon", "red", "url2", "info2", false, 1, false);

    assertNotEquals(app1, app2);
    assertNotEquals(app1.hashCode(), app2.hashCode());
  }

  @Test
  void testToStringContainsKeyFields() {
    Application app =
        new Application(
            "AppZ", "GroupZ", "mdi:z", "black", "https://z.com", "Z info", true, 99, true);
    String toString = app.toString();

    assertTrue(toString.contains("spec"));
    assertTrue(toString.contains("AppZ"));
    assertTrue(toString.contains("https://z.com"));
  }

  @Test
  void testEqualsWithDifferentTypeAndNull() {
    Application app = new Application("A", "G", "mdi:a", "color", "url", "info", true, 0, true);
    assertNotEquals(app, null);
    assertNotEquals(app, "not an app");
  }
}
