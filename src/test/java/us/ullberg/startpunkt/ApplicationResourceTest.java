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
import us.ullberg.startpunkt.crd.Application;
import us.ullberg.startpunkt.crd.ApplicationSpec;

import static org.junit.jupiter.api.Assertions.assertNotNull;

import org.junit.jupiter.api.BeforeEach;

import org.junit.jupiter.api.Test;

@QuarkusTest
@WithKubernetesTestServer
class ApplicationResourceTest {
  @KubernetesTestServer
  KubernetesServer server;

  @Inject
  KubernetesClient client;

  @BeforeEach
  public void before() {

    CustomResourceDefinition crd =
        CustomResourceDefinitionContext.v1CRDFromCustomResourceType(Application.class).build();

    server.expect().post().withPath("/apis/apiextensions.k8s.io/v1/customresourcedefinitions")
        .andReturn(HttpURLConnection.HTTP_OK, crd).once();

    // When
    CustomResourceDefinition createdApplicationCrd =
        client.apiextensions().v1().customResourceDefinitions().resource(crd).create();

    assertNotNull(createdApplicationCrd);

    // Create sonarr application
    ApplicationSpec sonarrSpec = new ApplicationSpec();
    sonarrSpec.setName("Sonarr");
    sonarrSpec.setGroup("Media");
    sonarrSpec.setIcon("mdi:television");
    sonarrSpec.setIconColor("blue");
    sonarrSpec.setUrl("https://sonarr.ullberg.us");
    sonarrSpec.setInfo("TV Show Manager");
    sonarrSpec.setTargetBlank(true);
    sonarrSpec.setLocation(1);
    sonarrSpec.setEnabled(true);

    Application sonarr = new Application();
    sonarr.setMetadata(new ObjectMetaBuilder().withName("sonarr").build());
    sonarr.setSpec(sonarrSpec);

    MixedOperation<Application, KubernetesResourceList<Application>, Resource<Application>> appOp =
        client.resources(Application.class);
    appOp.inNamespace("default").resource(sonarr).createOrReplace();
  }

  @Test
  void testApplicationList() {
    // Get a list of apps from the cluster and expect to see one application
    given().when().get("/api/apps").then().log().all().statusCode(200);
  }

  @Test
  void testApplicationListSize() {
    given().when().get("/api/apps").then().body("applications.size()", equalTo(1));
  }

  @Test
  void testApplicationName() {
    given().when().get("/api/apps").then().body("applications[0].name[0]", equalTo("sonarr"));
  }

  @Test
  void testApplicationGroup() {
    given().when().get("/api/apps").then().body("applications[0].group[0]", equalTo("media"));
  }

  @Test
  void testApplicationIcon() {
    given().when().get("/api/apps").then().body("applications[0].icon[0]",
        equalTo("mdi:television"));
  }

  @Test
  void testApplicationIconColor() {
    given().when().get("/api/apps").then().body("applications[0].iconColor[0]", equalTo("blue"));
  }

  @Test
  void testApplicationUrl() {
    given().when().get("/api/apps").then().body("applications[0].url[0]",
        equalTo("https://sonarr.ullberg.us"));
  }

  @Test
  void testApplicationInfo() {
    given().when().get("/api/apps").then().body("applications[0].info[0]",
        equalTo("TV Show Manager"));
  }

  @Test
  void testApplicationTargetBlank() {
    given().when().get("/api/apps").then().body("applications[0].targetBlank[0]", equalTo(true));
  }

  @Test
  void testApplicationLocation() {
    given().when().get("/api/apps").then().body("applications[0].location[0]", equalTo(1));
  }

  @Test
  void testApplicationEnabled() {
    given().when().get("/api/apps").then().body("applications[0].enabled[0]", equalTo(true));
  }

  @Test
  public void testApplicationGet() {
    // get Applications objects from the cluster and expect to see the sonarr
    // application
    given().when().get("/api/apps/sonarr").then().log().all().statusCode(200);
  }
}
