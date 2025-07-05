package us.ullberg.startpunkt.objects;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;

import java.util.Arrays;
import java.util.Collections;
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
    List<BookmarkSpec> applications =
        new LinkedList<>(
            Arrays.asList(
                new BookmarkSpec(
                    "Bookmark 1",
                    "Group 1",
                    "mdi:bookmark",
                    "https://example.com/bookmark1",
                    "Description 1",
                    true,
                    0)));
    applicationGroup.addBookmark(applications.get(0));

    assertEquals(applications, applicationGroup.getBookmarks());
  }

  @Test
  void testAddBookmark() {
    BookmarkSpec newApp =
        new BookmarkSpec(
            "Bookmark 1",
            "Group 1",
            "mdi:bookmark",
            "https://example.com/bookmark1",
            "Description 1",
            true,
            0);
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
    applicationGroup.addBookmark(
        new BookmarkSpec(
            "Bookmark 3",
            "Group 1",
            "mdi:bookmark",
            "https://example.com/bookmark1",
            "Description 1",
            true,
            0));

    BookmarkGroup sameGroup = new BookmarkGroup("Group 1");
    sameGroup.addBookmark(
        new BookmarkSpec(
            "Bookmark 3",
            "Group 1",
            "mdi:bookmark",
            "https://example.com/bookmark1",
            "Description 1",
            true,
            0));

    BookmarkGroup differentGroup = new BookmarkGroup("Group 2");
    differentGroup.addBookmark(
        new BookmarkSpec(
            "Bookmark 3",
            "Group 2",
            "mdi:bookmark",
            "https://example.com/bookmark1",
            "Description 1",
            true,
            0));

    BookmarkGroup differentGroup2 = new BookmarkGroup("Group 1");
    differentGroup2.addBookmark(
        new BookmarkSpec(
            "Bookmark 1",
            "Group 1",
            "mdi:bookmark",
            "https://example.com/bookmark1",
            "Description 1",
            true,
            0));

    assertEquals(applicationGroup, sameGroup);
    assertNotEquals(applicationGroup, differentGroup);
    assertNotEquals(applicationGroup, differentGroup2);
  }

  @Test
  void testHashCode() {
    BookmarkGroup sameGroup = new BookmarkGroup("Group 1");
    assertEquals(applicationGroup.hashCode(), sameGroup.hashCode());

    applicationGroup.addBookmark(
        new BookmarkSpec(
            "Bookmark 1",
            "Group 1",
            "mdi:bookmark",
            "https://example.com/bookmark1",
            "Description 1",
            true,
            0));
    sameGroup.addBookmark(
        new BookmarkSpec(
            "Bookmark 1",
            "Group 1",
            "mdi:bookmark",
            "https://example.com/bookmark1",
            "Description 1",
            true,
            0));

    assertEquals(applicationGroup.hashCode(), sameGroup.hashCode());
  }

  @Test
  void testConstructorWithNullNameThrowsException() {
    assertThrows(IllegalArgumentException.class, () -> new BookmarkGroup(null));
  }

  @Test
  void testConstructorWithEmptyNameThrowsException() {
    assertThrows(IllegalArgumentException.class, () -> new BookmarkGroup(""));
    assertThrows(IllegalArgumentException.class, () -> new BookmarkGroup("   "));
  }

  @Test
  void testConstructorWithNullBookmarksList() {
    BookmarkGroup group = new BookmarkGroup("Group", null);
    assertNotNull(group.getBookmarks());
    assertEquals(0, group.getBookmarks().size());
  }

  @Test
  void testAddNullBookmarkThrowsException() {
    BookmarkGroup group = new BookmarkGroup("Test Group");
    assertThrows(IllegalArgumentException.class, () -> group.addBookmark(null));
  }

  @Test
  void testBookmarksListIsUnmodifiable() {
    BookmarkGroup group = new BookmarkGroup("Immutable Group");
    group.addBookmark(
        new BookmarkSpec(
            "Bookmark 1",
            "Immutable Group",
            "mdi:bookmark",
            "https://example.com",
            "Desc",
            true,
            0));

    List<BookmarkSpec> bookmarks = group.getBookmarks();
    assertThrows(
        UnsupportedOperationException.class,
        () ->
            bookmarks.add(
                new BookmarkSpec(
                    "New",
                    "Immutable Group",
                    "mdi:bookmark",
                    "https://example.com",
                    "Desc",
                    true,
                    0)));
  }

  @Test
  void testEqualsWithNullAndDifferentClass() {
    BookmarkGroup group = new BookmarkGroup("Group");
    assertNotEquals(group, null);
    assertNotEquals(group, "Not a BookmarkGroup");
  }

  @Test
  void testToStringContainsNameAndBookmarks() {
    BookmarkGroup group = new BookmarkGroup("Group");
    group.addBookmark(
        new BookmarkSpec(
            "Bookmark 1", "Group", "mdi:bookmark", "https://example.com", "Desc", true, 0));

    String output = group.toString();
    assertTrue(output.contains("Group"));
    assertTrue(output.contains("Bookmark 1"));
  }

  @Test
  void testBookmarkGroupSorting() {
    BookmarkGroup groupA = new BookmarkGroup("Alpha");
    BookmarkGroup groupB = new BookmarkGroup("Beta");
    BookmarkGroup groupC = new BookmarkGroup("Charlie");

    List<BookmarkGroup> groups = Arrays.asList(groupC, groupA, groupB);
    Collections.sort(groups);

    assertThat(groups, contains(groupA, groupB, groupC));
  }
}
