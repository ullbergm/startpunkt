package us.ullberg.startpunkt.crd.v1alpha4;

import static org.junit.jupiter.api.Assertions.*;

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
}
