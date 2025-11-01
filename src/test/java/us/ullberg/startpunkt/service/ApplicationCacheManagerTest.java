package us.ullberg.startpunkt.service;

import static org.junit.jupiter.api.Assertions.*;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;

/** Unit tests for ApplicationCacheManager service. */
@QuarkusTest
class ApplicationCacheManagerTest {

  @Inject ApplicationCacheManager cacheManager;

  @Test
  void testCacheManagerInjection() {
    assertNotNull(cacheManager, "ApplicationCacheManager should be injected");
  }

  @Test
  void testInvalidateApplicationCaches() {
    // Should not throw exceptions
    assertDoesNotThrow(() -> cacheManager.invalidateApplicationCaches());
  }

  @Test
  void testInvalidateBookmarkCaches() {
    // Should not throw exceptions
    assertDoesNotThrow(() -> cacheManager.invalidateBookmarkCaches());
  }

  @Test
  void testInvalidateAllCaches() {
    // Should not throw exceptions
    assertDoesNotThrow(() -> cacheManager.invalidateAllCaches());
  }
}
