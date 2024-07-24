package us.ullberg.startpunkt.health;

import org.eclipse.microprofile.health.HealthCheck;
import org.eclipse.microprofile.health.HealthCheckResponse;
import org.eclipse.microprofile.health.Liveness;

import us.ullberg.startpunkt.ThemeResource;

/**
 * {@link HealthCheck} to ping the Theme service
 */
@Liveness
public class PingThemeResourceHealthCheck implements HealthCheck {
  private final ThemeResource themeResource;

  public PingThemeResourceHealthCheck(ThemeResource themeResource) {
    this.themeResource = themeResource;
  }

  @Override
  public HealthCheckResponse call() {
    var response = this.themeResource.ping();

    return HealthCheckResponse.named("Ping Theme REST Endpoint").withData("Response", response).up()
        .build();
  }
}
