package us.ullberg.startpunkt.graphql;

import io.fabric8.kubernetes.client.KubernetesClient;
import io.micrometer.core.annotation.Timed;
import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.eclipse.microprofile.graphql.Description;
import org.eclipse.microprofile.graphql.GraphQLApi;
import org.eclipse.microprofile.graphql.Name;
import org.eclipse.microprofile.graphql.Query;
import us.ullberg.startpunkt.objects.ApplicationGroup;
import us.ullberg.startpunkt.objects.ApplicationResponse;
import us.ullberg.startpunkt.objects.kubernetes.BaseKubernetesObject;
import us.ullberg.startpunkt.objects.kubernetes.GatewayApiHttpRouteWrapper;
import us.ullberg.startpunkt.objects.kubernetes.HajimariApplicationWrapper;
import us.ullberg.startpunkt.objects.kubernetes.IngressApplicationWrapper;
import us.ullberg.startpunkt.objects.kubernetes.IstioVirtualServiceApplicationWrapper;
import us.ullberg.startpunkt.objects.kubernetes.RouteApplicationWrapper;
import us.ullberg.startpunkt.objects.kubernetes.StartpunktApplicationWrapper;
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
   */
  public ApplicationGraphQLResource(
      KubernetesClient kubernetesClient, AvailabilityCheckService availabilityCheckService) {
    this.kubernetesClient = kubernetesClient;
    this.availabilityCheckService = availabilityCheckService;
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
  public List<ApplicationGroup> getApplicationGroups(
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

    return groups;
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
  public ApplicationResponse getApplication(
      @Name("groupName") @Description("The group name of the application") String groupName,
      @Name("appName") @Description("The name of the application") String appName) {
    Log.debugf("GraphQL query: application with groupName=%s, appName=%s", groupName, appName);

    for (ApplicationResponse a : retrieveAppsWithAvailability()) {
      if (a.getGroup().equals(groupName) && a.getName().equals(appName)) {
        return a;
      }
    }

    return null;
  }

  // Private helper methods from ApplicationResource

  private ArrayList<ApplicationResponse> retrieveApps() {
    Log.debug("Retrieving applications from Kubernetes");
    if (kubernetesClient == null) {
      Log.warn("KubernetesClient is null, returning empty application list");
      return new ArrayList<>();
    }

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

    var apps = new ArrayList<ApplicationResponse>();

    try {
      for (BaseKubernetesObject applicationWrapper : applicationWrappers) {
        var wrapperApps =
            applicationWrapper.getApplicationSpecsWithMetadata(
                kubernetesClient, anyNamespace, matchNames.orElse(List.of()));
        apps.addAll(wrapperApps);
      }
    } catch (Exception e) {
      Log.error("Error retrieving applications from Kubernetes", e);
      return new ArrayList<>();
    }

    Collections.sort(apps);

    for (ApplicationResponse app : apps) {
      if (app.getUrl() != null && !app.getUrl().isEmpty()) {
        availabilityCheckService.registerUrl(app.getUrl());
      }
    }

    return apps;
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
}
