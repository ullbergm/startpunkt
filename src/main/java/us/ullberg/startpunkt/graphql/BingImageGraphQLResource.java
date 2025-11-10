package us.ullberg.startpunkt.graphql;

import io.micrometer.core.annotation.Timed;
import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;
import org.eclipse.microprofile.graphql.Description;
import org.eclipse.microprofile.graphql.GraphQLApi;
import org.eclipse.microprofile.graphql.Query;
import us.ullberg.startpunkt.objects.bingimage.BingImage;
import us.ullberg.startpunkt.service.BingImageService;

/**
 * GraphQL API resource for Bing Image of the Day. Provides queries for retrieving optimized Bing
 * images based on client screen resolution.
 */
@GraphQLApi
@ApplicationScoped
public class BingImageGraphQLResource {

  private final BingImageService bingImageService;

  /**
   * Constructor for dependency injection.
   *
   * @param bingImageService the Bing image service
   */
  public BingImageGraphQLResource(BingImageService bingImageService) {
    this.bingImageService = bingImageService;
  }

  /**
   * Retrieve Bing Image of the Day optimized for the given screen resolution.
   *
   * @param width client screen width in pixels
   * @param height client screen height in pixels
   * @return BingImage with optimized URL and metadata
   */
  @Query("bingImageOfDay")
  @Description("Retrieve Bing Image of the Day optimized for client screen resolution")
  @Timed(value = "graphql.query.bingImageOfDay")
  public BingImage getBingImageOfDay(int width, int height) {
    Log.debugf("GraphQL query: bingImageOfDay with resolution %dx%d", width, height);

    if (width <= 0 || height <= 0) {
      throw new IllegalArgumentException(
          "Width and height must be positive integers, got: " + width + "x" + height);
    }

    return bingImageService.getBingImageOfDay(width, height);
  }
}
