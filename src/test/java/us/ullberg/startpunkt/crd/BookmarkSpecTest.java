package us.ullberg.startpunkt.crd.v1alpha2;

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
}
