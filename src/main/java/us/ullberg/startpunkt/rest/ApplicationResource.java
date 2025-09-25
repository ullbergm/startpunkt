package us.ullberg.startpunkt.rest;

import io.fabric8.kubernetes.client.KubernetesClient;
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
import us.ullberg.startpunkt.crd.v1alpha3.ApplicationSpec;
import us.ullberg.startpunkt.objects.ApplicationGroup;
import us.ullberg.startpunkt.objects.ApplicationGroupList;
import us.ullberg.startpunkt.objects.kubernetes.BaseKubernetesObject;
import us.ullberg.startpunkt.objects.kubernetes.GatewayApiHttpRouteWrapper;
import us.ullberg.startpunkt.objects.kubernetes.HajimariApplicationWrapper;
import us.ullberg.startpunkt.objects.kubernetes.IngressApplicationWrapper;
import us.ullberg.startpunkt.objects.kubernetes.IstioVirtualServiceApplicationWrapper;
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

  @ConfigProperty(name = "startpunkt.gatewayapi.httproute.enabled", defaultValue = "false")
  private boolean gatewayApiEnabled = false;

  @ConfigProperty(name = "startpunkt.gatewayapi.httproute.onlyAnnotated", defaultValue = "true")
  private boolean gatewayApiHttpRouteOnlyAnnotated = true;

  @ConfigProperty(name = "startpunkt.namespaceSelector.any", defaultValue = "true")
  private boolean anyNamespace;

  @ConfigProperty(name = "startpunkt.namespaceSelector.matchNames", defaultValue = "[]")
  private List<String> matchNames;

  @ConfigProperty(name = "startpunkt.defaultProtocol", defaultValue = "http")
  private String defaultProtocol = "http";

  // Inject the managed Kubernetes client
  private final KubernetesClient kubernetesClient;

  /**
   * Creates an ApplicationResource with the injected Kubernetes client.
   *
   * @param kubernetesClient the managed Kubernetes client
   */
  public ApplicationResource(KubernetesClient kubernetesClient) {
    this.kubernetesClient = kubernetesClient;
  }

  // Method to retrieve the list of applications
  private ArrayList<ApplicationSpec> retrieveApps() {
    // Check if the client is available
    if (kubernetesClient == null) {
      Log.warn("KubernetesClient is null, returning empty application list");
      return new ArrayList<>();
    }

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

    if (gatewayApiEnabled) {
      applicationWrappers.add(
          new GatewayApiHttpRouteWrapper(gatewayApiHttpRouteOnlyAnnotated, defaultProtocol));
    }

    // Create a list of applications
    var apps = new ArrayList<ApplicationSpec>();

    try {
      // Retrieve the applications from the application wrappers using the injected client
      for (BaseKubernetesObject applicationWrapper : applicationWrappers) {
        apps.addAll(
            applicationWrapper.getApplicationSpecs(kubernetesClient, anyNamespace, matchNames));
      }
    } catch (Exception e) {
      Log.error("Error retrieving applications from Kubernetes", e);
      // Return empty list on error to avoid 500s
      return new ArrayList<>();
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
   * GET endpoint to retrieve applications filtered by tags grouped by their group property.
   *
   * @param tags comma-separated list of tags to filter by
   * @return HTTP 200 with grouped applications or 404 if none found
   */
  @GET
  @Path("{tags}")
  @Operation(summary = "Returns applications filtered by tags")
  @APIResponse(
      responseCode = "200",
      description = "Gets applications filtered by tags",
      content =
          @Content(
              mediaType = MediaType.APPLICATION_JSON,
              schema = @Schema(implementation = ApplicationGroup.class, type = SchemaType.ARRAY)))
  @APIResponse(responseCode = "404", description = "No applications found")
  @Timed(
      value = "startpunkt.api.getapps.filtered",
      description = "Get the list of applications filtered by tags")
  @CacheResult(cacheName = "getAppsFiltered")
  public Response getAppsFiltered(@PathParam("tags") String tags) {
    return getAppsWithTags(tags);
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
    return getAppsWithTags(null);
  }

  /**
   * Retrieves applications with optional tag filtering.
   *
   * @param tags comma-separated list of tags to filter by, or null for no filtering
   * @return HTTP 200 with grouped applications or 404 if none found
   */
  private Response getAppsWithTags(String tags) {
    // Retrieve the list of applications
    ArrayList<ApplicationSpec> applist = retrieveApps();

    // Apply tag filtering
    if (tags != null && !tags.trim().isEmpty()) {
      // If tags are specified, show applications with matching tags AND untagged applications
      applist = filterApplicationsByTags(applist, tags);
    } else {
      // If no tags are specified, show only untagged applications
      applist = filterApplicationsWithoutTags(applist);
    }

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
   * Filters applications based on matching tags. Applications with no tags are always included.
   * Applications with matching tags are included.
   *
   * @param applications list of applications to filter
   * @param filterTags comma-separated list of tags to filter by
   * @return filtered list of applications
   */
  ArrayList<ApplicationSpec> filterApplicationsByTags(
      ArrayList<ApplicationSpec> applications, String filterTags) {
    if (filterTags == null || filterTags.trim().isEmpty()) {
      return applications;
    }

    // Parse filter tags
    var filterTagSet = java.util.Arrays.stream(filterTags.split(","))
        .map(String::trim)
        .map(String::toLowerCase)
        .filter(tag -> !tag.isEmpty())
        .collect(java.util.stream.Collectors.toSet());

    if (filterTagSet.isEmpty()) {
      return applications;
    }

    ArrayList<ApplicationSpec> filteredApps = new ArrayList<>();

    for (ApplicationSpec app : applications) {
      // Always include applications with no tags
      if (app.getTags() == null || app.getTags().trim().isEmpty()) {
        filteredApps.add(app);
        continue;
      }

      // Parse application tags
      var appTagSet = java.util.Arrays.stream(app.getTags().split(","))
          .map(String::trim)
          .map(String::toLowerCase)
          .filter(tag -> !tag.isEmpty())
          .collect(java.util.stream.Collectors.toSet());

      // Include if any tag matches
      boolean hasMatchingTag = appTagSet.stream().anyMatch(filterTagSet::contains);
      if (hasMatchingTag) {
        filteredApps.add(app);
      }
    }

    return filteredApps;
  }

  /**
   * Filters applications to include only those without tags.
   *
   * @param applications list of applications to filter
   * @return filtered list containing only applications without tags
   */
  ArrayList<ApplicationSpec> filterApplicationsWithoutTags(
      ArrayList<ApplicationSpec> applications) {
    ArrayList<ApplicationSpec> filteredApps = new ArrayList<>();

    for (ApplicationSpec app : applications) {
      // Include only applications with no tags
      if (app.getTags() == null || app.getTags().trim().isEmpty()) {
        filteredApps.add(app);
      }
    }

    return filteredApps;
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
