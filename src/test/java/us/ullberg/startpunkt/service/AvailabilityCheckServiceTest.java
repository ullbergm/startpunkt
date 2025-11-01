package us.ullberg.startpunkt.service;

import static org.junit.jupiter.api.Assertions.*;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import us.ullberg.startpunkt.crd.v1alpha4.ApplicationSpec;
import us.ullberg.startpunkt.objects.ApplicationSpecWithAvailability;

@QuarkusTest
class AvailabilityCheckServiceTest {

  @Inject AvailabilityCheckService service;

  @Test
  void testIsEnabledReturnsTrue() {
    assertTrue(service.isEnabled(), "Service should be enabled by default");
  }

  @Test
  void testRegisterUrlAddsToCache() {
    // When
    service.registerUrl("https://example.com");

    // Then
    assertNotNull(
        service.getCachedAvailability("https://example.com"), "URL should be registered in cache");
    assertTrue(
        service.getCachedAvailability("https://example.com"),
        "New URL should default to available");
  }

  @Test
  void testRegisterUrlHandlesNull() {
    // When/Then - Should not throw exception, just skip registration
    assertDoesNotThrow(() -> service.registerUrl(null), "Null URL should not throw exception");
  }

  @Test
  void testRegisterUrlHandlesEmpty() {
    // When/Then - Should not throw exception, just skip registration
    assertDoesNotThrow(() -> service.registerUrl(""), "Empty URL should not throw exception");
  }

  @Test
  void testGetCachedAvailabilityReturnsNullForUnregistered() {
    // When
    Boolean result = service.getCachedAvailability("https://unregistered-url-test.com");

    // Then
    assertNull(result, "Unregistered URL should return null");
  }

  @Test
  void testWrapWithAvailabilityHandlesEmptyList() {
    // Given
    List<ApplicationSpec> apps = new ArrayList<>();

    // When
    List<ApplicationSpecWithAvailability> result = service.wrapWithAvailability(apps);

    // Then
    assertNotNull(result, "Result should not be null");
    assertTrue(result.isEmpty(), "Result should be empty for empty input");
  }

  @Test
  void testWrapWithAvailabilityUsesCache() {
    // Given
    ApplicationSpec app = new ApplicationSpec();
    app.setName("test-app");
    app.setUrl("https://example-cached.com");

    service.registerUrl("https://example-cached.com");
    List<ApplicationSpec> apps = List.of(app);

    // When
    List<ApplicationSpecWithAvailability> result = service.wrapWithAvailability(apps);

    // Then
    assertNotNull(result, "Result should not be null");
    assertEquals(1, result.size(), "Should have one wrapped app");
    assertTrue(result.get(0).getAvailable(), "App should be available from cache");
  }

  @Test
  void testWrapWithAvailabilityHandlesNullUrl() {
    // Given
    ApplicationSpec app = new ApplicationSpec();
    app.setName("test-app");
    app.setUrl(null);

    List<ApplicationSpec> apps = List.of(app);

    // When
    List<ApplicationSpecWithAvailability> result = service.wrapWithAvailability(apps);

    // Then
    assertNotNull(result, "Result should not be null");
    assertEquals(1, result.size(), "Should have one wrapped app");
    assertTrue(result.get(0).getAvailable(), "App with null URL should default to available");
  }

  @Test
  void testWrapWithAvailabilityHandlesEmptyUrl() {
    // Given
    ApplicationSpec app = new ApplicationSpec();
    app.setName("test-app");
    app.setUrl("");

    List<ApplicationSpec> apps = List.of(app);

    // When
    List<ApplicationSpecWithAvailability> result = service.wrapWithAvailability(apps);

    // Then
    assertNotNull(result, "Result should not be null");
    assertEquals(1, result.size(), "Should have one wrapped app");
    assertTrue(result.get(0).getAvailable(), "App with empty URL should default to available");
  }

  @Test
  void testWrapWithAvailabilityDefaultsToTrueForUncached() {
    // Given
    ApplicationSpec app = new ApplicationSpec();
    app.setName("test-app");
    app.setUrl("https://uncached-test-url.com");

    List<ApplicationSpec> apps = List.of(app);

    // When
    List<ApplicationSpecWithAvailability> result = service.wrapWithAvailability(apps);

    // Then
    assertNotNull(result, "Result should not be null");
    assertEquals(1, result.size(), "Should have one wrapped app");
    assertTrue(result.get(0).getAvailable(), "Uncached URL should default to available");
  }

  @Test
  void testWrapWithAvailabilityMultipleApps() {
    // Given
    ApplicationSpec app1 = new ApplicationSpec();
    app1.setName("app1");
    app1.setUrl("https://example1-test.com");

    ApplicationSpec app2 = new ApplicationSpec();
    app2.setName("app2");
    app2.setUrl("https://example2-test.com");

    ApplicationSpec app3 = new ApplicationSpec();
    app3.setName("app3");
    app3.setUrl(null);

    service.registerUrl("https://example1-test.com");
    service.registerUrl("https://example2-test.com");

    List<ApplicationSpec> apps = List.of(app1, app2, app3);

    // When
    List<ApplicationSpecWithAvailability> result = service.wrapWithAvailability(apps);

    // Then
    assertEquals(3, result.size(), "Should have three wrapped apps");
    assertTrue(result.get(0).getAvailable(), "First app should be available");
    assertTrue(result.get(1).getAvailable(), "Second app should be available");
    assertTrue(result.get(2).getAvailable(), "Third app (null URL) should be available");
  }

  @Test
  void testCheckAvailabilityReturnsCorrectly() {
    // Note: This is a basic test. Full HTTP testing would require mock server setup
    // Testing with actual URLs may be unreliable in CI/CD

    // Test invalid URL format
    boolean result = service.checkAvailability("not-a-url");
    assertFalse(result, "Invalid URL should return false");
  }

  @Test
  void testInvalidateCachesMethods() {
    // When - Should not throw exceptions
    assertDoesNotThrow(
        () -> service.invalidateApplicationCaches(),
        "Invalidating caches should not throw exception");
  }

  @Test
  void testRegisterUrlDoesNotDuplicateEntries() {
    // Given
    String url = "https://duplicate-test.com";

    // When - Register same URL multiple times
    service.registerUrl(url);
    service.registerUrl(url);
    service.registerUrl(url);

    // Then - Should still have just one entry
    assertNotNull(service.getCachedAvailability(url), "URL should be in cache");
    assertTrue(service.getCachedAvailability(url), "URL should be available");
  }

  @Test
  void testWrapWithAvailabilityPreservesApplicationData() {
    // Given
    ApplicationSpec app = new ApplicationSpec();
    app.setName("Test App");
    app.setUrl("https://test-preserve.com");
    app.setGroup("Test Group");
    app.setIcon("mdi:test");
    app.setIconColor("blue");
    app.setInfo("Test info");
    app.setLocation(5);
    app.setTargetBlank(true);
    app.setEnabled(true);

    List<ApplicationSpec> apps = List.of(app);

    // When
    List<ApplicationSpecWithAvailability> result = service.wrapWithAvailability(apps);

    // Then
    assertEquals(1, result.size());
    ApplicationSpecWithAvailability wrapped = result.get(0);

    // Verify all fields are preserved
    assertEquals("Test App", wrapped.getName());
    assertEquals("https://test-preserve.com", wrapped.getUrl());
    assertEquals("Test Group", wrapped.getGroup());
    assertEquals("mdi:test", wrapped.getIcon());
    assertEquals("blue", wrapped.getIconColor());
    assertEquals("Test info", wrapped.getInfo());
    assertEquals(5, wrapped.getLocation());
    assertTrue(wrapped.getTargetBlank());
    assertTrue(wrapped.getEnabled());
    assertNotNull(wrapped.getAvailable(), "Availability should be set");
  }

  @Test
  void testCheckAvailabilityHandlesEmptyUrl() {
    // When/Then - Should handle gracefully without throwing
    boolean result = service.checkAvailability("");
    assertFalse(result, "Empty URL should return false");
  }

  @Test
  void testCheckAvailabilityHandlesMalformedUrl() {
    // Test various malformed URLs
    assertFalse(service.checkAvailability("not-a-url"), "Malformed URL should return false");
    assertFalse(service.checkAvailability("http://"), "Incomplete URL should return false");
    assertFalse(
        service.checkAvailability("ftp://invalid-protocol.com"),
        "Invalid protocol should return false");
  }

  @Test
  void testRegisterUrlWithWhitespace() {
    // Given
    String urlWithWhitespace = "  https://whitespace-test.com  ";

    // When - Should handle or trim whitespace
    service.registerUrl(urlWithWhitespace);

    // Then - URL should be registered (behavior depends on implementation)
    // At minimum, should not throw exception
    assertDoesNotThrow(() -> service.registerUrl(urlWithWhitespace));
  }

  @Test
  void testWrapWithAvailabilitySingleApp() {
    // Given
    ApplicationSpec app = new ApplicationSpec();
    app.setName("Single App");
    app.setUrl("https://single-test.com");
    app.setGroup("Test");

    service.registerUrl("https://single-test.com");

    // When
    List<ApplicationSpecWithAvailability> result = service.wrapWithAvailability(List.of(app));

    // Then
    assertEquals(1, result.size());
    assertEquals("Single App", result.get(0).getName());
    assertTrue(result.get(0).getAvailable());
  }

  @Test
  void testWrapWithAvailabilityMixedUrls() {
    // Given - Mix of cached, uncached, null, and empty URLs
    ApplicationSpec cached = new ApplicationSpec();
    cached.setName("Cached");
    cached.setUrl("https://cached-mix.com");

    ApplicationSpec uncached = new ApplicationSpec();
    uncached.setName("Uncached");
    uncached.setUrl("https://uncached-mix.com");

    ApplicationSpec nullUrl = new ApplicationSpec();
    nullUrl.setName("Null URL");
    nullUrl.setUrl(null);

    ApplicationSpec emptyUrl = new ApplicationSpec();
    emptyUrl.setName("Empty URL");
    emptyUrl.setUrl("");

    service.registerUrl("https://cached-mix.com");

    // When
    List<ApplicationSpecWithAvailability> result =
        service.wrapWithAvailability(List.of(cached, uncached, nullUrl, emptyUrl));

    // Then
    assertEquals(4, result.size());
    assertTrue(result.get(0).getAvailable(), "Cached URL should be available");
    assertTrue(result.get(1).getAvailable(), "Uncached URL should default to available");
    assertTrue(result.get(2).getAvailable(), "Null URL should default to available");
    assertTrue(result.get(3).getAvailable(), "Empty URL should default to available");
  }

  @Test
  void testCachedAvailabilityPersists() {
    // Given
    String url = "https://persist-test.com";
    service.registerUrl(url);

    // When - Retrieve multiple times
    Boolean first = service.getCachedAvailability(url);
    Boolean second = service.getCachedAvailability(url);
    Boolean third = service.getCachedAvailability(url);

    // Then - Should return same value consistently
    assertNotNull(first);
    assertEquals(first, second);
    assertEquals(second, third);
  }

  @Test
  void testRegisterMultipleUniqueUrls() {
    // Given
    List<String> urls =
        List.of(
            "https://url1-multi.com",
            "https://url2-multi.com",
            "https://url3-multi.com",
            "https://url4-multi.com",
            "https://url5-multi.com");

    // When - Register all URLs
    urls.forEach(service::registerUrl);

    // Then - All should be cached
    urls.forEach(
        url -> {
          assertNotNull(service.getCachedAvailability(url), "URL should be cached: " + url);
          assertTrue(service.getCachedAvailability(url), "URL should be available: " + url);
        });
  }
}
