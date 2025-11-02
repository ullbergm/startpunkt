package us.ullberg.startpunkt.service;

import static org.junit.jupiter.api.Assertions.*;

import io.fabric8.kubernetes.api.model.ObjectMetaBuilder;
import io.fabric8.kubernetes.api.model.OwnerReference;
import io.fabric8.kubernetes.api.model.OwnerReferenceBuilder;
import io.fabric8.kubernetes.api.model.apiextensions.v1.CustomResourceDefinition;
import io.fabric8.kubernetes.client.NamespacedKubernetesClient;
import io.fabric8.kubernetes.client.dsl.base.CustomResourceDefinitionContext;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.kubernetes.client.KubernetesServer;
import io.quarkus.test.kubernetes.client.KubernetesTestServer;
import io.quarkus.test.kubernetes.client.WithKubernetesTestServer;
import java.net.HttpURLConnection;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import us.ullberg.startpunkt.crd.v1alpha4.Bookmark;
import us.ullberg.startpunkt.crd.v1alpha4.BookmarkSpec;

@QuarkusTest
@WithKubernetesTestServer
class BookmarkManagementServiceTest {
  private static final Class<Bookmark> RESOURCE_TYPE = Bookmark.class;

  @KubernetesTestServer KubernetesServer server;
  private NamespacedKubernetesClient client;
  private BookmarkManagementService bookmarkManagementService;

  @BeforeEach
  public void before() {
    // Create a CustomResourceDefinition (CRD) for the Bookmark resource
    CustomResourceDefinition crd =
        CustomResourceDefinitionContext.v1CRDFromCustomResourceType(RESOURCE_TYPE).build();

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

    // Initialize the service
    bookmarkManagementService = new BookmarkManagementService(client);
  }

  @Test
  void testCreateBookmark() {
    // Create a new bookmark
    BookmarkSpec spec = new BookmarkSpec();
    spec.setName("Create Test Bookmark");
    spec.setGroup("Test Group");
    spec.setUrl("https://create-test.example.com");

    Bookmark created =
        bookmarkManagementService.createBookmark("default", "create-test-bookmark", spec);

    assertNotNull(created);
    assertNotNull(created.getMetadata());
    assertEquals("create-test-bookmark", created.getMetadata().getName());
    assertEquals("default", created.getMetadata().getNamespace());
    assertEquals("Create Test Bookmark", created.getSpec().getName());
  }

  @Test
  void testUpdateBookmark() {
    // First create a bookmark
    BookmarkSpec spec = new BookmarkSpec();
    spec.setName("Update Test Bookmark");
    spec.setGroup("Test Group");
    spec.setUrl("https://update-test.example.com");

    bookmarkManagementService.createBookmark("default", "update-test-bookmark", spec);

    // Now update it
    spec.setName("Updated Bookmark");
    spec.setUrl("https://updated.example.com");

    Bookmark updated =
        bookmarkManagementService.updateBookmark("default", "update-test-bookmark", spec);

    assertNotNull(updated);
    assertEquals("Updated Bookmark", updated.getSpec().getName());
    assertEquals("https://updated.example.com", updated.getSpec().getUrl());
  }

  @Test
  void testUpdateNonExistentBookmark() {
    BookmarkSpec spec = new BookmarkSpec();
    spec.setName("Test Bookmark");
    spec.setGroup("Test Group");
    spec.setUrl("https://test.example.com");

    assertThrows(
        IllegalArgumentException.class,
        () -> bookmarkManagementService.updateBookmark("default", "nonexistent", spec));
  }

  @Test
  void testDeleteBookmark() {
    // Create a bookmark first
    BookmarkSpec spec = new BookmarkSpec();
    spec.setName("Test Bookmark");
    spec.setGroup("Test Group");
    spec.setUrl("https://test.example.com");

    bookmarkManagementService.createBookmark("default", "test-bookmark", spec);

    // Delete it
    boolean deleted = bookmarkManagementService.deleteBookmark("default", "test-bookmark");

    assertTrue(deleted);

    // Verify it's gone
    Bookmark bookmark = bookmarkManagementService.getBookmark("default", "test-bookmark");
    assertNull(bookmark);
  }

  @Test
  void testDeleteNonExistentBookmark() {
    boolean deleted = bookmarkManagementService.deleteBookmark("default", "nonexistent");
    assertFalse(deleted);
  }

  @Test
  void testGetBookmark() {
    // Create a bookmark
    BookmarkSpec spec = new BookmarkSpec();
    spec.setName("Test Bookmark");
    spec.setGroup("Test Group");
    spec.setUrl("https://test.example.com");

    bookmarkManagementService.createBookmark("default", "test-bookmark", spec);

    // Get it
    Bookmark bookmark = bookmarkManagementService.getBookmark("default", "test-bookmark");

    assertNotNull(bookmark);
    assertEquals("test-bookmark", bookmark.getMetadata().getName());
    assertEquals("Test Bookmark", bookmark.getSpec().getName());
  }

  @Test
  void testIsReadOnly() {
    // Create a bookmark without owner reference
    Bookmark bookmark = new Bookmark();
    bookmark.setMetadata(new ObjectMetaBuilder().withName("test-bookmark").build());

    assertFalse(bookmarkManagementService.isReadOnly(bookmark));

    // Add an owner reference
    OwnerReference owner =
        new OwnerReferenceBuilder()
            .withKind("Deployment")
            .withName("test-deployment")
            .withUid("test-uid")
            .withApiVersion("apps/v1")
            .build();
    bookmark.getMetadata().setOwnerReferences(List.of(owner));

    assertTrue(bookmarkManagementService.isReadOnly(bookmark));
  }

  @Test
  void testGetOwner() {
    // Create a bookmark without owner reference
    Bookmark bookmark = new Bookmark();
    bookmark.setMetadata(new ObjectMetaBuilder().withName("test-bookmark").build());

    assertTrue(bookmarkManagementService.getOwner(bookmark).isEmpty());

    // Add an owner reference
    OwnerReference owner =
        new OwnerReferenceBuilder()
            .withKind("Deployment")
            .withName("test-deployment")
            .withUid("test-uid")
            .withApiVersion("apps/v1")
            .build();
    bookmark.getMetadata().setOwnerReferences(List.of(owner));

    assertTrue(bookmarkManagementService.getOwner(bookmark).isPresent());
    assertEquals("Deployment", bookmarkManagementService.getOwner(bookmark).get().getKind());
  }
}
