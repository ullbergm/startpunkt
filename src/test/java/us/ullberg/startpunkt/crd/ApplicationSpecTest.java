package us.ullberg.startpunkt.crd.v1alpha3;

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
}
