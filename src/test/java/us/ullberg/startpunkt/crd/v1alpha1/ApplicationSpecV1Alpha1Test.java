package us.ullberg.startpunkt.crd.v1alpha1;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

/**
 * Test class for ApplicationSpec v1alpha1. Tests getters/setters, compareTo, equals, hashCode,
 * toString, and JSON serialization.
 */
@QuarkusTest
class ApplicationSpecV1Alpha1Test {

  private final ObjectMapper mapper = new ObjectMapper();

  @Test
  void testApplicationSpecDefaultConstructor() {
    ApplicationSpec spec = new ApplicationSpec();
    assertNotNull(spec, "ApplicationSpec should be created");
    assertNull(spec.getName(), "Name should be null initially");
    assertNull(spec.getGroup(), "Group should be null initially");
  }

  @Test
  void testApplicationSpecParameterizedConstructor() {
    ApplicationSpec spec =
        new ApplicationSpec(
            "Test", "Group1", "mdi:test", "red", "https://test.com", "Info", true, 50, true);

    assertEquals("Test", spec.getName());
    assertEquals("Group1", spec.getGroup());
    assertEquals("mdi:test", spec.getIcon());
    assertEquals("red", spec.getIconColor());
    assertEquals("https://test.com", spec.getUrl());
    assertEquals("Info", spec.getInfo());
    assertTrue(spec.getTargetBlank());
    assertEquals(50, spec.getLocation());
    assertTrue(spec.getEnabled());
  }

  @Test
  void testApplicationSpecSetters() {
    ApplicationSpec spec = new ApplicationSpec();
    spec.setName("Updated");
    spec.setGroup("NewGroup");
    spec.setIcon("mdi:new");
    spec.setIconColor("blue");
    spec.setUrl("https://new.com");
    spec.setInfo("New Info");
    spec.setTargetBlank(false);
    spec.setLocation(200);
    spec.setEnabled(false);

    assertEquals("Updated", spec.getName());
    assertEquals("NewGroup", spec.getGroup());
    assertEquals("mdi:new", spec.getIcon());
    assertEquals("blue", spec.getIconColor());
    assertEquals("https://new.com", spec.getUrl());
    assertEquals("New Info", spec.getInfo());
    assertFalse(spec.getTargetBlank());
    assertEquals(200, spec.getLocation());
    assertFalse(spec.getEnabled());
  }

  @Test
  void testApplicationSpecCompareToByGroup() {
    ApplicationSpec spec1 =
        new ApplicationSpec("App1", "GroupA", null, null, "url1", null, null, 0, null);
    ApplicationSpec spec2 =
        new ApplicationSpec("App2", "GroupB", null, null, "url2", null, null, 0, null);

    assertTrue(spec1.compareTo(spec2) < 0, "GroupA should come before GroupB");
    assertTrue(spec2.compareTo(spec1) > 0, "GroupB should come after GroupA");
  }

  @Test
  void testApplicationSpecCompareToByLocation() {
    ApplicationSpec spec1 =
        new ApplicationSpec("App1", "Group", null, null, "url1", null, null, 10, null);
    ApplicationSpec spec2 =
        new ApplicationSpec("App2", "Group", null, null, "url2", null, null, 20, null);

    assertTrue(spec1.compareTo(spec2) < 0, "Location 10 should come before 20");
    assertTrue(spec2.compareTo(spec1) > 0, "Location 20 should come after 10");
  }

  @Test
  void testApplicationSpecCompareToByName() {
    ApplicationSpec spec1 =
        new ApplicationSpec("AppA", "Group", null, null, "url1", null, null, 10, null);
    ApplicationSpec spec2 =
        new ApplicationSpec("AppB", "Group", null, null, "url2", null, null, 10, null);

    assertTrue(spec1.compareTo(spec2) < 0, "AppA should come before AppB");
    assertTrue(spec2.compareTo(spec1) > 0, "AppB should come after AppA");
  }

  @Test
  void testApplicationSpecCompareToEqual() {
    ApplicationSpec spec1 =
        new ApplicationSpec("App", "Group", null, null, "url", null, null, 10, null);
    ApplicationSpec spec2 =
        new ApplicationSpec("App", "Group", null, null, "url", null, null, 10, null);

    assertEquals(0, spec1.compareTo(spec2), "Identical specs should compare equal");
  }

  @Test
  void testApplicationSpecEqualityReflexive() {
    ApplicationSpec spec = createSampleSpec();
    assertEquals(spec, spec, "Spec should equal itself");
  }

  @Test
  void testApplicationSpecEqualitySymmetric() {
    ApplicationSpec spec1 = createSampleSpec();
    ApplicationSpec spec2 = createSampleSpec();

    assertEquals(spec1, spec2, "Identical specs should be equal");
    assertEquals(spec2, spec1, "Equality should be symmetric");
  }

  @Test
  void testApplicationSpecInequalityDifferentName() {
    ApplicationSpec spec1 = createSampleSpec();
    ApplicationSpec spec2 = createSampleSpec();
    spec2.setName("Different");

    assertNotEquals(spec1, spec2, "Specs with different names should not be equal");
  }

  @Test
  void testApplicationSpecInequalityDifferentGroup() {
    ApplicationSpec spec1 = createSampleSpec();
    ApplicationSpec spec2 = createSampleSpec();
    spec2.setGroup("DifferentGroup");

    assertNotEquals(spec1, spec2, "Specs with different groups should not be equal");
  }

  @Test
  void testApplicationSpecInequalityDifferentLocation() {
    ApplicationSpec spec1 = createSampleSpec();
    ApplicationSpec spec2 = createSampleSpec();
    spec2.setLocation(999);

    assertNotEquals(spec1, spec2, "Specs with different locations should not be equal");
  }

  @Test
  void testApplicationSpecInequalityWithNull() {
    ApplicationSpec spec = createSampleSpec();
    assertNotEquals(spec, null, "Spec should not equal null");
  }

  @Test
  void testApplicationSpecInequalityWithDifferentType() {
    ApplicationSpec spec = createSampleSpec();
    assertNotEquals(spec, "Not a spec", "Spec should not equal different type");
  }

  @Test
  void testApplicationSpecHashCodeConsistency() {
    ApplicationSpec spec = createSampleSpec();
    int hash1 = spec.hashCode();
    int hash2 = spec.hashCode();
    assertEquals(hash1, hash2, "Hash code should be consistent");
  }

  @Test
  void testApplicationSpecHashCodeEquality() {
    ApplicationSpec spec1 = createSampleSpec();
    ApplicationSpec spec2 = createSampleSpec();
    assertEquals(spec1.hashCode(), spec2.hashCode(), "Equal objects should have equal hash codes");
  }

  @Test
  void testApplicationSpecToString() {
    ApplicationSpec spec = createSampleSpec();
    String str = spec.toString();

    assertNotNull(str, "toString should return non-null");
    assertTrue(str.contains("name="), "toString should include name");
    assertTrue(str.contains("TestApp"), "toString should include actual name value");
  }

  @Test
  void testApplicationSpecSerialization() throws JsonProcessingException {
    ApplicationSpec spec = createSampleSpec();
    String json = mapper.writeValueAsString(spec);

    assertNotNull(json, "JSON should not be null");
    assertTrue(json.contains("TestApp"), "JSON should contain name");
    assertTrue(json.contains("TestGroup"), "JSON should contain group");
  }

  @Test
  void testApplicationSpecDeserialization() throws JsonProcessingException {
    String json =
        """
        {
          "name": "TestApp",
          "group": "TestGroup",
          "icon": "mdi:test",
          "iconColor": "blue",
          "url": "https://test.example.com",
          "info": "Test info",
          "targetBlank": true,
          "location": 100,
          "enabled": true
        }
        """;

    ApplicationSpec spec = mapper.readValue(json, ApplicationSpec.class);

    assertNotNull(spec, "Spec should be deserialized");
    assertEquals("TestApp", spec.getName());
    assertEquals("TestGroup", spec.getGroup());
    assertEquals("https://test.example.com", spec.getUrl());
  }

  @Test
  void testApplicationSpecWithNullOptionalFields() {
    ApplicationSpec spec =
        new ApplicationSpec("App", "Group", null, null, "url", null, null, 0, null);

    assertEquals("App", spec.getName());
    assertEquals("Group", spec.getGroup());
    assertNull(spec.getIcon());
    assertNull(spec.getIconColor());
    assertNull(spec.getInfo());
    assertNull(spec.getTargetBlank());
    assertNull(spec.getEnabled());
  }

  private ApplicationSpec createSampleSpec() {
    return new ApplicationSpec(
        "TestApp",
        "TestGroup",
        "mdi:test",
        "blue",
        "https://test.example.com",
        "Test info",
        true,
        100,
        true);
  }
}
