package us.ullberg.startpunkt.crd.v1alpha1;

import static org.junit.jupiter.api.Assertions.*;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.quarkus.test.junit.QuarkusTest;
import org.junit.jupiter.api.Test;

/** Test class for BookmarkSpec v1alpha1. */
@QuarkusTest
class BookmarkSpecV1Alpha1Test {

  private final ObjectMapper mapper = new ObjectMapper();

  @Test
  void testBookmarkSpecDefaultConstructor() {
    BookmarkSpec spec = new BookmarkSpec();
    assertNotNull(spec, "BookmarkSpec should be created");
    assertNull(spec.getName(), "Name should be null initially");
    assertNull(spec.getGroup(), "Group should be null initially");
  }

  @Test
  void testBookmarkSpecParameterizedConstructor() {
    BookmarkSpec spec =
        new BookmarkSpec("Docs", "Development", "mdi:book", "https://docs.com", "Info", true, 25);

    assertEquals("Docs", spec.getName());
    assertEquals("Development", spec.getGroup());
    assertEquals("mdi:book", spec.getIcon());
    assertEquals("https://docs.com", spec.getUrl());
    assertEquals("Info", spec.getInfo());
    assertTrue(spec.getTargetBlank());
    assertEquals(25, spec.getLocation());
  }

  @Test
  void testBookmarkSpecSetters() {
    BookmarkSpec spec = new BookmarkSpec();
    spec.setName("Updated");
    spec.setGroup("NewGroup");
    spec.setIcon("mdi:new");
    spec.setUrl("https://new.com");
    spec.setInfo("New Info");
    spec.setTargetBlank(false);
    spec.setLocation(150);

    assertEquals("Updated", spec.getName());
    assertEquals("NewGroup", spec.getGroup());
    assertEquals("mdi:new", spec.getIcon());
    assertEquals("https://new.com", spec.getUrl());
    assertEquals("New Info", spec.getInfo());
    assertFalse(spec.getTargetBlank());
    assertEquals(150, spec.getLocation());
  }

  @Test
  void testBookmarkSpecCompareToByGroup() {
    BookmarkSpec spec1 = new BookmarkSpec("Bm1", "GroupA", null, "url1", null, null, 0);
    BookmarkSpec spec2 = new BookmarkSpec("Bm2", "GroupB", null, "url2", null, null, 0);

    assertTrue(spec1.compareTo(spec2) < 0, "GroupA should come before GroupB");
    assertTrue(spec2.compareTo(spec1) > 0, "GroupB should come after GroupA");
  }

  @Test
  void testBookmarkSpecCompareToByLocation() {
    BookmarkSpec spec1 = new BookmarkSpec("Bm1", "Group", null, "url1", null, null, 10);
    BookmarkSpec spec2 = new BookmarkSpec("Bm2", "Group", null, "url2", null, null, 20);

    assertTrue(spec1.compareTo(spec2) < 0, "Location 10 should come before 20");
    assertTrue(spec2.compareTo(spec1) > 0, "Location 20 should come after 10");
  }

  @Test
  void testBookmarkSpecCompareToByName() {
    BookmarkSpec spec1 = new BookmarkSpec("BmA", "Group", null, "url1", null, null, 10);
    BookmarkSpec spec2 = new BookmarkSpec("BmB", "Group", null, "url2", null, null, 10);

    assertTrue(spec1.compareTo(spec2) < 0, "BmA should come before BmB");
    assertTrue(spec2.compareTo(spec1) > 0, "BmB should come after BmA");
  }

  @Test
  void testBookmarkSpecCompareToEqual() {
    BookmarkSpec spec1 = new BookmarkSpec("Bm", "Group", null, "url", null, null, 10);
    BookmarkSpec spec2 = new BookmarkSpec("Bm", "Group", null, "url", null, null, 10);

    assertEquals(0, spec1.compareTo(spec2), "Identical specs should compare equal");
  }

  @Test
  void testBookmarkSpecEqualityReflexive() {
    BookmarkSpec spec = createSampleSpec();
    assertEquals(spec, spec, "Spec should equal itself");
  }

  @Test
  void testBookmarkSpecEqualitySymmetric() {
    BookmarkSpec spec1 = createSampleSpec();
    BookmarkSpec spec2 = createSampleSpec();

    assertEquals(spec1, spec2, "Identical specs should be equal");
    assertEquals(spec2, spec1, "Equality should be symmetric");
  }

  @Test
  void testBookmarkSpecInequalityDifferentName() {
    BookmarkSpec spec1 = createSampleSpec();
    BookmarkSpec spec2 = createSampleSpec();
    spec2.setName("Different");

    assertNotEquals(spec1, spec2, "Specs with different names should not be equal");
  }

  @Test
  void testBookmarkSpecInequalityDifferentGroup() {
    BookmarkSpec spec1 = createSampleSpec();
    BookmarkSpec spec2 = createSampleSpec();
    spec2.setGroup("DifferentGroup");

    assertNotEquals(spec1, spec2, "Specs with different groups should not be equal");
  }

  @Test
  void testBookmarkSpecInequalityDifferentLocation() {
    BookmarkSpec spec1 = createSampleSpec();
    BookmarkSpec spec2 = createSampleSpec();
    spec2.setLocation(999);

    assertNotEquals(spec1, spec2, "Specs with different locations should not be equal");
  }

  @Test
  void testBookmarkSpecInequalityWithNull() {
    BookmarkSpec spec = createSampleSpec();
    assertNotEquals(spec, null, "Spec should not equal null");
  }

  @Test
  void testBookmarkSpecInequalityWithDifferentType() {
    BookmarkSpec spec = createSampleSpec();
    assertNotEquals(spec, "Not a spec", "Spec should not equal different type");
  }

  @Test
  void testBookmarkSpecHashCodeConsistency() {
    BookmarkSpec spec = createSampleSpec();
    int hash1 = spec.hashCode();
    int hash2 = spec.hashCode();
    assertEquals(hash1, hash2, "Hash code should be consistent");
  }

  @Test
  void testBookmarkSpecHashCodeEquality() {
    BookmarkSpec spec1 = createSampleSpec();
    BookmarkSpec spec2 = createSampleSpec();
    assertEquals(spec1.hashCode(), spec2.hashCode(), "Equal objects should have equal hash codes");
  }

  @Test
  void testBookmarkSpecToString() {
    BookmarkSpec spec = createSampleSpec();
    String str = spec.toString();

    assertNotNull(str, "toString should return non-null");
    assertTrue(str.contains("name="), "toString should include name");
    assertTrue(str.contains("TestBookmark"), "toString should include actual name value");
  }

  @Test
  void testBookmarkSpecSerialization() throws JsonProcessingException {
    BookmarkSpec spec = createSampleSpec();
    String json = mapper.writeValueAsString(spec);

    assertNotNull(json, "JSON should not be null");
    assertTrue(json.contains("TestBookmark"), "JSON should contain name");
    assertTrue(json.contains("TestGroup"), "JSON should contain group");
  }

  @Test
  void testBookmarkSpecDeserialization() throws JsonProcessingException {
    String json =
        """
        {
          "name": "TestBookmark",
          "group": "TestGroup",
          "icon": "mdi:bookmark",
          "url": "https://test.example.com",
          "info": "Test info",
          "targetBlank": true,
          "location": 100
        }
        """;

    BookmarkSpec spec = mapper.readValue(json, BookmarkSpec.class);

    assertNotNull(spec, "Spec should be deserialized");
    assertEquals("TestBookmark", spec.getName());
    assertEquals("TestGroup", spec.getGroup());
    assertEquals("https://test.example.com", spec.getUrl());
  }

  @Test
  void testBookmarkSpecWithNullOptionalFields() {
    BookmarkSpec spec = new BookmarkSpec("Bm", "Group", null, "url", null, null, 0);

    assertEquals("Bm", spec.getName());
    assertEquals("Group", spec.getGroup());
    assertNull(spec.getIcon());
    assertNull(spec.getInfo());
    assertNull(spec.getTargetBlank());
  }

  private BookmarkSpec createSampleSpec() {
    return new BookmarkSpec(
        "TestBookmark",
        "TestGroup",
        "mdi:bookmark",
        "https://test.example.com",
        "Test info",
        true,
        100);
  }
}
