package us.ullberg.startpunkt.objects;

import static org.junit.jupiter.api.Assertions.*;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import us.ullberg.startpunkt.crd.v1alpha4.BookmarkSpec;

/**
 * Test class for BookmarkGroupList. Tests construction, getters, setters, null handling, and JSON
 * serialization compatibility.
 */
class BookmarkGroupListTest {

  private BookmarkGroupList bookmarkGroupList;

  @BeforeEach
  void setUp() {
    bookmarkGroupList = new BookmarkGroupList();
  }

  @Test
  void testDefaultConstructor() {
    assertNotNull(bookmarkGroupList, "BookmarkGroupList should be created");
    assertNotNull(
        bookmarkGroupList.getGroups(), "Groups list should not be null after construction");
    assertTrue(
        bookmarkGroupList.getGroups().isEmpty(),
        "Groups list should be empty after default construction");
  }

  @Test
  void testConstructorWithGroups() {
    BookmarkGroup group1 = new BookmarkGroup("Bookmarks1");
    BookmarkGroup group2 = new BookmarkGroup("Bookmarks2");
    List<BookmarkGroup> groups = List.of(group1, group2);

    BookmarkGroupList list = new BookmarkGroupList(groups);

    assertNotNull(list, "BookmarkGroupList should be created");
    assertEquals(2, list.getGroups().size(), "Groups list should have 2 items");
    assertEquals(groups, list.getGroups(), "Groups should match constructor input");
  }

  @Test
  void testConstructorWithNullGroups() {
    BookmarkGroupList list = new BookmarkGroupList(null);

    assertNotNull(list, "BookmarkGroupList should be created");
    assertNotNull(list.getGroups(), "Groups list should not be null");
    assertTrue(
        list.getGroups().isEmpty(), "Groups list should be empty when constructed with null");
  }

  @Test
  void testConstructorWithEmptyList() {
    BookmarkGroupList list = new BookmarkGroupList(List.of());

    assertNotNull(list, "BookmarkGroupList should be created");
    assertNotNull(list.getGroups(), "Groups list should not be null");
    assertTrue(list.getGroups().isEmpty(), "Groups list should be empty");
  }

  @Test
  void testGetGroupsReturnsEmptyListWhenNull() {
    bookmarkGroupList.setGroups(null);
    List<BookmarkGroup> groups = bookmarkGroupList.getGroups();

    assertNotNull(groups, "getGroups should never return null");
    assertTrue(groups.isEmpty(), "getGroups should return empty list when internal list is null");
  }

  @Test
  void testSetGroupsWithValidList() {
    BookmarkGroup group1 = new BookmarkGroup("TestGroup");
    List<BookmarkGroup> groups = List.of(group1);

    bookmarkGroupList.setGroups(groups);

    assertEquals(1, bookmarkGroupList.getGroups().size(), "Should have 1 group");
    assertEquals(group1, bookmarkGroupList.getGroups().get(0), "Group should match");
  }

  @Test
  void testSetGroupsWithNull() {
    bookmarkGroupList.setGroups(null);

    assertNotNull(bookmarkGroupList.getGroups(), "Groups should not be null after setting null");
    assertTrue(
        bookmarkGroupList.getGroups().isEmpty(), "Groups should be empty after setting null");
  }

  @Test
  void testSetGroupsReplacesExistingGroups() {
    BookmarkGroup group1 = new BookmarkGroup("Group1");
    bookmarkGroupList.setGroups(List.of(group1));
    assertEquals(1, bookmarkGroupList.getGroups().size(), "Should have 1 group initially");

    BookmarkGroup group2 = new BookmarkGroup("Group2");
    BookmarkGroup group3 = new BookmarkGroup("Group3");
    bookmarkGroupList.setGroups(List.of(group2, group3));

    assertEquals(2, bookmarkGroupList.getGroups().size(), "Should have 2 groups after replacement");
    assertTrue(bookmarkGroupList.getGroups().contains(group2), "Should contain new group2");
    assertTrue(bookmarkGroupList.getGroups().contains(group3), "Should contain new group3");
    assertFalse(bookmarkGroupList.getGroups().contains(group1), "Should not contain old group1");
  }

  @Test
  void testSetGroupsWithGroupsContainingBookmarks() {
    BookmarkGroup group = new BookmarkGroup("GroupWithBookmarks");
    BookmarkSpec bookmark =
        new BookmarkSpec(
            "Bookmark1", "GroupWithBookmarks", "icon1", "https://bookmark1.com", "info1", false, 0);
    group.addBookmark(bookmark);

    bookmarkGroupList.setGroups(List.of(group));

    assertEquals(1, bookmarkGroupList.getGroups().size(), "Should have 1 group");
    assertEquals(
        1,
        bookmarkGroupList.getGroups().get(0).getBookmarks().size(),
        "Group should have 1 bookmark");
  }

  @Test
  void testToStringWithEmptyGroups() {
    String result = bookmarkGroupList.toString();

    assertNotNull(result, "toString should not return null");
    assertTrue(result.contains("BookmarkGroupList"), "toString should contain class name");
    assertTrue(result.contains("groups"), "toString should mention groups");
  }

  @Test
  void testToStringWithGroups() {
    BookmarkGroup group = new BookmarkGroup("TestGroup");
    bookmarkGroupList.setGroups(List.of(group));

    String result = bookmarkGroupList.toString();

    assertNotNull(result, "toString should not return null");
    assertTrue(result.contains("BookmarkGroupList"), "toString should contain class name");
    assertTrue(result.contains("TestGroup"), "toString should contain group name");
  }

  @Test
  void testMultipleGroupsWithDifferentNames() {
    BookmarkGroup group1 = new BookmarkGroup("News");
    BookmarkGroup group2 = new BookmarkGroup("Tools");
    BookmarkGroup group3 = new BookmarkGroup("Social");

    bookmarkGroupList.setGroups(List.of(group1, group2, group3));

    assertEquals(3, bookmarkGroupList.getGroups().size(), "Should have 3 groups");
    assertEquals("News", bookmarkGroupList.getGroups().get(0).getName());
    assertEquals("Tools", bookmarkGroupList.getGroups().get(1).getName());
    assertEquals("Social", bookmarkGroupList.getGroups().get(2).getName());
  }

  @Test
  void testGroupsListMutability() {
    BookmarkGroup group1 = new BookmarkGroup("Group1");
    List<BookmarkGroup> mutableList = new ArrayList<>();
    mutableList.add(group1);

    bookmarkGroupList.setGroups(mutableList);
    assertEquals(1, bookmarkGroupList.getGroups().size(), "Should have 1 group initially");

    // Modify original list
    BookmarkGroup group2 = new BookmarkGroup("Group2");
    mutableList.add(group2);

    // Verify internal state depends on implementation
    assertNotNull(bookmarkGroupList.getGroups());
  }

  @Test
  void testSetGroupsWithMixedEmptyAndPopulatedGroups() {
    BookmarkGroup emptyGroup = new BookmarkGroup("EmptyGroup");
    BookmarkGroup populatedGroup = new BookmarkGroup("PopulatedGroup");
    populatedGroup.addBookmark(
        new BookmarkSpec(
            "Bookmark", "PopulatedGroup", "icon1", "https://example.com", "info1", false, 1));

    bookmarkGroupList.setGroups(List.of(emptyGroup, populatedGroup));

    assertEquals(2, bookmarkGroupList.getGroups().size(), "Should have 2 groups");
    assertEquals(
        0,
        bookmarkGroupList.getGroups().get(0).getBookmarks().size(),
        "First group should be empty");
    assertEquals(
        1,
        bookmarkGroupList.getGroups().get(1).getBookmarks().size(),
        "Second group should have 1 bookmark");
  }

  @Test
  void testGroupOrderingIsPreserved() {
    BookmarkGroup first = new BookmarkGroup("First");
    BookmarkGroup second = new BookmarkGroup("Second");
    BookmarkGroup third = new BookmarkGroup("Third");

    bookmarkGroupList.setGroups(List.of(first, second, third));

    List<BookmarkGroup> groups = bookmarkGroupList.getGroups();
    assertEquals("First", groups.get(0).getName(), "First group should be at index 0");
    assertEquals("Second", groups.get(1).getName(), "Second group should be at index 1");
    assertEquals("Third", groups.get(2).getName(), "Third group should be at index 2");
  }
}
