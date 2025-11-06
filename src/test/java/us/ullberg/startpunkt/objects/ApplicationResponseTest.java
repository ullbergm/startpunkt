package us.ullberg.startpunkt.objects;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import us.ullberg.startpunkt.crd.v1alpha4.ApplicationSpec;

/**
 * Test class for ApplicationResponse. Tests wrapper functionality, availability status, and field
 * copying from ApplicationSpec.
 */
class ApplicationResponseTest {

  private ApplicationSpec baseSpec;

  @BeforeEach
  void setUp() {
    baseSpec =
        new ApplicationSpec(
            "TestApp",
            "TestGroup",
            "mdi:test",
            "blue",
            "https://test.example.com",
            "Test application",
            true,
            10,
            true);
    baseSpec.setRootPath("/dashboard");
    baseSpec.setTags("tag1,tag2");
  }

  @Test
  void testDefaultConstructor() {
    ApplicationResponse wrapper = new ApplicationResponse();

    assertNotNull(wrapper, "Wrapper should be created");
    assertNull(wrapper.getName(), "Name should be null in default constructor");
    assertNull(wrapper.getAvailable(), "Available should be null in default constructor");
  }

  @Test
  void testConstructorWithApplicationSpec() {
    ApplicationResponse wrapper = new ApplicationResponse(baseSpec);

    assertNotNull(wrapper, "Wrapper should be created");
    assertEquals("TestApp", wrapper.getName(), "Name should be copied");
    assertEquals("TestGroup", wrapper.getGroup(), "Group should be copied");
    assertEquals("mdi:test", wrapper.getIcon(), "Icon should be copied");
    assertEquals("blue", wrapper.getIconColor(), "Icon color should be copied");
    assertEquals("https://test.example.com", wrapper.getUrl(), "URL should be copied");
    assertEquals("Test application", wrapper.getInfo(), "Info should be copied");
    assertTrue(wrapper.getTargetBlank(), "TargetBlank should be copied");
    assertEquals(10, wrapper.getLocation(), "Location should be copied");
    assertTrue(wrapper.getEnabled(), "Enabled should be copied");
    assertEquals("/dashboard", wrapper.getRootPath(), "RootPath should be copied");
    assertEquals("tag1,tag2", wrapper.getTags(), "Tags should be copied");
    assertNull(wrapper.getAvailable(), "Available should be null by default");
  }

  @Test
  void testConstructorWithNullFieldsInApplicationSpec() {
    ApplicationSpec specWithNulls =
        new ApplicationSpec(
            "MinimalApp",
            null, // group
            null, // icon
            null, // iconColor
            "https://minimal.com",
            null, // info
            null, // targetBlank
            0, // location
            null // enabled
            );

    ApplicationResponse wrapper = new ApplicationResponse(specWithNulls);

    assertEquals("MinimalApp", wrapper.getName(), "Name should be copied");
    assertNull(wrapper.getGroup(), "Null group should be copied as null");
    assertNull(wrapper.getIcon(), "Null icon should be copied as null");
    assertNull(wrapper.getIconColor(), "Null iconColor should be copied as null");
    assertEquals("https://minimal.com", wrapper.getUrl(), "URL should be copied");
    assertNull(wrapper.getInfo(), "Null info should be copied as null");
    assertNull(wrapper.getTargetBlank(), "Null targetBlank should be copied as null");
    assertNull(wrapper.getEnabled(), "Null enabled should be copied as null");
    assertNull(wrapper.getAvailable(), "Available should be null");
  }

  @Test
  void testSetAvailableTrue() {
    ApplicationResponse wrapper = new ApplicationResponse(baseSpec);

    wrapper.setAvailable(true);

    assertTrue(wrapper.getAvailable(), "Available should be true");
  }

  @Test
  void testSetAvailableFalse() {
    ApplicationResponse wrapper = new ApplicationResponse(baseSpec);

    wrapper.setAvailable(false);

    assertFalse(wrapper.getAvailable(), "Available should be false");
  }

  @Test
  void testSetAvailableNull() {
    ApplicationResponse wrapper = new ApplicationResponse(baseSpec);
    wrapper.setAvailable(true);

    wrapper.setAvailable(null);

    assertNull(wrapper.getAvailable(), "Available should be null after setting to null");
  }

  @Test
  void testGetAvailableWhenNotSet() {
    ApplicationResponse wrapper = new ApplicationResponse(baseSpec);

    assertNull(wrapper.getAvailable(), "Available should be null when not set");
  }

  @Test
  void testAvailabilityToggle() {
    ApplicationResponse wrapper = new ApplicationResponse(baseSpec);

    wrapper.setAvailable(true);
    assertTrue(wrapper.getAvailable(), "Should be true after setting to true");

    wrapper.setAvailable(false);
    assertFalse(wrapper.getAvailable(), "Should be false after setting to false");

    wrapper.setAvailable(true);
    assertTrue(wrapper.getAvailable(), "Should be true again after toggling back");
  }

  @Test
  void testInheritsFromApplicationSpec() {
    ApplicationResponse wrapper = new ApplicationResponse(baseSpec);

    // Verify inheritance by using ApplicationSpec methods
    assertTrue(wrapper instanceof ApplicationSpec, "Should be instance of ApplicationSpec");
  }

  @Test
  void testModifyingWrapperDoesNotAffectOriginalSpec() {
    ApplicationResponse wrapper = new ApplicationResponse(baseSpec);

    wrapper.setName("ModifiedName");
    wrapper.setAvailable(true);

    assertEquals("ModifiedName", wrapper.getName(), "Wrapper name should be modified");
    assertEquals("TestApp", baseSpec.getName(), "Original spec name should be unchanged");
  }

  @Test
  void testWrapperWithDisabledApplication() {
    ApplicationSpec disabledSpec =
        new ApplicationSpec(
            "DisabledApp",
            "TestGroup",
            "mdi:disabled",
            "grey",
            "https://disabled.com",
            "Disabled app",
            false, // targetBlank
            5,
            false // enabled
            );

    ApplicationResponse wrapper = new ApplicationResponse(disabledSpec);

    assertFalse(wrapper.getEnabled(), "Enabled should be false");
    assertNull(wrapper.getAvailable(), "Available should be null by default");

    wrapper.setAvailable(false);
    assertFalse(wrapper.getAvailable(), "Available should be false when set");
  }

  @Test
  void testWrapperWithApplicationWithoutTargetBlank() {
    ApplicationSpec specNoTarget =
        new ApplicationSpec(
            "NoTargetApp",
            "TestGroup",
            "mdi:app",
            "red",
            "https://notarget.com",
            "No target blank",
            false,
            0,
            true);

    ApplicationResponse wrapper = new ApplicationResponse(specNoTarget);

    assertFalse(wrapper.getTargetBlank(), "TargetBlank should be false");
    wrapper.setAvailable(true);
    assertTrue(wrapper.getAvailable(), "Available can still be true");
  }

  @Test
  void testWrapperPreservesAllFieldsIncludingRootPathAndTags() {
    ApplicationSpec fullSpec =
        new ApplicationSpec(
            "FullApp",
            "Group",
            "mdi:full",
            "green",
            "https://full.com",
            "Full spec",
            true,
            1,
            true);
    fullSpec.setRootPath("/api/v1");
    fullSpec.setTags("production,critical");

    ApplicationResponse wrapper = new ApplicationResponse(fullSpec);

    assertEquals("/api/v1", wrapper.getRootPath(), "RootPath should be preserved");
    assertEquals("production,critical", wrapper.getTags(), "Tags should be preserved");
    assertNull(wrapper.getAvailable(), "Available should start as null");
  }

  @Test
  void testMultipleWrappersFromSameSpec() {
    ApplicationResponse wrapper1 = new ApplicationResponse(baseSpec);
    ApplicationResponse wrapper2 = new ApplicationResponse(baseSpec);

    wrapper1.setAvailable(true);
    wrapper2.setAvailable(false);

    assertTrue(wrapper1.getAvailable(), "Wrapper1 should be available");
    assertFalse(wrapper2.getAvailable(), "Wrapper2 should not be available");
    // They are independent
    assertNotEquals(
        wrapper1.getAvailable(), wrapper2.getAvailable(), "Wrappers should be independent");
  }

  @Test
  void testSetAvailableMultipleTimes() {
    ApplicationResponse wrapper = new ApplicationResponse(baseSpec);

    wrapper.setAvailable(true);
    wrapper.setAvailable(true);
    assertTrue(wrapper.getAvailable(), "Should remain true");

    wrapper.setAvailable(false);
    wrapper.setAvailable(false);
    assertFalse(wrapper.getAvailable(), "Should remain false");

    wrapper.setAvailable(null);
    wrapper.setAvailable(null);
    assertNull(wrapper.getAvailable(), "Should remain null");
  }
}
