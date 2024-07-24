package us.ullberg.startpunkt.rest;

import java.io.IOException;

import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;

import io.micrometer.core.annotation.Timed;
import io.quarkus.cache.CacheResult;
import io.quarkus.logging.Log;
import io.smallrye.common.annotation.NonBlocking;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import us.ullberg.startpunkt.service.I8nService;

// REST API resource class for managing language translations
@Path("/api/i8n")
@Tag(name = "i8n")
@Produces(MediaType.APPLICATION_JSON)
public class I8nResource {

  I8nService i8nService;

  // Constructor
  public I8nResource(I8nService i8nService) {
    this.i8nService = i8nService;
  }

  @GET
  @Path("{language}")
  @Operation(summary = "Returns a translation")
  @APIResponse(responseCode = "200", description = "Gets an translation",
      content = @Content(mediaType = MediaType.APPLICATION_JSON,
          schema = @Schema(implementation = String.class, required = true)))
  @APIResponse(responseCode = "404", description = "No translation found")
  @Timed(value = "startpunkt.api.gettranslation",
      description = "Get the translation for a given language")
  @CacheResult(cacheName = "getTranslation")
  public Response getTranslation(@PathParam("language") String language) {
    try {
      String translation = i8nService.getTranslation(language);

      // Log the translation
      Log.debug("Translation for language " + language + ":" + translation);

      // Return the translation as a string
      return Response.ok(translation).build();
    } catch (IOException e) {
      return Response.status(404, "No translation found").build();
    }
  }

  // Default endpoint to get the translation for the default language
  @GET
  @Operation(summary = "Returns default translation")
  @APIResponse(responseCode = "200", description = "Gets default translation",
      content = @Content(mediaType = MediaType.APPLICATION_JSON,
          schema = @Schema(implementation = String.class, required = true)))
  @APIResponse(responseCode = "404", description = "No translation found")
  @Timed(value = "startpunkt.api.getdefaulttranslation",
      description = "Get the translation for the default language")
  @CacheResult(cacheName = "getDefaultTranslation")
  public Response getDefaultTranslation() {
    String translation;
    try {
      translation = i8nService.getTranslation("en-US");

      // Log the translation
      Log.debug("Default translation:" + translation);

      // Return the translation as a string
      return Response.ok(translation).build();
    } catch (IOException e) {
      return Response.status(404, "No translation found").build();
    }
  }

  @GET
  @Path("/ping")
  @Produces(MediaType.TEXT_PLAIN)
  @Tag(name = "ping")
  @Operation(summary = "Ping")
  @APIResponse(responseCode = "200", description = "Ping")
  @NonBlocking
  public String ping() {
    Log.debug("Ping I8n Resource");
    return "Pong from I8n Resource";
  }
}
