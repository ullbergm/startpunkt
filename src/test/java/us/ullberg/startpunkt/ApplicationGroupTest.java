package us.ullberg.startpunkt;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.LinkedList;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import us.ullberg.startpunkt.crd.ApplicationSpec;

class ApplicationGroupTest {

  private ApplicationGroup applicationGroup;
  private List<ApplicationSpec> applications;

  @BeforeEach
  void setUp() {
    applications = new LinkedList<>();
    applications.add(new ApplicationSpec("App1", "Group1", "mdi:application", "red",
        "https://www.example.com/", "Description 1", true, 0, true));
    applications.add(new ApplicationSpec("App2", "Group1", "mdi:application", "red",
        "https://www.test.com/", "Description 1", true, 0, true));
    applicationGroup = new ApplicationGroup("Group1", applications);
  }

  @Test
  void testGetName() {
    assertEquals("Group1", applicationGroup.getName());
  }

  @Test
  void testGetApplications() {
    assertEquals(applications, applicationGroup.getApplications());
  }

  @Test
  void testAddApplication() {
    ApplicationSpec newApp = new ApplicationSpec("App3", "Group1", "mdi:application", "red",
        "https://www.testing.com/", "Description 1", true, 0, true);
    applicationGroup.addApplication(newApp);
    assertTrue(applicationGroup.getApplications().contains(newApp));
  }

  @Test
  void testCompareTo() {
    ApplicationGroup otherGroup = new ApplicationGroup("Group2");
    assertTrue(applicationGroup.compareTo(otherGroup) < 0);
    assertTrue(otherGroup.compareTo(applicationGroup) > 0);
    assertEquals(0, applicationGroup.compareTo(applicationGroup));
  }

  @Test
  void testEquals() {
    ApplicationGroup sameGroup = new ApplicationGroup("Group1", applications);
    ApplicationGroup differentGroup = new ApplicationGroup("Group2", applications);
    assertTrue(applicationGroup.equals(sameGroup));
    assertFalse(applicationGroup.equals(differentGroup));
  }

  @Test
  void testHashCode() {
    ApplicationGroup sameGroup = new ApplicationGroup("Group1", applications);
    assertEquals(applicationGroup.hashCode(), sameGroup.hashCode());
  }
}
