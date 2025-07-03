package us.ullberg.startpunkt.health;

import java.util.logging.Logger;
import org.eclipse.microprofile.health.HealthCheck;
import org.eclipse.microprofile.health.HealthCheckResponse;
import org.eclipse.microprofile.health.Liveness;
import us.ullberg.startpunkt.rest.ThemeResource;

/**
 * {@link HealthCheck} implementation that performs a liveness check by pinging the Theme REST
 * resource.
 */
@Liveness
public class PingThemeResourceHealthCheck implements HealthCheck {
  private static final Logger LOGGER =
      Logger.getLogger(PingThemeResourceHealthCheck.class.getName());

  private final ThemeResource themeResource;

  /**
   * Constructor injecting the ThemeResource to be pinged.
   *
   * @param themeResource the ThemeResource REST endpoint
   */
  public PingThemeResourceHealthCheck(ThemeResource themeResource) {
    this.themeResource = themeResource;
  }

  /**
   * Executes the health check by invoking the ping method on ThemeResource.
   *
   * @return a HealthCheckResponse indicating up or down status with response data or error message
   */
  @Override
  public HealthCheckResponse call() {
    try {
      var response = this.themeResource.ping();
      return HealthCheckResponse.named("Ping Theme REST Endpoint")
          .withData("Response", response)
          .up()
          .build();
    } catch (Exception e) {
      LOGGER.severe("Ping to ThemeResource failed: " + e.getMessage());
      return HealthCheckResponse.named("Ping Theme REST Endpoint")
          .withData("error", e.getMessage())
          .down()
          .build();
    }
  }
}
