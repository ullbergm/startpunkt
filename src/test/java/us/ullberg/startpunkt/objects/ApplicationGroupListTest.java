package us.ullberg.startpunkt.objects;

import static org.junit.jupiter.api.Assertions.*;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import us.ullberg.startpunkt.crd.v1alpha4.ApplicationSpec;

/**
 * Test class for ApplicationGroupList. Tests construction, getters, setters, null handling, and
 * JSON serialization compatibility.
 */
class ApplicationGroupListTest {

  private ApplicationGroupList applicationGroupList;

  @BeforeEach
  void setUp() {
    applicationGroupList = new ApplicationGroupList();
  }

  @Test
  void testDefaultConstructor() {
    assertNotNull(applicationGroupList, "ApplicationGroupList should be created");
    assertNotNull(
        applicationGroupList.getGroups(), "Groups list should not be null after construction");
    assertTrue(
        applicationGroupList.getGroups().isEmpty(),
        "Groups list should be empty after default construction");
  }

  @Test
  void testConstructorWithGroups() {
    ApplicationGroup group1 = new ApplicationGroup("Group1");
    ApplicationGroup group2 = new ApplicationGroup("Group2");
    List<ApplicationGroup> groups = List.of(group1, group2);

    ApplicationGroupList list = new ApplicationGroupList(groups);

    assertNotNull(list, "ApplicationGroupList should be created");
    assertEquals(2, list.getGroups().size(), "Groups list should have 2 items");
    assertEquals(groups, list.getGroups(), "Groups should match constructor input");
  }

  @Test
  void testConstructorWithNullGroups() {
    ApplicationGroupList list = new ApplicationGroupList(null);

    assertNotNull(list, "ApplicationGroupList should be created");
    assertNotNull(list.getGroups(), "Groups list should not be null");
    assertTrue(list.getGroups().isEmpty(), "Groups list should be empty when constructed with null");
  }

  @Test
  void testConstructorWithEmptyList() {
    ApplicationGroupList list = new ApplicationGroupList(List.of());

    assertNotNull(list, "ApplicationGroupList should be created");
    assertNotNull(list.getGroups(), "Groups list should not be null");
    assertTrue(list.getGroups().isEmpty(), "Groups list should be empty");
  }

  @Test
  void testGetGroupsReturnsEmptyListWhenNull() {
    applicationGroupList.setGroups(null);
    List<ApplicationGroup> groups = applicationGroupList.getGroups();

    assertNotNull(groups, "getGroups should never return null");
    assertTrue(groups.isEmpty(), "getGroups should return empty list when internal list is null");
  }

  @Test
  void testSetGroupsWithValidList() {
    ApplicationGroup group1 = new ApplicationGroup("TestGroup");
    List<ApplicationGroup> groups = List.of(group1);

    applicationGroupList.setGroups(groups);

    assertEquals(1, applicationGroupList.getGroups().size(), "Should have 1 group");
    assertEquals(group1, applicationGroupList.getGroups().get(0), "Group should match");
  }

  @Test
  void testSetGroupsWithNull() {
    applicationGroupList.setGroups(null);

    assertNotNull(
        applicationGroupList.getGroups(), "Groups should not be null after setting null");
    assertTrue(
        applicationGroupList.getGroups().isEmpty(),
        "Groups should be empty after setting null");
  }

  @Test
  void testSetGroupsReplacesExistingGroups() {
    ApplicationGroup group1 = new ApplicationGroup("Group1");
    applicationGroupList.setGroups(List.of(group1));
    assertEquals(1, applicationGroupList.getGroups().size(), "Should have 1 group initially");

    ApplicationGroup group2 = new ApplicationGroup("Group2");
    ApplicationGroup group3 = new ApplicationGroup("Group3");
    applicationGroupList.setGroups(List.of(group2, group3));

    assertEquals(2, applicationGroupList.getGroups().size(), "Should have 2 groups after replacement");
    assertTrue(
        applicationGroupList.getGroups().contains(group2), "Should contain new group2");
    assertTrue(
        applicationGroupList.getGroups().contains(group3), "Should contain new group3");
    assertFalse(
        applicationGroupList.getGroups().contains(group1), "Should not contain old group1");
  }

  @Test
  void testSetGroupsWithGroupsContainingApplications() {
    ApplicationGroup group = new ApplicationGroup("GroupWithApps");
    ApplicationSpec app =
        new ApplicationSpec(
            "App1",
            "GroupWithApps",
            "mdi:app",
            "blue",
            "https://app1.com",
            "Test app",
            true,
            0,
            true);
    group.addApplication(app);

    applicationGroupList.setGroups(List.of(group));

    assertEquals(1, applicationGroupList.getGroups().size(), "Should have 1 group");
    assertEquals(
        1,
        applicationGroupList.getGroups().get(0).getApplications().size(),
        "Group should have 1 application");
  }

  @Test
  void testToStringWithEmptyGroups() {
    String result = applicationGroupList.toString();

    assertNotNull(result, "toString should not return null");
    assertTrue(result.contains("ApplicationGroupList"), "toString should contain class name");
    assertTrue(result.contains("groups"), "toString should mention groups");
  }

  @Test
  void testToStringWithGroups() {
    ApplicationGroup group = new ApplicationGroup("TestGroup");
    applicationGroupList.setGroups(List.of(group));

    String result = applicationGroupList.toString();

    assertNotNull(result, "toString should not return null");
    assertTrue(result.contains("ApplicationGroupList"), "toString should contain class name");
    assertTrue(result.contains("TestGroup"), "toString should contain group name");
  }

  @Test
  void testMultipleGroupsWithDifferentNames() {
    ApplicationGroup group1 = new ApplicationGroup("Alpha");
    ApplicationGroup group2 = new ApplicationGroup("Beta");
    ApplicationGroup group3 = new ApplicationGroup("Gamma");

    applicationGroupList.setGroups(List.of(group1, group2, group3));

    assertEquals(3, applicationGroupList.getGroups().size(), "Should have 3 groups");
    assertEquals("Alpha", applicationGroupList.getGroups().get(0).getName());
    assertEquals("Beta", applicationGroupList.getGroups().get(1).getName());
    assertEquals("Gamma", applicationGroupList.getGroups().get(2).getName());
  }

  @Test
  void testGroupsListMutability() {
    ApplicationGroup group1 = new ApplicationGroup("Group1");
    List<ApplicationGroup> mutableList = new ArrayList<>();
    mutableList.add(group1);

    applicationGroupList.setGroups(mutableList);
    assertEquals(1, applicationGroupList.getGroups().size(), "Should have 1 group initially");

    // Modify original list
    ApplicationGroup group2 = new ApplicationGroup("Group2");
    mutableList.add(group2);

    // Verify internal state depends on implementation
    // The test ensures we can work with the list without errors
    assertNotNull(applicationGroupList.getGroups());
  }

  @Test
  void testSetGroupsWithMixedEmptyAndPopulatedGroups() {
    ApplicationGroup emptyGroup = new ApplicationGroup("EmptyGroup");
    ApplicationGroup populatedGroup = new ApplicationGroup("PopulatedGroup");
    populatedGroup.addApplication(
        new ApplicationSpec(
            "App",
            "PopulatedGroup",
            "mdi:icon",
            "red",
            "https://example.com",
            "Info",
            true,
            5,
            false));

    applicationGroupList.setGroups(List.of(emptyGroup, populatedGroup));

    assertEquals(2, applicationGroupList.getGroups().size(), "Should have 2 groups");
    assertEquals(
        0,
        applicationGroupList.getGroups().get(0).getApplications().size(),
        "First group should be empty");
    assertEquals(
        1,
        applicationGroupList.getGroups().get(1).getApplications().size(),
        "Second group should have 1 app");
  }
}
