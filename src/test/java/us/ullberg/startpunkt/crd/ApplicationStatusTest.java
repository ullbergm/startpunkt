package us.ullberg.startpunkt.crd.v1alpha2;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

class ApplicationStatusTest {

  @Test
  void testCanInstantiate() {
    ApplicationStatus status = new ApplicationStatus();
    assertNotNull(status);
  }

  @Test
  void testEquality() {
    ApplicationStatus a = new ApplicationStatus();
    ApplicationStatus b = new ApplicationStatus();

    assertNotEquals(a, b); // they are not the same instance
    assertEquals(a, a); // sanity check: instance equals itself
  }

  @Test
  void testToStringNotNull() {
    ApplicationStatus status = new ApplicationStatus();
    assertNotNull(status.toString()); // Will be Object.toString() unless overridden
  }
}
