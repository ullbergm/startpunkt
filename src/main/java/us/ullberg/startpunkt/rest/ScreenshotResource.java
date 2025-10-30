package us.ullberg.startpunkt.rest;

import io.quarkus.logging.Log;
import io.smallrye.common.annotation.Blocking;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.io.IOException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.parameters.Parameter;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import us.ullberg.startpunkt.service.ScreenshotService;

/** REST API resource for capturing and serving application screenshots. */
@Path("/api/screenshots")
@Tag(name = "screenshots")
@ApplicationScoped
public class ScreenshotResource {

  private final ScreenshotService screenshotService;

  /**
   * Constructor for dependency injection.
   *
   * @param screenshotService the screenshot service
   */
  public ScreenshotResource(ScreenshotService screenshotService) {
    this.screenshotService = screenshotService;
  }

  /**
   * Captures a screenshot of the specified URL and returns it as a PNG image.
   *
   * @param url the URL to capture (URL-encoded)
   * @return HTTP 200 with PNG image or error response
   */
  @GET
  @Produces("image/png")
  @Blocking
  @Operation(summary = "Capture screenshot of URL")
  @APIResponse(
      responseCode = "200",
      description = "Screenshot captured successfully",
      content = @Content(mediaType = "image/png"))
  @APIResponse(responseCode = "400", description = "Invalid URL parameter")
  @APIResponse(responseCode = "500", description = "Screenshot capture failed")
  public Response getScreenshot(
      @Parameter(description = "URL to capture", required = true) @QueryParam("url") String url) {

    if (url == null || url.trim().isEmpty()) {
      Log.warn("Screenshot requested without URL parameter");
      return Response.status(Response.Status.BAD_REQUEST)
          .entity("URL parameter is required")
          .type(MediaType.TEXT_PLAIN)
          .build();
    }

    try {
      // Decode URL if it's encoded
      String decodedUrl = URLDecoder.decode(url, StandardCharsets.UTF_8);

      Log.debugf("Screenshot requested for URL: %s", decodedUrl);

      // Capture screenshot
      byte[] screenshotBytes = screenshotService.captureScreenshotBytes(decodedUrl);

      // Return as PNG image
      return Response.ok(screenshotBytes)
          .type("image/png")
          .header("Cache-Control", "public, max-age=3600")
          .build();

    } catch (IllegalStateException e) {
      Log.warn("Screenshot service not available", e);
      return Response.status(Response.Status.SERVICE_UNAVAILABLE)
          .entity("Screenshot service is disabled")
          .type(MediaType.TEXT_PLAIN)
          .build();

    } catch (IOException e) {
      // Check if this is an expected authentication/access error (not a real error)
      String message = e.getMessage();
    if (message != null
      && (message.contains("requires authentication")
        || message.contains("blank page detected")
        || message.contains("unreachable")
        || message.contains("Preview unavailable")
        || message.contains("Site returned error")
        || message.contains("preview not available"))) {
    // Log at WARN level without stack trace for expected conditions
    Log.warnf("Screenshot unavailable for %s: %s", url, message);
      } else {
        // Log unexpected IOExceptions at ERROR level with stack trace
        Log.errorf(e, "Failed to capture screenshot for %s", url);
      }
      return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
          .entity("Failed to capture screenshot: " + message)
          .type(MediaType.TEXT_PLAIN)
          .build();

    } catch (Exception e) {
      Log.error("Unexpected error capturing screenshot", e);
      return Response.status(Response.Status.INTERNAL_SERVER_ERROR)
          .entity("Unexpected error: " + e.getMessage())
          .type(MediaType.TEXT_PLAIN)
          .build();
    }
  }

  /**
   * Health check endpoint for the screenshot service.
   *
   * @return HTTP 200 if service is available
   */
  @GET
  @Path("/ping")
  @Produces(MediaType.TEXT_PLAIN)
  @Tag(name = "ping")
  @Operation(summary = "Ping screenshot service")
  @APIResponse(responseCode = "200", description = "Service available")
  public Response ping() {
    return Response.ok("Screenshot service is available").build();
  }
}
