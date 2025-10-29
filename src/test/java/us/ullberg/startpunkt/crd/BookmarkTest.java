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
}
