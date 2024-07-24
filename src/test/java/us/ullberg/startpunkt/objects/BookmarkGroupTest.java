package us.ullberg.startpunkt.objects;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.lessThan;
import static org.junit.Assert.assertNotEquals;
import static org.junit.Assert.assertThat;
import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.Arrays;
import java.util.LinkedList;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import us.ullberg.startpunkt.crd.BookmarkSpec;

class BookmarkGroupTest {

  private BookmarkGroup applicationGroup;

  @BeforeEach
  void setUp() {
    applicationGroup = new BookmarkGroup("Group 1");
  }

  @Test
  void testGetName() {
    assertEquals("Group 1", applicationGroup.getName());
  }

  @Test
  void testGetBookmarks() {
    List<BookmarkSpec> applications = new LinkedList<>(Arrays.asList(new BookmarkSpec("Bookmark 1",
        "Group 1", "mdi:bookmark", "https://example.com/bookmark1", "Description 1", true, 0)));
    applicationGroup.addBookmark(applications.get(0));

    assertEquals(applications, applicationGroup.getBookmarks());
  }

  @Test
  void testAddBookmark() {
    BookmarkSpec newApp = new BookmarkSpec("Bookmark 1", "Group 1", "mdi:bookmark",
        "https://example.com/bookmark1", "Description 1", true, 0);
    applicationGroup.addBookmark(newApp);
    assertThat(applicationGroup.getBookmarks(), contains(newApp));
  }

  @Test
  void testCompareTo() {
    BookmarkGroup otherGroup = new BookmarkGroup("Group 2");
    assertThat(applicationGroup.compareTo(otherGroup), lessThan(0));
    assertThat(otherGroup.compareTo(applicationGroup), greaterThan(0));
    assertEquals(0, applicationGroup.compareTo(applicationGroup));
  }

  @Test
  void testEquals() {
    applicationGroup.addBookmark(new BookmarkSpec("Bookmark 3", "Group 1", "mdi:bookmark",
        "https://example.com/bookmark1", "Description 1", true, 0));

    BookmarkGroup sameGroup = new BookmarkGroup("Group 1");
    sameGroup.addBookmark(new BookmarkSpec("Bookmark 3", "Group 1", "mdi:bookmark",
        "https://example.com/bookmark1", "Description 1", true, 0));

    BookmarkGroup differentGroup = new BookmarkGroup("Group 2");
    differentGroup.addBookmark(new BookmarkSpec("Bookmark 3", "Group 2", "mdi:bookmark",
        "https://example.com/bookmark1", "Description 1", true, 0));

    BookmarkGroup differentGroup2 = new BookmarkGroup("Group 1");
    differentGroup2.addBookmark(new BookmarkSpec("Bookmark 1", "Group 1", "mdi:bookmark",
        "https://example.com/bookmark1", "Description 1", true, 0));

    assertEquals(applicationGroup, sameGroup);
    assertNotEquals(applicationGroup, differentGroup);
    assertNotEquals(applicationGroup, differentGroup2);
  }

  @Test
  void testHashCode() {
    BookmarkGroup sameGroup = new BookmarkGroup("Group 1");
    assertEquals(applicationGroup.hashCode(), sameGroup.hashCode());

    applicationGroup.addBookmark(new BookmarkSpec("Bookmark 1", "Group 1", "mdi:bookmark",
        "https://example.com/bookmark1", "Description 1", true, 0));
    sameGroup.addBookmark(new BookmarkSpec("Bookmark 1", "Group 1", "mdi:bookmark",
        "https://example.com/bookmark1", "Description 1", true, 0));

    assertEquals(applicationGroup.hashCode(), sameGroup.hashCode());
  }
}
