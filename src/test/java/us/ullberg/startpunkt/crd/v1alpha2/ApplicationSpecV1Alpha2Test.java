package us.ullberg.startpunkt.crd.v1alpha2;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

class ApplicationSpecV1Alpha2Test {

  @Test
  void testDefaultConstructor() {
    ApplicationSpec spec = new ApplicationSpec();
    assertNotNull(spec);
  }

  @Test
  void testFullConstructor() {
    ApplicationSpec spec =
        new ApplicationSpec(
            "MyApp",
            "Development",
            "mdi:application",
            "blue",
            "https://myapp.example.com",
            "My application description",
            true,
            10,
            true,
            "/api");

    assertEquals("MyApp", spec.getName());
    assertEquals("Development", spec.getGroup());
    assertEquals("mdi:application", spec.getIcon());
    assertEquals("blue", spec.getIconColor());
    assertEquals("https://myapp.example.com", spec.getUrl());
    assertEquals("My application description", spec.getInfo());
    assertTrue(spec.getTargetBlank());
    assertEquals(10, spec.getLocation());
    assertTrue(spec.getEnabled());
    assertEquals("/api", spec.getRootPath());
  }

  @Test
  void testSettersAndGetters() {
    ApplicationSpec spec = new ApplicationSpec();

    spec.setName("TestApp");
    spec.setGroup("Testing");
    spec.setIcon("mdi:test");
    spec.setIconColor("red");
    spec.setUrl("https://test.com");
    spec.setInfo("Test info");
    spec.setTargetBlank(false);
    spec.setLocation(5);
    spec.setEnabled(false);
    spec.setRootPath("/v1");

    assertEquals("TestApp", spec.getName());
    assertEquals("Testing", spec.getGroup());
    assertEquals("mdi:test", spec.getIcon());
    assertEquals("red", spec.getIconColor());
    assertEquals("https://test.com", spec.getUrl());
    assertEquals("Test info", spec.getInfo());
    assertFalse(spec.getTargetBlank());
    assertEquals(5, spec.getLocation());
    assertFalse(spec.getEnabled());
    assertEquals("/v1", spec.getRootPath());
  }

  @Test
  void testCompareToByGroup() {
    ApplicationSpec spec1 = new ApplicationSpec();
    spec1.setName("App1");
    spec1.setGroup("Alpha");
    spec1.setLocation(1);

    ApplicationSpec spec2 = new ApplicationSpec();
    spec2.setName("App2");
    spec2.setGroup("Beta");
    spec2.setLocation(1);

    assertTrue(spec1.compareTo(spec2) < 0);
    assertTrue(spec2.compareTo(spec1) > 0);
  }

  @Test
  void testCompareToByLocation() {
    ApplicationSpec spec1 = new ApplicationSpec();
    spec1.setName("App1");
    spec1.setGroup("Group");
    spec1.setLocation(1);

    ApplicationSpec spec2 = new ApplicationSpec();
    spec2.setName("App2");
    spec2.setGroup("Group");
    spec2.setLocation(2);

    assertTrue(spec1.compareTo(spec2) < 0);
    assertTrue(spec2.compareTo(spec1) > 0);
  }

  @Test
  void testCompareToByName() {
    ApplicationSpec spec1 = new ApplicationSpec();
    spec1.setName("AppA");
    spec1.setGroup("Group");
    spec1.setLocation(1);

    ApplicationSpec spec2 = new ApplicationSpec();
    spec2.setName("AppB");
    spec2.setGroup("Group");
    spec2.setLocation(1);

    assertTrue(spec1.compareTo(spec2) < 0);
    assertTrue(spec2.compareTo(spec1) > 0);
    assertEquals(0, spec1.compareTo(spec1));
  }

  @Test
  void testEquals() {
    ApplicationSpec spec1 =
        new ApplicationSpec("App", "Group", "icon", "color", "url", "info", true, 1, true, "/root");
    ApplicationSpec spec2 =
        new ApplicationSpec("App", "Group", "icon", "color", "url", "info", true, 1, true, "/root");
    ApplicationSpec spec3 =
        new ApplicationSpec(
            "DiffApp", "Group", "icon", "color", "url", "info", true, 1, true, "/root");

    assertEquals(spec1, spec2);
    assertNotEquals(spec1, spec3);
    assertNotEquals(spec1, null);
    assertNotEquals(spec1, "not an ApplicationSpec");
    assertEquals(spec1, spec1);
  }

  @Test
  void testHashCode() {
    ApplicationSpec spec1 =
        new ApplicationSpec("App", "Group", "icon", "color", "url", "info", true, 1, true, "/root");
    ApplicationSpec spec2 =
        new ApplicationSpec("App", "Group", "icon", "color", "url", "info", true, 1, true, "/root");

    assertEquals(spec1.hashCode(), spec2.hashCode());
  }

  @Test
  void testToString() {
    ApplicationSpec spec = new ApplicationSpec();
    spec.setName("TestApp");
    spec.setGroup("TestGroup");

    String result = spec.toString();
    assertNotNull(result);
    assertTrue(result.contains("TestApp"));
    assertTrue(result.contains("TestGroup"));
  }

  @Test
  void testNullValues() {
    ApplicationSpec spec = new ApplicationSpec();
    assertNull(spec.getName());
    assertNull(spec.getGroup());
    assertNull(spec.getIcon());
    assertNull(spec.getIconColor());
    assertNull(spec.getUrl());
    assertNull(spec.getInfo());
    assertNull(spec.getTargetBlank());
    assertEquals(1000, spec.getLocation());
    assertNull(spec.getEnabled());
    assertNull(spec.getRootPath());
  }

  @Test
  void testEqualsWithNullFields() {
    ApplicationSpec spec1 = new ApplicationSpec();
    ApplicationSpec spec2 = new ApplicationSpec();

    assertEquals(spec1, spec2);
    assertEquals(spec1.hashCode(), spec2.hashCode());
  }

  @Test
  void testEqualsWithDifferentFields() {
    ApplicationSpec base = new ApplicationSpec();
    base.setName("App");
    base.setGroup("Group");

    ApplicationSpec diffName = new ApplicationSpec();
    diffName.setName("DiffApp");
    diffName.setGroup("Group");

    ApplicationSpec diffGroup = new ApplicationSpec();
    diffGroup.setName("App");
    diffGroup.setGroup("DiffGroup");

    assertNotEquals(base, diffName);
    assertNotEquals(base, diffGroup);
  }

  @Test
  void testCompareToWithNullHandling() {
    ApplicationSpec spec1 = new ApplicationSpec();
    spec1.setName("App1");
    spec1.setGroup("Group");

    ApplicationSpec spec2 = new ApplicationSpec();
    spec2.setName("App2");
    spec2.setGroup("Group");

    // Both have same group and location (0), should compare by name
    assertTrue(spec1.compareTo(spec2) < 0);
  }
}
