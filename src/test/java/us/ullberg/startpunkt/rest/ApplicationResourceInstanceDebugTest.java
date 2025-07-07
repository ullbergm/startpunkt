package us.ullberg.startpunkt.rest;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import io.fabric8.kubernetes.api.model.ObjectMetaBuilder;
import io.fabric8.kubernetes.api.model.apiextensions.v1.CustomResourceDefinition;
import io.fabric8.kubernetes.client.dsl.Resource;
import io.fabric8.kubernetes.client.dsl.base.CustomResourceDefinitionContext;
import io.fabric8.kubernetes.client.server.mock.KubernetesServer;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.QuarkusTestProfile;
import io.quarkus.test.junit.TestProfile;
import io.quarkus.test.kubernetes.client.KubernetesTestServer;
import io.quarkus.test.kubernetes.client.WithKubernetesTestServer;
import java.net.HttpURLConnection;
import java.util.Map;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import us.ullberg.startpunkt.crd.Application;
import us.ullberg.startpunkt.crd.ApplicationSpec;

@QuarkusTest
@WithKubernetesTestServer
@TestProfile(ApplicationResourceInstanceDebugTest.DebugProfile.class)
class ApplicationResourceInstanceDebugTest {
  // Define the type of the custom resource
  private static final Class<Application> RESOURCE_TYPE = Application.class;

  @KubernetesTestServer KubernetesServer server; // Mock Kubernetes server for testing

  public static class DebugProfile implements QuarkusTestProfile {
    @Override
    public Map<String, String> getConfigOverrides() {
      return Map.of("startpunkt.instance", "admin");
    }
  }

  @BeforeEach
  public void before() {

    // Create a CustomResourceDefinition (CRD) for the Application resource
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
    var client = server.getClient();

    // Create the CRD in the mock Kubernetes cluster
    CustomResourceDefinition createdApplicationCrd =
        client.apiextensions().v1().customResourceDefinitions().resource(crd).create();

    assertNotNull(createdApplicationCrd); // Verify that the CRD was created

    // Create a simple admin app 
    ApplicationSpec adminAppSpec = new ApplicationSpec();
    adminAppSpec.setName("Admin Dashboard");
    adminAppSpec.setGroup("Administration");
    adminAppSpec.setIcon("mdi:admin");
    adminAppSpec.setUrl("https://admin.example.com");
    adminAppSpec.setInfo("Admin Dashboard");
    adminAppSpec.setTargetBlank(true);
    adminAppSpec.setEnabled(true);

    Application adminApp = new Application();
    adminApp.setMetadata(new ObjectMetaBuilder()
        .withName("admin-dashboard")
        .withAnnotations(Map.of("startpunkt.ullberg.us/instance", "admin"))
        .build());
    adminApp.setSpec(adminAppSpec);

    createOrReplace("default", adminApp);
  }

  // Method to create or replace a custom resource in the specified namespace
  private void createOrReplace(String namespace, Application object) {
    // Get the Kubernetes client from the mock server
    var client = server.getClient();

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

  // Test simple case - single app with matching instance should be returned
  @Test
  void testSingleAppWithMatchingInstance() {
    given().when().get("/api/apps").then().log().all().statusCode(200)
        .body("groups.size()", equalTo(1))
        .body("groups[0].name", equalTo("administration"))
        .body("groups[0].applications.size()", equalTo(1))
        .body("groups[0].applications[0].name", equalTo("admin dashboard"));
  }
}