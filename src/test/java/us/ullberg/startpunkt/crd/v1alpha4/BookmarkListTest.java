package us.ullberg.startpunkt.crd.v1alpha4;

import static org.junit.jupiter.api.Assertions.*;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class BookmarkListTest {

  @Test
  void testCanInstantiateEmptyList() {
    BookmarkList list = new BookmarkList();
    assertNotNull(list);
    assertTrue(list.getItems().isEmpty());
  }

  @Test
  void testAddAndRetrieveBookmarks() {
    Bookmark bookmark =
        new Bookmark("Site", "Group1", "mdi:web", "https://example.com", "Info", false, 1);

    BookmarkList list = new BookmarkList();
    list.setItems(List.of(bookmark));

    assertEquals(1, list.getItems().size());
    assertEquals("Site", list.getItems().get(0).getSpec().getName());
  }

  @Test
  void testSetEmptyList() {
    BookmarkList list = new BookmarkList();
    list.setItems(List.of());

    assertNotNull(list.getItems());
    assertEquals(0, list.getItems().size());
  }

  @Test
  void testSetNullList() {
    BookmarkList list = new BookmarkList();
    list.setItems(null);

    // Verify it doesn't throw an exception
    assertDoesNotThrow(() -> list.getItems());
  }

  @Test
  void testMultipleBookmarks() {
    Bookmark b1 = new Bookmark("Site1", "Group1", "mdi:web", "https://site1.com", "Info1", true, 1);
    Bookmark b2 =
        new Bookmark("Site2", "Group2", "mdi:web", "https://site2.com", "Info2", false, 2);
    Bookmark b3 = new Bookmark("Site3", "Group3", "mdi:web", "https://site3.com", "Info3", true, 3);

    BookmarkList list = new BookmarkList();
    list.setItems(List.of(b1, b2, b3));

    assertEquals(3, list.getItems().size());
    assertEquals("Site1", list.getItems().get(0).getSpec().getName());
    assertEquals("Site2", list.getItems().get(1).getSpec().getName());
    assertEquals("Site3", list.getItems().get(2).getSpec().getName());
  }

  @Test
  void testManyBookmarks() {
    List<Bookmark> bookmarks = new ArrayList<>();
    for (int i = 0; i < 50; i++) {
      bookmarks.add(new Bookmark("Bookmark" + i, "Group" + i, "icon", "url" + i, "info", true, i));
    }

    BookmarkList list = new BookmarkList();
    list.setItems(bookmarks);

    assertEquals(50, list.getItems().size());
    assertEquals("Bookmark0", list.getItems().get(0).getSpec().getName());
    assertEquals("Bookmark49", list.getItems().get(49).getSpec().getName());
  }

  @Test
  void testBookmarksWithDifferentProperties() {
    Bookmark b1 =
        new Bookmark("Docs", "Help", "mdi:book", "https://docs.com", "Documentation", true, 10);
    Bookmark b2 =
        new Bookmark("API", "Dev", "mdi:api", "https://api.com", "API Reference", false, 20);

    BookmarkList list = new BookmarkList();
    list.setItems(List.of(b1, b2));

    assertEquals(2, list.getItems().size());
    assertTrue(list.getItems().get(0).getSpec().getTargetBlank());
    assertFalse(list.getItems().get(1).getSpec().getTargetBlank());
    assertEquals(10, list.getItems().get(0).getSpec().getLocation());
    assertEquals(20, list.getItems().get(1).getSpec().getLocation());
  }

  @Test
  void testBookmarksWithStatus() {
    Bookmark b1 = new Bookmark("Site1", "Group", "icon", "url1", "info", true, 0);
    Bookmark b2 = new Bookmark("Site2", "Group", "icon", "url2", "info", true, 0);

    BookmarkStatus status1 = new BookmarkStatus();
    BookmarkStatus status2 = new BookmarkStatus();

    b1.setStatus(status1);
    b2.setStatus(status2);

    BookmarkList list = new BookmarkList();
    list.setItems(List.of(b1, b2));

    assertEquals(2, list.getItems().size());
    assertNotNull(list.getItems().get(0).getStatus());
    assertNotNull(list.getItems().get(1).getStatus());
  }

  @Test
  void testReplaceItems() {
    Bookmark b1 = new Bookmark("Initial", "Group", "icon", "url", "info", true, 0);
    BookmarkList list = new BookmarkList();
    list.setItems(List.of(b1));

    assertEquals(1, list.getItems().size());

    Bookmark b2 = new Bookmark("Replaced1", "Group", "icon", "url", "info", true, 0);
    Bookmark b3 = new Bookmark("Replaced2", "Group", "icon", "url", "info", true, 0);
    list.setItems(List.of(b2, b3));

    assertEquals(2, list.getItems().size());
    assertEquals("Replaced1", list.getItems().get(0).getSpec().getName());
    assertEquals("Replaced2", list.getItems().get(1).getSpec().getName());
  }

  @Test
  void testMultipleSetOperations() {
    BookmarkList list = new BookmarkList();

    list.setItems(List.of(new Bookmark("B1", "G", "i", "u", "i", true, 0)));
    assertEquals(1, list.getItems().size());

    list.setItems(List.of());
    assertEquals(0, list.getItems().size());

    list.setItems(
        List.of(
            new Bookmark("B2", "G", "i", "u", "i", true, 0),
            new Bookmark("B3", "G", "i", "u", "i", true, 0)));
    assertEquals(2, list.getItems().size());
  }

  @Test
  void testDefaultConstructorInitialization() {
    BookmarkList list = new BookmarkList();
    assertNotNull(list.getItems(), "Items list should not be null after construction");
    assertEquals(0, list.getItems().size(), "Items list should be empty after construction");
  }
}
