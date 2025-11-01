package us.ullberg.startpunkt.crd.v1alpha4;

import static org.junit.jupiter.api.Assertions.*;

import java.util.List;
import java.util.Set;
import java.util.TreeSet;
import org.junit.jupiter.api.Test;

class ApplicationSpecTest {

  @Test
  void testDefaultConstructor() {
    ApplicationSpec spec = new ApplicationSpec();
    assertNull(spec.getName());
    assertEquals(0, spec.getLocation());
  }

  @Test
  void testParameterizedConstructor() {
    ApplicationSpec spec =
        new ApplicationSpec(
            "App", "Group", "mdi:icon", "blue", "https://app.example.com", "Info", true, 42, true);

    assertEquals("App", spec.getName());
    assertEquals("Group", spec.getGroup());
    assertEquals("mdi:icon", spec.getIcon());
    assertEquals("blue", spec.getIconColor());
    assertEquals("https://app.example.com", spec.getUrl());
    assertEquals("Info", spec.getInfo());
    assertTrue(spec.getTargetBlank());
    assertEquals(42, spec.getLocation());
    assertTrue(spec.getEnabled());
  }

  @Test
  void testEqualsAndHashCode() {
    ApplicationSpec a = new ApplicationSpec("App", "Group", null, null, "url", null, true, 0, true);
    ApplicationSpec b = new ApplicationSpec("App", "Group", null, null, "url", null, true, 0, true);
    ApplicationSpec c =
        new ApplicationSpec("Other", "Group", null, null, "url", null, true, 0, true);

    assertEquals(a, b);
    assertNotEquals(a, c);
    assertEquals(a.hashCode(), b.hashCode());
    assertNotEquals(a.hashCode(), c.hashCode());
  }

  @Test
  void testCompareTo_Sorting() {
    ApplicationSpec app1 =
        new ApplicationSpec("Alpha", "GroupA", null, null, "url", null, true, 1, true);
    ApplicationSpec app2 =
        new ApplicationSpec("Beta", "GroupA", null, null, "url", null, true, 1, true);
    ApplicationSpec app3 =
        new ApplicationSpec("Zeta", "GroupA", null, null, "url", null, true, 0, true);
    ApplicationSpec app4 =
        new ApplicationSpec("Gamma", "GroupB", null, null, "url", null, true, 1, true);

    List<ApplicationSpec> sorted = List.of(app1, app2, app3, app4).stream().sorted().toList();

    assertEquals("GroupA", sorted.get(0).getGroup());
    assertEquals("Zeta", sorted.get(0).getName()); // lowest location wins
    assertEquals("Alpha", sorted.get(1).getName());
    assertEquals("Beta", sorted.get(2).getName());
    assertEquals("Gamma", sorted.get(3).getName());
  }

  @Test
  void testCompareTo_ConsistentWithTreeSet() {
    ApplicationSpec app1 =
        new ApplicationSpec("Alpha", "A", null, null, "url", null, true, 1, true);
    ApplicationSpec app2 = new ApplicationSpec("Beta", "A", null, null, "url", null, true, 2, true);
    ApplicationSpec app3 =
        new ApplicationSpec("Gamma", "B", null, null, "url", null, true, 1, true);

    Set<ApplicationSpec> set = new TreeSet<>(Set.of(app3, app1, app2));

    assertEquals(3, set.size());
    assertEquals("Alpha", set.iterator().next().getName());
  }

  @Test
  void testToStringIncludesFields() {
    ApplicationSpec spec =
        new ApplicationSpec(
            "App", "Group", "mdi:test", "red", "https://url", "Info", false, 3, true);
    String output = spec.toString();

    assertTrue(output.contains("App"));
    assertTrue(output.contains("Group"));
    assertTrue(output.contains("mdi:test"));
    assertTrue(output.contains("https://url"));
  }

  @Test
  void testSettersAndGetters() {
    ApplicationSpec spec = new ApplicationSpec();

    spec.setName("TestApp");
    spec.setGroup("Tools");
    spec.setIcon("mdi:hammer");
    spec.setIconColor("gray");
    spec.setUrl("https://tools.example.com");
    spec.setInfo("Tool description");
    spec.setTargetBlank(true);
    spec.setLocation(7);
    spec.setEnabled(false);

    assertEquals("TestApp", spec.getName());
    assertEquals("Tools", spec.getGroup());
    assertEquals("mdi:hammer", spec.getIcon());
    assertEquals("gray", spec.getIconColor());
    assertEquals("https://tools.example.com", spec.getUrl());
    assertEquals("Tool description", spec.getInfo());
    assertTrue(spec.getTargetBlank());
    assertEquals(7, spec.getLocation());
    assertFalse(spec.getEnabled());
  }

  @Test
  void testRootPathSetterGetter() {
    ApplicationSpec spec = new ApplicationSpec();
    assertNull(spec.getRootPath());

    spec.setRootPath("/api/v1");
    assertEquals("/api/v1", spec.getRootPath());
  }

  @Test
  void testTagsSetterGetter() {
    ApplicationSpec spec = new ApplicationSpec();
    assertNull(spec.getTags());

    spec.setTags("monitoring,production,critical");
    assertEquals("monitoring,production,critical", spec.getTags());
  }

  @Test
  void testConstructorWithRootPath() {
    ApplicationSpec spec =
        new ApplicationSpec(
            "App",
            "Group",
            "mdi:icon",
            "blue",
            "https://app.example.com",
            "Info",
            true,
            42,
            true,
            "/dashboard");

    assertEquals("App", spec.getName());
    assertEquals("/dashboard", spec.getRootPath());
    assertNull(spec.getTags());
  }

  @Test
  void testConstructorWithRootPathAndTags() {
    ApplicationSpec spec =
        new ApplicationSpec(
            "App",
            "Group",
            "mdi:icon",
            "blue",
            "https://app.example.com",
            "Info",
            true,
            42,
            true,
            "/api",
            "dev,testing");

    assertEquals("App", spec.getName());
    assertEquals("/api", spec.getRootPath());
    assertEquals("dev,testing", spec.getTags());
  }

  @Test
  void testUrlFromSetterGetter() {
    ApplicationSpec spec = new ApplicationSpec();
    assertNull(spec.getUrlFrom());

    UrlFrom urlFrom = new UrlFrom("core", "v1", "Service", "my-service", "default", "spec.host");
    spec.setUrlFrom(urlFrom);

    assertNotNull(spec.getUrlFrom());
    assertEquals("my-service", spec.getUrlFrom().getName());
  }

  @Test
  void testEqualsWithRootPathAndTags() {
    ApplicationSpec a =
        new ApplicationSpec(
            "App", "Group", null, null, "url", null, true, 0, true, "/path", "tag1,tag2");
    ApplicationSpec b =
        new ApplicationSpec(
            "App", "Group", null, null, "url", null, true, 0, true, "/path", "tag1,tag2");
    ApplicationSpec c =
        new ApplicationSpec(
            "App", "Group", null, null, "url", null, true, 0, true, "/other", "tag1,tag2");

    assertEquals(a, b);
    assertNotEquals(a, c);
  }

  @Test
  void testHashCodeWithRootPathAndTags() {
    ApplicationSpec a =
        new ApplicationSpec(
            "App", "Group", null, null, "url", null, true, 0, true, "/path", "tag1");
    ApplicationSpec b =
        new ApplicationSpec(
            "App", "Group", null, null, "url", null, true, 0, true, "/path", "tag1");

    assertEquals(a.hashCode(), b.hashCode());
  }

  @Test
  void testToStringIncludesRootPathAndTags() {
    ApplicationSpec spec =
        new ApplicationSpec(
            "App",
            "Group",
            "mdi:test",
            "red",
            "https://url",
            "Info",
            false,
            3,
            true,
            "/api",
            "prod");
    String output = spec.toString();

    assertTrue(output.contains("/api"));
    assertTrue(output.contains("prod"));
  }

  @Test
  void testCompareToIgnoresRootPathAndTags() {
    // compareTo should sort by group, location, name - not affected by rootPath/tags
    ApplicationSpec app1 =
        new ApplicationSpec(
            "Alpha", "GroupA", null, null, "url1", null, true, 1, true, "/path1", "tag1");
    ApplicationSpec app2 =
        new ApplicationSpec(
            "Alpha", "GroupA", null, null, "url2", null, true, 1, true, "/path2", "tag2");

    assertEquals(0, app1.compareTo(app2), "Should compare equal despite different rootPath/tags");
  }

  @Test
  void testNullSafetyInEquals() {
    ApplicationSpec spec1 =
        new ApplicationSpec("App", "Group", null, null, "url", null, null, 0, null);
    ApplicationSpec spec2 =
        new ApplicationSpec("App", "Group", null, null, "url", null, null, 0, null);

    assertEquals(spec1, spec2);
  }

  @Test
  void testUrlFromInEquality() {
    UrlFrom urlFrom1 = new UrlFrom("core", "v1", "Service", "svc1", "default", "spec.host");
    UrlFrom urlFrom2 = new UrlFrom("core", "v1", "Service", "svc2", "default", "spec.host");

    ApplicationSpec spec1 =
        new ApplicationSpec("App", "Group", null, null, null, null, true, 0, true);
    spec1.setUrlFrom(urlFrom1);

    ApplicationSpec spec2 =
        new ApplicationSpec("App", "Group", null, null, null, null, true, 0, true);
    spec2.setUrlFrom(urlFrom2);

    assertNotEquals(spec1, spec2, "Specs with different urlFrom should not be equal");
  }

  @Test
  void testCompareToWithNullValues() {
    ApplicationSpec spec1 = new ApplicationSpec();
    spec1.setName("A");
    spec1.setGroup("Group");

    ApplicationSpec spec2 = new ApplicationSpec();
    spec2.setName("B");
    spec2.setGroup("Group");

    assertTrue(spec1.compareTo(spec2) < 0);
  }

  @Test
  void testHashCodeIncludesAllFields() {
    ApplicationSpec spec1 =
        new ApplicationSpec(
            "App", "Group", "icon", "color", "url", "info", true, 5, true, "/path", "tags");
    UrlFrom urlFrom = new UrlFrom("core", "v1", "Service", "svc", "default", "spec.host");
    spec1.setUrlFrom(urlFrom);

    ApplicationSpec spec2 =
        new ApplicationSpec(
            "App", "Group", "icon", "color", "url", "info", true, 5, true, "/path", "tags");
    spec2.setUrlFrom(urlFrom);

    assertEquals(spec1.hashCode(), spec2.hashCode());
  }

  @Test
  void testEqualsWithDifferentClass() {
    ApplicationSpec spec =
        new ApplicationSpec("App", "Group", null, null, "url", null, true, 0, true);
    assertNotEquals(spec, "not a spec");
    assertNotEquals(spec, Integer.valueOf(42));
  }

  @Test
  void testEqualsSameInstance() {
    ApplicationSpec spec =
        new ApplicationSpec("App", "Group", null, null, "url", null, true, 0, true);
    assertEquals(spec, spec);
  }

  @Test
  void testCompareToEdgeCases() {
    ApplicationSpec spec1 =
        new ApplicationSpec("Alpha", "A", null, null, "url", null, true, 1, true);
    ApplicationSpec spec2 =
        new ApplicationSpec("Beta", "A", null, null, "url", null, true, 1, true);
    ApplicationSpec spec3 =
        new ApplicationSpec("Alpha", "B", null, null, "url", null, true, 1, true);

    assertTrue(spec1.compareTo(spec2) < 0, "Should sort by name when group and location are same");
    assertTrue(spec1.compareTo(spec3) < 0, "Should sort by group first");
  }

  @Test
  void testEqualsWithAllNullFields() {
    ApplicationSpec spec1 = new ApplicationSpec();
    ApplicationSpec spec2 = new ApplicationSpec();

    assertEquals(spec1, spec2);
    assertEquals(spec1.hashCode(), spec2.hashCode());
  }

  @Test
  void testEqualsWithPartiallyNullFields() {
    ApplicationSpec spec1 =
        new ApplicationSpec("App", null, null, null, "url", null, null, 0, null);
    ApplicationSpec spec2 =
        new ApplicationSpec("App", null, null, null, "url", null, null, 0, null);

    assertEquals(spec1, spec2);
  }

  @Test
  void testInequalityOnEachField() {
    ApplicationSpec base =
        new ApplicationSpec(
            "App", "Group", "icon", "color", "url", "info", true, 5, true, "/path", "tags");

    ApplicationSpec diffName =
        new ApplicationSpec(
            "Other", "Group", "icon", "color", "url", "info", true, 5, true, "/path", "tags");
    ApplicationSpec diffGroup =
        new ApplicationSpec(
            "App", "Other", "icon", "color", "url", "info", true, 5, true, "/path", "tags");
    ApplicationSpec diffIcon =
        new ApplicationSpec(
            "App", "Group", "other", "color", "url", "info", true, 5, true, "/path", "tags");
    ApplicationSpec diffColor =
        new ApplicationSpec(
            "App", "Group", "icon", "other", "url", "info", true, 5, true, "/path", "tags");
    ApplicationSpec diffUrl =
        new ApplicationSpec(
            "App", "Group", "icon", "color", "other", "info", true, 5, true, "/path", "tags");
    ApplicationSpec diffInfo =
        new ApplicationSpec(
            "App", "Group", "icon", "color", "url", "other", true, 5, true, "/path", "tags");
    ApplicationSpec diffTarget =
        new ApplicationSpec(
            "App", "Group", "icon", "color", "url", "info", false, 5, true, "/path", "tags");
    ApplicationSpec diffLocation =
        new ApplicationSpec(
            "App", "Group", "icon", "color", "url", "info", true, 10, true, "/path", "tags");
    ApplicationSpec diffEnabled =
        new ApplicationSpec(
            "App", "Group", "icon", "color", "url", "info", true, 5, false, "/path", "tags");
    ApplicationSpec diffPath =
        new ApplicationSpec(
            "App", "Group", "icon", "color", "url", "info", true, 5, true, "/other", "tags");
    ApplicationSpec diffTags =
        new ApplicationSpec(
            "App", "Group", "icon", "color", "url", "info", true, 5, true, "/path", "other");

    assertNotEquals(base, diffName);
    assertNotEquals(base, diffGroup);
    assertNotEquals(base, diffIcon);
    assertNotEquals(base, diffColor);
    assertNotEquals(base, diffUrl);
    assertNotEquals(base, diffInfo);
    assertNotEquals(base, diffTarget);
    assertNotEquals(base, diffLocation);
    assertNotEquals(base, diffEnabled);
    assertNotEquals(base, diffPath);
    assertNotEquals(base, diffTags);
  }

  @Test
  void testToStringWithAllFieldsNull() {
    ApplicationSpec spec = new ApplicationSpec();
    String output = spec.toString();

    assertNotNull(output);
    assertTrue(output.contains("ApplicationSpec"));
  }

  @Test
  void testLocationNegativeValue() {
    ApplicationSpec spec =
        new ApplicationSpec("App", "Group", null, null, "url", null, true, -1, true);
    assertEquals(-1, spec.getLocation());

    ApplicationSpec spec2 =
        new ApplicationSpec("App", "Group", null, null, "url", null, true, 0, true);
    assertTrue(spec.compareTo(spec2) < 0, "Negative location should sort before zero");
  }
}
