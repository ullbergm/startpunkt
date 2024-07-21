package us.ullberg.startpunkt;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.lessThan;
import static org.junit.Assert.assertNotEquals;
import static org.junit.Assert.assertThat;
import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.Arrays;
import java.util.LinkedList;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import us.ullberg.startpunkt.crd.ApplicationSpec;

class ApplicationGroupTest {

  private ApplicationGroup applicationGroup;

  @BeforeEach
  void setUp() {
    applicationGroup = new ApplicationGroup("Group1");
  }

  @Test
  void testGetName() {
    assertEquals("Group1", applicationGroup.getName());
  }

  @Test
  void testGetApplications() {
    List<ApplicationSpec> applications = new LinkedList<>(
        Arrays.asList(new ApplicationSpec("App3", "Group1", "mdi:application", "red",
            "https://www.testing.com/", "Description 1", true, 0, true)));
    applicationGroup.addApplication(applications.get(0));

    assertEquals(applications, applicationGroup.getApplications());
  }

  @Test
  void testAddApplication() {
    ApplicationSpec newApp = new ApplicationSpec("App3", "Group1", "mdi:application", "red",
        "https://www.testing.com/", "Description 1", true, 0, true);
    applicationGroup.addApplication(newApp);
    assertThat(applicationGroup.getApplications(), contains(newApp));
  }

  @Test
  void testCompareTo() {
    ApplicationGroup otherGroup = new ApplicationGroup("Group2");
    assertThat(applicationGroup.compareTo(otherGroup), lessThan(0));
    assertThat(otherGroup.compareTo(applicationGroup), greaterThan(0));
    assertEquals(0, applicationGroup.compareTo(applicationGroup));
  }

  @Test
  void testEquals() {
    applicationGroup.addApplication(new ApplicationSpec("App3", "Group1", "mdi:application", "red",
        "https://www.testing.com/", "Description 1", true, 0, true));

    ApplicationGroup sameGroup = new ApplicationGroup("Group1");
    sameGroup.addApplication(new ApplicationSpec("App3", "Group1", "mdi:application", "red",
        "https://www.testing.com/", "Description 1", true, 0, true));

    ApplicationGroup differentGroup = new ApplicationGroup("Group2");
    differentGroup.addApplication(new ApplicationSpec("App3", "Group1", "mdi:application", "red",
        "https://www.testing.com/", "Description 1", true, 0, true));

    ApplicationGroup differentGroup2 = new ApplicationGroup("Group2");
    differentGroup2.addApplication(new ApplicationSpec("App2", "Group1", "mdi:application", "red",
        "https://www.testing.com/", "Description 1", true, 0, true));

    assertEquals(applicationGroup, sameGroup);
    assertNotEquals(applicationGroup, differentGroup);
    assertNotEquals(applicationGroup, differentGroup2);
  }

  @Test
  void testHashCode() {
    ApplicationGroup sameGroup = new ApplicationGroup("Group1");
    assertEquals(applicationGroup.hashCode(), sameGroup.hashCode());

    applicationGroup.addApplication(new ApplicationSpec("App3", "Group1", "mdi:application", "red",
        "https://www.testing.com/", "Description 1", true, 0, true));
    sameGroup.addApplication(new ApplicationSpec("App3", "Group1", "mdi:application", "red",
        "https://www.testing.com/", "Description 1", true, 0, true));

    assertEquals(applicationGroup.hashCode(), sameGroup.hashCode());
  }
}
