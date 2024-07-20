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
import us.ullberg.startpunkt.crd.Application;
import us.ullberg.startpunkt.crd.ApplicationSpec;

@QuarkusTest
@WithKubernetesTestServer
class ApplicationResourceTest {
  // Define the type of the custom resource
  private static final Class<Application> RESOURCE_TYPE = Application.class;

  @KubernetesTestServer
  KubernetesServer server; // Mock Kubernetes server for testing

  @Inject
  KubernetesClient client; // Kubernetes client for interacting with the cluster

  @BeforeEach
  public void before() {

    // Create a CustomResourceDefinition (CRD) for the Application resource
    CustomResourceDefinition crd =
        CustomResourceDefinitionContext.v1CRDFromCustomResourceType(RESOURCE_TYPE).build();

    // Set up the mock server to expect a POST request for creating the CRD
    server.expect().post().withPath("/apis/apiextensions.k8s.io/v1/customresourcedefinitions")
        .andReturn(HttpURLConnection.HTTP_OK, crd).once();

    // Create the CRD in the mock Kubernetes cluster
    CustomResourceDefinition createdApplicationCrd =
        client.apiextensions().v1().customResourceDefinitions().resource(crd).create();

    assertNotNull(createdApplicationCrd); // Verify that the CRD was created

    // Create a new ApplicationSpec for the Sonarr application
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

    // Create a new Application resource using the ApplicationSpec
    Application sonarr = new Application();
    sonarr.setMetadata(new ObjectMetaBuilder().withName("sonarr").build());
    sonarr.setSpec(sonarrSpec);

    // Create or replace the Sonarr application resource in the default namespace
    createOrReplace("default", sonarr);
  }

  // Method to create or replace a custom resource in the specified namespace
  private void createOrReplace(String namespace, Application object) {
    Resource<Application> resource =
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

  @Test
  void testApplicationList() {
    // Test to get a list of apps from the cluster and expect to see the Sonarr application
    given().when().get("/api/apps").then().log().all().statusCode(200);
  }

  @Test
  void testApplicationListSize() {
    // Test to verify that the list of applications contains exactly one application
    given().when().get("/api/apps").then().body("applications.size()", equalTo(1));
  }

  @Test
  void testApplicationName() {
    // Test to verify that the first application's name is "sonarr"
    given().when().get("/api/apps").then().body("applications[0].name[0]", equalTo("sonarr"));
  }

  @Test
  void testApplicationGroup() {
    // Test to verify that the first application's group is "media"
    given().when().get("/api/apps").then().body("applications[0].group[0]", equalTo("media"));
  }

  @Test
  void testApplicationIcon() {
    // Test to verify that the first application's icon is "mdi:television"
    given().when().get("/api/apps").then().body("applications[0].icon[0]",
        equalTo("mdi:television"));
  }

  @Test
  void testApplicationIconColor() {
    // Test to verify that the first application's icon color is "blue"
    given().when().get("/api/apps").then().body("applications[0].iconColor[0]", equalTo("blue"));
  }

  @Test
  void testApplicationUrl() {
    // Test to verify that the first application's URL is "https://sonarr.ullberg.us"
    given().when().get("/api/apps").then().body("applications[0].url[0]",
        equalTo("https://sonarr.ullberg.us"));
  }

  @Test
  void testApplicationInfo() {
    // Test to verify that the first application's info is "TV Show Manager"
    given().when().get("/api/apps").then().body("applications[0].info[0]",
        equalTo("TV Show Manager"));
  }

  @Test
  void testApplicationTargetBlank() {
    // Test to verify that the first application's targetBlank is true
    given().when().get("/api/apps").then().body("applications[0].targetBlank[0]", equalTo(true));
  }

  @Test
  void testApplicationLocation() {
    // Test to verify that the first application's location is 1
    given().when().get("/api/apps").then().body("applications[0].location[0]", equalTo(1));
  }

  @Test
  void testApplicationEnabled() {
    // Test to verify that the first application's enabled is true
    given().when().get("/api/apps").then().body("applications[0].enabled[0]", equalTo(true));
  }

  @Test
  void testApplicationGet() {
    // Test to get the Sonarr application from the cluster and expect it to be present
    given().when().get("/api/apps/sonarr").then().log().all().statusCode(200);
  }
}
