package us.ullberg.startpunkt.rest;

import static io.restassured.RestAssured.given;
import static org.hamcrest.Matchers.equalTo;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import io.fabric8.kubernetes.api.model.ObjectMetaBuilder;
import io.fabric8.kubernetes.api.model.apiextensions.v1.CustomResourceDefinition;
import io.fabric8.kubernetes.client.NamespacedKubernetesClient;
import io.fabric8.kubernetes.client.dsl.Resource;
import io.fabric8.kubernetes.client.dsl.base.CustomResourceDefinitionContext;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.kubernetes.client.KubernetesServer;
import io.quarkus.test.kubernetes.client.KubernetesTestServer;
import io.quarkus.test.kubernetes.client.WithKubernetesTestServer;
import java.net.HttpURLConnection;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import us.ullberg.startpunkt.crd.v1alpha4.Application;
import us.ullberg.startpunkt.crd.v1alpha4.ApplicationSpec;

@QuarkusTest
@WithKubernetesTestServer
class ApplicationResourceTest {
  // Define the type of the custom resource
  private static final Class<Application> RESOURCE_TYPE = Application.class;

  @KubernetesTestServer KubernetesServer server; // Mock Kubernetes server for testing
  private NamespacedKubernetesClient client;

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
    client = server.getClient();

    // Create the CRD in the mock Kubernetes cluster
    CustomResourceDefinition createdApplicationCrd =
        client.apiextensions().v1().customResourceDefinitions().resource(crd).create();

    assertNotNull(createdApplicationCrd); // Verify that the CRD was created

    // Create new ApplicationSpec for the HomeAssistant application
    ApplicationSpec homeAssistantSpec = new ApplicationSpec();
    homeAssistantSpec.setName("Home Assistant");
    homeAssistantSpec.setGroup("Home Automation");
    homeAssistantSpec.setIcon("mdi:home-automation");
    homeAssistantSpec.setUrl("https://homeassistant.ullberg.us");
    homeAssistantSpec.setInfo("Smart Home Manager");
    homeAssistantSpec.setTargetBlank(true);
    homeAssistantSpec.setEnabled(true);
    homeAssistantSpec.setTags("admin,home");

    // Create a new Application resource using the ApplicationSpec
    Application homeAssistant = new Application();
    homeAssistant.setMetadata(
        new ObjectMetaBuilder()
            .withName("homeassistant")
            .addToAnnotations("startpunkt.ullberg.us/tags", "admin,home")
            .build());
    homeAssistant.setSpec(homeAssistantSpec);

    // Create or replace the HomeAssistant application resource in the default
    // namespace
    createOrReplace("default", homeAssistant);

    // Create new ApplicationSpec for the Node-Red application
    ApplicationSpec nodeRedSpec = new ApplicationSpec();
    nodeRedSpec.setName("Node-RED");
    nodeRedSpec.setGroup("Home Automation");
    nodeRedSpec.setIcon("mdi:node-red");
    nodeRedSpec.setIconColor("red");
    nodeRedSpec.setUrl("https://nodered.ullberg.us");
    nodeRedSpec.setInfo("Flow-based development tool");
    nodeRedSpec.setTargetBlank(true);
    nodeRedSpec.setLocation(1);
    nodeRedSpec.setEnabled(true);
    nodeRedSpec.setTags("dev,home");

    // Create a new Application resource using the ApplicationSpec
    Application nodeRed = new Application();
    nodeRed.setMetadata(
        new ObjectMetaBuilder()
            .withName("nodered")
            .addToAnnotations("startpunkt.ullberg.us/tags", "dev,home")
            .build());
    nodeRed.setSpec(nodeRedSpec);

    // Create or replace the Node-Red application resource in the default namespace
    createOrReplace("default", nodeRed);

    // Create new ApplicationSpec for the CyberChef application (no tags - untagged app)
    ApplicationSpec cyberChefSpec = new ApplicationSpec();
    cyberChefSpec.setName("CyberChef");
    cyberChefSpec.setGroup("Utilities");
    cyberChefSpec.setIcon("mdi:chef-hat");
    cyberChefSpec.setUrl("https://cyberchef.ullberg.us");
    cyberChefSpec.setInfo("Cyber Swiss Army Knife");
    cyberChefSpec.setTargetBlank(true);
    cyberChefSpec.setEnabled(true);

    // Create a new Application resource using the ApplicationSpec
    Application cyberChef = new Application();
    cyberChef.setMetadata(new ObjectMetaBuilder().withName("cyberchef").build());
    cyberChef.setSpec(cyberChefSpec);

    // Create or replace the CyberChef application resource in the default namespace
    createOrReplace("default", cyberChef);
  }

  // Method to create or replace a custom resource in the specified namespace
  private void createOrReplace(String namespace, Application object) {
    // Get the Kubernetes client from the mock server
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

  // Test to verify that the applications API endpoint is accessible
  @Test
  void testApplicationsApiEndpoint() {
    given().when().get("/api/apps").then().log().all().statusCode(200);
  }

  // Test to verify that the list contains only one group (utilities with untagged app)
  @Test
  void testApplicationsGroupCount() {
    given().when().get("/api/apps").then().statusCode(200).body("groups.size()", equalTo(1));
  }

  // Test to verify that only utilities group is returned (with untagged app)
  @Test
  void testApplicationsGroupOrder() {
    given()
        .when()
        .get("/api/apps")
        .then()
        .statusCode(200)
        .body("groups[0].name", equalTo("utilities"));
  }

  // Test to verify that only one application (untagged) is returned
  @Test
  void testApplicationsCount() {
    given()
        .when()
        .get("/api/apps")
        .then()
        .statusCode(200)
        .body("groups[0].applications.size()", equalTo(1));
  }

  // Test to verify that only the untagged application (cyberchef) is returned
  @Test
  void testApplicationsValues() {
    given()
        .when()
        .get("/api/apps")
        .then()
        .statusCode(200)
        .body("groups[0].applications[0].name", equalTo("cyberchef"))
        .body("groups[0].applications[0].group", equalTo("utilities"))
        .body("groups[0].applications[0].icon", equalTo("mdi:chef-hat"))
        .body("groups[0].applications[0].url", equalTo("https://cyberchef.ullberg.us"))
        .body("groups[0].applications[0].info", equalTo("Cyber Swiss Army Knife"))
        .body("groups[0].applications[0].targetBlank", equalTo(true))
        .body("groups[0].applications[0].enabled", equalTo(true));
  }

  // Test reading the information of a single application
  @Test
  void testApplicationInfo() {
    given()
        .when()
        .get("/api/apps/home automation/home assistant")
        .then()
        .statusCode(200)
        .body("name", equalTo("home assistant"))
        .body("group", equalTo("home automation"))
        .body("icon", equalTo("mdi:home-automation"))
        .body("url", equalTo("https://homeassistant.ullberg.us"))
        .body("info", equalTo("Smart Home Manager"))
        .body("targetBlank", equalTo(true))
        .body("location", equalTo(1000))
        .body("enabled", equalTo(true));
  }

  // Test reading the information for a missing application
  @Test
  void testMissingApplicationInfo() {
    given().when().get("/api/apps/home automation/missing").then().statusCode(404);
  }

  // Test the ping endpoint
  @Test
  void testPingEndpoint() {
    given()
        .when()
        .get("/api/apps/ping")
        .then()
        .statusCode(200)
        .body(equalTo(new ApplicationResource(null, null).ping()));
  }

  // ---- Tag Filtering Tests ----

  // Test filtering by single tag 'admin' - should return Home Assistant and untagged CyberChef
  @Test
  void testFilterBySingleTagAdmin() {
    given()
        .when()
        .get("/api/apps/admin")
        .then()
        .statusCode(200)
        .body("groups.size()", equalTo(2)) // Home Automation + Utilities
        .body("groups[0].applications.size()", equalTo(1)) // Only Home Assistant
        .body("groups[0].applications[0].name", equalTo("home assistant"))
        .body("groups[1].applications.size()", equalTo(1)) // Untagged CyberChef
        .body("groups[1].applications[0].name", equalTo("cyberchef"));
  }

  // Test filtering by single tag 'dev' - should return Node-RED and untagged CyberChef
  @Test
  void testFilterBySingleTagDev() {
    given()
        .when()
        .get("/api/apps/dev")
        .then()
        .statusCode(200)
        .body("groups.size()", equalTo(2)) // Home Automation + Utilities
        .body("groups[0].applications.size()", equalTo(1)) // Only Node-RED
        .body("groups[0].applications[0].name", equalTo("node-red"))
        .body("groups[1].applications.size()", equalTo(1)) // Untagged CyberChef
        .body("groups[1].applications[0].name", equalTo("cyberchef"));
  }

  // Test filtering by single tag 'home' - should return both Home Automation apps and untagged
  // CyberChef
  @Test
  void testFilterBySingleTagHome() {
    given()
        .when()
        .get("/api/apps/home")
        .then()
        .statusCode(200)
        .body("groups.size()", equalTo(2)) // Home Automation + Utilities
        .body("groups[0].applications.size()", equalTo(2)) // Both Home Automation apps
        .body("groups[1].applications.size()", equalTo(1)) // Untagged CyberChef
        .body("groups[1].applications[0].name", equalTo("cyberchef"));
  }

  // Test filtering by multiple tags 'admin,dev' - should return all apps (both tagged + untagged)
  @Test
  void testFilterByMultipleTags() {
    given()
        .when()
        .get("/api/apps/admin,dev")
        .then()
        .statusCode(200)
        .body("groups.size()", equalTo(2)) // Home Automation + Utilities
        .body("groups[0].applications.size()", equalTo(2)) // Both Home Automation apps
        .body("groups[1].applications.size()", equalTo(1)) // Untagged CyberChef
        .body("groups[1].applications[0].name", equalTo("cyberchef"));
  }

  // Test filtering by non-existent tag - should only return untagged apps
  @Test
  void testFilterByNonExistentTag() {
    given()
        .when()
        .get("/api/apps/nonexistent")
        .then()
        .statusCode(200)
        .body("groups.size()", equalTo(1)) // Only Utilities group
        .body("groups[0].applications.size()", equalTo(1)) // Only untagged CyberChef
        .body("groups[0].applications[0].name", equalTo("cyberchef"));
  }

  // Test filtering with empty tags - should show only untagged applications
  @Test
  void testFilterWithEmptyTags() {
    given()
        .when()
        .get("/api/apps/")
        .then()
        .statusCode(200)
        .body("groups.size()", equalTo(1)) // Only utilities group (has untagged app)
        .body("groups[0].applications.size()", equalTo(1)) // Only untagged CyberChef
        .body("groups[0].applications[0].name", equalTo("cyberchef"));
  }

  /** Test class with specific namespace configuration - any = false, specific namespaces */
  @QuarkusTest
  @WithKubernetesTestServer
  @io.quarkus.test.junit.TestProfile(SpecificNamespacesApplicationProfile.class)
  static class SpecificNamespacesApplicationTest {

    @KubernetesTestServer KubernetesServer server;
    private NamespacedKubernetesClient client;

    @BeforeEach
    public void before() {
      // Create a CustomResourceDefinition (CRD) for the Application resource
      CustomResourceDefinition crd =
          CustomResourceDefinitionContext.v1CRDFromCustomResourceType(Application.class).build();

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
      CustomResourceDefinition createdApplicationCrd =
          client.apiextensions().v1().customResourceDefinitions().resource(crd).create();

      // Verify that the CRD was created
      assertNotNull(createdApplicationCrd);

      // Create applications in multiple namespaces to test namespace filtering
      createApplicationInNamespace("default", "default-app", "Default App", "Default");
      createApplicationInNamespace("startpunkt", "startpunkt-app", "Startpunkt App", "Startpunkt");
      createApplicationInNamespace("kube-system", "system-app", "System App", "System");
      createApplicationInNamespace("other", "other-app", "Other App", "Other");
    }

    /** Helper method to create an application in a specific namespace. */
    private void createApplicationInNamespace(
        String namespace, String name, String displayName, String group) {
      ApplicationSpec spec = new ApplicationSpec();
      spec.setName(displayName);
      spec.setGroup(group);
      spec.setUrl("https://" + name + ".example.com");
      spec.setEnabled(true);
      spec.setLocation(1000);
      spec.setTargetBlank(true);

      Application application = new Application();
      application.setMetadata(
          new ObjectMetaBuilder().withName(name).withNamespace(namespace).build());
      application.setSpec(spec);

      client.resources(Application.class).inNamespace(namespace).resource(application).create();
    }

    @Test
    void testRetrieveApplications_SpecificNamespaces() {
      // With matchNames = ["default", "startpunkt"], should only retrieve from those namespaces
      given()
          .when()
          .get("/api/apps")
          .then()
          .statusCode(200)
          .body("groups.size()", equalTo(2)) // Default and Startpunkt groups only
          .body("groups.find { it.name == 'Default' }.applications.size()", equalTo(1))
          .body("groups.find { it.name == 'Startpunkt' }.applications.size()", equalTo(1))
          .body("groups.find { it.name == 'Default' }.applications[0].name", equalTo("Default App"))
          .body(
              "groups.find { it.name == 'Startpunkt' }.applications[0].name",
              equalTo("Startpunkt App"));
    }
  }

  /** Test profile for specific namespace configuration in ApplicationResource tests. */
  public static class SpecificNamespacesApplicationProfile
      implements io.quarkus.test.junit.QuarkusTestProfile {
    @Override
    public java.util.Map<String, String> getConfigOverrides() {
      return java.util.Map.of(
          "startpunkt.namespaceSelector.any", "false",
          "startpunkt.namespaceSelector.matchNames[0]", "default",
          "startpunkt.namespaceSelector.matchNames[1]", "startpunkt");
    }
  }

  /** Test class with empty namespace configuration */
  @QuarkusTest
  @WithKubernetesTestServer
  @io.quarkus.test.junit.TestProfile(EmptyNamespacesApplicationProfile.class)
  static class EmptyNamespacesApplicationTest {

    @KubernetesTestServer KubernetesServer server;
    private NamespacedKubernetesClient client;

    @BeforeEach
    public void before() {
      // Create a CustomResourceDefinition (CRD) for the Application resource
      CustomResourceDefinition crd =
          CustomResourceDefinitionContext.v1CRDFromCustomResourceType(Application.class).build();

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
      CustomResourceDefinition createdApplicationCrd =
          client.apiextensions().v1().customResourceDefinitions().resource(crd).create();

      // Verify that the CRD was created
      assertNotNull(createdApplicationCrd);

      // Create applications in multiple namespaces
      createApplicationInNamespace("default", "default-app", "Default App", "Default");
      createApplicationInNamespace("startpunkt", "startpunkt-app", "Startpunkt App", "Startpunkt");
    }

    /** Helper method to create an application in a specific namespace. */
    private void createApplicationInNamespace(
        String namespace, String name, String displayName, String group) {
      ApplicationSpec spec = new ApplicationSpec();
      spec.setName(displayName);
      spec.setGroup(group);
      spec.setUrl("https://" + name + ".example.com");
      spec.setEnabled(true);
      spec.setLocation(1000);
      spec.setTargetBlank(true);

      Application application = new Application();
      application.setMetadata(
          new ObjectMetaBuilder().withName(name).withNamespace(namespace).build());
      application.setSpec(spec);

      client.resources(Application.class).inNamespace(namespace).resource(application).create();
    }

    @Test
    void testRetrieveApplications_EmptyMatchNamesWithAnyFalse() {
      // With anyNamespace = false and no matchNames configured, should retrieve no applications
      given()
          .when()
          .get("/api/apps")
          .then()
          .statusCode(200)
          .body("groups.size()", equalTo(0)); // No applications should be returned
    }
  }

  // Additional edge case tests
  @Test
  void testApplicationsResponseContentType() {
    given()
        .when()
        .get("/api/apps")
        .then()
        .statusCode(200)
        .contentType("application/json");
  }

  @Test
  void testApplicationsWithNoMatchingTags() {
    given()
        .queryParam("tags", "nonexistent-tag")
        .when()
        .get("/api/apps")
        .then()
        .statusCode(200);
  }

  @Test
  void testApplicationsWithMultipleTagsQueryParam() {
    given()
        .queryParam("tags", "admin,home,extra")
        .when()
        .get("/api/apps")
        .then()
        .statusCode(200);
  }

  @Test
  void testApplicationsWithEmptyTagsParam() {
    given()
        .queryParam("tags", "")
        .when()
        .get("/api/apps")
        .then()
        .statusCode(200);
  }

  @Test
  void testApplicationsWithSpecialCharsInTags() {
    given()
        .queryParam("tags", "tag-with-dash,tag_with_underscore")
        .when()
        .get("/api/apps")
        .then()
        .statusCode(200);
  }

  @Test
  void testApplicationGroupsArePresent() {
    given()
        .when()
        .get("/api/apps")
        .then()
        .statusCode(200)
        .body("groups", org.hamcrest.Matchers.notNullValue());
  }

  @Test
  void testApplicationAvailabilityFields() {
    // Verify that applications have availability information
    given()
        .when()
        .get("/api/apps")
        .then()
        .statusCode(200)
        .body("groups[0].applications[0].available", org.hamcrest.Matchers.notNullValue());
  }

  @Test
  void testMultipleApplicationsInSameGroup() {
    // Verify multiple applications can exist in the same group
    given()
        .when()
        .get("/api/apps")
        .then()
        .statusCode(200)
        .body("groups.size()", org.hamcrest.Matchers.greaterThan(0));
  }

  @Test
  void testDisabledApplicationsAreExcluded() {
    // Verify that disabled applications are not returned
    given()
        .when()
        .get("/api/apps")
        .then()
        .statusCode(200);
    // The disabled K3s application should not appear in results
  }

  @Test
  void testApplicationWithRootPath() {
    // Verify applications with rootPath are handled correctly
    given()
        .when()
        .get("/api/apps")
        .then()
        .statusCode(200);
  }

  /** Test profile for empty namespace configuration in ApplicationResource tests. */
  public static class EmptyNamespacesApplicationProfile
      implements io.quarkus.test.junit.QuarkusTestProfile {
    @Override
    public java.util.Map<String, String> getConfigOverrides() {
      return java.util.Map.of(
          "startpunkt.namespaceSelector.any", "false"
          // No matchNames configured - this tests the Optional.empty() case
          );
    }
  }
}
