package us.ullberg.startpunkt;

import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import us.ullberg.startpunkt.crd.BookmarkSpec;

import java.util.Arrays;
import java.util.LinkedList;
import java.util.List;

class BookmarkGroupTest {

  private BookmarkGroup bookmarkGroup;

  @BeforeEach
  void setUp() {
    bookmarkGroup = new BookmarkGroup("Group A");
  }

  @Test
  void testGetName() {
    Assertions.assertEquals("Group A", bookmarkGroup.getName());
  }

  @Test
  void testGetBookmarks() {
    List<BookmarkSpec> bookmarks = new LinkedList<>(Arrays.asList(new BookmarkSpec("Bookmark 1",
        "Group", "mdi:bookmark", "https://example.com/bookmark1", "Description 1", true, 0)));
    bookmarkGroup = new BookmarkGroup("Group A", bookmarks);

    Assertions.assertEquals(bookmarks, bookmarkGroup.getBookmarks());
  }

  @Test
  void testAddBookmark() {
    BookmarkSpec bookmark = new BookmarkSpec("Bookmark 1", "Group", "mdi:bookmark",
        "https://example.com/bookmark1", "Description 1", true, 0);
    bookmarkGroup.addBookmark(bookmark);

    Assertions.assertTrue(bookmarkGroup.getBookmarks().contains(bookmark));
  }

  @Test
  void testCompareTo() {
    BookmarkGroup otherGroup = new BookmarkGroup("Group B");

    Assertions.assertTrue(bookmarkGroup.compareTo(otherGroup) < 0);
    Assertions.assertTrue(otherGroup.compareTo(bookmarkGroup) > 0);
    Assertions.assertEquals(0, bookmarkGroup.compareTo(bookmarkGroup));
  }

  @Test
  void testEquals() {
    BookmarkGroup otherGroup = new BookmarkGroup("Group A");

    Assertions.assertEquals(bookmarkGroup, otherGroup);
  }

  @Test
  void testHashCode() {
    BookmarkGroup otherGroup = new BookmarkGroup("Group A");

    Assertions.assertEquals(bookmarkGroup.hashCode(), otherGroup.hashCode());
  }
}
