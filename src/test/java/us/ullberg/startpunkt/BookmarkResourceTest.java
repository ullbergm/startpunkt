package us.ullberg.startpunkt;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import java.net.HttpURLConnection;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import io.fabric8.kubernetes.api.model.ObjectMetaBuilder;
import io.fabric8.kubernetes.api.model.apiextensions.v1.CustomResourceDefinition;
import io.fabric8.kubernetes.client.KubernetesClient;
import io.fabric8.kubernetes.client.dsl.Resource;
import io.fabric8.kubernetes.client.dsl.base.CustomResourceDefinitionContext;
import io.fabric8.kubernetes.client.server.mock.KubernetesServer;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.kubernetes.client.KubernetesTestServer;
import io.quarkus.test.kubernetes.client.WithKubernetesTestServer;
import jakarta.inject.Inject;
import us.ullberg.startpunkt.crd.Bookmark;
import us.ullberg.startpunkt.crd.BookmarkSpec;

// Mark this class as a Quarkus test
@QuarkusTest
// Enable Kubernetes mock server for testing
@WithKubernetesTestServer
class BookmarkResourceTest {
  // Define the type of the custom resource
  private static final Class<Bookmark> RESOURCE_TYPE = Bookmark.class;

  // Inject the Kubernetes mock server
  @KubernetesTestServer
  KubernetesServer server;

  // Inject the Kubernetes client
  @Inject
  KubernetesClient client;

  // Setup method to initialize the test environment before each test
  @BeforeEach
  public void before() {

    // Create a CustomResourceDefinition (CRD) for the Bookmark resource
    CustomResourceDefinition crd =
        CustomResourceDefinitionContext.v1CRDFromCustomResourceType(Bookmark.class).build();

    // Set up the mock server to expect a POST request for creating the CRD
    server.expect().post().withPath("/apis/apiextensions.k8s.io/v1/customresourcedefinitions")
        .andReturn(HttpURLConnection.HTTP_OK, crd).once();

    // Create the CRD in the mock Kubernetes cluster
    CustomResourceDefinition createdBookmarkCrd =
        client.apiextensions().v1().customResourceDefinitions().resource(crd).create();

    // Verify that the CRD was created
    assertNotNull(createdBookmarkCrd);

    // Create a new BookmarkSpec for the Makerworld bookmark
    BookmarkSpec makerworldSpec = new BookmarkSpec();
    makerworldSpec.setName("Makerworld");
    makerworldSpec.setGroup("Media");
    makerworldSpec.setIcon("simple-icons:makerworld");
    makerworldSpec.setUrl("https://makerworld.com");

    // Create a new Bookmark resource using the BookmarkSpec
    Bookmark makerworld = new Bookmark();
    makerworld.setMetadata(new ObjectMetaBuilder().withName("makerworld").build());
    makerworld.setSpec(makerworldSpec);

    // Create or replace the Makerworld bookmark resource in the default namespace
    createOrReplace("default", makerworld);
  }

  // Method to create or replace a custom resource in the specified namespace
  private void createOrReplace(String namespace, Bookmark object) {
    Resource<Bookmark> resource =
        client.resources(RESOURCE_TYPE).inNamespace(namespace).resource(object);

    // Check if the resource already exists
    if (resource.get() != null) {
      // Replace the existing resource
      resource.update();
    } else {
      // Create the new resource
      resource.create();
    }
  }

  // Test to verify that the bookmarks API endpoint is accessible
  @Test
  void testBookmarkApiEndpoint() {
    given().when().get("/api/bookmarks").then().statusCode(200);
  }

  // Test to get a list of bookmarks from the cluster and expect to see the Makerworld bookmark
  @Test
  void testBookmarkList() {
    given().when().get("/api/bookmarks").then().log().all().statusCode(200);
  }

  // Test to verify that the list of bookmarks contains exactly one bookmark
  @Test
  void testBookmarkListSize() {
    given().when().get("/api/bookmarks").then().body("bookmarks.size()", equalTo(1));
  }

  // Test to verify that the first bookmark's name is "Makerworld"
  @Test
  void testBookmarkName() {
    given().when().get("/api/bookmarks").then().body("bookmarks[0].name[0]", equalTo("Makerworld"));
  }

  // Test to verify that the first bookmark's group is "media"
  @Test
  void testBookmarkGroup() {
    given().when().get("/api/bookmarks").then().body("bookmarks[0].group[0]", equalTo("media"));
  }

  // Test to verify that the first bookmark's icon is "simple-icons:makerworld"
  @Test
  void testBookmarkIcon() {
    given().when().get("/api/bookmarks").then().body("bookmarks[0].icon[0]",
        equalTo("simple-icons:makerworld"));
  }

  // Test to verify that the first bookmark's URL is "https://makerworld.com"
  @Test
  void testBookmarkUrl() {
    given().when().get("/api/bookmarks").then().body("bookmarks[0].url[0]",
        equalTo("https://makerworld.com"));
  }
}
