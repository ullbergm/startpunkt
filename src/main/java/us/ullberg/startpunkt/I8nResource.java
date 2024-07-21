package us.ullberg.startpunkt;

import java.io.IOException;

import io.micrometer.core.annotation.Timed;
import io.micrometer.core.instrument.MeterRegistry;
import io.quarkus.cache.CacheResult;
import io.quarkus.logging.Log;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;

// REST API resource class for managing language translations
@Path("/api/i8n")
@Produces(MediaType.APPLICATION_JSON)
public class I8nResource {

  @Inject
  I8nService i8nService;

  // Inject the MeterRegistry for metrics
  @Inject
  MeterRegistry registry;

  @GET
  @Path("{language}")
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
      return Response.serverError().entity("Error getting translation").build();
    }
  }

  // Default endpoint to get the translation for the default language
  @GET
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
      return Response.serverError().entity("Error getting translation").build();
    }
  }
}
