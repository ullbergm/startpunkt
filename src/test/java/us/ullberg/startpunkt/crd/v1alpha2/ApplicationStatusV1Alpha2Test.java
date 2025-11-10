package us.ullberg.startpunkt.crd.v1alpha2;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

class ApplicationStatusV1Alpha2Test {

  @Test
  void testDefaultConstructor() {
    ApplicationStatus status = new ApplicationStatus();
    assertNotNull(status);
  }
}
