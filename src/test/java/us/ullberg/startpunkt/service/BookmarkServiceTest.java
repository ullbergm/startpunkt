package us.ullberg.startpunkt.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.fabric8.kubernetes.api.model.ObjectMetaBuilder;
import io.fabric8.kubernetes.api.model.apiextensions.v1.CustomResourceDefinition;
import io.fabric8.kubernetes.client.NamespacedKubernetesClient;
import io.fabric8.kubernetes.client.dsl.base.CustomResourceDefinitionContext;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.kubernetes.client.KubernetesServer;
import io.quarkus.test.kubernetes.client.KubernetesTestServer;
import io.quarkus.test.kubernetes.client.WithKubernetesTestServer;
import jakarta.inject.Inject;
import java.net.HttpURLConnection;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import us.ullberg.startpunkt.crd.v1alpha4.Bookmark;
import us.ullberg.startpunkt.crd.v1alpha4.BookmarkSpec;

/** Test class for {@link BookmarkService} with default namespace configuration behavior. */
@QuarkusTest
@WithKubernetesTestServer
class BookmarkServiceTest {

  @KubernetesTestServer KubernetesServer server;
  private NamespacedKubernetesClient client;

  @Inject BookmarkService bookmarkService;

  @BeforeEach
  void setUp() {
    // Create a CustomResourceDefinition (CRD) for the Bookmark resource
    CustomResourceDefinition crd =
        CustomResourceDefinitionContext.v1CRDFromCustomResourceType(Bookmark.class).build();

    // Set up the mock server to expect a POST request for creating the CRD
    server
        .expect()
        .post()
        .withPath("/apis/apiextensions.k8s.io/v1/customresourcedefinitions")
        .andReturn(HttpURLConnection.HTTP_OK, crd)
        .once();

    // Get the Kubernetes client from the mock server
    client = server.getClient();

    // Create the CRD in the mock Kubernetes cluster
    CustomResourceDefinition createdBookmarkCrd =
        client.apiextensions().v1().customResourceDefinitions().resource(crd).create();

    assertNotNull(createdBookmarkCrd);

    // Clean up any existing bookmarks from previous tests
    client.resources(Bookmark.class).inAnyNamespace().delete();
  }

  /** Helper method to create a bookmark in a specific namespace. */
  private void createBookmark(String namespace, String name, String group, String url) {
    BookmarkSpec spec = new BookmarkSpec();
    spec.setName(name);
    spec.setGroup(group);
    spec.setUrl(url);

    Bookmark bookmark = new Bookmark();
    bookmark.setMetadata(
        new ObjectMetaBuilder()
            .withName(name.toLowerCase().replace(" ", "-"))
            .withNamespace(namespace)
            .build());
    bookmark.setSpec(spec);

    client.resources(Bookmark.class).inNamespace(namespace).resource(bookmark).create();
  }

  @Test
  void testRetrieveBookmarks_DefaultConfiguration() {
    // Create bookmarks in different namespaces
    createBookmark("default", "Test Bookmark 1", "Test", "https://test1.com");
    createBookmark("kube-system", "Test Bookmark 2", "Test", "https://test2.com");
    createBookmark("startpunkt", "Test Bookmark 3", "Test", "https://test3.com");

    // With default configuration (anyNamespace = true), should retrieve from all namespaces
    List<BookmarkSpec> bookmarks = bookmarkService.retrieveBookmarks();

    assertNotNull(bookmarks);
    assertEquals(3, bookmarks.size());

    // Verify all bookmarks are retrieved
    assertTrue(bookmarks.stream().anyMatch(b -> "Test Bookmark 1".equals(b.getName())));
    assertTrue(bookmarks.stream().anyMatch(b -> "Test Bookmark 2".equals(b.getName())));
    assertTrue(bookmarks.stream().anyMatch(b -> "Test Bookmark 3".equals(b.getName())));
  }

  /** Helper method to create a bookmark with specific location. */
  private void createBookmarkWithLocation(
      String namespace, String name, String group, String url, int location) {
    BookmarkSpec spec = new BookmarkSpec();
    spec.setName(name);
    spec.setGroup(group);
    spec.setUrl(url);
    spec.setLocation(location);

    Bookmark bookmark = new Bookmark();
    bookmark.setMetadata(
        new ObjectMetaBuilder()
            .withName(name.toLowerCase().replace(" ", "-"))
            .withNamespace(namespace)
            .build());
    bookmark.setSpec(spec);

    client.resources(Bookmark.class).inNamespace(namespace).resource(bookmark).create();
  }

  @Test
  void testLocationNormalization_ZeroBecomesOneThousand() {
    // Create a bookmark with location = 0
    createBookmarkWithLocation("default", "Zero Location Bookmark", "Test", "https://zero.com", 0);

    List<BookmarkSpec> bookmarks = bookmarkService.retrieveBookmarks();

    assertNotNull(bookmarks);
    assertEquals(1, bookmarks.size());

    BookmarkSpec bookmark = bookmarks.get(0);
    assertEquals("Zero Location Bookmark", bookmark.getName());
    // Location 0 should be normalized to 1000 for Hajimari compatibility
    assertEquals(1000, bookmark.getLocation(), "Location 0 should be normalized to 1000");
  }

  @Test
  void testLocationNormalization_NonZeroPreserved() {
    // Create bookmarks with various non-zero locations
    createBookmarkWithLocation("default", "Location Five", "Test", "https://five.com", 5);
    createBookmarkWithLocation("default", "Location Ten", "Test", "https://ten.com", 10);
    createBookmarkWithLocation("default", "Location Hundred", "Test", "https://hundred.com", 100);

    List<BookmarkSpec> bookmarks = bookmarkService.retrieveBookmarks();

    assertNotNull(bookmarks);
    assertEquals(3, bookmarks.size());

    // Verify non-zero locations are preserved
    assertTrue(
        bookmarks.stream()
            .anyMatch(b -> "Location Five".equals(b.getName()) && b.getLocation() == 5));
    assertTrue(
        bookmarks.stream()
            .anyMatch(b -> "Location Ten".equals(b.getName()) && b.getLocation() == 10));
    assertTrue(
        bookmarks.stream()
            .anyMatch(b -> "Location Hundred".equals(b.getName()) && b.getLocation() == 100));
  }

  @Test
  void testLocationNormalization_NegativeLocation() {
    // Create a bookmark with negative location
    createBookmarkWithLocation("default", "Negative Location", "Test", "https://negative.com", -5);

    List<BookmarkSpec> bookmarks = bookmarkService.retrieveBookmarks();

    assertNotNull(bookmarks);
    assertEquals(1, bookmarks.size());

    BookmarkSpec bookmark = bookmarks.get(0);
    assertEquals("Negative Location", bookmark.getName());
    // Negative locations should be preserved (not normalized)
    assertEquals(-5, bookmark.getLocation());
  }

  @Test
  void testLocationNormalization_LargeLocation() {
    // Create a bookmark with a large location value
    createBookmarkWithLocation("default", "Large Location", "Test", "https://large.com", 999999);

    List<BookmarkSpec> bookmarks = bookmarkService.retrieveBookmarks();

    assertNotNull(bookmarks);
    assertEquals(1, bookmarks.size());

    BookmarkSpec bookmark = bookmarks.get(0);
    assertEquals("Large Location", bookmark.getName());
    assertEquals(999999, bookmark.getLocation());
  }

  @Test
  void testGroupNameLowercasing() {
    // Create bookmarks with mixed-case group names
    createBookmark("default", "Upper Group", "UpperCase", "https://upper.com");
    createBookmark("default", "Mixed Group", "MiXeD", "https://mixed.com");
    createBookmark("default", "Lower Group", "lowercase", "https://lower.com");

    List<BookmarkSpec> bookmarks = bookmarkService.retrieveBookmarks();

    assertNotNull(bookmarks);
    assertEquals(3, bookmarks.size());

    // Verify all group names are lowercased
    assertTrue(
        bookmarks.stream()
            .allMatch(b -> b.getGroup() != null && b.getGroup().equals(b.getGroup().toLowerCase())),
        "All group names should be lowercased");

    // Verify specific lowercasing
    assertTrue(bookmarks.stream().anyMatch(b -> "uppercase".equals(b.getGroup())));
    assertTrue(bookmarks.stream().anyMatch(b -> "mixed".equals(b.getGroup())));
    assertTrue(bookmarks.stream().anyMatch(b -> "lowercase".equals(b.getGroup())));
  }

  @Test
  void testBookmarkWithTargetBlank() {
    // Create bookmark with targetBlank = true
    BookmarkSpec spec = new BookmarkSpec();
    spec.setName("Target Blank Bookmark");
    spec.setGroup("Test");
    spec.setUrl("https://target.com");
    spec.setTargetBlank(true);

    Bookmark bookmark = new Bookmark();
    bookmark.setMetadata(
        new ObjectMetaBuilder().withName("target-blank-bookmark").withNamespace("default").build());
    bookmark.setSpec(spec);

    client.resources(Bookmark.class).inNamespace("default").resource(bookmark).create();

    List<BookmarkSpec> bookmarks = bookmarkService.retrieveBookmarks();

    assertNotNull(bookmarks);
    assertEquals(1, bookmarks.size());

    BookmarkSpec retrieved = bookmarks.get(0);
    assertEquals(true, retrieved.getTargetBlank());
  }

  @Test
  void testBookmarkWithIconAndInfo() {
    // Create bookmark with icon and info
    BookmarkSpec spec = new BookmarkSpec();
    spec.setName("Icon Bookmark");
    spec.setGroup("Test");
    spec.setUrl("https://icon.com");
    spec.setIcon("mdi:bookmark");
    spec.setInfo("Test bookmark with icon");

    Bookmark bookmark = new Bookmark();
    bookmark.setMetadata(
        new ObjectMetaBuilder().withName("icon-bookmark").withNamespace("default").build());
    bookmark.setSpec(spec);

    client.resources(Bookmark.class).inNamespace("default").resource(bookmark).create();

    List<BookmarkSpec> bookmarks = bookmarkService.retrieveBookmarks();

    assertNotNull(bookmarks);
    assertEquals(1, bookmarks.size());

    BookmarkSpec retrieved = bookmarks.get(0);
    assertEquals("mdi:bookmark", retrieved.getIcon());
    assertEquals("Test bookmark with icon", retrieved.getInfo());
  }

  @Test
  void testMultipleBookmarksSorting() {
    // Create bookmarks with different locations to test sorting
    createBookmarkWithLocation("default", "Third", "Test", "https://third.com", 30);
    createBookmarkWithLocation("default", "First", "Test", "https://first.com", 10);
    createBookmarkWithLocation("default", "Second", "Test", "https://second.com", 20);

    List<BookmarkSpec> bookmarks = bookmarkService.retrieveBookmarks();

    assertNotNull(bookmarks);
    assertEquals(3, bookmarks.size());

    // Bookmarks should be sorted by location
    // Note: Sorting happens in BookmarkGroupList, not in retrieveBookmarks
    // Just verify all bookmarks are present
    assertTrue(bookmarks.stream().anyMatch(b -> "First".equals(b.getName())));
    assertTrue(bookmarks.stream().anyMatch(b -> "Second".equals(b.getName())));
    assertTrue(bookmarks.stream().anyMatch(b -> "Third".equals(b.getName())));
  }

  @Test
  void testEmptyBookmarkList() {
    // Don't create any bookmarks
    List<BookmarkSpec> bookmarks = bookmarkService.retrieveBookmarks();

    assertNotNull(bookmarks);
    assertTrue(bookmarks.isEmpty(), "Should return empty list when no bookmarks exist");
  }
}
