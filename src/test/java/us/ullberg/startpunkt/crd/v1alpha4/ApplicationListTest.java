package us.ullberg.startpunkt.crd.v1alpha4;

import static org.junit.jupiter.api.Assertions.*;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class ApplicationListTest {

  @Test
  void testDefaultConstructorCreatesEmptyList() {
    ApplicationList appList = new ApplicationList();
    assertNotNull(appList.getItems());
    assertTrue(appList.getItems().isEmpty());
  }

  @Test
  void testAddApplications() {
    Application app1 =
        new Application("App1", "Group1", "icon", "color", "url", "info", true, 1, true);
    Application app2 =
        new Application("App2", "Group2", "icon", "color", "url", "info", false, 2, false);

    ApplicationList appList = new ApplicationList();
    appList.setItems(List.of(app1, app2));

    assertEquals(2, appList.getItems().size());
    assertEquals("App1", appList.getItems().get(0).getSpec().getName());
    assertEquals("App2", appList.getItems().get(1).getSpec().getName());
  }

  @Test
  void testSetEmptyList() {
    ApplicationList appList = new ApplicationList();
    appList.setItems(List.of());

    assertNotNull(appList.getItems());
    assertEquals(0, appList.getItems().size());
  }

  @Test
  void testSetNullList() {
    ApplicationList appList = new ApplicationList();
    appList.setItems(null);

    // Behavior depends on parent class implementation
    // Just verify it doesn't throw an exception
    assertDoesNotThrow(() -> appList.getItems());
  }

  @Test
  void testSingleApplication() {
    Application app =
        new Application("SingleApp", "Group", "icon", "blue", "url", "info", true, 0, true);
    ApplicationList appList = new ApplicationList();
    appList.setItems(List.of(app));

    assertEquals(1, appList.getItems().size());
    assertEquals("SingleApp", appList.getItems().get(0).getSpec().getName());
  }

  @Test
  void testManyApplications() {
    List<Application> apps = new ArrayList<>();
    for (int i = 0; i < 100; i++) {
      apps.add(
          new Application(
              "App" + i, "Group" + i, "icon", "color", "url" + i, "info", true, i, true));
    }

    ApplicationList appList = new ApplicationList();
    appList.setItems(apps);

    assertEquals(100, appList.getItems().size());
    assertEquals("App0", appList.getItems().get(0).getSpec().getName());
    assertEquals("App99", appList.getItems().get(99).getSpec().getName());
  }

  @Test
  void testApplicationsWithDifferentSpecs() {
    Application app1 =
        new Application(
            "App1", "Group1", "mdi:one", "red", "https://one.com", "First", true, 1, true);
    Application app2 =
        new Application(
            "App2", "Group2", "mdi:two", "blue", "https://two.com", "Second", false, 2, false);
    Application app3 =
        new Application(
            "App3", "Group3", "mdi:three", "green", "https://three.com", "Third", true, 3, true);

    ApplicationList appList = new ApplicationList();
    appList.setItems(List.of(app1, app2, app3));

    assertEquals(3, appList.getItems().size());
    assertEquals("mdi:one", appList.getItems().get(0).getSpec().getIcon());
    assertEquals("mdi:two", appList.getItems().get(1).getSpec().getIcon());
    assertEquals("mdi:three", appList.getItems().get(2).getSpec().getIcon());
  }

  @Test
  void testApplicationsWithStatus() {
    Application app1 =
        new Application("App1", "Group", "icon", "color", "url", "info", true, 0, true);
    Application app2 =
        new Application("App2", "Group", "icon", "color", "url", "info", true, 0, true);

    ApplicationStatus status1 = new ApplicationStatus();
    ApplicationStatus status2 = new ApplicationStatus();

    app1.setStatus(status1);
    app2.setStatus(status2);

    ApplicationList appList = new ApplicationList();
    appList.setItems(List.of(app1, app2));

    assertEquals(2, appList.getItems().size());
    assertNotNull(appList.getItems().get(0).getStatus());
    assertNotNull(appList.getItems().get(1).getStatus());
  }

  @Test
  void testReplaceItems() {
    Application app1 =
        new Application("App1", "Group", "icon", "color", "url", "info", true, 0, true);
    ApplicationList appList = new ApplicationList();
    appList.setItems(List.of(app1));

    assertEquals(1, appList.getItems().size());

    Application app2 =
        new Application("App2", "Group", "icon", "color", "url", "info", true, 0, true);
    Application app3 =
        new Application("App3", "Group", "icon", "color", "url", "info", true, 0, true);
    appList.setItems(List.of(app2, app3));

    assertEquals(2, appList.getItems().size());
    assertEquals("App2", appList.getItems().get(0).getSpec().getName());
    assertEquals("App3", appList.getItems().get(1).getSpec().getName());
  }

  @Test
  void testApplicationsWithRootPathAndTags() {
    Application app1 =
        new Application(
            "App1", "Group", "icon", "color", "url", "info", true, 0, true, "/api", "tag1");
    Application app2 =
        new Application(
            "App2", "Group", "icon", "color", "url", "info", true, 0, true, "/v2", "tag2,tag3");

    ApplicationList appList = new ApplicationList();
    appList.setItems(List.of(app1, app2));

    assertEquals(2, appList.getItems().size());
    assertEquals("/api", appList.getItems().get(0).getSpec().getRootPath());
    assertEquals("tag1", appList.getItems().get(0).getSpec().getTags());
    assertEquals("/v2", appList.getItems().get(1).getSpec().getRootPath());
    assertEquals("tag2,tag3", appList.getItems().get(1).getSpec().getTags());
  }

  @Test
  void testMultipleSetItems() {
    ApplicationList appList = new ApplicationList();

    appList.setItems(List.of(new Application("App1", "G", "i", "c", "u", "i", true, 0, true)));
    assertEquals(1, appList.getItems().size());

    appList.setItems(List.of());
    assertEquals(0, appList.getItems().size());

    appList.setItems(
        List.of(
            new Application("App2", "G", "i", "c", "u", "i", true, 0, true),
            new Application("App3", "G", "i", "c", "u", "i", true, 0, true)));
    assertEquals(2, appList.getItems().size());
  }
}
