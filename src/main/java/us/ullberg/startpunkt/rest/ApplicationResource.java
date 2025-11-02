package us.ullberg.startpunkt.rest;

import io.fabric8.kubernetes.client.KubernetesClient;
import io.micrometer.core.annotation.Timed;
import io.quarkus.cache.Cache;
import io.quarkus.cache.CacheInvalidate;
import io.quarkus.cache.CacheManager;
import io.quarkus.cache.CacheResult;
import io.quarkus.logging.Log;
import io.smallrye.common.annotation.NonBlocking;
import jakarta.ws.rs.Consumes;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.QueryParam;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.openapi.annotations.Operation;
import org.eclipse.microprofile.openapi.annotations.enums.SchemaType;
import org.eclipse.microprofile.openapi.annotations.media.Content;
import org.eclipse.microprofile.openapi.annotations.media.Schema;
import org.eclipse.microprofile.openapi.annotations.responses.APIResponse;
import org.eclipse.microprofile.openapi.annotations.tags.Tag;
import us.ullberg.startpunkt.crd.v1alpha4.Application;
import us.ullberg.startpunkt.crd.v1alpha4.ApplicationSpec;
import us.ullberg.startpunkt.messaging.EventBroadcaster;
import us.ullberg.startpunkt.objects.ApplicationGroup;
import us.ullberg.startpunkt.objects.ApplicationGroupList;
import us.ullberg.startpunkt.objects.ApplicationSpecWithAvailability;
import us.ullberg.startpunkt.objects.kubernetes.BaseKubernetesObject;
import us.ullberg.startpunkt.objects.kubernetes.GatewayApiHttpRouteWrapper;
import us.ullberg.startpunkt.objects.kubernetes.HajimariApplicationWrapper;
import us.ullberg.startpunkt.objects.kubernetes.IngressApplicationWrapper;
import us.ullberg.startpunkt.objects.kubernetes.IstioVirtualServiceApplicationWrapper;
import us.ullberg.startpunkt.objects.kubernetes.RouteApplicationWrapper;
import us.ullberg.startpunkt.objects.kubernetes.StartpunktApplicationWrapper;
import us.ullberg.startpunkt.service.ApplicationService;
import us.ullberg.startpunkt.service.AvailabilityCheckService;

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

  @ConfigProperty(name = "startpunkt.namespaceSelector.matchNames")
  private Optional<List<String>> matchNames;

  @ConfigProperty(name = "startpunkt.defaultProtocol", defaultValue = "http")
  private String defaultProtocol = "http";

  // Inject the managed Kubernetes client
  private final KubernetesClient kubernetesClient;

  // Inject the availability check service
  private final AvailabilityCheckService availabilityCheckService;

  // Inject the application service for CRUD operations
  private final ApplicationService applicationService;

  // Inject the event broadcaster for WebSocket notifications
  private final EventBroadcaster eventBroadcaster;

  // Inject the cache manager for manual cache invalidation
  private final CacheManager cacheManager;

  /**
   * Creates an ApplicationResource with the injected Kubernetes client and services.
   *
   * @param kubernetesClient the managed Kubernetes client
   * @param availabilityCheckService the availability check service
   * @param applicationService the application service for CRUD operations
   * @param eventBroadcaster the event broadcaster for WebSocket notifications
   * @param cacheManager the cache manager for manual cache invalidation
   */
  public ApplicationResource(
      KubernetesClient kubernetesClient,
      AvailabilityCheckService availabilityCheckService,
      ApplicationService applicationService,
      EventBroadcaster eventBroadcaster,
      CacheManager cacheManager) {
    this.kubernetesClient = kubernetesClient;
    this.availabilityCheckService = availabilityCheckService;
    this.applicationService = applicationService;
    this.eventBroadcaster = eventBroadcaster;
    this.cacheManager = cacheManager;
  }

  /** Helper method to manually invalidate all application caches synchronously. */
  private void invalidateApplicationCaches() {
    Cache appsCache = cacheManager.getCache("getApps").orElse(null);
    if (appsCache != null) {
      appsCache.invalidateAll().await().indefinitely();
    }

    Cache appsFilteredCache = cacheManager.getCache("getAppsFiltered").orElse(null);
    if (appsFilteredCache != null) {
      appsFilteredCache.invalidateAll().await().indefinitely();
    }

    Cache appCache = cacheManager.getCache("getApp").orElse(null);
    if (appCache != null) {
      appCache.invalidateAll().await().indefinitely();
    }
  }

  // Method to retrieve the list of applications
  private ArrayList<ApplicationSpecWithAvailability> retrieveApps() {
    Log.debug("Retrieving applications from Kubernetes");
    // Check if the client is available
    if (kubernetesClient == null) {
      Log.warn("KubernetesClient is null, returning empty application list");
      return new ArrayList<>();
    }

    // Create a list of application wrappers to retrieve applications from
    var applicationWrappers = new ArrayList<BaseKubernetesObject>();
    applicationWrappers.add(new StartpunktApplicationWrapper());
    Log.debugf(
        "Enabled wrappers: Startpunkt=true, Hajimari=%s, OpenShift=%s, Ingress=%s, Istio=%s, GatewayAPI=%s",
        hajimariEnabled,
        openshiftEnabled,
        ingressEnabled,
        istioVirtualServiceEnabled,
        gatewayApiEnabled);

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

    // Create a list of applications with metadata
    var apps = new ArrayList<ApplicationSpecWithAvailability>();

    try {
      // Retrieve the applications from the application wrappers using the injected client
      for (BaseKubernetesObject applicationWrapper : applicationWrappers) {
        Log.debugf(
            "Retrieving applications using wrapper: %s",
            applicationWrapper.getClass().getSimpleName());
        var wrapperApps =
            applicationWrapper.getApplicationSpecsWithMetadata(
                kubernetesClient, anyNamespace, matchNames.orElse(List.of()));
        Log.debugf(
            "Retrieved %d applications from %s",
            wrapperApps.size(), applicationWrapper.getClass().getSimpleName());
        apps.addAll(wrapperApps);
      }
    } catch (Exception e) {
      Log.error("Error retrieving applications from Kubernetes", e);
      // Return empty list on error to avoid 500s
      return new ArrayList<>();
    }

    // Sort the list of applications
    Collections.sort(apps);
    Log.debugf("Total applications retrieved: %d", apps.size());

    // Register URLs for availability checking
    for (ApplicationSpecWithAvailability app : apps) {
      if (app.getUrl() != null && !app.getUrl().isEmpty()) {
        availabilityCheckService.registerUrl(app.getUrl());
      }
    }

    // Return the list of applications
    return apps;
  }

  // Method to retrieve applications and wrap them with availability status
  private ArrayList<ApplicationSpecWithAvailability> retrieveAppsWithAvailability() {
    ArrayList<ApplicationSpecWithAvailability> apps = retrieveApps();
    return new ArrayList<>(availabilityCheckService.enrichWithAvailability(apps));
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
              schema =
                  @Schema(implementation = ApplicationSpecWithAvailability.class, required = true)))
  @APIResponse(responseCode = "404", description = "No application found")
  @Timed(value = "startpunkt.api.getapp", description = "Get a application")
  @CacheResult(cacheName = "getApp")
  public Response getApp(
      @PathParam("groupName") String groupName, @PathParam("appName") String appName) {
    // Find the application with the specified name
    for (ApplicationSpecWithAvailability a : retrieveAppsWithAvailability()) {
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
    Log.debugf("Getting applications with tag filter: %s", tags != null ? tags : "(none)");
    // Retrieve the list of applications with availability
    ArrayList<ApplicationSpecWithAvailability> applist = retrieveAppsWithAvailability();
    Log.debugf("Retrieved %d applications with availability", applist.size());

    // Apply tag filtering
    if (tags != null && !tags.trim().isEmpty()) {
      // If tags are specified, show applications with matching tags AND untagged applications
      Log.debugf("Filtering applications by tags: %s", tags);
      applist = filterApplicationsByTags(applist, tags);
      Log.debugf("After tag filtering: %d applications", applist.size());
    } else {
      // If no tags are specified, show only untagged applications
      Log.debug("No tags specified, showing only untagged applications");
      applist = filterApplicationsWithoutTags(applist);
      Log.debugf("After filtering untagged: %d applications", applist.size());
    }

    // Create a list to store application groups
    ArrayList<ApplicationGroup> groups = new ArrayList<>();

    // Group the applications by their group property
    for (ApplicationSpecWithAvailability a : applist) {
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
        Log.debugf("Created new application group: %s", a.getGroup());
      }

      // Add the application to the group
      group.addApplication(a);
    }

    Log.debugf("Grouped applications into %d groups", groups.size());

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
  ArrayList<ApplicationSpecWithAvailability> filterApplicationsByTags(
      ArrayList<ApplicationSpecWithAvailability> applications, String filterTags) {
    if (filterTags == null || filterTags.trim().isEmpty()) {
      return applications;
    }

    // Parse filter tags
    var filterTagSet =
        java.util.Arrays.stream(filterTags.split(","))
            .map(String::trim)
            .map(String::toLowerCase)
            .filter(tag -> !tag.isEmpty())
            .collect(java.util.stream.Collectors.toSet());

    if (filterTagSet.isEmpty()) {
      return applications;
    }

    ArrayList<ApplicationSpecWithAvailability> filteredApps = new ArrayList<>();

    for (ApplicationSpecWithAvailability app : applications) {
      // Always include applications with no tags
      if (app.getTags() == null || app.getTags().trim().isEmpty()) {
        filteredApps.add(app);
        continue;
      }

      // Parse application tags
      var appTagSet =
          java.util.Arrays.stream(app.getTags().split(","))
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
  ArrayList<ApplicationSpecWithAvailability> filterApplicationsWithoutTags(
      ArrayList<ApplicationSpecWithAvailability> applications) {
    ArrayList<ApplicationSpecWithAvailability> filteredApps = new ArrayList<>();

    for (ApplicationSpecWithAvailability app : applications) {
      // Include only applications with no tags
      if (app.getTags() == null || app.getTags().trim().isEmpty()) {
        filteredApps.add(app);
      }
    }

    return filteredApps;
  }

  /**
   * POST endpoint to create a new Application custom resource.
   *
   * @param namespace namespace to create the application in
   * @param name name for the application resource
   * @param spec application specification
   * @return HTTP 201 with created application or 400/500 on error
   */
  @POST
  @Path("/manage")
  @Consumes(MediaType.APPLICATION_JSON)
  @Operation(summary = "Create a new application")
  @APIResponse(
      responseCode = "201",
      description = "Application created",
      content =
          @Content(
              mediaType = MediaType.APPLICATION_JSON,
              schema = @Schema(implementation = Application.class)))
  @APIResponse(responseCode = "400", description = "Invalid input")
  @APIResponse(responseCode = "500", description = "Server error")
  @Timed(value = "startpunkt.api.createapp", description = "Create an application")
  @CacheInvalidate(cacheName = "getApps")
  @CacheInvalidate(cacheName = "getAppsFiltered")
  @CacheInvalidate(cacheName = "getApp")
  public Response createApplication(
      @QueryParam("namespace") String namespace,
      @QueryParam("name") String name,
      ApplicationSpec spec) {
    try {
      if (namespace == null || namespace.isEmpty()) {
        return Response.status(400, "Namespace is required").build();
      }
      if (name == null || name.isEmpty()) {
        return Response.status(400, "Name is required").build();
      }
      if (spec == null) {
        return Response.status(400, "Application spec is required").build();
      }

      Application created = applicationService.createApplication(namespace, name, spec);

      // Manually invalidate caches synchronously before broadcasting
      invalidateApplicationCaches();

      // Broadcast event to connected clients after cache is invalidated
      eventBroadcaster.broadcastApplicationAdded(created);

      return Response.status(201).entity(created).build();
    } catch (Exception e) {
      Log.error("Error creating application", e);
      return Response.status(500, "Error creating application: " + e.getMessage()).build();
    }
  }

  /**
   * PUT endpoint to update an existing Application custom resource.
   *
   * @param namespace namespace of the application
   * @param name name of the application resource
   * @param spec updated application specification
   * @return HTTP 200 with updated application or 400/404/500 on error
   */
  @PUT
  @Path("/manage")
  @Consumes(MediaType.APPLICATION_JSON)
  @Operation(summary = "Update an existing application")
  @APIResponse(
      responseCode = "200",
      description = "Application updated",
      content =
          @Content(
              mediaType = MediaType.APPLICATION_JSON,
              schema = @Schema(implementation = Application.class)))
  @APIResponse(responseCode = "400", description = "Invalid input")
  @APIResponse(responseCode = "404", description = "Application not found")
  @APIResponse(responseCode = "500", description = "Server error")
  @Timed(value = "startpunkt.api.updateapp", description = "Update an application")
  public Response updateApplication(
      @QueryParam("namespace") String namespace,
      @QueryParam("name") String name,
      ApplicationSpec spec) {
    try {
      if (namespace == null || namespace.isEmpty()) {
        return Response.status(400, "Namespace is required").build();
      }
      if (name == null || name.isEmpty()) {
        return Response.status(400, "Name is required").build();
      }
      if (spec == null) {
        return Response.status(400, "Application spec is required").build();
      }

      Application updated = applicationService.updateApplication(namespace, name, spec);

      // Invalidate all application caches synchronously before broadcasting
      invalidateApplicationCaches();

      // Broadcast event to connected clients
      eventBroadcaster.broadcastApplicationUpdated(updated);

      return Response.ok(updated).build();
    } catch (IllegalArgumentException e) {
      return Response.status(404, e.getMessage()).build();
    } catch (Exception e) {
      Log.error("Error updating application", e);
      return Response.status(500, "Error updating application: " + e.getMessage()).build();
    }
  }

  /**
   * DELETE endpoint to delete an Application custom resource.
   *
   * @param namespace namespace of the application
   * @param name name of the application resource
   * @return HTTP 204 if deleted, 404 if not found, 500 on error
   */
  @DELETE
  @Path("/manage")
  @Operation(summary = "Delete an application")
  @APIResponse(responseCode = "204", description = "Application deleted")
  @APIResponse(responseCode = "404", description = "Application not found")
  @APIResponse(responseCode = "500", description = "Server error")
  @Timed(value = "startpunkt.api.deleteapp", description = "Delete an application")
  public Response deleteApplication(
      @QueryParam("namespace") String namespace, @QueryParam("name") String name) {
    try {
      if (namespace == null || namespace.isEmpty()) {
        return Response.status(400, "Namespace is required").build();
      }
      if (name == null || name.isEmpty()) {
        return Response.status(400, "Name is required").build();
      }

      boolean deleted = applicationService.deleteApplication(namespace, name);
      if (deleted) {
        // Invalidate all application caches synchronously before broadcasting
        invalidateApplicationCaches();

        // Broadcast event to connected clients
        var deletedData = new java.util.HashMap<String, String>();
        deletedData.put("namespace", namespace);
        deletedData.put("name", name);
        eventBroadcaster.broadcastApplicationRemoved(deletedData);

        return Response.status(204).build();
      } else {
        return Response.status(404, "Application not found").build();
      }
    } catch (Exception e) {
      Log.error("Error deleting application", e);
      return Response.status(500, "Error deleting application: " + e.getMessage()).build();
    }
  }

  /**
   * GET endpoint to retrieve a single Application custom resource with ownership info.
   *
   * @param namespace namespace of the application
   * @param name name of the application resource
   * @return HTTP 200 with application and ownership info or 404 if not found
   */
  @GET
  @Path("/manage")
  @Operation(summary = "Get an application resource with ownership info")
  @APIResponse(
      responseCode = "200",
      description = "Application retrieved",
      content =
          @Content(
              mediaType = MediaType.APPLICATION_JSON,
              schema = @Schema(implementation = Application.class)))
  @APIResponse(responseCode = "404", description = "Application not found")
  @Timed(value = "startpunkt.api.getappresource", description = "Get application resource")
  public Response getApplicationResource(
      @QueryParam("namespace") String namespace, @QueryParam("name") String name) {
    try {
      if (namespace == null || namespace.isEmpty()) {
        return Response.status(400, "Namespace is required").build();
      }
      if (name == null || name.isEmpty()) {
        return Response.status(400, "Name is required").build();
      }

      Application app = applicationService.getApplication(namespace, name);
      if (app == null) {
        return Response.status(404, "Application not found").build();
      }

      return Response.ok(app).build();
    } catch (Exception e) {
      Log.error("Error getting application", e);
      return Response.status(500, "Error getting application: " + e.getMessage()).build();
    }
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
