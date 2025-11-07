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

  @Test
  void testConstructorWithRootPath() {
    Application app =
        new Application(
            "MyApp",
            "Services",
            "mdi:app",
            "green",
            "https://example.com",
            "App with rootPath",
            true,
            10,
            true,
            "/api/v1");

    ApplicationSpec spec = app.getSpec();
    assertNotNull(spec);
    assertEquals("MyApp", spec.getName());
    assertEquals("/api/v1", spec.getRootPath());
    assertNull(spec.getTags());
  }

  @Test
  void testConstructorWithRootPathAndTags() {
    Application app =
        new Application(
            "TaggedApp",
            "Tools",
            "mdi:tag",
            "blue",
            "https://tagged.com",
            "App with tags",
            false,
            20,
            true,
            "/v2",
            "production,monitoring");

    ApplicationSpec spec = app.getSpec();
    assertNotNull(spec);
    assertEquals("TaggedApp", spec.getName());
    assertEquals("/v2", spec.getRootPath());
    assertEquals("production,monitoring", spec.getTags());
  }

  @Test
  void testSpecAndStatusIndependence() {
    Application app = new Application();
    assertNull(app.getSpec());
    assertNull(app.getStatus());

    ApplicationSpec spec =
        new ApplicationSpec("Test", "Group", null, null, "url", null, true, 0, true);
    app.setSpec(spec);
    assertNotNull(app.getSpec());
    assertNull(app.getStatus());

    ApplicationStatus status = new ApplicationStatus();
    app.setStatus(status);
    assertNotNull(app.getStatus());
  }

  @Test
  void testEqualsSameInstance() {
    Application app = new Application("App", "Group", "icon", "red", "url", "info", true, 0, true);
    assertEquals(app, app);
  }

  @Test
  void testEqualsWithStatus() {
    Application app1 = new Application("App", "Group", "icon", "red", "url", "info", true, 0, true);
    Application app2 = new Application("App", "Group", "icon", "red", "url", "info", true, 0, true);

    ApplicationStatus status1 = new ApplicationStatus();
    ApplicationStatus status2 = new ApplicationStatus();

    app1.setStatus(status1);
    app2.setStatus(status2);

    // Status objects are different instances but empty, so applications should still be unequal
    // because ApplicationStatus doesn't override equals
    assertNotEquals(app1, app2);
  }

  @Test
  void testEqualityWithSameStatus() {
    Application app1 = new Application("App", "Group", "icon", "red", "url", "info", true, 0, true);
    Application app2 = new Application("App", "Group", "icon", "red", "url", "info", true, 0, true);

    ApplicationStatus status = new ApplicationStatus();

    app1.setStatus(status);
    app2.setStatus(status); // Same instance

    assertEquals(app1, app2);
    assertEquals(app1.hashCode(), app2.hashCode());
  }

  @Test
  void testInequalityDifferentStatus() {
    Application app1 = new Application("App", "Group", "icon", "red", "url", "info", true, 0, true);
    Application app2 = new Application("App", "Group", "icon", "red", "url", "info", true, 0, true);

    ApplicationStatus status1 = new ApplicationStatus();
    ApplicationStatus status2 = new ApplicationStatus();

    app1.setStatus(status1);
    app2.setStatus(status2);

    // Different status instances make applications unequal (ApplicationStatus uses default equals)
    assertNotEquals(app1, app2);
  }

  @Test
  void testEqualsWithNull() {
    Application app = new Application("App", "Group", "icon", "red", "url", "info", true, 0, true);
    assertNotEquals(null, app);
  }

  @Test
  void testSetSpecDirectly() {
    Application app = new Application();
    ApplicationSpec spec =
        new ApplicationSpec(
            "DirectApp", "Tools", "mdi:tool", "blue", "https://tool.com", "A tool", true, 3, true);
    app.setSpec(spec);

    assertEquals("DirectApp", app.getSpec().getName());
    assertEquals("Tools", app.getSpec().getGroup());
    assertEquals(3, app.getSpec().getLocation());
  }

  @Test
  void testSpecWithNullValues() {
    Application app = new Application(null, null, null, null, null, null, null, 0, null);
    ApplicationSpec spec = app.getSpec();

    assertNotNull(spec);
    assertNull(spec.getName());
    assertNull(spec.getGroup());
    assertNull(spec.getIcon());
    assertNull(spec.getUrl());
  }

  @Test
  void testConstructorWithEmptyStrings() {
    Application app = new Application("", "", "", "", "", "", false, 0, false);

    assertEquals("", app.getSpec().getName());
    assertEquals("", app.getSpec().getGroup());
    assertEquals("", app.getSpec().getIcon());
  }

  @Test
  void testConstructorWithSpecialCharacters() {
    Application app =
        new Application(
            "App/Name",
            "Group-Name",
            "mdi:test-icon",
            "#FF00FF",
            "https://example.com/path?param=value&other=123",
            "Info with special chars: <>&\"'",
            true,
            0,
            true);

    assertEquals("App/Name", app.getSpec().getName());
    assertEquals("Group-Name", app.getSpec().getGroup());
    assertEquals("#FF00FF", app.getSpec().getIconColor());
    assertTrue(app.getSpec().getUrl().contains("param=value"));
  }

  @Test
  void testConstructorWithMaxLocationValue() {
    Application app =
        new Application(
            "App", "Group", "icon", "red", "url", "info", true, Integer.MAX_VALUE, true);
    assertEquals(Integer.MAX_VALUE, app.getSpec().getLocation());
  }

  @Test
  void testConstructorWithMinLocationValue() {
    Application app =
        new Application(
            "App", "Group", "icon", "red", "url", "info", true, Integer.MIN_VALUE, true);
    assertEquals(Integer.MIN_VALUE, app.getSpec().getLocation());
  }

  @Test
  void testHashCodeConsistency() {
    Application app = new Application("App", "Group", "icon", "red", "url", "info", true, 5, true);
    int hash1 = app.hashCode();
    int hash2 = app.hashCode();

    assertEquals(hash1, hash2, "hashCode should be consistent across multiple calls");
  }

  @Test
  void testHashCodeChangesWithSpec() {
    Application app = new Application("App", "Group", "icon", "red", "url", "info", true, 5, true);
    int hash1 = app.hashCode();

    ApplicationSpec newSpec =
        new ApplicationSpec("NewApp", "Group", "icon", "red", "url", "info", true, 5, true);
    app.setSpec(newSpec);
    int hash2 = app.hashCode();

    assertNotEquals(hash1, hash2, "hashCode should change when spec changes");
  }

  @Test
  void testToStringNotNull() {
    Application app = new Application();
    assertNotNull(app.toString());
  }

  @Test
  void testConstructorWithRootPathOnly() {
    Application app =
        new Application(
            "PathApp",
            "Services",
            "mdi:path",
            "green",
            "https://service.com",
            "Service with path",
            false,
            10,
            true,
            "/api/v2");

    assertNotNull(app.getSpec());
    assertEquals("/api/v2", app.getSpec().getRootPath());
    assertNull(app.getSpec().getTags(), "Tags should be null when not specified");
  }

  @Test
  void testConstructorWithEmptyRootPath() {
    Application app =
        new Application("App", "Group", "icon", "color", "url", "info", true, 0, true, "");

    assertEquals("", app.getSpec().getRootPath());
  }

  @Test
  void testConstructorWithEmptyTags() {
    Application app =
        new Application("App", "Group", "icon", "color", "url", "info", true, 0, true, "/path", "");

    assertEquals("", app.getSpec().getTags());
  }

  @Test
  void testConstructorWithWhitespaceTags() {
    Application app =
        new Application(
            "App",
            "Group",
            "icon",
            "color",
            "url",
            "info",
            true,
            0,
            true,
            "/path",
            "  tag1  ,  tag2  ");

    assertEquals("  tag1  ,  tag2  ", app.getSpec().getTags());
  }

  @Test
  void testConstructorWithSingleTag() {
    Application app =
        new Application(
            "App", "Group", "icon", "color", "url", "info", true, 0, true, "/path", "production");

    assertEquals("production", app.getSpec().getTags());
  }

  @Test
  void testToStringIncludesRootPathAndTags() {
    Application app =
        new Application(
            "CompleteApp",
            "Tools",
            "mdi:complete",
            "purple",
            "https://complete.com",
            "Complete application",
            true,
            20,
            true,
            "/dashboard",
            "monitoring,critical");

    String result = app.toString();
    assertTrue(result.contains("CompleteApp"));
    assertTrue(result.contains("/dashboard"));
    assertTrue(result.contains("monitoring"));
  }
}
