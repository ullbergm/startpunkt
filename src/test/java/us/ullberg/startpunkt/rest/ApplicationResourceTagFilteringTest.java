package us.ullberg.startpunkt.rest;

import static org.junit.jupiter.api.Assertions.*;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.util.ArrayList;
import org.junit.jupiter.api.Test;
import us.ullberg.startpunkt.crd.v1alpha4.ApplicationSpec;
import us.ullberg.startpunkt.objects.ApplicationSpecWithAvailability;

/** Unit tests for tag filtering logic in {@link ApplicationResource}. */
@QuarkusTest
class ApplicationResourceTagFilteringTest {

  @Inject ApplicationResource resource;

  private ApplicationSpecWithAvailability createApp(String name, String tags) {
    ApplicationSpec spec = new ApplicationSpec();
    spec.setName(name);
    spec.setGroup("test");
    spec.setUrl("https://example.com");
    spec.setTags(tags);
    return new ApplicationSpecWithAvailability(spec);
  }

  @Test
  void testFilterApplicationsByTags_NullFilter() {
    ArrayList<ApplicationSpecWithAvailability> apps = new ArrayList<>();
    apps.add(createApp("App1", "tag1,tag2"));
    apps.add(createApp("App2", "tag3"));

    ArrayList<ApplicationSpecWithAvailability> result =
        resource.filterApplicationsByTags(apps, null);

    assertEquals(2, result.size(), "Null filter should return all applications");
  }

  @Test
  void testFilterApplicationsByTags_EmptyFilter() {
    ArrayList<ApplicationSpecWithAvailability> apps = new ArrayList<>();
    apps.add(createApp("App1", "tag1,tag2"));
    apps.add(createApp("App2", "tag3"));

    ArrayList<ApplicationSpecWithAvailability> result = resource.filterApplicationsByTags(apps, "");

    assertEquals(2, result.size(), "Empty filter should return all applications");
  }

  @Test
  void testFilterApplicationsByTags_WhitespaceFilter() {
    ArrayList<ApplicationSpecWithAvailability> apps = new ArrayList<>();
    apps.add(createApp("App1", "tag1,tag2"));

    ArrayList<ApplicationSpecWithAvailability> result =
        resource.filterApplicationsByTags(apps, "   ");

    assertEquals(1, result.size(), "Whitespace-only filter should return all applications");
  }

  @Test
  void testFilterApplicationsByTags_SingleTagMatch() {
    ArrayList<ApplicationSpecWithAvailability> apps = new ArrayList<>();
    apps.add(createApp("App1", "production,backend"));
    apps.add(createApp("App2", "development,frontend"));
    apps.add(createApp("App3", "production,frontend"));

    ArrayList<ApplicationSpecWithAvailability> result =
        resource.filterApplicationsByTags(apps, "production");

    assertEquals(2, result.size(), "Should match apps with 'production' tag");
    assertTrue(
        result.stream().anyMatch(app -> "App1".equals(app.getName())), "Should include App1");
    assertTrue(
        result.stream().anyMatch(app -> "App3".equals(app.getName())), "Should include App3");
  }

  @Test
  void testFilterApplicationsByTags_MultipleTagsMatch() {
    ArrayList<ApplicationSpecWithAvailability> apps = new ArrayList<>();
    apps.add(createApp("App1", "production,backend"));
    apps.add(createApp("App2", "development,frontend"));
    apps.add(createApp("App3", "staging,backend"));

    ArrayList<ApplicationSpecWithAvailability> result =
        resource.filterApplicationsByTags(apps, "production,development");

    assertEquals(2, result.size(), "Should match apps with either 'production' or 'development'");
    assertTrue(result.stream().anyMatch(app -> "App1".equals(app.getName())));
    assertTrue(result.stream().anyMatch(app -> "App2".equals(app.getName())));
  }

  @Test
  void testFilterApplicationsByTags_NoMatch() {
    ArrayList<ApplicationSpecWithAvailability> apps = new ArrayList<>();
    apps.add(createApp("App1", "production,backend"));
    apps.add(createApp("App2", "development,frontend"));

    ArrayList<ApplicationSpecWithAvailability> result =
        resource.filterApplicationsByTags(apps, "staging");

    assertEquals(0, result.size(), "Should return empty list when no tags match");
  }

  @Test
  void testFilterApplicationsByTags_CaseInsensitive() {
    ArrayList<ApplicationSpecWithAvailability> apps = new ArrayList<>();
    apps.add(createApp("App1", "Production,Backend"));
    apps.add(createApp("App2", "DEVELOPMENT,FRONTEND"));

    ArrayList<ApplicationSpecWithAvailability> result =
        resource.filterApplicationsByTags(apps, "production,frontend");

    assertEquals(2, result.size(), "Tag matching should be case-insensitive");
  }

  @Test
  void testFilterApplicationsByTags_WithWhitespace() {
    ArrayList<ApplicationSpecWithAvailability> apps = new ArrayList<>();
    apps.add(createApp("App1", " production , backend "));
    apps.add(createApp("App2", "development"));

    ArrayList<ApplicationSpecWithAvailability> result =
        resource.filterApplicationsByTags(apps, " production , development ");

    assertEquals(2, result.size(), "Should handle whitespace in tags");
  }

  @Test
  void testFilterApplicationsByTags_AlwaysIncludesUntaggedApps() {
    ArrayList<ApplicationSpecWithAvailability> apps = new ArrayList<>();
    apps.add(createApp("App1", "production"));
    apps.add(createApp("App2", null));
    apps.add(createApp("App3", ""));
    apps.add(createApp("App4", "   "));

    ArrayList<ApplicationSpecWithAvailability> result =
        resource.filterApplicationsByTags(apps, "production");

    assertEquals(
        4,
        result.size(),
        "Should always include applications with null, empty, or whitespace-only tags");
  }

  @Test
  void testFilterApplicationsByTags_PartialMatch() {
    ArrayList<ApplicationSpecWithAvailability> apps = new ArrayList<>();
    apps.add(createApp("App1", "prod"));
    apps.add(createApp("App2", "production"));

    ArrayList<ApplicationSpecWithAvailability> result =
        resource.filterApplicationsByTags(apps, "prod");

    assertEquals(1, result.size(), "Should match exact tags only, not partial matches");
    assertTrue(result.stream().anyMatch(app -> "App1".equals(app.getName())));
  }

  @Test
  void testFilterApplicationsByTags_EmptyApplicationList() {
    ArrayList<ApplicationSpecWithAvailability> apps = new ArrayList<>();

    ArrayList<ApplicationSpecWithAvailability> result =
        resource.filterApplicationsByTags(apps, "production");

    assertEquals(0, result.size(), "Empty application list should return empty result");
  }

  @Test
  void testFilterApplicationsWithoutTags_AllTagged() {
    ArrayList<ApplicationSpecWithAvailability> apps = new ArrayList<>();
    apps.add(createApp("App1", "production"));
    apps.add(createApp("App2", "development"));
    apps.add(createApp("App3", "staging"));

    ArrayList<ApplicationSpecWithAvailability> result =
        resource.filterApplicationsWithoutTags(apps);

    assertEquals(0, result.size(), "Should return empty when all apps have tags");
  }

  @Test
  void testFilterApplicationsWithoutTags_NoneTagged() {
    ArrayList<ApplicationSpecWithAvailability> apps = new ArrayList<>();
    apps.add(createApp("App1", null));
    apps.add(createApp("App2", ""));
    apps.add(createApp("App3", "   "));

    ArrayList<ApplicationSpecWithAvailability> result =
        resource.filterApplicationsWithoutTags(apps);

    assertEquals(3, result.size(), "Should return all apps when none have tags");
  }

  @Test
  void testFilterApplicationsWithoutTags_Mixed() {
    ArrayList<ApplicationSpecWithAvailability> apps = new ArrayList<>();
    apps.add(createApp("App1", "production"));
    apps.add(createApp("App2", null));
    apps.add(createApp("App3", "development"));
    apps.add(createApp("App4", ""));
    apps.add(createApp("App5", "   "));

    ArrayList<ApplicationSpecWithAvailability> result =
        resource.filterApplicationsWithoutTags(apps);

    assertEquals(3, result.size(), "Should return only untagged apps");
    assertTrue(result.stream().anyMatch(app -> "App2".equals(app.getName())));
    assertTrue(result.stream().anyMatch(app -> "App4".equals(app.getName())));
    assertTrue(result.stream().anyMatch(app -> "App5".equals(app.getName())));
  }

  @Test
  void testFilterApplicationsWithoutTags_EmptyList() {
    ArrayList<ApplicationSpecWithAvailability> apps = new ArrayList<>();

    ArrayList<ApplicationSpecWithAvailability> result =
        resource.filterApplicationsWithoutTags(apps);

    assertEquals(0, result.size(), "Empty input should return empty result");
  }

  @Test
  void testFilterApplicationsByTags_SpecialCharactersInTags() {
    ArrayList<ApplicationSpecWithAvailability> apps = new ArrayList<>();
    apps.add(createApp("App1", "my-tag,my_tag"));
    apps.add(createApp("App2", "my.tag"));

    ArrayList<ApplicationSpecWithAvailability> result =
        resource.filterApplicationsByTags(apps, "my-tag,my.tag");

    assertEquals(2, result.size(), "Should handle special characters in tags");
  }
}
