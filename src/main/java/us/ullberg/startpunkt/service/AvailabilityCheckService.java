package us.ullberg.startpunkt.service;

import io.quarkus.logging.Log;
import io.quarkus.scheduler.Scheduled;
import jakarta.enterprise.context.ApplicationScoped;
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
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLParameters;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import us.ullberg.startpunkt.crd.v1alpha3.ApplicationSpec;
import us.ullberg.startpunkt.objects.ApplicationSpecWithAvailability;

/**
 * Service for checking the availability of applications by probing their URLs. Runs periodic checks
 * in the background to maintain up-to-date availability status.
 */
@ApplicationScoped
public class AvailabilityCheckService {

  @ConfigProperty(name = "startpunkt.availability.enabled", defaultValue = "true")
  private boolean availabilityCheckEnabled;

  @ConfigProperty(name = "startpunkt.availability.timeout", defaultValue = "5")
  private int availabilityTimeout;

  @ConfigProperty(name = "startpunkt.availability.interval", defaultValue = "60")
  private int availabilityCheckInterval;

  @ConfigProperty(name = "startpunkt.availability.ignoreCertificates", defaultValue = "false")
  private boolean ignoreCertificates;

  private final Map<String, Boolean> availabilityCache = new ConcurrentHashMap<>();
  private final HttpClient httpClient;

  /** Constructor that initializes the HTTP client with appropriate timeouts. */
  public AvailabilityCheckService(
      @ConfigProperty(name = "startpunkt.availability.ignoreCertificates", defaultValue = "false")
          boolean ignoreCertificates) {
    HttpClient.Builder builder =
        HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .followRedirects(HttpClient.Redirect.NORMAL);

    if (ignoreCertificates) {
      Log.warn(
          "SSL certificate validation and hostname verification are disabled for availability checks. "
              + "This is insecure and should only be used in development environments.");
      try {
        // Create a trust manager that accepts all certificates
        TrustManager[] trustAllCerts =
            new TrustManager[] {
              new X509TrustManager() {
                public X509Certificate[] getAcceptedIssuers() {
                  return new X509Certificate[0];
                }

                public void checkClientTrusted(X509Certificate[] certs, String authType) {}

                public void checkServerTrusted(X509Certificate[] certs, String authType) {}
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
      HttpRequest request =
          HttpRequest.newBuilder()
              .uri(URI.create(url))
              .timeout(Duration.ofSeconds(availabilityTimeout))
              .method("HEAD", HttpRequest.BodyPublishers.noBody())
              .build();

      HttpResponse<Void> response =
          httpClient.send(request, HttpResponse.BodyHandlers.discarding());

      // Consider 2xx, 3xx, and 4xx status codes as available
      // 4xx means the server is responding but rejecting our specific request
      // Only 5xx server errors indicate the service is actually unavailable
      if (response.statusCode() >= 200 && response.statusCode() < 500) {
        return true;
      } else {
        Log.warnf("Availability check for %s returned status code %d", url, response.statusCode());
        return false;
      }
    } catch (Exception e) {
      Log.warnf("Availability check failed for %s: %s", url, e.getMessage());
      return false;
    }
  }

  /**
   * Wraps ApplicationSpec objects with availability information. This method checks all URLs and
   * caches the results.
   *
   * @param applications list of applications to wrap
   * @return list of wrapped applications with availability status
   */
  public List<ApplicationSpecWithAvailability> wrapWithAvailability(
      List<ApplicationSpec> applications) {
    List<ApplicationSpecWithAvailability> wrappedApps = new ArrayList<>();

    for (ApplicationSpec app : applications) {
      ApplicationSpecWithAvailability wrapped = new ApplicationSpecWithAvailability(app);

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
   * Background job that periodically checks application availability. This runs asynchronously to
   * avoid blocking the main request flow.
   */
  @Scheduled(every = "60s", delayed = "10s")
  void refreshAvailability() {
    if (!availabilityCheckEnabled) {
      return;
    }

    Log.debug("Running background availability checks");

    // Get all unique URLs from the cache keys
    availabilityCache
        .keySet()
        .forEach(
            url -> {
              try {
                boolean isAvailable = checkAvailability(url);
                availabilityCache.put(url, isAvailable);
                Log.tracef("Availability check for %s: %s", url, isAvailable);
              } catch (Exception e) {
                Log.debugf("Error checking availability for %s: %s", url, e.getMessage());
                availabilityCache.put(url, false);
              }
            });
  }

  /**
   * Registers a URL for periodic availability checking.
   *
   * @param url the URL to register
   */
  public void registerUrl(String url) {
    if (availabilityCheckEnabled && url != null && !url.isEmpty()) {
      availabilityCache.putIfAbsent(url, true); // Default to available until checked
    }
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
}
