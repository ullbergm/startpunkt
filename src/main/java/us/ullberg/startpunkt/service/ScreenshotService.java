package us.ullberg.startpunkt.service;

import com.microsoft.playwright.Browser;
import com.microsoft.playwright.BrowserType;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Playwright;
import io.quarkus.cache.CacheResult;
import io.quarkus.logging.Log;
import jakarta.annotation.PreDestroy;
import jakarta.enterprise.context.ApplicationScoped;
import java.io.IOException;
import java.util.Base64;
import org.eclipse.microprofile.config.inject.ConfigProperty;

/**
 * Service for capturing screenshots of web applications using Playwright. Screenshots are cached to
 * improve performance and reduce resource usage.
 */
@ApplicationScoped
public class ScreenshotService {

  private Playwright playwright;
  private Browser browser;

  @ConfigProperty(name = "startpunkt.web.preview.screenshot.width", defaultValue = "1280")
  int screenshotWidth;

  @ConfigProperty(name = "startpunkt.web.preview.screenshot.height", defaultValue = "720")
  int screenshotHeight;

  @ConfigProperty(name = "startpunkt.web.preview.screenshot.timeout", defaultValue = "10000")
  int screenshotTimeout;

  @ConfigProperty(name = "startpunkt.web.preview.enabled", defaultValue = "true")
  boolean previewEnabled;

  /** Initializes the Playwright browser instance. Called lazily on first screenshot request. */
  private synchronized void initializeBrowser() {
    if (browser != null) {
      return;
    }

    if (!previewEnabled) {
      Log.info("Preview feature is disabled, skipping browser initialization");
      return;
    }

    try {
      Log.info("Initializing Playwright browser for screenshots");
      playwright = Playwright.create();
      browser =
          playwright
              .chromium()
              .launch(
                  new BrowserType.LaunchOptions()
                      .setHeadless(true)
                      .setArgs(
                          java.util.List.of(
                              "--no-sandbox",
                              "--disable-setuid-sandbox",
                              "--disable-dev-shm-usage",
                              "--disable-gpu")));
      Log.info("Playwright browser initialized successfully");
    } catch (Exception e) {
      Log.error("Failed to initialize Playwright browser", e);
      throw new RuntimeException("Failed to initialize screenshot service", e);
    }
  }

  /**
   * Captures a screenshot of the given URL and returns it as a base64-encoded PNG.
   *
   * @param url the URL to capture
   * @return base64-encoded PNG screenshot
   * @throws IOException if screenshot capture fails
   */
  @CacheResult(cacheName = "screenshots")
  public String captureScreenshot(String url) throws IOException {
    if (!previewEnabled) {
      throw new IllegalStateException("Preview feature is disabled");
    }

    if (browser == null) {
      initializeBrowser();
    }

    if (browser == null) {
      throw new IllegalStateException("Browser not initialized");
    }

    Log.debugf("Capturing screenshot for URL: %s", url);

    Page page = null;
    try {
      page = browser.newPage();
      page.setViewportSize(screenshotWidth, screenshotHeight);

      // Navigate to URL with timeout
      com.microsoft.playwright.Response response = null;
      try {
        response = page.navigate(url, new Page.NavigateOptions().setTimeout(screenshotTimeout));
        
        // Check HTTP status code
        if (response != null) {
          int status = response.status();
          Log.debugf("Response for %s - Status: %d", url, status);
          
          // Check for WWW-Authenticate header which indicates auth is required
          try {
            String wwwAuth = response.headerValue("www-authenticate");
            Log.debugf("WWW-Authenticate header: %s", wwwAuth);
            if (wwwAuth != null && !wwwAuth.isEmpty()) {
              Log.debugf(
                  "Detected Basic/Digest auth requirement via WWW-Authenticate header for %s",
                  url);
              throw new IOException(
                  "Site requires authentication (Basic/Digest auth) - preview not available");
            }
          } catch (IOException e) {
            throw e;
          } catch (Exception e) {
            // Ignore header parsing errors
            Log.warnf("Error reading WWW-Authenticate header: %s", e.getMessage());
          }
          
          if (status == 401 || status == 403) {
            Log.debugf("Detected HTTP %d auth requirement for %s", status, url);
            throw new IOException(
                "Site requires authentication (HTTP " + status + ") - preview not available");
          } else if (status >= 400) {
            Log.debugf("Detected HTTP %d error for %s", status, url);
            throw new IOException(
                "Site returned error (HTTP " + status + ") - preview not available");
          }
          
          // Also check if response body is empty (some auth pages return 401 with no content)
          try {
            String contentLength = response.headerValue("content-length");
            Log.debugf("Content-Length header: %s", contentLength);
            if (contentLength != null && contentLength.equals("0")) {
              Log.debugf("Detected empty response for %s", url);
              throw new IOException(
                  "Site requires authentication (empty response) - preview not available");
            }
          } catch (IOException e) {
            throw e;
          } catch (Exception e) {
            // Ignore header parsing errors
            Log.warnf("Error reading Content-Length header: %s", e.getMessage());
          }
        }
      } catch (IOException e) {
        // Re-throw our custom IOException
        throw e;
      } catch (Exception e) {
        // Check if it's an auth dialog or other navigation issue
        String errorMsg = e.getMessage().toLowerCase();
        if (errorMsg.contains("net::err_") || errorMsg.contains("timeout")) {
          throw new IOException(
              "Failed to load page - site may be unreachable or require authentication");
        }
        throw e;
      }

      // Wait a bit for dynamic content to load
      page.waitForTimeout(1000);

      // Check if page has common authentication indicators
      try {
        String pageTitle = page.title().toLowerCase();
        String pageUrl = page.url().toLowerCase();
        Log.debugf("Page loaded - Title: '%s', URL: '%s'", pageTitle, pageUrl);
        
        // Check for common auth page indicators
        if (pageTitle.contains("sign in")
            || pageTitle.contains("login")
            || pageTitle.contains("authenticate")
            || pageTitle.contains("unauthorized")
            || pageUrl.contains("/login")
            || pageUrl.contains("/auth")) {
          Log.debugf("Detected login page via title/URL for %s", url);
          throw new IOException("Site requires authentication - redirected to login page");
        }
      } catch (IOException e) {
        throw e;
      } catch (Exception e) {
        // Ignore errors checking page content
        Log.debugf("Could not check page content for auth indicators: %s", e.getMessage());
      }

      // Capture screenshot
      byte[] screenshotBytes = page.screenshot(new Page.ScreenshotOptions().setFullPage(false));
      Log.debugf("Screenshot captured: %d bytes", screenshotBytes.length);

      // Check if screenshot is effectively blank (might indicate auth popup or error page)
      // Empty pages typically result in very small PNG files (< 10KB)
      if (screenshotBytes.length < 10000) {
        // Very small screenshot, likely blank or error
        Log.debugf(
            "Screenshot too small (%d bytes), likely auth or blank page for %s",
            screenshotBytes.length,
            url);
        throw new IOException(
            "Preview unavailable - site may require authentication or failed to load");
      }

      // Convert to base64
      String base64Screenshot = Base64.getEncoder().encodeToString(screenshotBytes);

      Log.debugf(
          "Successfully captured screenshot for URL: %s (%d bytes)", url, screenshotBytes.length);

      return base64Screenshot;

    } catch (IOException e) {
      // Don't log stack trace for expected IOExceptions - they're already logged in ScreenshotResource
      // These are normal conditions like auth requirements, not actual errors
      throw e;
    } catch (Exception e) {
      // Only log unexpected exceptions with stack trace
      Log.errorf(e, "Unexpected error capturing screenshot for URL: %s", url);
      throw new IOException("Failed to capture screenshot: " + e.getMessage(), e);
    } finally {
      if (page != null) {
        try {
          page.close();
        } catch (Exception e) {
          Log.warn("Failed to close page", e);
        }
      }
    }
  }

  /**
   * Captures a screenshot and returns the raw PNG bytes.
   *
   * @param url the URL to capture
   * @return PNG screenshot bytes
   * @throws IOException if screenshot capture fails
   */
  @CacheResult(cacheName = "screenshot-bytes")
  public byte[] captureScreenshotBytes(String url) throws IOException {
    String base64 = captureScreenshot(url);
    return Base64.getDecoder().decode(base64);
  }

  /** Cleans up Playwright resources on application shutdown. */
  @PreDestroy
  public void cleanup() {
    Log.info("Cleaning up Playwright resources");
    if (browser != null) {
      try {
        browser.close();
      } catch (Exception e) {
        Log.warn("Error closing browser", e);
      }
    }
    if (playwright != null) {
      try {
        playwright.close();
      } catch (Exception e) {
        Log.warn("Error closing Playwright", e);
      }
    }
  }
}
