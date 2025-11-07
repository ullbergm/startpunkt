package us.ullberg.startpunkt.crd.v1alpha2;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

class BookmarkV1Alpha2Test {

  @Test
  void testDefaultConstructor() {
    Bookmark bookmark = new Bookmark();
    assertNotNull(bookmark);
    assertNull(bookmark.getSpec());
    assertNull(bookmark.getStatus());
  }

  @Test
  void testSetAndGetSpec() {
    Bookmark bookmark = new Bookmark();
    BookmarkSpec spec = new BookmarkSpec();
    spec.setName("TestBookmark");

    bookmark.setSpec(spec);

    assertNotNull(bookmark.getSpec());
    assertEquals("TestBookmark", bookmark.getSpec().getName());
  }

  @Test
  void testSetAndGetStatus() {
    Bookmark bookmark = new Bookmark();
    BookmarkStatus status = new BookmarkStatus();

    bookmark.setStatus(status);

    assertNotNull(bookmark.getStatus());
  }

  @Test
  void testSetAndGetMetadata() {
    Bookmark bookmark = new Bookmark();
    io.fabric8.kubernetes.api.model.ObjectMeta metadata =
        new io.fabric8.kubernetes.api.model.ObjectMetaBuilder()
            .withName("test-bookmark")
            .withNamespace("default")
            .build();

    bookmark.setMetadata(metadata);

    assertNotNull(bookmark.getMetadata());
    assertEquals("test-bookmark", bookmark.getMetadata().getName());
    assertEquals("default", bookmark.getMetadata().getNamespace());
  }

  @Test
  void testGetKind() {
    Bookmark bookmark = new Bookmark();
    assertEquals("Bookmark", bookmark.getKind());
  }

  @Test
  void testGetApiVersion() {
    Bookmark bookmark = new Bookmark();
    assertEquals("startpunkt.ullberg.us/v1alpha2", bookmark.getApiVersion());
  }
}
