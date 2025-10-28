package us.ullberg.startpunkt.objects;

import static org.hamcrest.MatcherAssert.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.greaterThan;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.lessThan;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Arrays;
import java.util.LinkedList;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import us.ullberg.startpunkt.crd.v1alpha3.ApplicationSpec;

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
    List<ApplicationSpec> applications =
        new LinkedList<>(
            Arrays.asList(
                new ApplicationSpec(
                    "App3",
                    "Group1",
                    "mdi:application",
                    "red",
                    "https://www.testing.com/",
                    "Description 1",
                    true,
                    0,
                    true)));
    applicationGroup.addApplication(applications.get(0));

    assertEquals(applications, applicationGroup.getApplications());
  }

  @Test
  void testAddApplication() {
    ApplicationSpec newApp =
        new ApplicationSpec(
            "App3",
            "Group1",
            "mdi:application",
            "red",
            "https://www.testing.com/",
            "Description 1",
            true,
            0,
            true);
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
    applicationGroup.addApplication(
        new ApplicationSpec(
            "App3",
            "Group1",
            "mdi:application",
            "red",
            "https://www.testing.com/",
            "Description 1",
            true,
            0,
            true));

    ApplicationGroup sameGroup = new ApplicationGroup("Group1");
    sameGroup.addApplication(
        new ApplicationSpec(
            "App3",
            "Group1",
            "mdi:application",
            "red",
            "https://www.testing.com/",
            "Description 1",
            true,
            0,
            true));

    ApplicationGroup differentGroup = new ApplicationGroup("Group2");
    differentGroup.addApplication(
        new ApplicationSpec(
            "App3",
            "Group1",
            "mdi:application",
            "red",
            "https://www.testing.com/",
            "Description 1",
            true,
            0,
            true));

    ApplicationGroup differentGroup2 = new ApplicationGroup("Group2");
    differentGroup2.addApplication(
        new ApplicationSpec(
            "App2",
            "Group1",
            "mdi:application",
            "red",
            "https://www.testing.com/",
            "Description 1",
            true,
            0,
            true));

    assertThat(applicationGroup.equals(sameGroup), is(true));
    assertThat(applicationGroup.equals(differentGroup), is(false));
    assertThat(applicationGroup.equals(differentGroup2), is(false));

    // test comparing to null
    assertThat(applicationGroup.equals(null), is(false));

    // test comparing to a different object
    assertThat(applicationGroup.equals(new Object()), is(false));

    // test comparing to itself
    assertThat(applicationGroup.equals(applicationGroup), is(true));
  }

  @Test
  void testHashCode() {
    ApplicationGroup sameGroup = new ApplicationGroup("Group1");
    assertEquals(applicationGroup.hashCode(), sameGroup.hashCode());

    applicationGroup.addApplication(
        new ApplicationSpec(
            "App3",
            "Group1",
            "mdi:application",
            "red",
            "https://www.testing.com/",
            "Description 1",
            true,
            0,
            true));
    sameGroup.addApplication(
        new ApplicationSpec(
            "App3",
            "Group1",
            "mdi:application",
            "red",
            "https://www.testing.com/",
            "Description 1",
            true,
            0,
            true));

    assertEquals(applicationGroup.hashCode(), sameGroup.hashCode());
  }

  // Test creating an application group with a supplied list of applications
  @Test
  void testApplicationGroupWithApplications() {
    List<ApplicationSpec> applications =
        new LinkedList<>(
            Arrays.asList(
                new ApplicationSpec(
                    "App3",
                    "Group1",
                    "mdi:application",
                    "red",
                    "https://www.testing.com/",
                    "Description 1",
                    true,
                    0,
                    true)));
    ApplicationGroup groupWithApps = new ApplicationGroup("Group1", applications);

    assertEquals("Group1", groupWithApps.getName());
    assertEquals(applications, groupWithApps.getApplications());
  }

  @Test
  void testSetName() {
    applicationGroup.setName("NewGroupName");
    assertEquals("NewGroupName", applicationGroup.getName());
  }

  @Test
  void testSetNameWithNullOrBlank() {
    applicationGroup.setName(null);
    assertEquals(null, applicationGroup.getName());

    applicationGroup.setName("   ");
    assertEquals("   ", applicationGroup.getName());
  }

  @Test
  void testSetApplications() {
    List<ApplicationSpec> apps =
        List.of(
            new ApplicationSpec(
                "AppX",
                "Group1",
                "mdi:application",
                "blue",
                "https://example.com",
                "App X description",
                true,
                1,
                false));

    applicationGroup.setApplications(apps);
    assertEquals(apps, applicationGroup.getApplications());
  }

  @Test
  void testSetApplicationsWithNull() {
    applicationGroup.setApplications(null);
    assertEquals(0, applicationGroup.getApplications().size());
  }

  @Test
  void testApplicationsListIsUnmodifiable() {
    applicationGroup.addApplication(
        new ApplicationSpec(
            "App1",
            "Group1",
            "mdi:application",
            "green",
            "https://example.com",
            "App Desc",
            true,
            0,
            true));

    List<ApplicationSpec> apps = applicationGroup.getApplications();
    assertThrows(
        UnsupportedOperationException.class,
        () ->
            apps.add(
                new ApplicationSpec(
                    "App2",
                    "Group1",
                    "mdi:application",
                    "blue",
                    "https://example.com",
                    "App Desc",
                    true,
                    1,
                    false)));
  }

  @Test
  void testToStringContainsGroupNameAndAppName() {
    applicationGroup.addApplication(
        new ApplicationSpec(
            "AppZ",
            "Group1",
            "mdi:application",
            "black",
            "https://appz.com",
            "Desc",
            false,
            3,
            true));

    String output = applicationGroup.toString();
    assertTrue(output.contains("Group1"));
    assertTrue(output.contains("AppZ"));
  }
}
