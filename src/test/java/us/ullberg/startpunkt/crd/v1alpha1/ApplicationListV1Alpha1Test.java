package us.ullberg.startpunkt.crd.v1alpha1;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.fabric8.kubernetes.api.model.ObjectMetaBuilder;
import io.quarkus.test.junit.QuarkusTest;
import java.util.List;
import org.junit.jupiter.api.Test;

/** Test class for ApplicationList v1alpha1. */
@QuarkusTest
class ApplicationListV1Alpha1Test {

  private final ObjectMapper mapper = new ObjectMapper();

  @Test
  void testApplicationListDefaultConstructor() {
    ApplicationList list = new ApplicationList();
    assertNotNull(list, "ApplicationList should be created");
    assertNotNull(list.getItems(), "Items should be initialized");
    assertTrue(list.getItems().isEmpty(), "Items should be empty initially");
  }

  @Test
  void testApplicationListWithItems() {
    Application app1 = createApplication("app1", "App1", "Group1");
    Application app2 = createApplication("app2", "App2", "Group1");

    ApplicationList list = new ApplicationList();
    list.setItems(List.of(app1, app2));

    assertEquals(2, list.getItems().size(), "Should have 2 items");
    assertEquals("app1", list.getItems().get(0).getMetadata().getName());
    assertEquals("app2", list.getItems().get(1).getMetadata().getName());
  }

  @Test
  void testApplicationListSerialization() throws JsonProcessingException {
    ApplicationList list = new ApplicationList();
    Application app = createApplication("test-app", "TestApp", "TestGroup");
    list.setItems(List.of(app));

    String json = mapper.writeValueAsString(list);

    assertNotNull(json, "JSON should not be null");
    assertTrue(json.contains("TestApp"), "JSON should contain application name");
  }

  @Test
  void testApplicationListDeserialization() throws JsonProcessingException {
    String json =
        """
        {
          "apiVersion": "startpunkt.ullberg.us/v1alpha1",
          "kind": "ApplicationList",
          "metadata": {},
          "items": [
            {
              "apiVersion": "startpunkt.ullberg.us/v1alpha1",
              "kind": "Application",
              "metadata": {
                "name": "test-app",
                "namespace": "default"
              },
              "spec": {
                "name": "TestApp",
                "group": "TestGroup",
                "url": "https://test.example.com",
                "location": 0,
                "enabled": true
              }
            }
          ]
        }
        """;

    ApplicationList list = mapper.readValue(json, ApplicationList.class);

    assertNotNull(list, "ApplicationList should be deserialized");
    assertNotNull(list.getItems(), "Items should be deserialized");
    assertEquals(1, list.getItems().size(), "Should have 1 item");
    assertEquals("TestApp", list.getItems().get(0).getSpec().getName());
  }

  @Test
  void testApplicationListEmptySerialization() throws JsonProcessingException {
    ApplicationList list = new ApplicationList();
    String json = mapper.writeValueAsString(list);

    assertNotNull(json, "JSON should not be null");
    assertTrue(json.contains("items"), "JSON should contain items field");
  }

  private Application createApplication(String name, String displayName, String group) {
    Application app =
        new Application(
            displayName, group, "mdi:test", "blue", "https://test.com", "Info", true, 0, true);
    app.setMetadata(new ObjectMetaBuilder().withName(name).withNamespace("default").build());
    return app;
  }
}
