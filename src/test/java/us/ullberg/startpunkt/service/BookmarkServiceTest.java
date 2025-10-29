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
import us.ullberg.startpunkt.crd.v1alpha3.Bookmark;
import us.ullberg.startpunkt.crd.v1alpha3.BookmarkSpec;

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
}
