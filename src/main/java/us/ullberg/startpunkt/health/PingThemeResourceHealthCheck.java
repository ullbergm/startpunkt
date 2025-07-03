package us.ullberg.startpunkt.health;

import java.util.logging.Logger;
import org.eclipse.microprofile.health.HealthCheck;
import org.eclipse.microprofile.health.HealthCheckResponse;
import org.eclipse.microprofile.health.Liveness;
import us.ullberg.startpunkt.rest.ThemeResource;

/** {@link HealthCheck} to ping the Theme service */
@Liveness
public class PingThemeResourceHealthCheck implements HealthCheck {
  private static final Logger LOGGER =
      Logger.getLogger(PingThemeResourceHealthCheck.class.getName());
  private final ThemeResource themeResource;

  public PingThemeResourceHealthCheck(ThemeResource themeResource) {
    this.themeResource = themeResource;
  }

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
