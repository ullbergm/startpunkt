package us.ullberg.startpunkt;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;

import java.net.HttpURLConnection;

import io.fabric8.kubernetes.api.model.KubernetesResourceList;
import io.fabric8.kubernetes.api.model.ObjectMetaBuilder;
import io.fabric8.kubernetes.api.model.apiextensions.v1.CustomResourceDefinition;
import io.fabric8.kubernetes.client.KubernetesClient;
import io.fabric8.kubernetes.client.dsl.MixedOperation;
import io.fabric8.kubernetes.client.dsl.Resource;
import io.fabric8.kubernetes.client.dsl.base.CustomResourceDefinitionContext;
import io.fabric8.kubernetes.client.server.mock.KubernetesServer;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.kubernetes.client.KubernetesTestServer;
import io.quarkus.test.kubernetes.client.WithKubernetesTestServer;
import jakarta.inject.Inject;
import us.ullberg.startpunkt.crd.Bookmark;
import us.ullberg.startpunkt.crd.BookmarkSpec;

import static org.junit.jupiter.api.Assertions.assertNotNull;

import org.junit.jupiter.api.BeforeEach;

import org.junit.jupiter.api.Test;

@QuarkusTest
@WithKubernetesTestServer
class BookmarkResourceTest {
  @KubernetesTestServer
  KubernetesServer server;

  @Inject
  KubernetesClient client;

  @BeforeEach
  public void before() {

    CustomResourceDefinition crd =
        CustomResourceDefinitionContext.v1CRDFromCustomResourceType(Bookmark.class).build();

    server.expect().post().withPath("/apis/apiextensions.k8s.io/v1/customresourcedefinitions")
        .andReturn(HttpURLConnection.HTTP_OK, crd).once();

    // When
    CustomResourceDefinition createdCronTabCrd =
        client.apiextensions().v1().customResourceDefinitions().resource(crd).create();

    assertNotNull(createdCronTabCrd);

    // Create sonarr application
    BookmarkSpec makerworldSpec = new BookmarkSpec();
    makerworldSpec.setName("Makerworld");
    makerworldSpec.setGroup("Media");
    makerworldSpec.setIcon("simple-icons:makerworld");
    makerworldSpec.setUrl("https://makerworld.com");

    Bookmark makerworld = new Bookmark();
    makerworld.setMetadata(new ObjectMetaBuilder().withName("makerworld").build());
    makerworld.setSpec(makerworldSpec);

    MixedOperation<Bookmark, KubernetesResourceList<Bookmark>, Resource<Bookmark>> bookmarkOp =
        client.resources(Bookmark.class);
    bookmarkOp.inNamespace("default").resource(makerworld).createOrReplace();
  }

  @Test
  void testBookmarkApiEndpoint() {
    given().when().get("/api/bookmarks").then().statusCode(200);
  }

  @Test
  void testBookmarkList() {
    // Get a list of apps from the cluster and expect to see one Bookmark
    given().when().get("/api/bookmarks").then().log().all().statusCode(200);
  }

  @Test
  void testBookmarkListSize() {
    given().when().get("/api/bookmarks").then().body("bookmarks.size()", equalTo(1));
  }

  @Test
  void testBookmarkName() {
    given().when().get("/api/bookmarks").then().body("bookmarks[0].name[0]", equalTo("Makerworld"));
  }

  @Test
  void testBookmarkGroup() {
    given().when().get("/api/bookmarks").then().body("bookmarks[0].group[0]", equalTo("media"));
  }

  @Test
  void testBookmarkIcon() {
    given().when().get("/api/bookmarks").then().body("bookmarks[0].icon[0]",
        equalTo("simple-icons:makerworld"));
  }

  @Test
  void testBookmarkUrl() {
    given().when().get("/api/bookmarks").then().body("bookmarks[0].url[0]",
        equalTo("https://makerworld.com"));
  }
}
