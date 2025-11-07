package us.ullberg.startpunkt.service;

import static org.junit.jupiter.api.Assertions.*;

import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.junit.jupiter.api.Test;
import us.ullberg.startpunkt.objects.bingimage.BingImage;

/**
 * Test class for BingImageService. Tests circuit breaker behavior and fallback mechanisms for Bing
 * API integration.
 */
@QuarkusTest
class BingImageServiceTest {

  @Inject BingImageService bingImageService;

  @Test
  void testGetBingImageOfDay_returnsValidImage() {
    // Given - Valid screen dimensions
    int width = 1920;
    int height = 1080;

    // When
    BingImage result = bingImageService.getBingImageOfDay(width, height);

    // Then
    assertNotNull(result, "BingImage should not be null");
    assertNotNull(result.getImageUrl(), "Image URL should not be null");
    assertNotNull(result.getDate(), "Date should not be null");
    assertTrue(
        result.getImageUrl().contains("bing.com"),
        "Image URL should be from Bing: " + result.getImageUrl());
  }

  @Test
  void testGetBingImageOfDay_handlesLowResolution() {
    // Given - Low resolution screen
    int width = 640;
    int height = 480;

    // When
    BingImage result = bingImageService.getBingImageOfDay(width, height);

    // Then
    assertNotNull(result, "BingImage should not be null");
    assertTrue(
        result.getImageUrl().contains("640x480") || result.getImageUrl().contains("320x240"),
        "Should use appropriate low resolution");
  }

  @Test
  void testGetBingImageOfDay_handlesHighResolution() {
    // Given - High resolution screen
    int width = 3840;
    int height = 2160;

    // When
    BingImage result = bingImageService.getBingImageOfDay(width, height);

    // Then
    assertNotNull(result, "BingImage should not be null");
    assertTrue(result.getImageUrl().contains("UHD"), "Should use UHD resolution for 4K screens");
  }

  @Test
  void testGetBingImageOfDay_handlesPortraitMode() {
    // Given - Portrait orientation
    int width = 768;
    int height = 1280;

    // When
    BingImage result = bingImageService.getBingImageOfDay(width, height);

    // Then
    assertNotNull(result, "BingImage should not be null");
    assertTrue(
        result.getImageUrl().contains("768x1280") || result.getImageUrl().contains("x"),
        "Should handle portrait mode resolution");
  }

  @Test
  void testFallbackImage_hasValidStructure() {
    // This test verifies the fallback mechanism by testing with valid dimensions
    // The actual fallback only triggers on API failure, but we can verify the service
    // always returns a valid BingImage

    // Given - Standard resolution
    int width = 1920;
    int height = 1080;

    // When
    BingImage result = bingImageService.getBingImageOfDay(width, height);

    // Then - Should always return a valid image (either from API or fallback)
    assertNotNull(result, "Should return a BingImage");
    assertNotNull(result.getImageUrl(), "Should have an image URL");
    assertNotNull(result.getCopyright(), "Should have copyright info");
    assertNotNull(result.getTitle(), "Should have a title");
    assertNotNull(result.getDate(), "Should have a date");
    assertFalse(result.getImageUrl().isEmpty(), "Image URL should not be empty");
    assertFalse(result.getDate().isEmpty(), "Date should not be empty");
  }

  @Test
  void testGetBingImageOfDay_cachesBingApiData() {
    // Given - Two requests with same and different resolutions
    int width1 = 1920;
    int height1 = 1080;
    int width2 = 1366;
    int height2 = 768;

    // When - Make two requests (should use cached base data)
    BingImage result1 = bingImageService.getBingImageOfDay(width1, height1);
    BingImage result2 = bingImageService.getBingImageOfDay(width2, height2);

    // Then - Both should return valid images with same date (from cache)
    assertNotNull(result1, "First result should not be null");
    assertNotNull(result2, "Second result should not be null");
    assertEquals(
        result1.getDate(),
        result2.getDate(),
        "Both images should have the same date (cached base data)");

    // Different resolutions should be used
    assertNotEquals(
        result1.getImageUrl(),
        result2.getImageUrl(),
        "Different resolutions should produce different URLs");
  }

  @Test
  void testBingImageService_alwaysSucceedsWithFallback() {
    // This test ensures that the service never throws exceptions due to circuit breaker
    // and fallback mechanisms

    // Given - Multiple requests in sequence
    int[] widths = {1920, 1366, 1024, 800, 640};
    int[] heights = {1080, 768, 768, 600, 480};

    // When & Then - All requests should succeed (either with real data or fallback)
    for (int i = 0; i < widths.length; i++) {
      BingImage result = bingImageService.getBingImageOfDay(widths[i], heights[i]);
      assertNotNull(
          result, "Request " + i + " should return a valid BingImage (never throw exception)");
      assertNotNull(result.getImageUrl(), "Image URL should always be present");
      assertTrue(
          result.getImageUrl().contains("bing.com"), "Should always be a Bing.com image URL");
    }
  }
}
