package us.ullberg.startpunkt.crd.v1alpha4;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

class BookmarkSpecTest {

  @Test
  void testConstructorAndGetters() {
    BookmarkSpec spec =
        new BookmarkSpec(
            "Grafana",
            "Monitoring",
            "mdi:chart-box",
            "https://grafana.example.com",
            "Grafana dashboards",
            true,
            5);

    assertEquals("Grafana", spec.getName());
    assertEquals("Monitoring", spec.getGroup());
    assertEquals("mdi:chart-box", spec.getIcon());
    assertEquals("https://grafana.example.com", spec.getUrl());
    assertEquals("Grafana dashboards", spec.getInfo());
    assertTrue(spec.getTargetBlank());
    assertEquals(5, spec.getLocation());
  }

  @Test
  void testSetters() {
    BookmarkSpec spec = new BookmarkSpec();
    spec.setName("Prometheus");
    spec.setGroup("Monitoring");
    spec.setIcon("mdi:chart-line");
    spec.setUrl("https://prometheus.example.com");
    spec.setInfo("Prometheus UI");
    spec.setTargetBlank(false);
    spec.setLocation(10);

    assertEquals("Prometheus", spec.getName());
    assertEquals("Monitoring", spec.getGroup());
    assertEquals("mdi:chart-line", spec.getIcon());
    assertEquals("https://prometheus.example.com", spec.getUrl());
    assertEquals("Prometheus UI", spec.getInfo());
    assertFalse(spec.getTargetBlank());
    assertEquals(10, spec.getLocation());
  }

  @Test
  void testEqualityAndHashCode() {
    BookmarkSpec a = new BookmarkSpec("App", "Group", "icon", "url", "info", true, 1);
    BookmarkSpec b = new BookmarkSpec("App", "Group", "icon", "url", "info", true, 1);
    BookmarkSpec c = new BookmarkSpec("Other", "Group", "icon", "url", "info", true, 1);

    assertEquals(a, b);
    assertEquals(a.hashCode(), b.hashCode());
    assertNotEquals(a, c);
  }

  @Test
  void testComparison() {
    BookmarkSpec a = new BookmarkSpec("A", "Dev", null, "url", null, false, 1);
    BookmarkSpec b = new BookmarkSpec("B", "Dev", null, "url", null, false, 2);
    BookmarkSpec c = new BookmarkSpec("C", "Prod", null, "url", null, false, 1);

    assertTrue(a.compareTo(b) < 0); // lower location
    assertTrue(b.compareTo(a) > 0);
    assertTrue(a.compareTo(c) < 0); // "Dev" < "Prod"
  }

  @Test
  void testToString() {
    BookmarkSpec spec = new BookmarkSpec("App", "Group", "icon", "url", "info", true, 1);
    String output = spec.toString();
    assertNotNull(output);
    assertTrue(output.contains("App"));
    assertTrue(output.contains("Group"));
  }

  @Test
  void testDefaultConstructor() {
    BookmarkSpec spec = new BookmarkSpec();
    assertNull(spec.getName());
    assertNull(spec.getGroup());
    assertNull(spec.getIcon());
    assertNull(spec.getUrl());
    assertNull(spec.getInfo());
    assertNull(spec.getTargetBlank());
    assertEquals(0, spec.getLocation());
  }

  @Test
  void testComparisonByLocation() {
    BookmarkSpec low = new BookmarkSpec("A", "Group", null, "url", null, false, 1);
    BookmarkSpec high = new BookmarkSpec("B", "Group", null, "url", null, false, 10);

    assertTrue(low.compareTo(high) < 0);
    assertTrue(high.compareTo(low) > 0);
    assertEquals(0, low.compareTo(low));
  }

  @Test
  void testComparisonByGroupThenLocation() {
    BookmarkSpec groupA = new BookmarkSpec("X", "A", null, "url", null, false, 5);
    BookmarkSpec groupB = new BookmarkSpec("Y", "B", null, "url", null, false, 1);

    // Group "A" < "B", regardless of location
    assertTrue(groupA.compareTo(groupB) < 0);
  }

  @Test
  void testComparisonByName() {
    BookmarkSpec alpha = new BookmarkSpec("Alpha", "Group", null, "url", null, false, 1);
    BookmarkSpec beta = new BookmarkSpec("Beta", "Group", null, "url", null, false, 1);

    assertTrue(alpha.compareTo(beta) < 0);
    assertTrue(beta.compareTo(alpha) > 0);
  }

  @Test
  void testEqualsWithNull() {
    BookmarkSpec spec = new BookmarkSpec("App", "Group", "icon", "url", "info", true, 1);
    assertNotEquals(spec, null);
  }

  @Test
  void testEqualsWithDifferentClass() {
    BookmarkSpec spec = new BookmarkSpec("App", "Group", "icon", "url", "info", true, 1);
    assertNotEquals(spec, "not a BookmarkSpec");
  }

  @Test
  void testEqualsSameInstance() {
    BookmarkSpec spec = new BookmarkSpec("App", "Group", "icon", "url", "info", true, 1);
    assertEquals(spec, spec);
  }

  @Test
  void testEqualsWithAllFieldsNull() {
    BookmarkSpec spec1 = new BookmarkSpec();
    BookmarkSpec spec2 = new BookmarkSpec();
    assertEquals(spec1, spec2);
    assertEquals(spec1.hashCode(), spec2.hashCode());
  }

  @Test
  void testEqualsWithPartiallyNullFields() {
    BookmarkSpec a = new BookmarkSpec("App", "Group", null, "url", null, null, 0);
    BookmarkSpec b = new BookmarkSpec("App", "Group", null, "url", null, null, 0);
    assertEquals(a, b);
  }

  @Test
  void testInequalityOnEachField() {
    BookmarkSpec base = new BookmarkSpec("App", "Group", "icon", "url", "info", true, 1);

    BookmarkSpec diffName = new BookmarkSpec("Other", "Group", "icon", "url", "info", true, 1);
    BookmarkSpec diffGroup = new BookmarkSpec("App", "Other", "icon", "url", "info", true, 1);
    BookmarkSpec diffIcon = new BookmarkSpec("App", "Group", "other", "url", "info", true, 1);
    BookmarkSpec diffUrl = new BookmarkSpec("App", "Group", "icon", "other", "info", true, 1);
    BookmarkSpec diffInfo = new BookmarkSpec("App", "Group", "icon", "url", "other", true, 1);
    BookmarkSpec diffTarget = new BookmarkSpec("App", "Group", "icon", "url", "info", false, 1);
    BookmarkSpec diffLocation = new BookmarkSpec("App", "Group", "icon", "url", "info", true, 2);

    assertNotEquals(base, diffName);
    assertNotEquals(base, diffGroup);
    assertNotEquals(base, diffIcon);
    assertNotEquals(base, diffUrl);
    assertNotEquals(base, diffInfo);
    assertNotEquals(base, diffTarget);
    assertNotEquals(base, diffLocation);
  }

  @Test
  void testHashCodeConsistency() {
    BookmarkSpec spec = new BookmarkSpec("App", "Group", "icon", "url", "info", true, 1);
    int hash1 = spec.hashCode();
    int hash2 = spec.hashCode();
    assertEquals(hash1, hash2);
  }

  @Test
  void testNegativeLocation() {
    BookmarkSpec spec = new BookmarkSpec("App", "Group", null, "url", null, true, -5);
    assertEquals(-5, spec.getLocation());
  }

  @Test
  void testLargeLocation() {
    BookmarkSpec spec =
        new BookmarkSpec("App", "Group", null, "url", null, true, Integer.MAX_VALUE);
    assertEquals(Integer.MAX_VALUE, spec.getLocation());
  }

  @Test
  void testToStringWithNullFields() {
    BookmarkSpec spec = new BookmarkSpec();
    String output = spec.toString();
    assertNotNull(output);
    assertTrue(output.contains("BookmarkSpec"));
  }
}
