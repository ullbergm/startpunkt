package us.ullberg.startpunkt.crd.v1alpha1;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.fabric8.kubernetes.api.model.ObjectMetaBuilder;
import io.quarkus.test.junit.QuarkusTest;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Test class for BookmarkList v1alpha1. */
@QuarkusTest
class BookmarkListV1Alpha1Test {

  private final ObjectMapper mapper = new ObjectMapper();

  @Test
  void testBookmarkListDefaultConstructor() {
    BookmarkList list = new BookmarkList();
    assertNotNull(list, "BookmarkList should be created");
    assertNotNull(list.getItems(), "Items should be initialized");
    assertTrue(list.getItems().isEmpty(), "Items should be empty initially");
  }

  @Test
  void testBookmarkListWithItems() {
    Bookmark bm1 = createBookmark("bm1", "Bookmark1", "Group1");
    Bookmark bm2 = createBookmark("bm2", "Bookmark2", "Group1");

    BookmarkList list = new BookmarkList();
    list.setItems(List.of(bm1, bm2));

    assertEquals(2, list.getItems().size(), "Should have 2 items");
    assertEquals("bm1", list.getItems().get(0).getMetadata().getName());
    assertEquals("bm2", list.getItems().get(1).getMetadata().getName());
  }

  @Test
  void testBookmarkListSerialization() throws JsonProcessingException {
    BookmarkList list = new BookmarkList();
    Bookmark bookmark = createBookmark("test-bm", "TestBookmark", "TestGroup");
    list.setItems(List.of(bookmark));

    String json = mapper.writeValueAsString(list);

    assertNotNull(json, "JSON should not be null");
    assertTrue(json.contains("TestBookmark"), "JSON should contain bookmark name");
  }

  @Test
  void testBookmarkListDeserialization() throws JsonProcessingException {
    String json =
        """
        {
          "apiVersion": "startpunkt.ullberg.us/v1alpha1",
          "kind": "BookmarkList",
          "metadata": {},
          "items": [
            {
              "apiVersion": "startpunkt.ullberg.us/v1alpha1",
              "kind": "Bookmark",
              "metadata": {
                "name": "test-bookmark",
                "namespace": "default"
              },
              "spec": {
                "name": "TestBookmark",
                "group": "TestGroup",
                "url": "https://test.example.com",
                "location": 0
              }
            }
          ]
        }
        """;

    BookmarkList list = mapper.readValue(json, BookmarkList.class);

    assertNotNull(list, "BookmarkList should be deserialized");
    assertNotNull(list.getItems(), "Items should be deserialized");
    assertEquals(1, list.getItems().size(), "Should have 1 item");
    assertEquals("TestBookmark", list.getItems().get(0).getSpec().getName());
  }

  @Test
  void testBookmarkListEmptySerialization() throws JsonProcessingException {
    BookmarkList list = new BookmarkList();
    String json = mapper.writeValueAsString(list);

    assertNotNull(json, "JSON should not be null");
    assertTrue(json.contains("items"), "JSON should contain items field");
  }

  private Bookmark createBookmark(String name, String displayName, String group) {
    Bookmark bookmark =
        new Bookmark(displayName, group, "mdi:bookmark", "https://test.com", "Info", true, 0);
    bookmark.setMetadata(new ObjectMetaBuilder().withName(name).withNamespace("default").build());
    return bookmark;
  }
}
