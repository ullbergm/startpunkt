package us.ullberg.startpunkt.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import io.fabric8.kubernetes.api.model.ObjectMetaBuilder;
import io.fabric8.kubernetes.api.model.apiextensions.v1.CustomResourceDefinition;
import io.fabric8.kubernetes.client.NamespacedKubernetesClient;
import io.fabric8.kubernetes.client.dsl.base.CustomResourceDefinitionContext;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.TestProfile;
import io.quarkus.test.kubernetes.client.KubernetesServer;
import io.quarkus.test.kubernetes.client.KubernetesTestServer;
import io.quarkus.test.kubernetes.client.WithKubernetesTestServer;
import jakarta.inject.Inject;
import java.net.HttpURLConnection;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import us.ullberg.startpunkt.crd.v1alpha3.Bookmark;
import us.ullberg.startpunkt.crd.v1alpha3.BookmarkSpec;

/** Test class for {@link BookmarkService} with empty namespace configuration. */
@QuarkusTest
@WithKubernetesTestServer
@TestProfile(BookmarkServiceEmptyNamespaceTest.EmptyNamespacesProfile.class)
class BookmarkServiceEmptyNamespaceTest {

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
  void testRetrieveBookmarks_EmptyMatchNamesWithAnyFalse() {
    // Create bookmarks in different namespaces
    createBookmark("default", "Empty Default Bookmark", "Test", "https://default.com");
    createBookmark("startpunkt", "Empty Startpunkt Bookmark", "Test", "https://startpunkt.com");

    // With anyNamespace = false and no matchNames configured, should retrieve no bookmarks
    List<BookmarkSpec> bookmarks = bookmarkService.retrieveBookmarks();

    assertNotNull(bookmarks);
    // Should return empty list when anyNamespace=false and matchNames is not configured
    assertEquals(0, bookmarks.size());
  }

  /** Test profile for empty namespace configuration. */
  public static class EmptyNamespacesProfile implements io.quarkus.test.junit.QuarkusTestProfile {
    @Override
    public Map<String, String> getConfigOverrides() {
      return Map.of(
          "startpunkt.namespaceSelector.any", "false"
          // No matchNames configured - this tests the Optional.empty() case
          );
    }
  }
}
