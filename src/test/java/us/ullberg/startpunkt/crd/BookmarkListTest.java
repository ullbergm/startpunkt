package us.ullberg.startpunkt.crd;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

import java.util.List;

class BookmarkListTest {

  @Test
  void testCanInstantiateEmptyList() {
    BookmarkList list = new BookmarkList();
    assertNotNull(list);
    assertTrue(list.getItems().isEmpty());
  }

  @Test
  void testAddAndRetrieveBookmarks() {
    Bookmark bookmark = new Bookmark(
        "Site", "Group1", "mdi:web", "https://example.com", "Info", false, 1);

    BookmarkList list = new BookmarkList();
    list.setItems(List.of(bookmark));

    assertEquals(1, list.getItems().size());
    assertEquals("Site", list.getItems().get(0).getSpec().getName());
  }
}
