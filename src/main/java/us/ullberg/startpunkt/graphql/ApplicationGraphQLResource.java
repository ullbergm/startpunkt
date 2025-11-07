package us.ullberg.startpunkt.graphql;

import io.fabric8.kubernetes.client.KubernetesClient;
import io.fabric8.kubernetes.client.KubernetesClientException;
import io.micrometer.core.annotation.Timed;
import io.quarkus.cache.Cache;
import io.quarkus.cache.CacheManager;
import io.quarkus.logging.Log;
import io.smallrye.graphql.api.Subscription;
import io.smallrye.mutiny.Multi;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.graphql.Description;
import org.eclipse.microprofile.graphql.GraphQLApi;
import org.eclipse.microprofile.graphql.Mutation;
import org.eclipse.microprofile.graphql.Name;
import org.eclipse.microprofile.graphql.NonNull;
import org.eclipse.microprofile.graphql.Query;
import us.ullberg.startpunkt.crd.v1alpha4.Application;
import us.ullberg.startpunkt.crd.v1alpha4.ApplicationSpec;
import us.ullberg.startpunkt.graphql.exception.ApplicationConflictException;
import us.ullberg.startpunkt.graphql.input.CreateApplicationInput;
import us.ullberg.startpunkt.graphql.input.UpdateApplicationInput;
import us.ullberg.startpunkt.graphql.types.ApplicationGroupType;
import us.ullberg.startpunkt.graphql.types.ApplicationType;
import us.ullberg.startpunkt.graphql.types.ApplicationUpdateEvent;
import us.ullberg.startpunkt.graphql.types.ApplicationUpdateType;
import us.ullberg.startpunkt.messaging.EventBroadcaster;
import us.ullberg.startpunkt.objects.ApplicationGroup;
import us.ullberg.startpunkt.objects.ApplicationResponse;
import us.ullberg.startpunkt.service.ApplicationCacheService;
import us.ullberg.startpunkt.service.ApplicationService;
import us.ullberg.startpunkt.service.AvailabilityCheckService;

/**
 * GraphQL API resource for applications. Provides queries for retrieving applications with optional
 * tag filtering and grouping.
 */
@GraphQLApi
@ApplicationScoped
public class ApplicationGraphQLResource {

  final KubernetesClient kubernetesClient;
  final AvailabilityCheckService availabilityCheckService;
  final ApplicationService applicationService;
  final EventBroadcaster eventBroadcaster;
  final CacheManager cacheManager;
  final SubscriptionEventEmitter subscriptionEventEmitter;
  final ApplicationCacheService applicationCacheService;

  @ConfigProperty(name = "startpunkt.hajimari.enabled", defaultValue = "false")
  boolean hajimariEnabled;

  @ConfigProperty(name = "startpunkt.ingress.enabled", defaultValue = "false")
  boolean ingressEnabled;

  @ConfigProperty(name = "startpunkt.ingress.onlyAnnotated", defaultValue = "true")
  boolean ingressOnlyAnnotated;

  @ConfigProperty(name = "startpunkt.openshift.enabled", defaultValue = "false")
  boolean openshiftEnabled;

  @ConfigProperty(name = "startpunkt.openshift.onlyAnnotated", defaultValue = "true")
  boolean openshiftOnlyAnnotated;

  @ConfigProperty(name = "startpunkt.istio.virtualservice.enabled", defaultValue = "false")
  boolean istioVirtualServiceEnabled;

  @ConfigProperty(name = "startpunkt.istio.virtualservice.onlyAnnotated", defaultValue = "true")
  boolean istioVirtualServiceOnlyAnnotated;

  @ConfigProperty(name = "startpunkt.gatewayapi.httproute.enabled", defaultValue = "false")
  boolean gatewayApiEnabled;

  @ConfigProperty(name = "startpunkt.gatewayapi.httproute.onlyAnnotated", defaultValue = "true")
  boolean gatewayApiHttpRouteOnlyAnnotated;

  @ConfigProperty(name = "startpunkt.namespaceSelector.any", defaultValue = "true")
  boolean anyNamespace;

  @ConfigProperty(name = "startpunkt.namespaceSelector.matchNames")
  Optional<List<String>> matchNames;

  @ConfigProperty(name = "startpunkt.defaultProtocol", defaultValue = "http")
  String defaultProtocol;

  /**
   * Constructor with injected dependencies.
   *
   * @param kubernetesClient the Kubernetes client
   * @param availabilityCheckService the availability check service
   * @param applicationService the application service for CRUD operations
   * @param eventBroadcaster the event broadcaster for WebSocket notifications
   * @param cacheManager the cache manager for manual cache invalidation
   * @param subscriptionEventEmitter the subscription event emitter for GraphQL subscriptions
   * @param applicationCacheService the application cache service
   */
  public ApplicationGraphQLResource(
      KubernetesClient kubernetesClient,
      AvailabilityCheckService availabilityCheckService,
      ApplicationService applicationService,
      EventBroadcaster eventBroadcaster,
      CacheManager cacheManager,
      SubscriptionEventEmitter subscriptionEventEmitter,
      ApplicationCacheService applicationCacheService) {
    this.kubernetesClient = kubernetesClient;
    this.availabilityCheckService = availabilityCheckService;
    this.applicationService = applicationService;
    this.eventBroadcaster = eventBroadcaster;
    this.cacheManager = cacheManager;
    this.subscriptionEventEmitter = subscriptionEventEmitter;
    this.applicationCacheService = applicationCacheService;
  }

  /**
   * Retrieve application groups, optionally filtered by tags.
   *
   * @param tags optional list of tags to filter applications
   * @return list of application groups
   */
  @Query("applicationGroups")
  @Description("Retrieve application groups, optionally filtered by tags")
  @Timed(value = "graphql.query.applicationGroups")
  public List<ApplicationGroupType> getApplicationGroups(
      @Name("tags") @Description("Optional tags to filter applications") List<String> tags) {
    Log.debugf("GraphQL query: applicationGroups with tags: %s", tags);

    // Retrieve applications
    ArrayList<ApplicationResponse> applist = retrieveAppsWithAvailability();

    // Apply tag filtering
    if (tags != null && !tags.isEmpty()) {
      String tagsStr = String.join(",", tags);
      applist = filterApplicationsByTags(applist, tagsStr);
    } else {
      applist = filterApplicationsWithoutTags(applist);
    }

    // Group applications
    ArrayList<ApplicationGroup> groups = new ArrayList<>();
    for (ApplicationResponse a : applist) {
      ApplicationGroup group = null;
      for (ApplicationGroup g : groups) {
        if (g.getName().equals(a.getGroup())) {
          group = g;
          break;
        }
      }

      if (group == null) {
        group = new ApplicationGroup(a.getGroup());
        groups.add(group);
      }

      group.addApplication(a);
    }

    // Convert to GraphQL types (no CRD exposure)
    return groups.stream()
        .map(ApplicationGroupType::fromApplicationGroup)
        .collect(java.util.stream.Collectors.toList());
  }

  /**
   * Retrieve a single application by group and name.
   *
   * @param groupName the group name
   * @param appName the application name
   * @return the application if found, null otherwise
   */
  @Query("application")
  @Description("Retrieve a single application by group and name")
  @Timed(value = "graphql.query.application")
  public ApplicationType getApplication(
      @Name("groupName") @Description("The group name of the application") String groupName,
      @Name("appName") @Description("The name of the application") String appName) {
    Log.debugf("GraphQL query: application with groupName=%s, appName=%s", groupName, appName);

    for (ApplicationResponse a : retrieveAppsWithAvailability()) {
      if (a.getGroup().equals(groupName) && a.getName().equals(appName)) {
        return ApplicationType.fromResponse(a);
      }
    }

    return null;
  }

  // Private helper methods

  private ArrayList<ApplicationResponse> retrieveApps() {
    Log.debug("Retrieving applications from cache");

    // Get all applications from cache
    List<ApplicationResponse> apps = applicationCacheService.getAll();

    // Sort applications
    ArrayList<ApplicationResponse> sortedApps = new ArrayList<>(apps);
    Collections.sort(sortedApps);

    return sortedApps;
  }

  private ArrayList<ApplicationResponse> retrieveAppsWithAvailability() {
    ArrayList<ApplicationResponse> apps = retrieveApps();
    return new ArrayList<>(availabilityCheckService.enrichWithAvailability(apps));
  }

  private ArrayList<ApplicationResponse> filterApplicationsByTags(
      ArrayList<ApplicationResponse> applications, String filterTags) {
    if (filterTags == null || filterTags.trim().isEmpty()) {
      return applications;
    }

    var filterTagSet =
        java.util.Arrays.stream(filterTags.split(","))
            .map(String::trim)
            .map(String::toLowerCase)
            .filter(tag -> !tag.isEmpty())
            .collect(java.util.stream.Collectors.toSet());

    if (filterTagSet.isEmpty()) {
      return applications;
    }

    ArrayList<ApplicationResponse> filteredApps = new ArrayList<>();

    for (ApplicationResponse app : applications) {
      if (app.getTags() == null || app.getTags().trim().isEmpty()) {
        filteredApps.add(app);
        continue;
      }

      var appTagSet =
          java.util.Arrays.stream(app.getTags().split(","))
              .map(String::trim)
              .map(String::toLowerCase)
              .filter(tag -> !tag.isEmpty())
              .collect(java.util.stream.Collectors.toSet());

      boolean hasMatchingTag = appTagSet.stream().anyMatch(filterTagSet::contains);
      if (hasMatchingTag) {
        filteredApps.add(app);
      }
    }

    return filteredApps;
  }

  private ArrayList<ApplicationResponse> filterApplicationsWithoutTags(
      ArrayList<ApplicationResponse> applications) {
    ArrayList<ApplicationResponse> filteredApps = new ArrayList<>();

    for (ApplicationResponse app : applications) {
      if (app.getTags() == null || app.getTags().trim().isEmpty()) {
        filteredApps.add(app);
      }
    }

    return filteredApps;
  }

  /**
   * Create a new application.
   *
   * @param input the application creation input
   * @return the created application
   */
  @Mutation("createApplication")
  @Description("Create a new application")
  @Timed(value = "graphql.mutation.createApplication")
  public ApplicationType createApplication(@NonNull @Name("input") CreateApplicationInput input) {
    Log.debugf(
        "GraphQL mutation: createApplication in namespace=%s, name=%s",
        input.namespace, input.resourceName);

    // Create ApplicationSpec from input
    ApplicationSpec spec = new ApplicationSpec();
    spec.name = input.name;
    spec.setGroup(input.group);
    spec.setIcon(input.icon);
    spec.setIconColor(input.iconColor);
    spec.setUrl(input.url);
    spec.setInfo(input.info);
    spec.setTargetBlank(input.targetBlank);
    spec.setLocation(input.location != null ? input.location : 1000);
    spec.setEnabled(input.enabled != null ? input.enabled : true);
    spec.setRootPath(input.rootPath);
    spec.setTags(input.tags);

    try {
      // Create application via service
      Application created =
          applicationService.createApplication(input.namespace, input.resourceName, spec);

      // Invalidate cache
      invalidateApplicationCaches();

      // Broadcast event
      eventBroadcaster.broadcastApplicationAdded(created);

      // Convert to GraphQL type
      ApplicationResponse response = new ApplicationResponse(spec);
      response.setNamespace(input.namespace);
      response.setResourceName(input.resourceName);
      return ApplicationType.fromResponse(response);
    } catch (KubernetesClientException e) {
      if (e.getCode() == 409) {
        String message =
            String.format(
                "An application with the name '%s' already exists in namespace '%s'. Please use a"
                    + " different resource name.",
                input.resourceName, input.namespace);
        Log.warnf("Conflict creating application: %s", message);
        throw new ApplicationConflictException(message, e);
      }
      // Re-throw other Kubernetes errors
      Log.errorf(e, "Failed to create application: %s", e.getMessage());
      throw new RuntimeException("Failed to create application: " + e.getMessage(), e);
    }
  }

  /**
   * Update an existing application.
   *
   * @param input the application update input
   * @return the updated application
   */
  @Mutation("updateApplication")
  @Description("Update an existing application")
  @Timed(value = "graphql.mutation.updateApplication")
  public ApplicationType updateApplication(@NonNull @Name("input") UpdateApplicationInput input) {
    Log.debugf(
        "GraphQL mutation: updateApplication in namespace=%s, name=%s",
        input.namespace, input.resourceName);

    // Create ApplicationSpec from input
    ApplicationSpec spec = new ApplicationSpec();
    spec.name = input.name;
    spec.setGroup(input.group);
    spec.setIcon(input.icon);
    spec.setIconColor(input.iconColor);
    spec.setUrl(input.url);
    spec.setInfo(input.info);
    spec.setTargetBlank(input.targetBlank);
    spec.setLocation(input.location != null ? input.location : 1000);
    spec.setEnabled(input.enabled != null ? input.enabled : true);
    spec.setRootPath(input.rootPath);
    spec.setTags(input.tags);

    // Update application via service
    Application updated =
        applicationService.updateApplication(input.namespace, input.resourceName, spec);

    // Invalidate cache
    invalidateApplicationCaches();

    // Broadcast event
    eventBroadcaster.broadcastApplicationUpdated(updated);

    // Convert to GraphQL type
    ApplicationResponse response = new ApplicationResponse(spec);
    response.setNamespace(input.namespace);
    response.setResourceName(input.resourceName);
    return ApplicationType.fromResponse(response);
  }

  /**
   * Delete an application.
   *
   * @param namespace the namespace of the application
   * @param name the name of the application resource
   * @return true if deleted successfully
   */
  @Mutation("deleteApplication")
  @Description("Delete an application")
  @Timed(value = "graphql.mutation.deleteApplication")
  public Boolean deleteApplication(
      @NonNull @Name("namespace") String namespace, @NonNull @Name("name") String name) {
    Log.debugf("GraphQL mutation: deleteApplication in namespace=%s, name=%s", namespace, name);

    // Get the application data BEFORE deleting so we can broadcast it
    var appToDelete = applicationService.getApplication(namespace, name);

    // Delete application via service
    boolean deleted = applicationService.deleteApplication(namespace, name);

    if (deleted) {
      // Invalidate cache
      invalidateApplicationCaches();

      // Broadcast event with the full application data
      if (appToDelete != null) {
        eventBroadcaster.broadcastApplicationRemoved(appToDelete);
      } else {
        Log.warnf(
            "Could not broadcast application removed event - application data not found for %s/%s",
            namespace, name);
      }
    }

    return deleted;
  }

  /** Invalidates the application caches. */
  private void invalidateApplicationCaches() {
    Cache cache = cacheManager.getCache("getApps").orElse(null);
    if (cache != null) {
      cache.invalidateAll().await().indefinitely();
    }

    cache = cacheManager.getCache("getAppsFiltered").orElse(null);
    if (cache != null) {
      cache.invalidateAll().await().indefinitely();
    }

    cache = cacheManager.getCache("getApp").orElse(null);
    if (cache != null) {
      cache.invalidateAll().await().indefinitely();
    }
  }

  /**
   * Subscribe to real-time application updates.
   *
   * <p>Clients can subscribe to this to receive notifications when applications are added, updated,
   * or removed. Optional filtering by namespace and tags is supported.
   *
   * @param namespace optional namespace filter (only events for this namespace will be sent)
   * @param tags optional list of tags to filter applications
   * @return Multi stream of application update events
   */
  @Subscription("applicationUpdates")
  @Description("Subscribe to real-time application updates with optional filtering")
  public Multi<ApplicationUpdateEvent> subscribeToApplicationUpdates(
      @Name("namespace") @Description("Optional namespace filter") String namespace,
      @Name("tags") @Description("Optional tags to filter applications") List<String> tags) {
    Log.debugf(
        "GraphQL subscription: applicationUpdates with namespace=%s, tags=%s", namespace, tags);

    Multi<ApplicationUpdateEvent> stream = subscriptionEventEmitter.getApplicationStream();

    // Apply namespace filter if provided
    if (namespace != null && !namespace.trim().isEmpty()) {
      final String ns = namespace.trim();
      stream =
          stream.filter(
              event -> {
                ApplicationType app = event.getApplication();
                return app != null && ns.equals(app.namespace);
              });
    }

    // Apply tags filter if provided
    if (tags != null && !tags.isEmpty()) {
      final List<String> lowerCaseTags =
          tags.stream()
              .map(String::trim)
              .map(String::toLowerCase)
              .filter(tag -> !tag.isEmpty())
              .toList();

      if (!lowerCaseTags.isEmpty()) {
        stream =
            stream.filter(
                event -> {
                  ApplicationType app = event.getApplication();
                  if (app == null) {
                    return false;
                  }

                  // Include apps without tags (per tag filtering rules in
                  // docs/object-tag-filtering.md)
                  if (app.tags == null || app.tags.trim().isEmpty()) {
                    return true;
                  }

                  // Check if app has any of the requested tags
                  List<String> appTags =
                      java.util.Arrays.stream(app.tags.split(","))
                          .map(String::trim)
                          .map(String::toLowerCase)
                          .filter(tag -> !tag.isEmpty())
                          .toList();

                  return appTags.stream().anyMatch(lowerCaseTags::contains);
                });
      }
    }

    return stream;
  }

  /**
   * Subscribe to new applications being added.
   *
   * @return Multi stream of new applications
   */
  @Subscription("applicationAdded")
  @Description("Subscribe to notifications when new applications are added")
  public Multi<ApplicationType> subscribeToApplicationsAdded() {
    Log.debug("GraphQL subscription: applicationAdded");
    return subscriptionEventEmitter
        .getApplicationStream()
        .filter(event -> event.getType() == ApplicationUpdateType.ADDED)
        .map(ApplicationUpdateEvent::getApplication);
  }

  /**
   * Subscribe to applications being removed.
   *
   * @return Multi stream of removed applications
   */
  @Subscription("applicationRemoved")
  @Description("Subscribe to notifications when applications are removed")
  public Multi<ApplicationType> subscribeToApplicationsRemoved() {
    Log.debug("GraphQL subscription: applicationRemoved");
    return subscriptionEventEmitter
        .getApplicationStream()
        .filter(event -> event.getType() == ApplicationUpdateType.REMOVED)
        .map(ApplicationUpdateEvent::getApplication);
  }

  /**
   * Subscribe to applications being updated.
   *
   * @return Multi stream of updated applications
   */
  @Subscription("applicationUpdated")
  @Description("Subscribe to notifications when applications are updated")
  public Multi<ApplicationType> subscribeToApplicationsUpdated() {
    Log.debug("GraphQL subscription: applicationUpdated");
    return subscriptionEventEmitter
        .getApplicationStream()
        .filter(event -> event.getType() == ApplicationUpdateType.UPDATED)
        .map(ApplicationUpdateEvent::getApplication);
  }
}
