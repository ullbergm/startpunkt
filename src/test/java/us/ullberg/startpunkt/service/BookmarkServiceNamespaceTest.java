package us.ullberg.startpunkt.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

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

/** Test class for {@link BookmarkService} with specific namespace configuration. */
@QuarkusTest
@WithKubernetesTestServer
@TestProfile(BookmarkServiceNamespaceTest.SpecificNamespacesProfile.class)
class BookmarkServiceNamespaceTest {

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
  void testRetrieveBookmarks_SpecificNamespaces() {
    // Create bookmarks in different namespaces
    createBookmark("default", "Default Bookmark", "Test", "https://default.com");
    createBookmark("startpunkt", "Startpunkt Bookmark", "Test", "https://startpunkt.com");
    createBookmark("kube-system", "System Bookmark", "Test", "https://system.com");
    createBookmark("other", "Other Bookmark", "Test", "https://other.com");

    // With matchNames = ["default", "startpunkt"], should only retrieve from those namespaces
    List<BookmarkSpec> bookmarks = bookmarkService.retrieveBookmarks();

    assertNotNull(bookmarks);
    assertEquals(2, bookmarks.size());

    // Verify only bookmarks from specified namespaces are retrieved
    assertTrue(bookmarks.stream().anyMatch(b -> "Default Bookmark".equals(b.getName())));
    assertTrue(bookmarks.stream().anyMatch(b -> "Startpunkt Bookmark".equals(b.getName())));
    assertTrue(bookmarks.stream().noneMatch(b -> "System Bookmark".equals(b.getName())));
    assertTrue(bookmarks.stream().noneMatch(b -> "Other Bookmark".equals(b.getName())));
  }

  /** Test profile for specific namespace configuration. */
  public static class SpecificNamespacesProfile
      implements io.quarkus.test.junit.QuarkusTestProfile {
    @Override
    public Map<String, String> getConfigOverrides() {
      return Map.of(
          "startpunkt.namespaceSelector.any", "false",
          "startpunkt.namespaceSelector.matchNames[0]", "default",
          "startpunkt.namespaceSelector.matchNames[1]", "startpunkt");
    }
  }
}
