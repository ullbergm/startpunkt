package us.ullberg.startpunkt.rest;

import io.fabric8.kubernetes.client.KubernetesClient;
import io.fabric8.kubernetes.client.KubernetesClientBuilder;
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
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.enums.SchemaType;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import us.ullberg.startpunkt.crd.ApplicationSpec;
import us.ullberg.startpunkt.objects.ApplicationGroup;
import us.ullberg.startpunkt.objects.ApplicationGroupList;
import us.ullberg.startpunkt.objects.kubernetes.BaseKubernetesObject;
import us.ullberg.startpunkt.objects.kubernetes.HajimariApplicationWrapper;
import us.ullberg.startpunkt.objects.kubernetes.IngressApplicationWrapper;
import us.ullberg.startpunkt.objects.kubernetes.IstioVirtualServiceApplicationWrapper;
import us.ullberg.startpunkt.objects.kubernetes.GatewayAPIHTTPRouteApplicationWrapper;
import us.ullberg.startpunkt.objects.kubernetes.RouteApplicationWrapper;
import us.ullberg.startpunkt.objects.kubernetes.StartpunktApplicationWrapper;

/**
 * REST API resource class for managing applications. Supports retrieval from multiple Kubernetes
 * resource types, grouping applications by their group property.
 */
@Path("/api/apps")
@Tag(name = "apps")
@Produces(MediaType.APPLICATION_JSON)
public class ApplicationResource {
  // Configuration properties for enabling different types of application wrappers
  @ConfigProperty(name = "startpunkt.hajimari.enabled", defaultValue = "false")
  private boolean hajimariEnabled = false;

  @ConfigProperty(name = "startpunkt.ingress.enabled", defaultValue = "false")
  private boolean ingressEnabled = false;

  @ConfigProperty(name = "startpunkt.ingress.onlyAnnotated", defaultValue = "true")
  private boolean ingressOnlyAnnotated = true;

  @ConfigProperty(name = "startpunkt.openshift.enabled", defaultValue = "false")
  private boolean openshiftEnabled = false;

  @ConfigProperty(name = "startpunkt.openshift.onlyAnnotated", defaultValue = "true")
  private boolean openshiftOnlyAnnotated = true;

  @ConfigProperty(name = "startpunkt.istio.virtualservice.enabled", defaultValue = "false")
  private boolean istioVirtualServiceEnabled = false;

  @ConfigProperty(name = "startpunkt.istio.virtualservice.onlyAnnotated", defaultValue = "true")
  private boolean istioVirtualServiceOnlyAnnotated = true;

  @ConfigProperty(name = "startpunkt.gatewayapi.enabled", defaultValue = "false")
  private boolean gatewayAPIEnabled = false;

  @ConfigProperty(name = "startpunkt.gatewayapi.httproute.onlyAnnotated", defaultValue = "true")
  private boolean gatewayAPIHTTPRouteAnnotated = true;

  @ConfigProperty(name = "startpunkt.namespaceSelector.any", defaultValue = "true")
  private boolean anyNamespace;

  @ConfigProperty(name = "startpunkt.namespaceSelector.matchNames", defaultValue = "[]")
  private List<String> matchNames;

  @ConfigProperty(name = "startpunkt.defaultProtocol", defaultValue = "http")
  private String defaultProtocol = "http";

  /**
   * Creates an empty ApplicationResource. Required to explicitly document the default constructor.
   */
  public ApplicationResource() {
    super();
  }

  // Method to retrieve the list of applications
  private ArrayList<ApplicationSpec> retrieveApps() {
    // Create a list of application wrappers to retrieve applications from
    var applicationWrappers = new ArrayList<BaseKubernetesObject>();
    applicationWrappers.add(new StartpunktApplicationWrapper());

    if (hajimariEnabled) {
      applicationWrappers.add(new HajimariApplicationWrapper());
    }

    if (openshiftEnabled) {
      applicationWrappers.add(new RouteApplicationWrapper(openshiftOnlyAnnotated));
    }

    if (ingressEnabled) {
      applicationWrappers.add(new IngressApplicationWrapper(ingressOnlyAnnotated));
    }

    if (istioVirtualServiceEnabled) {
      applicationWrappers.add(
          new IstioVirtualServiceApplicationWrapper(
              istioVirtualServiceOnlyAnnotated, defaultProtocol));
    }

    if (gatewayAPIEnabled)
      applicationWrappers.add(
          new GatewayAPIHTTPRouteApplicationWrapper(gatewayAPIHTTPRouteAnnotated, defaultProtocol));

    // Create a list of applications
    var apps = new ArrayList<ApplicationSpec>();

    // Retrieve the applications from the application wrappers
    final KubernetesClient client = new KubernetesClientBuilder().build();
    for (BaseKubernetesObject applicationWrapper : applicationWrappers) {
      apps.addAll(applicationWrapper.getApplicationSpecs(client, anyNamespace, matchNames));
    }

    // Sort the list of applications
    Collections.sort(apps);

    // Return the list of applications
    return apps;
  }

  /**
   * GET endpoint to retrieve an application by its group and name.
   *
   * @param groupName the group name of the application
   * @param appName the name of the application
   * @return HTTP 200 with application or 404 if not found
   */
  @GET
  @Path("{groupName}/{appName}")
  @Operation(summary = "Returns an application")
  @APIResponse(
      responseCode = "200",
      description = "Gets an application",
      content =
          @Content(
              mediaType = MediaType.APPLICATION_JSON,
              schema = @Schema(implementation = ApplicationSpec.class, required = true)))
  @APIResponse(responseCode = "404", description = "No application found")
  @Timed(value = "startpunkt.api.getapp", description = "Get a application")
  @CacheResult(cacheName = "getApp")
  public Response getApp(
      @PathParam("groupName") String groupName, @PathParam("appName") String appName) {
    // Find the application with the specified name
    for (ApplicationSpec a : retrieveApps()) {
      if (a.getGroup().equals(groupName) && a.getName().equals(appName)) {
        return Response.ok(a).build();
      }
    }

    return Response.status(404, "No application found").build();
  }

  /**
   * GET endpoint to retrieve all applications grouped by their group property.
   *
   * @return HTTP 200 with grouped applications or 404 if none found
   */
  @GET
  @Operation(summary = "Returns all applications")
  @APIResponse(
      responseCode = "200",
      description = "Gets all applications",
      content =
          @Content(
              mediaType = MediaType.APPLICATION_JSON,
              schema = @Schema(implementation = ApplicationGroup.class, type = SchemaType.ARRAY)))
  @APIResponse(responseCode = "404", description = "No applications found")
  @Timed(value = "startpunkt.api.getapps", description = "Get the list of applications")
  @CacheResult(cacheName = "getApps")
  public Response getApps() {
    // Retrieve the list of applications
    ArrayList<ApplicationSpec> applist = retrieveApps();

    // Create a list to store application groups
    ArrayList<ApplicationGroup> groups = new ArrayList<>();

    // Group the applications by their group property
    for (ApplicationSpec a : applist) {
      // Find the group
      ApplicationGroup group = null;
      for (ApplicationGroup g : groups) {
        if (g.getName().equals(a.getGroup())) {
          group = g;
          break;
        }
      }

      // If the group doesn't exist, create it
      if (group == null) {
        group = new ApplicationGroup(a.getGroup());
        groups.add(group);
      }

      // Add the application to the group
      group.addApplication(a);
    }

    if (groups.isEmpty()) {
      return Response.status(404, "No applications found").build();
    }

    // Return the list of application groups
    return Response.ok(new ApplicationGroupList(groups)).build();
  }

  /**
   * Ping endpoint for health checking this resource.
   *
   * @return a simple string confirming the resource is alive
   */
  @GET
  @Path("/ping")
  @Produces(MediaType.TEXT_PLAIN)
  @Tag(name = "ping")
  @Operation(summary = "Ping")
  @APIResponse(responseCode = "200", description = "Ping")
  @NonBlocking
  public String ping() {
    Log.debug("Ping Application Resource");
    return "Pong from Application Resource";
  }
}
