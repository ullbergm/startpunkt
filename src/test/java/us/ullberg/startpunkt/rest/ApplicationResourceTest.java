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
import io.quarkus.test.kubernetes.client.KubernetesTestServer;
import io.quarkus.test.kubernetes.client.WithKubernetesTestServer;
import jakarta.inject.Inject;
import java.net.HttpURLConnection;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import us.ullberg.startpunkt.crd.Application;
import us.ullberg.startpunkt.crd.ApplicationSpec;

@QuarkusTest
@WithKubernetesTestServer
class ApplicationResourceTest {

  private static final Class<Application> RESOURCE_TYPE = Application.class;

  @KubernetesTestServer
  KubernetesServer server;

  @Inject
  ApplicationResource applicationResource;

  @BeforeEach
  void before() {
    var crd = CustomResourceDefinitionContext.v1CRDFromCustomResourceType(RESOURCE_TYPE).build();

    server.expect()
        .post()
        .withPath("/apis/apiextensions.k8s.io/v1/customresourcedefinitions")
        .andReturn(HttpURLConnection.HTTP_OK, crd)
        .once();

    var client = server.getClient();
    CustomResourceDefinition createdCRD =
        client.apiextensions().v1().customResourceDefinitions().resource(crd).create();

    assertNotNull(createdCRD);

    createApplication("Home Assistant", "Home Automation", "mdi:home-automation", null,
        "https://homeassistant.ullberg.us", "Smart Home Manager", true, 1000, true);

    createApplication("Node-RED", "Home Automation", "mdi:node-red", "red",
        "https://nodered.ullberg.us", "Flow-based development tool", true, 1, true);

    createApplication("CyberChef", "Utilities", "mdi:chef-hat", null,
        "https://cyberchef.ullberg.us", "Cyber Swiss Army Knife", true, 0, true);
  }

  private void createApplication(String name, String group, String icon, String iconColor, String url,
                                 String info, boolean targetBlank, int location, boolean enabled) {
    ApplicationSpec spec = new ApplicationSpec();
    spec.setName(name);
    spec.setGroup(group);
    spec.setIcon(icon);
    spec.setIconColor(iconColor);
    spec.setUrl(url);
    spec.setInfo(info);
    spec.setTargetBlank(targetBlank);
    spec.setLocation(location);
    spec.setEnabled(enabled);

    Application app = new Application();
    app.setMetadata(new ObjectMetaBuilder().withName(name.toLowerCase().replace(" ", "")).build());
    app.setSpec(spec);

    createOrReplace("default", app);
  }

  private void createOrReplace(String namespace, Application object) {
    var client = server.getClient();
    Resource<Application> resource =
        client.resources(RESOURCE_TYPE).inNamespace(namespace).resource(object);

    if (resource.get() != null) {
      resource.update();
    } else {
      resource.create();
    }
  }

  @Test
  void testApplicationsApiEndpoint() {
    given().when().get("/api/apps").then().log().all().statusCode(200);
  }

  @Test
  void testApplicationsGroupCount() {
    given().when().get("/api/apps").then().statusCode(200).body("groups.size()", equalTo(2));
  }

  @Test
  void testApplicationsGroupOrder() {
    given()
        .when()
        .get("/api/apps")
        .then()
        .statusCode(200)
        .body("groups[0].name", equalTo("home automation"))
        .body("groups[1].name", equalTo("utilities"));
  }

  @Test
  void testApplicationsCount() {
    given()
        .when()
        .get("/api/apps")
        .then()
        .statusCode(200)
        .body("groups[0].applications.size()", equalTo(2))
        .body("groups[1].applications.size()", equalTo(1));
  }

  @Test
  void testApplicationsValues() {
    given()
        .when()
        .get("/api/apps")
        .then()
        .statusCode(200)
        .body("groups[0].applications[0].name", equalTo("node-red"))
        .body("groups[0].applications[0].group", equalTo("home automation"))
        .body("groups[0].applications[0].icon", equalTo("mdi:node-red"))
        .body("groups[0].applications[0].iconColor", equalTo("red"))
        .body("groups[0].applications[0].url", equalTo("https://nodered.ullberg.us"))
        .body("groups[0].applications[0].info", equalTo("Flow-based development tool"))
        .body("groups[0].applications[0].targetBlank", equalTo(true))
        .body("groups[0].applications[0].location", equalTo(1))
        .body("groups[0].applications[0].enabled", equalTo(true))
        .body("groups[0].applications[1].name", equalTo("home assistant"))
        .body("groups[0].applications[1].group", equalTo("home automation"))
        .body("groups[0].applications[1].icon", equalTo("mdi:home-automation"))
        .body("groups[0].applications[1].url", equalTo("https://homeassistant.ullberg.us"))
        .body("groups[0].applications[1].info", equalTo("Smart Home Manager"))
        .body("groups[0].applications[1].targetBlank", equalTo(true))
        .body("groups[0].applications[1].location", equalTo(1000))
        .body("groups[0].applications[1].enabled", equalTo(true))
        .body("groups[1].applications[0].name", equalTo("cyberchef"))
        .body("groups[1].applications[0].group", equalTo("utilities"))
        .body("groups[1].applications[0].icon", equalTo("mdi:chef-hat"))
        .body("groups[1].applications[0].url", equalTo("https://cyberchef.ullberg.us"))
        .body("groups[1].applications[0].info", equalTo("Cyber Swiss Army Knife"))
        .body("groups[1].applications[0].targetBlank", equalTo(true))
        .body("groups[1].applications[0].enabled", equalTo(true));
  }

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

  @Test
  void testMissingApplicationInfo() {
    given().when().get("/api/apps/home automation/missing").then().statusCode(404);
  }

  @Test
  void testPingEndpoint() {
    given()
        .when()
        .get("/api/apps/ping")
        .then()
        .statusCode(200)
        .body(equalTo(applicationResource.ping()));
  }
}
