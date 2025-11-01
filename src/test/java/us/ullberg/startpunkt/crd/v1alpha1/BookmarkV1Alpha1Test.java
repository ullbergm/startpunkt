package us.ullberg.startpunkt.crd.v1alpha1;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.fabric8.kubernetes.api.model.ObjectMetaBuilder;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

/** Test class for v1alpha1 Bookmark CustomResource. */
@QuarkusTest
class BookmarkV1Alpha1Test {

  private final ObjectMapper mapper = new ObjectMapper();

  @Test
  void testBookmarkCreationWithDefaultConstructor() {
    Bookmark bookmark = new Bookmark();
    assertNotNull(bookmark, "Bookmark should be created");
    assertNull(bookmark.getSpec(), "Spec should be null initially");
    assertNull(bookmark.getStatus(), "Status should be null initially");
  }

  @Test
  void testBookmarkCreationWithParameterizedConstructor() {
    Bookmark bookmark =
        new Bookmark(
            "Docs",
            "Development",
            "mdi:book",
            "https://docs.example.com",
            "Documentation",
            true,
            50);

    assertNotNull(bookmark.getSpec(), "Spec should be initialized");
    assertEquals("Docs", bookmark.getSpec().getName());
    assertEquals("Development", bookmark.getSpec().getGroup());
    assertEquals("mdi:book", bookmark.getSpec().getIcon());
    assertEquals("https://docs.example.com", bookmark.getSpec().getUrl());
    assertEquals("Documentation", bookmark.getSpec().getInfo());
    assertTrue(bookmark.getSpec().getTargetBlank());
    assertEquals(50, bookmark.getSpec().getLocation());
  }

  @Test
  void testBookmarkEqualityReflexive() {
    Bookmark bookmark = createSampleBookmark();
    assertEquals(bookmark, bookmark, "Bookmark should equal itself");
  }

  @Test
  void testBookmarkEqualitySymmetric() {
    Bookmark bm1 = createSampleBookmark();
    Bookmark bm2 = createSampleBookmark();
    assertEquals(bm1, bm2, "Identical bookmarks should be equal");
    assertEquals(bm2, bm1, "Equality should be symmetric");
  }

  @Test
  void testBookmarkInequalityDifferentSpec() {
    Bookmark bm1 = createSampleBookmark();
    Bookmark bm2 =
        new Bookmark("Different", "Tools", "mdi:wrench", "https://other.com", "Info", false, 10);
    bm2.setMetadata(new ObjectMetaBuilder().withName("bm2").withNamespace("default").build());

    assertNotEquals(bm1, bm2, "Bookmarks with different specs should not be equal");
  }

  @Test
  void testBookmarkInequalityWithNull() {
    Bookmark bookmark = createSampleBookmark();
    assertNotEquals(bookmark, null, "Bookmark should not equal null");
  }

  @Test
  void testBookmarkInequalityWithDifferentType() {
    Bookmark bookmark = createSampleBookmark();
    assertNotEquals(bookmark, "Not a Bookmark", "Bookmark should not equal other type");
  }

  @Test
  void testBookmarkHashCodeConsistency() {
    Bookmark bookmark = createSampleBookmark();
    int hash1 = bookmark.hashCode();
    int hash2 = bookmark.hashCode();
    assertEquals(hash1, hash2, "Hash code should be consistent");
  }

  @Test
  void testBookmarkHashCodeEquality() {
    Bookmark bm1 = createSampleBookmark();
    Bookmark bm2 = createSampleBookmark();
    assertEquals(bm1.hashCode(), bm2.hashCode(), "Equal objects should have equal hash codes");
  }

  @Test
  void testBookmarkToString() {
    Bookmark bookmark = createSampleBookmark();
    String str = bookmark.toString();
    assertNotNull(str, "toString should return non-null");
    assertTrue(str.contains("spec="), "toString should include spec");
  }

  @Test
  void testBookmarkSerialization() throws JsonProcessingException {
    Bookmark bookmark = createSampleBookmark();
    String json = mapper.writeValueAsString(bookmark);

    assertNotNull(json, "JSON should not be null");
    assertTrue(json.contains("Test Bookmark"), "JSON should contain bookmark name");
    assertTrue(json.contains("TestGroup"), "JSON should contain group");
  }

  @Test
  void testBookmarkDeserialization() throws JsonProcessingException {
    String json =
        """
        {
          "apiVersion": "startpunkt.ullberg.us/v1alpha1",
          "kind": "Bookmark",
          "metadata": {
            "name": "test-bookmark",
            "namespace": "default"
          },
          "spec": {
            "name": "Test Bookmark",
            "group": "TestGroup",
            "icon": "mdi:bookmark",
            "url": "https://test.example.com",
            "info": "Test bookmark",
            "targetBlank": true,
            "location": 100
          }
        }
        """;

    Bookmark bookmark = mapper.readValue(json, Bookmark.class);

    assertNotNull(bookmark, "Bookmark should be deserialized");
    assertNotNull(bookmark.getSpec(), "Spec should be deserialized");
    assertEquals("Test Bookmark", bookmark.getSpec().getName());
    assertEquals("TestGroup", bookmark.getSpec().getGroup());
  }

  @Test
  void testBookmarkWithStatus() {
    Bookmark bookmark = createSampleBookmark();
    BookmarkStatus status = new BookmarkStatus();
    bookmark.setStatus(status);

    assertNotNull(bookmark.getStatus(), "Status should be set");
    assertEquals(status, bookmark.getStatus());
  }

  @Test
  void testBookmarkKubernetesMetadata() {
    Bookmark bookmark = createSampleBookmark();
    assertEquals("test-bookmark", bookmark.getMetadata().getName());
    assertEquals("default", bookmark.getMetadata().getNamespace());
  }

  private Bookmark createSampleBookmark() {
    Bookmark bookmark =
        new Bookmark(
            "Test Bookmark",
            "TestGroup",
            "mdi:bookmark",
            "https://test.example.com",
            "Test bookmark",
            true,
            100);
    bookmark.setMetadata(
        new ObjectMetaBuilder().withName("test-bookmark").withNamespace("default").build());
    return bookmark;
  }
}
