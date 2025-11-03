package us.ullberg.startpunkt.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.annotation.Timed;
import io.quarkus.cache.CacheResult;
import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import us.ullberg.startpunkt.objects.bingimage.BingImage;

/**
 * Service for fetching and caching Bing's Image of the Day. The base URL from Bing API is cached
 * for 1 hour, and resolution selection is performed based on client aspect ratio.
 */
@ApplicationScoped
public class BingImageService {

  private static final String BING_API_URL =
      "https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1";
  private static final String BING_IMAGE_BASE_URL = "https://www.bing.com";

  private final ObjectMapper objectMapper;
  private final HttpClient httpClient;

  /**
   * Constructor initializes HTTP client and injects ObjectMapper.
   *
   * @param objectMapper Jackson ObjectMapper for JSON parsing
   */
  public BingImageService(ObjectMapper objectMapper) {
    this.objectMapper = objectMapper;
    this.httpClient = HttpClient.newHttpClient();
  }

  /**
   * Fetches Bing Image of the Day with optimal resolution for the given screen dimensions. The base
   * URL data is cached for 1 hour to minimize API calls.
   *
   * @param width client screen width in pixels
   * @param height client screen height in pixels
   * @return BingImage with optimized URL and metadata
   * @throws IOException if the API call fails or response cannot be parsed
   */
  @Timed(
      value = "startpunkt.bingimage.fetch",
      description = "Fetch Bing Image of the Day with resolution optimization")
  public BingImage getBingImageOfDay(int width, int height) throws IOException {
    Log.debugf("Getting Bing Image of the Day for resolution: %dx%d", width, height);

    // Fetch cached base data from Bing API (cached for 1 hour)
    BingImageData baseData = fetchBingImageData();

    // Determine best resolution based on client screen dimensions
    String resolution = getBestResolutionForAspectRatio(width, height);

    // Build complete image URL with selected resolution
    String imageUrl = BING_IMAGE_BASE_URL + baseData.urlbase() + "_" + resolution + ".jpg";

    Log.debugf(
        "Bing image URL constructed: %s for date: %s with resolution: %s",
        imageUrl, baseData.date(), resolution);

    return new BingImage(imageUrl, baseData.copyright(), baseData.title(), baseData.date());
  }

  /**
   * Fetches the base image data from Bing API. This method is cached for 1 hour to reduce API
   * calls.
   *
   * @return BingImageData containing urlbase and metadata
   * @throws IOException if the API call fails
   */
  @CacheResult(cacheName = "bing-image-base-cache")
  BingImageData fetchBingImageData() throws IOException {
    Log.debug("Fetching base image data from Bing API (cache miss)");

    try {
      HttpRequest request = HttpRequest.newBuilder().uri(URI.create(BING_API_URL)).GET().build();

      HttpResponse<String> response =
          httpClient.send(request, HttpResponse.BodyHandlers.ofString());

      if (response.statusCode() != 200) {
        throw new IOException(
            "Bing API returned status code: "
                + response.statusCode()
                + ", body: "
                + response.body());
      }

      // Parse JSON response
      JsonNode root = objectMapper.readTree(response.body());
      JsonNode images = root.path("images");

      if (!images.isArray() || images.isEmpty()) {
        throw new IOException("No images found in Bing API response");
      }

      JsonNode image = images.get(0);
      String urlbase = image.path("urlbase").asText();
      String copyright = image.path("copyright").asText();
      String title = image.path("title").asText();
      String startdate = image.path("startdate").asText();

      if (urlbase.isEmpty()) {
        throw new IOException("Urlbase is empty in Bing API response");
      }

      return new BingImageData(urlbase, copyright, title, startdate);

    } catch (InterruptedException e) {
      Thread.currentThread().interrupt();
      throw new IOException("Request was interrupted", e);
    } catch (Exception e) {
      Log.errorf(e, "Error fetching Bing Image of the Day base data");
      throw new IOException("Failed to fetch Bing Image of the Day", e);
    }
  }

  /**
   * Determines the best Bing image resolution based on client screen aspect ratio and dimensions.
   * Prioritizes finding the closest aspect ratio match, then selects appropriate resolution.
   *
   * @param width screen width in pixels
   * @param height screen height in pixels
   * @return resolution string (e.g., "1920x1080", "UHD", "768x1280")
   */
  private String getBestResolutionForAspectRatio(int width, int height) {
    double aspectRatio = (double) width / height;
    boolean isPortrait = height > width;

    Log.debugf(
        "Calculating best resolution for %dx%d (aspect ratio: %.2f, portrait: %b)",
        width, height, aspectRatio, isPortrait);

    // Ultra high resolution
    if (width >= 3840 || height >= 2160) {
      return "UHD";
    }

    // Portrait mode resolutions
    if (isPortrait) {
      if (width >= 768 && height >= 1280) {
        return "768x1280"; // 0.6 aspect ratio
      }
      if (width >= 720 && height >= 1280) {
        return "720x1280"; // 0.5625 aspect ratio
      }
      if (width >= 480 && height >= 800) {
        return "480x800"; // 0.6 aspect ratio
      }
      if (width >= 240 && height >= 320) {
        return "240x320"; // 0.75 aspect ratio
      }
      return "320x240"; // Fallback
    }

    // Landscape mode resolutions - match by aspect ratio
    // Wide aspect ratios (16:10 = 1.6, 16:9 = 1.78, 4:3 = 1.33)

    if (aspectRatio >= 1.55 && aspectRatio <= 1.65) {
      // 16:10 aspect ratio
      if (width >= 1920 && height >= 1200) {
        return "1920x1200";
      }
      if (width >= 1280 && height >= 768) {
        return "1280x768";
      }
      return "800x480";
    } else if (aspectRatio >= 1.70 && aspectRatio <= 1.85) {
      // 16:9 aspect ratio
      if (width >= 1920 && height >= 1080) {
        return "1920x1080";
      }
      if (width >= 1366 && height >= 768) {
        return "1366x768";
      }
      return "800x480";
    } else if (aspectRatio >= 1.25 && aspectRatio <= 1.40) {
      // 4:3 aspect ratio
      if (width >= 1024 && height >= 768) {
        return "1024x768";
      }
      if (width >= 800 && height >= 600) {
        return "800x600";
      }
      if (width >= 640 && height >= 480) {
        return "640x480";
      }
      return "320x240";
    } else if (aspectRatio >= 1.62 && aspectRatio <= 1.70) {
      // Between 16:10 and 16:9
      if (width >= 1920) {
        return "1920x1200";
      }
      if (width >= 1366) {
        return "1366x768";
      }
      return "800x600";
    }

    // Default fallback based on size
    if (width >= 1920) {
      return "1920x1080";
    }
    if (width >= 1366) {
      return "1366x768";
    }
    if (width >= 1024) {
      return "1024x768";
    }
    if (width >= 800) {
      return "800x600";
    }
    if (width >= 640) {
      return "640x480";
    }
    if (width >= 400) {
      return "400x240";
    }
    return "320x240";
  }

  /**
   * Internal record to hold Bing image base data from API.
   *
   * @param urlbase base URL path for the image
   * @param copyright copyright information
   * @param title image title
   * @param date image date in YYYYMMDD format
   */
  record BingImageData(String urlbase, String copyright, String title, String date) {}
}
