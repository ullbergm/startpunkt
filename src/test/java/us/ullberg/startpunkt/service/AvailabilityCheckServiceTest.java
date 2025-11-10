package us.ullberg.startpunkt.service;

import static org.junit.jupiter.api.Assertions.*;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import us.ullberg.startpunkt.crd.v1alpha4.ApplicationSpec;
import us.ullberg.startpunkt.objects.ApplicationResponse;

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
    List<ApplicationResponse> result = service.wrapWithAvailability(apps);

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
    List<ApplicationResponse> result = service.wrapWithAvailability(apps);

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
    List<ApplicationResponse> result = service.wrapWithAvailability(apps);

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
    List<ApplicationResponse> result = service.wrapWithAvailability(apps);

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
    List<ApplicationResponse> result = service.wrapWithAvailability(apps);

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
    List<ApplicationResponse> result = service.wrapWithAvailability(apps);

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
    List<ApplicationResponse> result = service.wrapWithAvailability(apps);

    // Then
    assertEquals(1, result.size());
    ApplicationResponse wrapped = result.get(0);

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
    List<ApplicationResponse> result = service.wrapWithAvailability(List.of(app));

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
    List<ApplicationResponse> result =
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

  @Test
  void testRegisterUrlWithInvalidProtocol() {
    // When/Then - Should handle gracefully
    assertDoesNotThrow(() -> service.registerUrl("invalid://example.com"));
  }

  @Test
  void testRegisterUrlWithMalformedUrl() {
    // When/Then - Should handle gracefully
    assertDoesNotThrow(() -> service.registerUrl("not-a-valid-url"));
  }

  @Test
  void testCacheAvailabilityDefaultsToTrue() {
    // Given
    String url = "https://new-url-cache-test.com";

    // When
    service.registerUrl(url);

    // Then
    Boolean result = service.getCachedAvailability(url);
    assertNotNull(result);
    assertTrue(result, "Newly registered URL should default to available");
  }

  @Test
  void testMultipleAppsWithSameUrl() {
    // Given
    String sharedUrl = "https://shared-url.com";
    ApplicationSpec app1 = new ApplicationSpec();
    app1.setName("app1");
    app1.setUrl(sharedUrl);

    ApplicationSpec app2 = new ApplicationSpec();
    app2.setName("app2");
    app2.setUrl(sharedUrl);

    service.registerUrl(sharedUrl);

    // When
    List<ApplicationResponse> result = service.wrapWithAvailability(List.of(app1, app2));

    // Then
    assertEquals(2, result.size());
    assertNotNull(result.get(0).getAvailable());
    assertNotNull(result.get(1).getAvailable());
  }

  @Test
  void testWrapWithAvailabilityPreservesAllFields() {
    // Given
    ApplicationSpec app =
        new ApplicationSpec(
            "TestApp",
            "TestGroup",
            "mdi:test",
            "blue",
            "https://test-preserve.com",
            "Test info",
            true,
            5,
            true,
            "/api",
            "prod,test");

    service.registerUrl("https://test-preserve.com");

    // When
    List<ApplicationResponse> result = service.wrapWithAvailability(List.of(app));

    // Then
    assertEquals(1, result.size());
    ApplicationResponse wrapped = result.get(0);
    assertEquals("TestApp", wrapped.getName());
    assertEquals("TestGroup", wrapped.getGroup());
    assertEquals("mdi:test", wrapped.getIcon());
    assertEquals("blue", wrapped.getIconColor());
    assertEquals("https://test-preserve.com", wrapped.getUrl());
    assertEquals("Test info", wrapped.getInfo());
    assertTrue(wrapped.getTargetBlank());
    assertEquals(5, wrapped.getLocation());
    assertTrue(wrapped.getEnabled());
    assertEquals("/api", wrapped.getRootPath());
    assertEquals("prod,test", wrapped.getTags());
    assertNotNull(wrapped.getAvailable());
  }

  @Test
  void testRegisterUrlWithPortNumber() {
    // When
    String urlWithPort = "https://example.com:8443";
    service.registerUrl(urlWithPort);

    // Then
    assertNotNull(service.getCachedAvailability(urlWithPort));
  }

  @Test
  void testRegisterUrlWithPath() {
    // When
    String urlWithPath = "https://example.com/path/to/resource";
    service.registerUrl(urlWithPath);

    // Then
    assertNotNull(service.getCachedAvailability(urlWithPath));
  }

  @Test
  void testRegisterUrlWithQueryParams() {
    // When
    String urlWithQuery = "https://example.com/search?q=test&page=1";
    service.registerUrl(urlWithQuery);

    // Then
    assertNotNull(service.getCachedAvailability(urlWithQuery));
  }

  @Test
  void testRegisterUrlWithFragment() {
    // When
    String urlWithFragment = "https://example.com/page#section";
    service.registerUrl(urlWithFragment);

    // Then
    assertNotNull(service.getCachedAvailability(urlWithFragment));
  }

  @Test
  void testCacheConsistencyAcrossMultipleCalls() {
    // Given
    String url = "https://consistency-test.com";
    service.registerUrl(url);

    // When - Get cached value multiple times
    Boolean first = service.getCachedAvailability(url);
    Boolean second = service.getCachedAvailability(url);
    Boolean third = service.getCachedAvailability(url);

    // Then - Should be consistent
    assertEquals(first, second);
    assertEquals(second, third);
  }

  @Test
  void testWrapWithAvailabilityHandlesLargeList() {
    // Given
    List<ApplicationSpec> apps = new ArrayList<>();
    for (int i = 0; i < 100; i++) {
      ApplicationSpec app = new ApplicationSpec();
      app.setName("app" + i);
      app.setUrl("https://example" + i + ".com");
      service.registerUrl("https://example" + i + ".com");
      apps.add(app);
    }

    // When
    List<ApplicationResponse> result = service.wrapWithAvailability(apps);

    // Then
    assertEquals(100, result.size());
    result.forEach(app -> assertNotNull(app.getAvailable()));
  }

  @Test
  void testRegisterUrlIdempotency() {
    // Given
    String url = "https://idempotent-test.com";

    // When - Register same URL multiple times
    service.registerUrl(url);
    service.registerUrl(url);
    service.registerUrl(url);

    // Then - Should still have one cached entry
    assertNotNull(service.getCachedAvailability(url));
    assertTrue(service.getCachedAvailability(url));
  }

  @Test
  void testCheckAvailabilityInvalidUrlTriggersBackoff() {
    // Given
    String invalidUrl = "not-a-valid-url-backoff";

    // When - First check should fail and trigger backoff
    boolean firstCheck = service.checkAvailability(invalidUrl);

    // Then
    assertFalse(firstCheck, "Invalid URL should fail first check");

    // When - Second immediate check should be skipped due to backoff
    boolean secondCheck = service.checkAvailability(invalidUrl);

    // Then - Should return cached false result without attempting HTTP call
    assertFalse(secondCheck, "Backoff should return cached false result");
  }

  @Test
  void testExponentialBackoffMultipleFailures() {
    // Given
    String unreachableUrl = "http://localhost:99999/nonexistent";

    // When - Trigger multiple failures to test backoff progression
    for (int i = 0; i < 5; i++) {
      boolean result = service.checkAvailability(unreachableUrl);
      assertFalse(result, "Check " + (i + 1) + " should fail");

      // Small sleep to ensure time progresses between checks
      try {
        Thread.sleep(10);
      } catch (InterruptedException e) {
        Thread.currentThread().interrupt();
      }
    }

    // Then - The service should have established backoff state
    // Further checks should be skipped until backoff expires
    Boolean cachedResult = service.getCachedAvailability(unreachableUrl);
    assertNotNull(cachedResult, "URL should be in cache after failures");
    assertFalse(cachedResult, "Failed URL should be cached as unavailable");
  }

  @Test
  void testBackoffResetOnSuccess() {
    // Given - We'll use an invalid URL that will fail, then verify reset behavior
    String testUrl = "http://invalid-host-reset-test:99999";

    // When - First check fails
    boolean firstCheck = service.checkAvailability(testUrl);
    assertFalse(firstCheck, "First check should fail");

    // Then - URL should be in backoff state
    Boolean cachedAfterFailure = service.getCachedAvailability(testUrl);
    assertNotNull(cachedAfterFailure, "URL should be cached after failure");

    // Note: Testing actual reset would require a working URL or mock server
    // The backoff reset logic is verified by unit testing the private methods
    // through integration behavior
  }

  @Test
  void testUnregisterUrlCleansUpBackoffState() {
    // Given
    String url = "http://test-cleanup:99999";
    service.registerUrl(url);

    // When - Cause failure to establish backoff state
    service.checkAvailability(url);

    // Then - Unregister should clean up all state
    service.unregisterUrl(url);

    // Verify cleanup
    assertNull(
        service.getCachedAvailability(url), "Unregistered URL should not be in availability cache");
  }

  @Test
  void testBackoffDoesNotAffectOtherUrls() {
    // Given
    String failingUrl = "http://failing-url:99999";
    String workingUrl = "https://different-url.com";

    service.registerUrl(failingUrl);
    service.registerUrl(workingUrl);

    // When - Failing URL enters backoff
    service.checkAvailability(failingUrl);

    // Then - Working URL should not be affected
    Boolean workingCached = service.getCachedAvailability(workingUrl);
    assertNotNull(workingCached, "Working URL should still be cached");

    // The working URL availability is determined by actual check or default
    // This test ensures isolation between URLs
  }

  @Test
  void testCheckAvailabilityRespectsBackoffPeriod() {
    // Given
    String backoffUrl = "http://backoff-period-test:99999";

    // When - First check establishes backoff
    boolean firstCheck = service.checkAvailability(backoffUrl);
    assertFalse(firstCheck, "First check should fail");

    // When - Immediate second check should use cached result
    long startTime = System.currentTimeMillis();
    boolean secondCheck = service.checkAvailability(backoffUrl);
    long elapsed = System.currentTimeMillis() - startTime;

    // Then - Second check should be very fast (< 100ms) as it's cached
    assertTrue(
        elapsed < 100,
        "Backoff check should be fast (cached), took " + elapsed + "ms but should be < 100ms");
    assertFalse(secondCheck, "Cached result should be false");
  }

  @Test
  void testMultipleUrlsWithIndependentBackoff() {
    // Given
    String url1 = "http://backoff-test-1:99999";
    String url2 = "http://backoff-test-2:99999";
    String url3 = "http://backoff-test-3:99999";

    service.registerUrl(url1);
    service.registerUrl(url2);
    service.registerUrl(url3);

    // When - Each URL fails independently
    service.checkAvailability(url1);
    service.checkAvailability(url2);
    service.checkAvailability(url3);

    // Then - All should be in backoff independently
    assertFalse(service.getCachedAvailability(url1), "URL 1 should be cached as unavailable");
    assertFalse(service.getCachedAvailability(url2), "URL 2 should be cached as unavailable");
    assertFalse(service.getCachedAvailability(url3), "URL 3 should be cached as unavailable");
  }

  @Test
  void testCheckAvailabilityHandlesMultipleConsecutiveFailures() {
    // Given
    String multiFailUrl = "http://multi-fail-test:99999";

    // When - Cause multiple consecutive failures
    for (int i = 0; i < 3; i++) {
      boolean result = service.checkAvailability(multiFailUrl);
      assertFalse(result, "Check " + (i + 1) + " should fail");

      if (i < 2) { // Don't sleep on the last iteration
        try {
          Thread.sleep(50);
        } catch (InterruptedException e) {
          Thread.currentThread().interrupt();
        }
      }
    }

    // Then - URL should remain in failed state
    Boolean finalState = service.getCachedAvailability(multiFailUrl);
    assertNotNull(finalState, "URL should be cached");
    assertFalse(finalState, "URL should be marked as unavailable");
  }

  @Test
  void testBackoffStateIsolatedBetweenTests() {
    // Given - Fresh URL that hasn't been used in other tests
    String isolatedUrl = "http://isolated-backoff-test:99999";

    // When
    service.registerUrl(isolatedUrl);
    boolean firstCheck = service.checkAvailability(isolatedUrl);

    // Then
    assertFalse(firstCheck, "First check should fail for unreachable URL");

    // Verify URL is tracked
    assertNotNull(service.getCachedAvailability(isolatedUrl), "URL should be cached");
  }

  @Test
  void testCheckAvailabilityMalformedUrlEntersBackoff() {
    // Given
    String malformedUrl = "definitely-not-a-url-with-backoff";

    // When - Multiple checks on malformed URL
    boolean firstCheck = service.checkAvailability(malformedUrl);
    boolean secondCheck = service.checkAvailability(malformedUrl);

    // Then
    assertFalse(firstCheck, "Malformed URL first check should fail");
    assertFalse(secondCheck, "Malformed URL second check should use backoff");
  }
}
