package us.ullberg.startpunkt.health;

import java.util.logging.Logger;
import org.eclipse.microprofile.health.HealthCheck;
import org.eclipse.microprofile.health.HealthCheckResponse;
import org.eclipse.microprofile.health.Liveness;
import us.ullberg.startpunkt.rest.BookmarkResource;

/**
 * {@link HealthCheck} implementation that performs a liveness check by pinging the Bookmark REST
 * resource.
 */
@Liveness
public class PingBookmarkResourceHealthCheck implements HealthCheck {
  private static final Logger LOGGER =
      Logger.getLogger(PingBookmarkResourceHealthCheck.class.getName());

  private final BookmarkResource bookmarkResource;

  /**
   * Constructor injecting the BookmarkResource to be pinged.
   *
   * @param bookmarkResource the Bookmark REST endpoint
   */
  public PingBookmarkResourceHealthCheck(BookmarkResource bookmarkResource) {
    this.bookmarkResource = bookmarkResource;
  }

  /**
   * Executes the health check by invoking the ping method on BookmarkResource.
   *
   * @return a HealthCheckResponse indicating up or down status with response data or error message
   */
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
