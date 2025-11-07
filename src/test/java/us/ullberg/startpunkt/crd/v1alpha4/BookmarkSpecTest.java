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

  @Test
  void testComplexUrlWithQuery() {
    String complexUrl =
        "https://example.com:8080/path/to/resource?param1=value1&param2=value2#anchor";
    BookmarkSpec spec = new BookmarkSpec("App", "Group", "icon", complexUrl, "info", true, 0);

    assertEquals(complexUrl, spec.getUrl());
    assertTrue(spec.getUrl().contains("?"));
    assertTrue(spec.getUrl().contains("#"));
  }

  @Test
  void testUrlWithUnicode() {
    String unicodeUrl = "https://example.com/路径/資源";
    BookmarkSpec spec = new BookmarkSpec("App", "Group", "icon", unicodeUrl, "info", true, 0);

    assertEquals(unicodeUrl, spec.getUrl());
  }

  @Test
  void testInfoWithNewlines() {
    String infoWithNewlines = "Line 1\nLine 2\nLine 3";
    BookmarkSpec spec = new BookmarkSpec("App", "Group", "icon", "url", infoWithNewlines, true, 0);

    assertEquals(infoWithNewlines, spec.getInfo());
    assertTrue(spec.getInfo().contains("\n"));
  }

  @Test
  void testGroupNameCaseSensitivity() {
    BookmarkSpec specLower = new BookmarkSpec("App", "group", "icon", "url", "info", true, 0);
    BookmarkSpec specUpper = new BookmarkSpec("App", "GROUP", "icon", "url", "info", true, 0);

    assertNotEquals(specLower, specUpper, "Group names should be case-sensitive");
  }

  @Test
  void testNameCaseSensitivity() {
    BookmarkSpec specLower = new BookmarkSpec("app", "Group", "icon", "url", "info", true, 0);
    BookmarkSpec specUpper = new BookmarkSpec("APP", "Group", "icon", "url", "info", true, 0);

    assertNotEquals(specLower, specUpper, "Names should be case-sensitive");
  }

  @Test
  void testMultipleIconFormats() {
    BookmarkSpec mdiSpec = new BookmarkSpec("App1", "Group", "mdi:home", "url", "info", true, 0);
    BookmarkSpec urlSpec =
        new BookmarkSpec("App2", "Group", "https://example.com/icon.png", "url", "info", true, 0);
    BookmarkSpec emojiSpec = new BookmarkSpec("App3", "Group", "🏠", "url", "info", true, 0);

    assertEquals("mdi:home", mdiSpec.getIcon());
    assertEquals("https://example.com/icon.png", urlSpec.getIcon());
    assertEquals("🏠", emojiSpec.getIcon());
  }

  @Test
  void testComparisonConsistency() {
    BookmarkSpec spec1 = new BookmarkSpec("A", "Group", "icon", "url", "info", true, 1);
    BookmarkSpec spec2 = new BookmarkSpec("B", "Group", "icon", "url", "info", true, 1);
    BookmarkSpec spec3 = new BookmarkSpec("C", "Group", "icon", "url", "info", true, 1);

    // Transitivity: if A < B and B < C, then A < C
    assertTrue(spec1.compareTo(spec2) < 0);
    assertTrue(spec2.compareTo(spec3) < 0);
    assertTrue(spec1.compareTo(spec3) < 0);
  }

  @Test
  void testHashCodeDifferentForDifferentObjects() {
    BookmarkSpec spec1 = new BookmarkSpec("App1", "Group", "icon", "url", "info", true, 1);
    BookmarkSpec spec2 = new BookmarkSpec("App2", "Group", "icon", "url", "info", true, 1);

    // Not required by contract but typically different
    assertNotEquals(spec1.hashCode(), spec2.hashCode());
  }
}
