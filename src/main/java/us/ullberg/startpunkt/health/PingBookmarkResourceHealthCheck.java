package us.ullberg.startpunkt.health;

import org.eclipse.microprofile.health.HealthCheck;
import org.eclipse.microprofile.health.HealthCheckResponse;
import org.eclipse.microprofile.health.Liveness;

import us.ullberg.startpunkt.rest.BookmarkResource;

import java.util.logging.Logger;

/**
 * {@link HealthCheck} to ping the Bookmark service
 */
@Liveness
public class PingBookmarkResourceHealthCheck implements HealthCheck {
  private static final Logger LOGGER = Logger.getLogger(PingBookmarkResourceHealthCheck.class.getName());
  private final BookmarkResource bookmarkResource;

  public PingBookmarkResourceHealthCheck(BookmarkResource bookmarkResource) {
    this.bookmarkResource = bookmarkResource;
  }

  @Override
  public HealthCheckResponse call() {
    try {
      var response = this.bookmarkResource.ping();
      return HealthCheckResponse.named("Ping Bookmark REST Endpoint")
          .withData("Response", response)
          .up()
          .build();
    } catch (Exception e) {
      LOGGER.severe("Ping to BookmarkResource failed: " + e.getMessage());
      return HealthCheckResponse.named("Ping Bookmark REST Endpoint")
          .withData("error", e.getMessage())
          .down()
          .build();
    }
  }
}
