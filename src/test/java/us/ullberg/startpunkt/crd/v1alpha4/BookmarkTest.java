package us.ullberg.startpunkt.crd.v1alpha4;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

class BookmarkTest {

  @Test
  void testBookmarkConstructorAndGetters() {
    Bookmark bookmark =
        new Bookmark(
            "Docs", "Reference", "mdi:book", "https://example.com", "Documentation link", true, 10);

    BookmarkSpec spec = bookmark.getSpec();

    assertNotNull(spec);
    assertEquals("Docs", spec.getName());
    assertEquals("Reference", spec.getGroup());
    assertEquals("mdi:book", spec.getIcon());
    assertEquals("https://example.com", spec.getUrl());
    assertEquals("Documentation link", spec.getInfo());
    assertTrue(spec.getTargetBlank());
    assertEquals(10, spec.getLocation());
  }

  @Test
  void testEqualsAndHashCode() {
    Bookmark a = new Bookmark("Docs", "Ref", "mdi:book", "https://docs", "link", true, 5);
    Bookmark b = new Bookmark("Docs", "Ref", "mdi:book", "https://docs", "link", true, 5);

    assertEquals(a, b);
    assertEquals(a.hashCode(), b.hashCode());

    // Modify b and check inequality
    b.getSpec().setName("Other");
    assertNotEquals(a, b);
  }

  @Test
  void testToStringContainsSpecFields() {
    Bookmark bookmark = new Bookmark("Name", "Group", "mdi:test", "https://url", "info", false, 0);

    String str = bookmark.toString();
    assertTrue(str.contains("spec"));
    assertTrue(str.contains("Name"));
    assertTrue(str.contains("Group"));
  }

  @Test
  void testDefaultConstructor() {
    Bookmark bookmark = new Bookmark();
    assertNull(bookmark.getSpec());
    assertNull(bookmark.getStatus());
  }

  @Test
  void testSetSpecDirectly() {
    Bookmark bookmark = new Bookmark();
    BookmarkSpec spec = new BookmarkSpec("Test", "Group", "icon", "url", "info", true, 5);
    bookmark.setSpec(spec);

    assertNotNull(bookmark.getSpec());
    assertEquals("Test", bookmark.getSpec().getName());
  }

  @Test
  void testSetStatus() {
    Bookmark bookmark = new Bookmark();
    BookmarkStatus status = new BookmarkStatus();
    bookmark.setStatus(status);

    assertNotNull(bookmark.getStatus());
    assertSame(status, bookmark.getStatus());
  }

  @Test
  void testEqualsSameInstance() {
    Bookmark bookmark = new Bookmark("Test", "Group", "icon", "url", "info", true, 0);
    assertEquals(bookmark, bookmark);
  }

  @Test
  void testEqualsWithNull() {
    Bookmark bookmark = new Bookmark("Test", "Group", "icon", "url", "info", true, 0);
    assertNotEquals(null, bookmark);
  }

  @Test
  void testEqualsWithDifferentType() {
    Bookmark bookmark = new Bookmark("Test", "Group", "icon", "url", "info", true, 0);
    assertNotEquals("not a bookmark", bookmark);
    assertNotEquals(Integer.valueOf(42), bookmark);
  }

  @Test
  void testHashCodeConsistency() {
    Bookmark bookmark = new Bookmark("Test", "Group", "icon", "url", "info", true, 5);
    int hash1 = bookmark.hashCode();
    int hash2 = bookmark.hashCode();

    assertEquals(hash1, hash2, "hashCode should be consistent");
  }

  @Test
  void testConstructorWithNullValues() {
    Bookmark bookmark = new Bookmark(null, null, null, null, null, null, 0);
    
    assertNotNull(bookmark.getSpec());
    assertNull(bookmark.getSpec().getName());
    assertNull(bookmark.getSpec().getGroup());
  }

  @Test
  void testConstructorWithEmptyStrings() {
    Bookmark bookmark = new Bookmark("", "", "", "", "", false, 0);
    
    assertEquals("", bookmark.getSpec().getName());
    assertEquals("", bookmark.getSpec().getGroup());
  }

  @Test
  void testConstructorWithSpecialCharacters() {
    Bookmark bookmark = new Bookmark(
        "Docs & Tutorials",
        "Help/Support",
        "mdi:help-circle",
        "https://example.com/docs?lang=en&version=1.0",
        "Help <info>",
        true,
        0);

    assertEquals("Docs & Tutorials", bookmark.getSpec().getName());
    assertEquals("Help/Support", bookmark.getSpec().getGroup());
    assertTrue(bookmark.getSpec().getUrl().contains("lang=en"));
  }

  @Test
  void testConstructorWithMaxLocation() {
    Bookmark bookmark = new Bookmark("Test", "Group", "icon", "url", "info", true, Integer.MAX_VALUE);
    assertEquals(Integer.MAX_VALUE, bookmark.getSpec().getLocation());
  }

  @Test
  void testConstructorWithMinLocation() {
    Bookmark bookmark = new Bookmark("Test", "Group", "icon", "url", "info", true, Integer.MIN_VALUE);
    assertEquals(Integer.MIN_VALUE, bookmark.getSpec().getLocation());
  }

  @Test
  void testToStringNotNull() {
    Bookmark bookmark = new Bookmark();
    assertNotNull(bookmark.toString());
  }

  @Test
  void testSpecAndStatusIndependence() {
    Bookmark bookmark = new Bookmark();
    assertNull(bookmark.getSpec());
    assertNull(bookmark.getStatus());

    BookmarkSpec spec = new BookmarkSpec("Test", "Group", "icon", "url", "info", true, 0);
    bookmark.setSpec(spec);
    assertNotNull(bookmark.getSpec());
    assertNull(bookmark.getStatus());

    BookmarkStatus status = new BookmarkStatus();
    bookmark.setStatus(status);
    assertNotNull(bookmark.getStatus());
  }

  @Test
  void testEqualsWithStatus() {
    Bookmark bookmark1 = new Bookmark("Test", "Group", "icon", "url", "info", true, 0);
    Bookmark bookmark2 = new Bookmark("Test", "Group", "icon", "url", "info", true, 0);

    BookmarkStatus status1 = new BookmarkStatus();
    BookmarkStatus status2 = new BookmarkStatus();

    bookmark1.setStatus(status1);
    bookmark2.setStatus(status2);

    // Different status instances make bookmarks unequal
    assertNotEquals(bookmark1, bookmark2);
  }

  @Test
  void testEqualsWithSameStatus() {
    Bookmark bookmark1 = new Bookmark("Test", "Group", "icon", "url", "info", true, 0);
    Bookmark bookmark2 = new Bookmark("Test", "Group", "icon", "url", "info", true, 0);

    BookmarkStatus status = new BookmarkStatus();

    bookmark1.setStatus(status);
    bookmark2.setStatus(status);

    assertEquals(bookmark1, bookmark2);
  }
}
