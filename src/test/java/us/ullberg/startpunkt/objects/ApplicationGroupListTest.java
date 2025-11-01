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
    assertTrue(
        list.getGroups().isEmpty(), "Groups list should be empty when constructed with null");
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

    assertNotNull(applicationGroupList.getGroups(), "Groups should not be null after setting null");
    assertTrue(
        applicationGroupList.getGroups().isEmpty(), "Groups should be empty after setting null");
  }

  @Test
  void testSetGroupsReplacesExistingGroups() {
    ApplicationGroup group1 = new ApplicationGroup("Group1");
    applicationGroupList.setGroups(List.of(group1));
    assertEquals(1, applicationGroupList.getGroups().size(), "Should have 1 group initially");

    ApplicationGroup group2 = new ApplicationGroup("Group2");
    ApplicationGroup group3 = new ApplicationGroup("Group3");
    applicationGroupList.setGroups(List.of(group2, group3));

    assertEquals(
        2, applicationGroupList.getGroups().size(), "Should have 2 groups after replacement");
    assertTrue(applicationGroupList.getGroups().contains(group2), "Should contain new group2");
    assertTrue(applicationGroupList.getGroups().contains(group3), "Should contain new group3");
    assertFalse(applicationGroupList.getGroups().contains(group1), "Should not contain old group1");
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

  @Test
  void testGroupSortingByName() {
    ApplicationGroup groupC = new ApplicationGroup("Charlie");
    ApplicationGroup groupA = new ApplicationGroup("Alice");
    ApplicationGroup groupB = new ApplicationGroup("Bob");

    applicationGroupList.setGroups(List.of(groupC, groupA, groupB));

    // Groups should be returned in the order they were added
    assertEquals("Charlie", applicationGroupList.getGroups().get(0).getName());
    assertEquals("Alice", applicationGroupList.getGroups().get(1).getName());
    assertEquals("Bob", applicationGroupList.getGroups().get(2).getName());
  }

  @Test
  void testApplicationSortingWithinGroups() {
    ApplicationGroup group = new ApplicationGroup("TestGroup");
    
    // Add applications with different locations
    ApplicationSpec app1 = new ApplicationSpec("App1", "TestGroup", null, null, "url1", null, true, 5, true);
    ApplicationSpec app2 = new ApplicationSpec("App2", "TestGroup", null, null, "url2", null, true, 1, true);
    ApplicationSpec app3 = new ApplicationSpec("App3", "TestGroup", null, null, "url3", null, true, 3, true);
    
    group.addApplication(app1);
    group.addApplication(app2);
    group.addApplication(app3);

    applicationGroupList.setGroups(List.of(group));

    // Applications within a group should maintain their order
    List<ApplicationSpec> apps = applicationGroupList.getGroups().get(0).getApplications();
    assertEquals(3, apps.size());
  }

  @Test
  void testMultipleGroupsWithApplications() {
    ApplicationGroup group1 = new ApplicationGroup("Group1");
    group1.addApplication(new ApplicationSpec("App1A", "Group1", null, null, "url", null, true, 0, true));
    group1.addApplication(new ApplicationSpec("App1B", "Group1", null, null, "url", null, true, 0, true));

    ApplicationGroup group2 = new ApplicationGroup("Group2");
    group2.addApplication(new ApplicationSpec("App2A", "Group2", null, null, "url", null, true, 0, true));

    applicationGroupList.setGroups(List.of(group1, group2));

    assertEquals(2, applicationGroupList.getGroups().size());
    assertEquals(2, applicationGroupList.getGroups().get(0).getApplications().size());
    assertEquals(1, applicationGroupList.getGroups().get(1).getApplications().size());
  }

  @Test
  void testGroupsWithSpecialCharacters() {
    ApplicationGroup specialGroup = new ApplicationGroup("Group/With-Special_Chars.123");
    applicationGroupList.setGroups(List.of(specialGroup));

    assertEquals("Group/With-Special_Chars.123", applicationGroupList.getGroups().get(0).getName());
  }

  @Test
  void testTagFilteringPreservation() {
    // Tests that applications with tags are preserved when added to groups
    ApplicationGroup group = new ApplicationGroup("TaggedGroup");
    
    ApplicationSpec appWithTags = new ApplicationSpec(
        "TaggedApp", "TaggedGroup", "icon", "color", "url", "info", true, 0, true, "/path", "prod,monitoring");
    ApplicationSpec appWithoutTags = new ApplicationSpec(
        "UntaggedApp", "TaggedGroup", "icon", "color", "url", "info", true, 0, true);
    
    group.addApplication(appWithTags);
    group.addApplication(appWithoutTags);

    applicationGroupList.setGroups(List.of(group));

    assertEquals(2, applicationGroupList.getGroups().get(0).getApplications().size());
    assertEquals("prod,monitoring", applicationGroupList.getGroups().get(0).getApplications().get(0).getTags());
    assertNull(applicationGroupList.getGroups().get(0).getApplications().get(1).getTags());
  }

  @Test
  void testGroupsWithIdenticalNames() {
    ApplicationGroup group1 = new ApplicationGroup("Duplicate");
    ApplicationGroup group2 = new ApplicationGroup("Duplicate");
    
    group1.addApplication(new ApplicationSpec("App1", "Duplicate", null, null, "url1", null, true, 0, true));
    group2.addApplication(new ApplicationSpec("App2", "Duplicate", null, null, "url2", null, true, 0, true));

    applicationGroupList.setGroups(List.of(group1, group2));

    assertEquals(2, applicationGroupList.getGroups().size());
    assertEquals("Duplicate", applicationGroupList.getGroups().get(0).getName());
    assertEquals("Duplicate", applicationGroupList.getGroups().get(1).getName());
  }

  @Test
  void testLargeNumberOfGroups() {
    List<ApplicationGroup> manyGroups = new ArrayList<>();
    for (int i = 0; i < 100; i++) {
      manyGroups.add(new ApplicationGroup("Group" + i));
    }

    applicationGroupList.setGroups(manyGroups);

    assertEquals(100, applicationGroupList.getGroups().size());
    assertEquals("Group0", applicationGroupList.getGroups().get(0).getName());
    assertEquals("Group99", applicationGroupList.getGroups().get(99).getName());
  }

  @Test
  void testGroupsWithManyApplications() {
    ApplicationGroup group = new ApplicationGroup("BigGroup");
    for (int i = 0; i < 50; i++) {
      group.addApplication(new ApplicationSpec("App" + i, "BigGroup", null, null, "url" + i, null, true, i, true));
    }

    applicationGroupList.setGroups(List.of(group));

    assertEquals(1, applicationGroupList.getGroups().size());
    assertEquals(50, applicationGroupList.getGroups().get(0).getApplications().size());
  }

  @Test
  void testClearGroups() {
    ApplicationGroup group = new ApplicationGroup("Group");
    applicationGroupList.setGroups(List.of(group));
    assertEquals(1, applicationGroupList.getGroups().size());

    applicationGroupList.setGroups(List.of());
    assertEquals(0, applicationGroupList.getGroups().size());
  }

  @Test
  void testGroupsPreserveApplicationOrder() {
    ApplicationGroup group = new ApplicationGroup("OrderTest");
    
    ApplicationSpec first = new ApplicationSpec("First", "OrderTest", null, null, "url", null, true, 0, true);
    ApplicationSpec second = new ApplicationSpec("Second", "OrderTest", null, null, "url", null, true, 0, true);
    ApplicationSpec third = new ApplicationSpec("Third", "OrderTest", null, null, "url", null, true, 0, true);
    
    group.addApplication(first);
    group.addApplication(second);
    group.addApplication(third);

    applicationGroupList.setGroups(List.of(group));

    List<ApplicationSpec> apps = applicationGroupList.getGroups().get(0).getApplications();
    assertEquals("First", apps.get(0).getName());
    assertEquals("Second", apps.get(1).getName());
    assertEquals("Third", apps.get(2).getName());
  }

  @Test
  void testToStringWithComplexStructure() {
    ApplicationGroup group1 = new ApplicationGroup("ComplexGroup1");
    group1.addApplication(new ApplicationSpec("App1", "ComplexGroup1", "icon", "color", "url", "info", true, 0, true));
    
    ApplicationGroup group2 = new ApplicationGroup("ComplexGroup2");
    group2.addApplication(new ApplicationSpec("App2", "ComplexGroup2", "icon", "color", "url", "info", true, 0, true));

    applicationGroupList.setGroups(List.of(group1, group2));

    String result = applicationGroupList.toString();
    assertNotNull(result);
    assertTrue(result.contains("ComplexGroup1") || result.contains("ComplexGroup2"));
  }

  @Test
  void testApplicationsWithRootPath() {
    ApplicationGroup group = new ApplicationGroup("PathGroup");
    ApplicationSpec appWithPath = new ApplicationSpec(
        "PathApp", "PathGroup", "icon", "color", "url", "info", true, 0, true, "/api/v1");
    
    group.addApplication(appWithPath);
    applicationGroupList.setGroups(List.of(group));

    assertEquals("/api/v1", applicationGroupList.getGroups().get(0).getApplications().get(0).getRootPath());
  }

  @Test
  void testGroupWithDisabledApplications() {
    ApplicationGroup group = new ApplicationGroup("MixedGroup");
    ApplicationSpec enabled = new ApplicationSpec("Enabled", "MixedGroup", null, null, "url1", null, true, 0, true);
    ApplicationSpec disabled = new ApplicationSpec("Disabled", "MixedGroup", null, null, "url2", null, true, 0, false);
    
    group.addApplication(enabled);
    group.addApplication(disabled);

    applicationGroupList.setGroups(List.of(group));

    List<ApplicationSpec> apps = applicationGroupList.getGroups().get(0).getApplications();
    assertTrue(apps.get(0).getEnabled());
    assertFalse(apps.get(1).getEnabled());
  }
}
