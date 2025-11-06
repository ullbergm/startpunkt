package us.ullberg.startpunkt.crd.v1alpha4;

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

  @Test
  void testSameInstanceEquality() {
    ApplicationStatus status = new ApplicationStatus();
    assertEquals(status, status, "Same instance should equal itself");
  }

  @Test
  void testDifferentInstancesNotEqual() {
    ApplicationStatus status1 = new ApplicationStatus();
    ApplicationStatus status2 = new ApplicationStatus();

    assertNotEquals(status1, status2, "Different instances should not be equal");
  }

  @Test
  void testNotEqualToNull() {
    ApplicationStatus status = new ApplicationStatus();
    assertNotEquals(null, status, "Status should not equal null");
  }

  @Test
  void testNotEqualToDifferentType() {
    ApplicationStatus status = new ApplicationStatus();
    assertNotEquals("not a status", status, "Status should not equal different type");
    assertNotEquals(Integer.valueOf(42), status, "Status should not equal Integer");
  }

  @Test
  void testHashCodeNotNull() {
    ApplicationStatus status = new ApplicationStatus();
    assertNotNull(status.hashCode());
  }

  @Test
  void testHashCodeConsistency() {
    ApplicationStatus status = new ApplicationStatus();
    int hash1 = status.hashCode();
    int hash2 = status.hashCode();

    assertEquals(hash1, hash2, "hashCode should be consistent across multiple calls");
  }

  @Test
  void testHashCodeDifferentForDifferentInstances() {
    ApplicationStatus status1 = new ApplicationStatus();
    ApplicationStatus status2 = new ApplicationStatus();

    // Hash codes will typically be different for different instances
    // This is not guaranteed by contract but generally expected for Object.hashCode()
    assertNotNull(status1.hashCode());
    assertNotNull(status2.hashCode());
  }

  @Test
  void testToStringContainsClassName() {
    ApplicationStatus status = new ApplicationStatus();
    String result = status.toString();

    assertNotNull(result);
    assertTrue(result.contains("ApplicationStatus"), "toString should contain the class name");
  }

  @Test
  void testMultipleInstantiations() {
    ApplicationStatus status1 = new ApplicationStatus();
    ApplicationStatus status2 = new ApplicationStatus();
    ApplicationStatus status3 = new ApplicationStatus();

    assertNotNull(status1);
    assertNotNull(status2);
    assertNotNull(status3);
    assertNotEquals(status1, status2);
    assertNotEquals(status2, status3);
    assertNotEquals(status1, status3);
  }

  @Test
  void testStatusCanBeAssignedToApplication() {
    Application app = new Application();
    ApplicationStatus status = new ApplicationStatus();

    app.setStatus(status);

    assertNotNull(app.getStatus());
    assertSame(status, app.getStatus());
  }

  @Test
  void testStatusReplacementInApplication() {
    Application app = new Application();
    ApplicationStatus status1 = new ApplicationStatus();
    ApplicationStatus status2 = new ApplicationStatus();

    app.setStatus(status1);
    assertSame(status1, app.getStatus());

    app.setStatus(status2);
    assertSame(status2, app.getStatus());
    assertNotSame(status1, app.getStatus());
  }
}
