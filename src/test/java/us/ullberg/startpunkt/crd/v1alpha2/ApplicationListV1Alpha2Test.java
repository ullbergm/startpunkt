package us.ullberg.startpunkt.crd.v1alpha2;

import static org.junit.jupiter.api.Assertions.*;

import java.util.Arrays;
import org.junit.jupiter.api.Test;

class ApplicationListV1Alpha2Test {

  @Test
  void testDefaultConstructor() {
    ApplicationList list = new ApplicationList();
    assertNotNull(list);
  }

  @Test
  void testSetAndGetItems() {
    ApplicationList list = new ApplicationList();
    Application app1 = new Application();
    Application app2 = new Application();

    list.setItems(Arrays.asList(app1, app2));

    assertNotNull(list.getItems());
    assertEquals(2, list.getItems().size());
  }

  @Test
  void testSetAndGetMetadata() {
    ApplicationList list = new ApplicationList();
    io.fabric8.kubernetes.api.model.ListMeta metadata =
        new io.fabric8.kubernetes.api.model.ListMetaBuilder().withResourceVersion("12345").build();

    list.setMetadata(metadata);

    assertNotNull(list.getMetadata());
    assertEquals("12345", list.getMetadata().getResourceVersion());
  }
}
