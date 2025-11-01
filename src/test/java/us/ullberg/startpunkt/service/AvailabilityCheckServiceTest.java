package us.ullberg.startpunkt.service;

import static org.junit.jupiter.api.Assertions.*;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import us.ullberg.startpunkt.crd.v1alpha4.ApplicationSpec;
import us.ullberg.startpunkt.messaging.EventBroadcaster;
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
        service.getCachedAvailability("https://example.com"),
        "URL should be registered in cache");
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
}
