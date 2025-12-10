package us.ullberg.startpunkt.crd.v1alpha2;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

class BookmarkSpecV1Alpha2Test {

  @Test
  void testDefaultConstructor() {
    BookmarkSpec spec = new BookmarkSpec();
    assertNotNull(spec);
  }

  @Test
  void testFullConstructor() {
    BookmarkSpec spec =
        new BookmarkSpec(
            "GitHub",
            "Development",
            "mdi:github",
            "https://github.com",
            "GitHub homepage",
            true,
            5);

    assertEquals("GitHub", spec.getName());
    assertEquals("Development", spec.getGroup());
    assertEquals("mdi:github", spec.getIcon());
    assertEquals("https://github.com", spec.getUrl());
    assertEquals("GitHub homepage", spec.getInfo());
    assertTrue(spec.getTargetBlank());
    assertEquals(5, spec.getLocation());
  }

  @Test
  void testSettersAndGetters() {
    BookmarkSpec spec = new BookmarkSpec();

    spec.setName("Docs");
    spec.setGroup("Resources");
    spec.setIcon("mdi:book");
    spec.setUrl("https://docs.example.com");
    spec.setInfo("Documentation");
    spec.setTargetBlank(false);
    spec.setLocation(10);

    assertEquals("Docs", spec.getName());
    assertEquals("Resources", spec.getGroup());
    assertEquals("mdi:book", spec.getIcon());
    assertEquals("https://docs.example.com", spec.getUrl());
    assertEquals("Documentation", spec.getInfo());
    assertFalse(spec.getTargetBlank());
    assertEquals(10, spec.getLocation());
  }

  @Test
  void testCompareToByGroup() {
    BookmarkSpec spec1 = new BookmarkSpec();
    spec1.setName("Bookmark1");
    spec1.setGroup("Alpha");
    spec1.setLocation(1);

    BookmarkSpec spec2 = new BookmarkSpec();
    spec2.setName("Bookmark2");
    spec2.setGroup("Beta");
    spec2.setLocation(1);

    assertTrue(spec1.compareTo(spec2) < 0);
    assertTrue(spec2.compareTo(spec1) > 0);
  }

  @Test
  void testCompareToByLocation() {
    BookmarkSpec spec1 = new BookmarkSpec();
    spec1.setName("Bookmark1");
    spec1.setGroup("Group");
    spec1.setLocation(1);

    BookmarkSpec spec2 = new BookmarkSpec();
    spec2.setName("Bookmark2");
    spec2.setGroup("Group");
    spec2.setLocation(2);

    assertTrue(spec1.compareTo(spec2) < 0);
    assertTrue(spec2.compareTo(spec1) > 0);
  }

  @Test
  void testCompareToByName() {
    BookmarkSpec spec1 = new BookmarkSpec();
    spec1.setName("BookmarkA");
    spec1.setGroup("Group");
    spec1.setLocation(1);

    BookmarkSpec spec2 = new BookmarkSpec();
    spec2.setName("BookmarkB");
    spec2.setGroup("Group");
    spec2.setLocation(1);

    assertTrue(spec1.compareTo(spec2) < 0);
    assertTrue(spec2.compareTo(spec1) > 0);
    assertEquals(0, spec1.compareTo(spec1));
  }

  @Test
  void testEquals() {
    BookmarkSpec spec1 = new BookmarkSpec("Bookmark", "Group", "icon", "url", "info", true, 1);
    BookmarkSpec spec2 = new BookmarkSpec("Bookmark", "Group", "icon", "url", "info", true, 1);
    BookmarkSpec spec3 = new BookmarkSpec("Different", "Group", "icon", "url", "info", true, 1);

    assertEquals(spec1, spec2);
    assertNotEquals(spec1, spec3);
    assertNotEquals(spec1, null);
    assertNotEquals(spec1, "not a BookmarkSpec");
    assertEquals(spec1, spec1);
  }

  @Test
  void testHashCode() {
    BookmarkSpec spec1 = new BookmarkSpec("Bookmark", "Group", "icon", "url", "info", true, 1);
    BookmarkSpec spec2 = new BookmarkSpec("Bookmark", "Group", "icon", "url", "info", true, 1);

    assertEquals(spec1.hashCode(), spec2.hashCode());
  }

  @Test
  void testToString() {
    BookmarkSpec spec = new BookmarkSpec();
    spec.setName("TestBookmark");
    spec.setGroup("TestGroup");

    String result = spec.toString();
    assertNotNull(result);
    assertTrue(result.contains("TestBookmark"));
    assertTrue(result.contains("TestGroup"));
  }

  @Test
  void testNullValues() {
    BookmarkSpec spec = new BookmarkSpec();
    assertNull(spec.getName());
    assertNull(spec.getGroup());
    assertNull(spec.getIcon());
    assertNull(spec.getUrl());
    assertNull(spec.getInfo());
    assertNull(spec.getTargetBlank());
    assertEquals(1000, spec.getLocation());
  }

  @Test
  void testEqualsWithNullFields() {
    BookmarkSpec spec1 = new BookmarkSpec();
    BookmarkSpec spec2 = new BookmarkSpec();

    assertEquals(spec1, spec2);
    assertEquals(spec1.hashCode(), spec2.hashCode());
  }

  @Test
  void testEqualsWithDifferentLocation() {
    BookmarkSpec spec1 = new BookmarkSpec("B", "G", "i", "u", "info", true, 1);
    BookmarkSpec spec2 = new BookmarkSpec("B", "G", "i", "u", "info", true, 2);

    assertNotEquals(spec1, spec2);
  }

  @Test
  void testEqualsWithDifferentName() {
    BookmarkSpec spec1 = new BookmarkSpec("Name1", "G", "i", "u", "info", true, 1);
    BookmarkSpec spec2 = new BookmarkSpec("Name2", "G", "i", "u", "info", true, 1);

    assertNotEquals(spec1, spec2);
  }

  @Test
  void testEqualsWithDifferentGroup() {
    BookmarkSpec spec1 = new BookmarkSpec("B", "Group1", "i", "u", "info", true, 1);
    BookmarkSpec spec2 = new BookmarkSpec("B", "Group2", "i", "u", "info", true, 1);

    assertNotEquals(spec1, spec2);
  }

  @Test
  void testEqualsWithDifferentIcon() {
    BookmarkSpec spec1 = new BookmarkSpec("B", "G", "icon1", "u", "info", true, 1);
    BookmarkSpec spec2 = new BookmarkSpec("B", "G", "icon2", "u", "info", true, 1);

    assertNotEquals(spec1, spec2);
  }

  @Test
  void testEqualsWithDifferentUrl() {
    BookmarkSpec spec1 = new BookmarkSpec("B", "G", "i", "url1", "info", true, 1);
    BookmarkSpec spec2 = new BookmarkSpec("B", "G", "i", "url2", "info", true, 1);

    assertNotEquals(spec1, spec2);
  }

  @Test
  void testEqualsWithDifferentInfo() {
    BookmarkSpec spec1 = new BookmarkSpec("B", "G", "i", "u", "info1", true, 1);
    BookmarkSpec spec2 = new BookmarkSpec("B", "G", "i", "u", "info2", true, 1);

    assertNotEquals(spec1, spec2);
  }

  @Test
  void testEqualsWithDifferentTargetBlank() {
    BookmarkSpec spec1 = new BookmarkSpec("B", "G", "i", "u", "info", true, 1);
    BookmarkSpec spec2 = new BookmarkSpec("B", "G", "i", "u", "info", false, 1);

    assertNotEquals(spec1, spec2);
  }
}
