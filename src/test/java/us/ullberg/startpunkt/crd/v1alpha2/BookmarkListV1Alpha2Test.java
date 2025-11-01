package us.ullberg.startpunkt.crd.v1alpha2;

import static org.junit.jupiter.api.Assertions.*;

import java.util.Arrays;
import org.junit.jupiter.api.Test;

class BookmarkListV1Alpha2Test {

  @Test
  void testDefaultConstructor() {
    BookmarkList list = new BookmarkList();
    assertNotNull(list);
  }

  @Test
  void testSetAndGetItems() {
    BookmarkList list = new BookmarkList();
    Bookmark bookmark1 = new Bookmark();
    Bookmark bookmark2 = new Bookmark();

    list.setItems(Arrays.asList(bookmark1, bookmark2));

    assertNotNull(list.getItems());
    assertEquals(2, list.getItems().size());
  }

  @Test
  void testSetAndGetMetadata() {
    BookmarkList list = new BookmarkList();
    io.fabric8.kubernetes.api.model.ListMeta metadata =
        new io.fabric8.kubernetes.api.model.ListMetaBuilder().withResourceVersion("54321").build();

    list.setMetadata(metadata);

    assertNotNull(list.getMetadata());
    assertEquals("54321", list.getMetadata().getResourceVersion());
  }
}
