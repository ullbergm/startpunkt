package us.ullberg.startpunkt.service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.security.KeyManagementException;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.security.cert.X509Certificate;
import java.time.Duration;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLParameters;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;

import org.eclipse.microprofile.config.inject.ConfigProperty;

import io.quarkus.cache.CacheInvalidate;
import io.quarkus.logging.Log;
import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
import us.ullberg.startpunkt.crd.v1alpha4.ApplicationSpec;
import us.ullberg.startpunkt.messaging.EventBroadcaster;
import us.ullberg.startpunkt.objects.ApplicationResponse;

/**
 * Service for checking the availability of applications by probing their URLs.
 * Runs periodic checks
 * in the background to maintain up-to-date availability status.
 */
@ApplicationScoped
public class AvailabilityCheckService {

  @ConfigProperty(name = "startpunkt.availability.enabled", defaultValue = "true")
  private boolean availabilityCheckEnabled;

  @ConfigProperty(name = "startpunkt.availability.timeout", defaultValue = "5")
  private int availabilityTimeout;

  /**
   * Interval for availability checks, injected from configuration. This field is
   * referenced via
   * annotation expressions (e.g., @Scheduled(every =
   * "{startpunkt.availability.interval}")) and is
   * retained for documentation and potential future use.
   */
  @ConfigProperty(name = "startpunkt.availability.interval", defaultValue = "60s")
  private String availabilityCheckInterval;

  @ConfigProperty(name = "startpunkt.availability.ignoreCertificates", defaultValue = "false")
  private boolean ignoreCertificates;

  private final Map<String, Boolean> availabilityCache = new ConcurrentHashMap<>();
  private final Map<String, Boolean> previousAvailabilityCache = new ConcurrentHashMap<>();
  private final HttpClient httpClient;
  private final EventBroadcaster eventBroadcaster;

  /**
   * Constructor that initializes the HTTP client with appropriate timeouts.
   *
   * @param ignoreCertificates whether to ignore SSL certificate validation
   * @param eventBroadcaster   the event broadcaster for sending availability
   *                           change events
   */
  public AvailabilityCheckService(
      @ConfigProperty(name = "startpunkt.availability.ignoreCertificates", defaultValue = "false") boolean ignoreCertificates,
      EventBroadcaster eventBroadcaster) {
    this.eventBroadcaster = eventBroadcaster;
    HttpClient.Builder builder = HttpClient.newBuilder()
        .connectTimeout(Duration.ofSeconds(5))
        .followRedirects(HttpClient.Redirect.NORMAL);

    if (ignoreCertificates) {
      Log.warn(
          "SSL certificate validation and hostname verification are disabled for availability checks. "
              + "This is insecure and should only be used in development environments.");
      try {
        // Create a trust manager that accepts all certificates
        TrustManager[] trustAllCerts = new TrustManager[] {
            new X509TrustManager() {
              public X509Certificate[] getAcceptedIssuers() {
                return new X509Certificate[0];
              }

              public void checkClientTrusted(X509Certificate[] certs, String authType) {
              }

              public void checkServerTrusted(X509Certificate[] certs, String authType) {
              }
            }
        };

        // Install the all-trusting trust manager
        SSLContext sslContext = SSLContext.getInstance("TLS");
        sslContext.init(null, trustAllCerts, new SecureRandom());

        // Create SSL parameters that disable hostname verification
        SSLParameters sslParameters = new SSLParameters();
        sslParameters.setEndpointIdentificationAlgorithm(null);

        builder.sslContext(sslContext).sslParameters(sslParameters);
      } catch (NoSuchAlgorithmException | KeyManagementException e) {
        Log.error("Failed to configure SSL context to ignore certificates", e);
      }
    }

    this.httpClient = builder.build();
  }

  /**
   * Checks if availability checking is enabled.
   *
   * @return true if availability checking is enabled
   */
  public boolean isEnabled() {
    return availabilityCheckEnabled;
  }

  /**
   * Checks the availability of a single application URL.
   *
   * @param url the URL to check
   * @return true if the application is available, false otherwise
   */
  public boolean checkAvailability(String url) {
    if (!availabilityCheckEnabled) {
      return true; // Default to available if checking is disabled
    }

    try {
      HttpRequest request = HttpRequest.newBuilder()
          .uri(URI.create(url))
          .timeout(Duration.ofSeconds(availabilityTimeout))
          .method("HEAD", HttpRequest.BodyPublishers.noBody())
          .build();

      HttpResponse<Void> response = httpClient.send(request, HttpResponse.BodyHandlers.discarding());

      // Consider 2xx and 3xx status codes as available
      // 404 Not Found should count as unavailable (resource doesn't exist)
      // Other 4xx codes (401, 403, etc.) mean the server is responding but rejecting
      // our request
      // 5xx server errors indicate the service is actually unavailable
      int statusCode = response.statusCode();
      if ((statusCode >= 200 && statusCode < 400)
          || (statusCode >= 400 && statusCode < 500 && statusCode != 404)) {
        return true;
      } else {
        Log.warnf("Availability check for %s returned status code %d", url, statusCode);
        return false;
      }
    } catch (Exception e) {
      Log.warnf("Availability check failed for %s: %s", url, e.getMessage());
      return false;
    }
  }

  /**
   * Wraps a list of ApplicationSpec objects with availability status.
   *
   * @param applications list of ApplicationSpec to wrap
   * @return list of ApplicationResponse with availability status set
   */
  public List<ApplicationResponse> wrapWithAvailability(List<ApplicationSpec> applications) {
    List<ApplicationResponse> wrappedApps = new ArrayList<>();

    for (ApplicationSpec app : applications) {
      ApplicationResponse wrapped = new ApplicationResponse(app);

      if (!availabilityCheckEnabled) {
        // Set all applications as available if checking is disabled
        wrapped.setAvailable(true);
      } else {
        String url = app.getUrl();
        if (url != null && !url.isEmpty()) {
          // Check if we have a cached result
          Boolean cached = availabilityCache.get(url);
          if (cached != null) {
            wrapped.setAvailable(cached);
          } else {
            // If not cached, default to true to avoid blocking
            wrapped.setAvailable(true);
          }
        } else {
          wrapped.setAvailable(true); // No URL to check, consider available
        }
      }

      wrappedApps.add(wrapped);
    }

    return wrappedApps;
  }

  /**
   * Enriches a list of ApplicationResponse objects with availability status.
   * Unlike
   * wrapWithAvailability, this method works with already-wrapped objects that may
   * have metadata
   * fields populated.
   *
   * @param applications list of ApplicationResponse to enrich
   * @return the same list with availability status updated
   */
  public List<ApplicationResponse> enrichWithAvailability(List<ApplicationResponse> applications) {
    for (ApplicationResponse app : applications) {
      if (!availabilityCheckEnabled) {
        // Set all applications as available if checking is disabled
        app.setAvailable(true);
      } else {
        String url = app.getUrl();
        if (url != null && !url.isEmpty()) {
          // Check if we have a cached result
          Boolean cached = availabilityCache.get(url);
          if (cached != null) {
            app.setAvailable(cached);
          } else {
            // If not cached, default to true to avoid blocking
            app.setAvailable(true);
          }
        } else {
          app.setAvailable(true); // No URL to check, consider available
        }
      }
    }

    return applications;
  }

  /**
   * Background job that periodically checks application availability. This runs
   * asynchronously to
   * avoid blocking the main request flow.
   */
  @Scheduled(every = "{startpunkt.availability.interval}", delayed = "5s")
  void refreshAvailability() {
    if (!availabilityCheckEnabled) {
      return;
    }

    Log.info("Running background availability checks for " + availabilityCache.size() + " URLs");

    boolean hasChanges = false;

    // Get all unique URLs from the cache keys
    for (String url : availabilityCache.keySet()) {
      try {
        boolean isAvailable = checkAvailability(url);
        Boolean previousValue = previousAvailabilityCache.get(url);

        availabilityCache.put(url, isAvailable);

        // Track if availability changed
        if (previousValue == null || previousValue != isAvailable) {
          Log.infof("Availability changed for %s: %s -> %s", url, previousValue, isAvailable);
          hasChanges = true;
        }

        previousAvailabilityCache.put(url, isAvailable);
        Log.tracef("Availability check for %s: %s", url, isAvailable);
      } catch (Exception e) {
        Log.debugf("Error checking availability for %s: %s", url, e.getMessage());
        Boolean previousValue = previousAvailabilityCache.get(url);

        availabilityCache.put(url, false);

        // Track if availability changed to false due to error
        if (previousValue == null || previousValue) {
          Log.infof("Availability changed for %s to false due to error: %s", url, e.getMessage());
          hasChanges = true;
        }

        previousAvailabilityCache.put(url, false);
      }
    }

    // Broadcast status changed event if any availability changed
    if (hasChanges) {
      Log.info("Broadcasting STATUS_CHANGED event due to availability changes");
      // Invalidate caches BEFORE broadcasting to ensure fresh data
      invalidateApplicationCaches();
      eventBroadcaster.broadcastStatusChanged(
          Map.of("timestamp", System.currentTimeMillis(), "reason", "availability_check"));
    }
  }

  /**
   * Registers a URL for periodic availability checking.
   *
   * @param url the URL to register
   */
  public void registerUrl(String url) {
    if (availabilityCheckEnabled && url != null && !url.isEmpty()) {
      boolean wasNew = availabilityCache.putIfAbsent(url, true) == null; // Default to available until checked
      if (wasNew) {
        Log.infof(
            "Registered URL for availability checking: %s (total: %d)",
            url, availabilityCache.size());
      }
    }
  }

  /**
   * Unregisters a URL from periodic availability checking. This should be called
   * when an
   * application is deleted to clean up resources.
   *
   * @param url the URL to unregister
   */
  public void unregisterUrl(String url) {
    if (url != null && !url.isEmpty()) {
      boolean wasPresent = availabilityCache.remove(url) != null;
      previousAvailabilityCache.remove(url);
      if (wasPresent) {
        Log.infof(
            "Unregistered URL from availability checking: %s (remaining: %d)",
            url, availabilityCache.size());
      }
    }
  }

  /**
   * Gets the set of URLs currently being tracked for availability checking.
   *
   * @return a set of all URLs currently registered
   */
  public Set<String> getTrackedUrls() {
    return new HashSet<>(availabilityCache.keySet());
  }

  /**
   * Gets the cached availability status for a URL.
   *
   * @param url the URL to check
   * @return true if available, false if not, null if not cached
   */
  public Boolean getCachedAvailability(String url) {
    return availabilityCache.get(url);
  }

  /**
   * Invalidates the application caches to force fresh data on next request.
   * Called when
   * availability status changes to ensure clients get updated data.
   */
  public void invalidateApplicationCaches() {
    invalidateGetAppCache();
    invalidateGetAppsCache();
    invalidateGetAppsFilteredCache();
    Log.debug("Invalidated application caches due to availability changes");
  }

  /** Invalidates the getApp cache. */
  @CacheInvalidate(cacheName = "getApp")
  protected void invalidateGetAppCache() {
    // No-op: annotation triggers cache invalidation
  }

  /** Invalidates the getApps cache. */
  @CacheInvalidate(cacheName = "getApps")
  protected void invalidateGetAppsCache() {
    // No-op: annotation triggers cache invalidation
  }

  /** Invalidates the getAppsFiltered cache. */
  @CacheInvalidate(cacheName = "getAppsFiltered")
  protected void invalidateGetAppsFilteredCache() {
    // No-op: annotation triggers cache invalidation
  }
}
