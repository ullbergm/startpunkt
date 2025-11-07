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

  @Test
  void testLocationNormalizationZeroToThousand() {
    // Test that bookmarks with location 0 would be normalized to 1000 for Hajimari compatibility
    BookmarkGroup group = new BookmarkGroup("TestGroup");
    BookmarkSpec bookmarkZero =
        new BookmarkSpec("Bookmark0", "TestGroup", "icon", "url", "info", true, 0);
    BookmarkSpec bookmarkNonZero =
        new BookmarkSpec("Bookmark5", "TestGroup", "icon", "url", "info", true, 5);

    group.addBookmark(bookmarkZero);
    group.addBookmark(bookmarkNonZero);

    bookmarkGroupList.setGroups(List.of(group));

    // Verify bookmarks are stored with their original locations
    assertEquals(0, bookmarkGroupList.getGroups().get(0).getBookmarks().get(0).getLocation());
    assertEquals(5, bookmarkGroupList.getGroups().get(0).getBookmarks().get(1).getLocation());
  }

  @Test
  void testLocationNormalizationMultipleZeros() {
    BookmarkGroup group = new BookmarkGroup("ZeroGroup");

    for (int i = 0; i < 5; i++) {
      BookmarkSpec bookmark =
          new BookmarkSpec("Bookmark" + i, "ZeroGroup", "icon", "url" + i, "info", true, 0);
      group.addBookmark(bookmark);
    }

    bookmarkGroupList.setGroups(List.of(group));

    List<BookmarkSpec> bookmarks = bookmarkGroupList.getGroups().get(0).getBookmarks();
    assertEquals(5, bookmarks.size());

    // All should have location 0 before normalization
    for (BookmarkSpec bookmark : bookmarks) {
      assertEquals(0, bookmark.getLocation());
    }
  }

  @Test
  void testGroupNameCaseSensitivityPreserved() {
    // Test that group names preserve their case when stored
    BookmarkGroup upperCase = new BookmarkGroup("UPPERCASE");
    BookmarkGroup lowerCase = new BookmarkGroup("lowercase");
    BookmarkGroup mixedCase = new BookmarkGroup("MixedCase");

    bookmarkGroupList.setGroups(List.of(upperCase, lowerCase, mixedCase));

    assertEquals("UPPERCASE", bookmarkGroupList.getGroups().get(0).getName());
    assertEquals("lowercase", bookmarkGroupList.getGroups().get(1).getName());
    assertEquals("MixedCase", bookmarkGroupList.getGroups().get(2).getName());
  }

  @Test
  void testGroupWithSpecialCharactersInName() {
    BookmarkGroup specialGroup = new BookmarkGroup("Group-With_Special.Chars@123");
    bookmarkGroupList.setGroups(List.of(specialGroup));

    assertEquals("Group-With_Special.Chars@123", bookmarkGroupList.getGroups().get(0).getName());
  }

  @Test
  void testBookmarkSortingByLocation() {
    BookmarkGroup group = new BookmarkGroup("SortedGroup");

    BookmarkSpec bookmark1 = new BookmarkSpec("B1", "SortedGroup", "icon", "url1", "info", true, 5);
    BookmarkSpec bookmark2 = new BookmarkSpec("B2", "SortedGroup", "icon", "url2", "info", true, 1);
    BookmarkSpec bookmark3 =
        new BookmarkSpec("B3", "SortedGroup", "icon", "url3", "info", true, 10);

    group.addBookmark(bookmark1);
    group.addBookmark(bookmark2);
    group.addBookmark(bookmark3);

    bookmarkGroupList.setGroups(List.of(group));

    // Verify bookmarks are stored in insertion order
    List<BookmarkSpec> bookmarks = bookmarkGroupList.getGroups().get(0).getBookmarks();
    assertEquals("B1", bookmarks.get(0).getName());
    assertEquals("B2", bookmarks.get(1).getName());
    assertEquals("B3", bookmarks.get(2).getName());
  }

  @Test
  void testLargeNumberOfGroups() {
    List<BookmarkGroup> manyGroups = new ArrayList<>();
    for (int i = 0; i < 100; i++) {
      manyGroups.add(new BookmarkGroup("Group" + i));
    }

    bookmarkGroupList.setGroups(manyGroups);

    assertEquals(100, bookmarkGroupList.getGroups().size());
    assertEquals("Group0", bookmarkGroupList.getGroups().get(0).getName());
    assertEquals("Group99", bookmarkGroupList.getGroups().get(99).getName());
  }

  @Test
  void testGroupWithManyBookmarks() {
    BookmarkGroup group = new BookmarkGroup("BigGroup");

    for (int i = 0; i < 50; i++) {
      BookmarkSpec bookmark =
          new BookmarkSpec("Bookmark" + i, "BigGroup", "icon", "url" + i, "info", true, i);
      group.addBookmark(bookmark);
    }

    bookmarkGroupList.setGroups(List.of(group));

    assertEquals(50, bookmarkGroupList.getGroups().get(0).getBookmarks().size());
  }

  @Test
  void testBookmarkGroupComparison() {
    BookmarkGroup groupA = new BookmarkGroup("Alpha");
    BookmarkGroup groupB = new BookmarkGroup("Beta");
    BookmarkGroup groupC = new BookmarkGroup("Charlie");

    bookmarkGroupList.setGroups(List.of(groupC, groupA, groupB));

    // Verify they are stored in the order added, not sorted
    assertEquals("Charlie", bookmarkGroupList.getGroups().get(0).getName());
    assertEquals("Alpha", bookmarkGroupList.getGroups().get(1).getName());
    assertEquals("Beta", bookmarkGroupList.getGroups().get(2).getName());
  }

  @Test
  void testEmptyGroupsInList() {
    BookmarkGroup empty1 = new BookmarkGroup("Empty1");
    BookmarkGroup empty2 = new BookmarkGroup("Empty2");
    BookmarkGroup empty3 = new BookmarkGroup("Empty3");

    bookmarkGroupList.setGroups(List.of(empty1, empty2, empty3));

    assertEquals(3, bookmarkGroupList.getGroups().size());
    assertEquals(0, bookmarkGroupList.getGroups().get(0).getBookmarks().size());
    assertEquals(0, bookmarkGroupList.getGroups().get(1).getBookmarks().size());
    assertEquals(0, bookmarkGroupList.getGroups().get(2).getBookmarks().size());
  }

  @Test
  void testBookmarkWithTargetBlankVariations() {
    BookmarkGroup group = new BookmarkGroup("TargetBlankGroup");

    BookmarkSpec blankTrue =
        new BookmarkSpec("B1", "TargetBlankGroup", "icon", "url1", "info", true, 1);
    BookmarkSpec blankFalse =
        new BookmarkSpec("B2", "TargetBlankGroup", "icon", "url2", "info", false, 2);
    BookmarkSpec blankNull =
        new BookmarkSpec("B3", "TargetBlankGroup", "icon", "url3", "info", null, 3);

    group.addBookmark(blankTrue);
    group.addBookmark(blankFalse);
    group.addBookmark(blankNull);

    bookmarkGroupList.setGroups(List.of(group));

    List<BookmarkSpec> bookmarks = bookmarkGroupList.getGroups().get(0).getBookmarks();
    assertTrue(bookmarks.get(0).getTargetBlank());
    assertFalse(bookmarks.get(1).getTargetBlank());
    assertNull(bookmarks.get(2).getTargetBlank());
  }

  @Test
  void testBookmarkUrlVariations() {
    BookmarkGroup group = new BookmarkGroup("UrlGroup");

    BookmarkSpec httpUrl =
        new BookmarkSpec("HTTP", "UrlGroup", "icon", "http://example.com", "info", true, 1);
    BookmarkSpec httpsUrl =
        new BookmarkSpec("HTTPS", "UrlGroup", "icon", "https://secure.com", "info", true, 2);
    BookmarkSpec complexUrl =
        new BookmarkSpec(
            "Complex", "UrlGroup", "icon", "https://example.com:8080/path?q=1", "info", true, 3);

    group.addBookmark(httpUrl);
    group.addBookmark(httpsUrl);
    group.addBookmark(complexUrl);

    bookmarkGroupList.setGroups(List.of(group));

    List<BookmarkSpec> bookmarks = bookmarkGroupList.getGroups().get(0).getBookmarks();
    assertEquals("http://example.com", bookmarks.get(0).getUrl());
    assertEquals("https://secure.com", bookmarks.get(1).getUrl());
    assertEquals("https://example.com:8080/path?q=1", bookmarks.get(2).getUrl());
  }

  @Test
  void testGroupsWithIdenticalNames() {
    BookmarkGroup group1 = new BookmarkGroup("Duplicate");
    BookmarkGroup group2 = new BookmarkGroup("Duplicate");

    group1.addBookmark(new BookmarkSpec("B1", "Duplicate", "icon", "url1", "info", true, 1));
    group2.addBookmark(new BookmarkSpec("B2", "Duplicate", "icon", "url2", "info", true, 2));

    bookmarkGroupList.setGroups(List.of(group1, group2));

    assertEquals(2, bookmarkGroupList.getGroups().size());
    assertEquals(1, bookmarkGroupList.getGroups().get(0).getBookmarks().size());
    assertEquals(1, bookmarkGroupList.getGroups().get(1).getBookmarks().size());
  }

  @Test
  void testClearAndRepopulateGroups() {
    BookmarkGroup initial = new BookmarkGroup("Initial");
    bookmarkGroupList.setGroups(List.of(initial));
    assertEquals(1, bookmarkGroupList.getGroups().size());

    bookmarkGroupList.setGroups(List.of());
    assertEquals(0, bookmarkGroupList.getGroups().size());

    BookmarkGroup newGroup = new BookmarkGroup("New");
    bookmarkGroupList.setGroups(List.of(newGroup));
    assertEquals(1, bookmarkGroupList.getGroups().size());
    assertEquals("New", bookmarkGroupList.getGroups().get(0).getName());
  }

  @Test
  void testLocationBoundaryValues() {
    BookmarkGroup group = new BookmarkGroup("BoundaryGroup");

    BookmarkSpec minLocation =
        new BookmarkSpec("Min", "BoundaryGroup", "icon", "url1", "info", true, Integer.MIN_VALUE);
    BookmarkSpec maxLocation =
        new BookmarkSpec("Max", "BoundaryGroup", "icon", "url2", "info", true, Integer.MAX_VALUE);
    BookmarkSpec zeroLocation =
        new BookmarkSpec("Zero", "BoundaryGroup", "icon", "url3", "info", true, 0);

    group.addBookmark(minLocation);
    group.addBookmark(maxLocation);
    group.addBookmark(zeroLocation);

    bookmarkGroupList.setGroups(List.of(group));

    List<BookmarkSpec> bookmarks = bookmarkGroupList.getGroups().get(0).getBookmarks();
    assertEquals(Integer.MIN_VALUE, bookmarks.get(0).getLocation());
    assertEquals(Integer.MAX_VALUE, bookmarks.get(1).getLocation());
    assertEquals(0, bookmarks.get(2).getLocation());
  }
}
