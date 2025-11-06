package us.ullberg.startpunkt.service;

import io.fabric8.kubernetes.api.model.GenericKubernetesResource;
import io.fabric8.kubernetes.api.model.GenericKubernetesResourceList;
import io.fabric8.kubernetes.client.KubernetesClient;
import io.fabric8.kubernetes.client.dsl.base.ResourceDefinitionContext;
import io.micrometer.core.annotation.Timed;
import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import us.ullberg.startpunkt.crd.v1alpha4.BookmarkSpec;
import us.ullberg.startpunkt.objects.BookmarkGroup;
import us.ullberg.startpunkt.objects.BookmarkResponse;

/**
 * Service class for managing bookmarks retrieved from Kubernetes Custom Resources. Supports
 * retrieval from multiple namespaces and clusters, and grouping bookmarks by their group property.
 */
@ApplicationScoped
public class BookmarkService {

  // Configuration properties for namespace selection
  @ConfigProperty(name = "startpunkt.namespaceSelector.any", defaultValue = "true")
  private boolean anyNamespace;

  @ConfigProperty(name = "startpunkt.namespaceSelector.matchNames")
  private Optional<List<String>> matchNames;

  private final ClusterClientService clusterClientService;

  /**
   * Constructor with dependency injection.
   *
   * @param clusterClientService the cluster client service for multi-cluster support
   */
  public BookmarkService(ClusterClientService clusterClientService) {
    this.clusterClientService = clusterClientService;
  }

  /**
   * Retrieves a list of bookmarks from all configured clusters based on configured namespaces.
   *
   * @return list of {@link BookmarkResponse} representing the bookmarks
   */
  @Timed(value = "startpunkt.kubernetes.bookmarks", description = "Get a list of bookmarks")
  public List<BookmarkResponse> retrieveBookmarks() {
    Log.debug("Retrieving Startpunkt bookmarks from Kubernetes clusters");
    List<BookmarkResponse> allBookmarks = new LinkedList<>();

    try {
      ResourceDefinitionContext ctx =
          new ResourceDefinitionContext.Builder()
              .withGroup("startpunkt.ullberg.us")
              .withVersion("v1alpha4")
              .withPlural("bookmarks")
              .withNamespaced(true)
              .build();

      // Get all cluster clients
      Map<String, KubernetesClient> clusterClients = clusterClientService.getAllClusterClients();
      Log.debugf("Retrieving bookmarks from %d clusters", clusterClients.size());

      // Iterate over each cluster
      for (Map.Entry<String, KubernetesClient> entry : clusterClients.entrySet()) {
        String clusterName = entry.getKey();
        KubernetesClient client = entry.getValue();
        Log.debugf("Fetching bookmarks from cluster: %s", clusterName);

        try {
          GenericKubernetesResourceList list = getResourceList(client, ctx);
          List<BookmarkResponse> bookmarks = mapResourcesToBookmarks(list, clusterName);
          allBookmarks.addAll(bookmarks);
          Log.debugf(
              "Retrieved %d Startpunkt bookmarks from cluster %s", bookmarks.size(), clusterName);
        } catch (Exception e) {
          Log.errorf(e, "Error retrieving bookmarks from cluster %s", clusterName);
          // Continue with other clusters
        }
      }

      Log.debugf("Total bookmarks retrieved across all clusters: %d", allBookmarks.size());
      return allBookmarks;
    } catch (Exception e) {
      Log.error("Error retrieving bookmarks", e);
      return List.of();
    }
  }

  // Method to get the list of resources from the Kubernetes cluster
  private GenericKubernetesResourceList getResourceList(
      final KubernetesClient client, ResourceDefinitionContext resourceDefinitionContext) {
    if (anyNamespace) {
      Log.debug("Retrieving resources from all namespaces");
      return client.genericKubernetesResources(resourceDefinitionContext).inAnyNamespace().list();
    }

    // For each specified namespace, get the resource
    Log.debugf("Retrieving resources from specific namespaces: %s", matchNames.orElse(List.of()));
    GenericKubernetesResourceList list = new GenericKubernetesResourceList();
    for (String ns : matchNames.orElse(List.of())) {
      Log.debugf("Fetching resources from namespace: %s", ns);
      list.getItems()
          .addAll(
              client
                  .genericKubernetesResources(resourceDefinitionContext)
                  .inNamespace(ns)
                  .list()
                  .getItems());
    }

    return list;
  }

  /**
   * Maps a list of generic Kubernetes resources to a list of {@link BookmarkResponse} objects.
   *
   * @param list Kubernetes resource list to map
   * @return list of {@link BookmarkResponse}
   */
  private List<BookmarkResponse> mapResourcesToBookmarks(GenericKubernetesResourceList list) {
    return mapResourcesToBookmarks(list, null);
  }

  /**
   * Maps a list of generic Kubernetes resources to a list of {@link BookmarkResponse} objects.
   *
   * @param list Kubernetes resource list to map
   * @param clusterName the name of the cluster these bookmarks belong to
   * @return list of {@link BookmarkResponse}
   */
  private List<BookmarkResponse> mapResourcesToBookmarks(
      GenericKubernetesResourceList list, String clusterName) {
    return list.getItems().stream()
        .map(
            item -> {
              Map<String, Object> spec = getSpec(item);
              String name = spec.getOrDefault("name", item.getMetadata().getName()).toString();
              String url = (String) spec.get("url");
              String icon = (String) spec.get("icon");
              String info = (String) spec.get("info");
              String group =
                  (spec.containsKey("group")
                          ? spec.get("group").toString()
                          : item.getMetadata().getNamespace())
                      .toLowerCase();
              Boolean targetBlank =
                  spec.containsKey("targetBlank")
                      ? Boolean.parseBoolean(spec.get("targetBlank").toString())
                      : null;
              int location =
                  spec.containsKey("location")
                      ? Integer.parseInt(spec.get("location").toString())
                      : 1000;
              if (location == 0) {
                location = 1000;
              }

              BookmarkSpec baseSpec =
                  new BookmarkSpec(name, group, icon, url, info, targetBlank, location);
              BookmarkResponse withMetadata = new BookmarkResponse(baseSpec);

              // Populate metadata fields
              withMetadata.setNamespace(item.getMetadata().getNamespace());
              withMetadata.setResourceName(item.getMetadata().getName());
              withMetadata.setClusterName(clusterName);

              // Check if resource has owner references or is managed by ArgoCD
              boolean hasOwnerRefs =
                  item.getMetadata().getOwnerReferences() != null
                      && !item.getMetadata().getOwnerReferences().isEmpty();
              boolean managedByArgocd =
                  item.getMetadata().getManagedFields() != null
                      && item.getMetadata().getManagedFields().stream()
                          .anyMatch(
                              field -> {
                                var manager = field.getManager();
                                return manager != null && manager.contains("argocd");
                              });
              withMetadata.setHasOwnerReferences(hasOwnerRefs || managedByArgocd);

              return withMetadata;
            })
        .toList();
  }

  /**
   * Retrieves bookmarks from the "hajimari.io" group namespace from all configured clusters.
   *
   * @return list of {@link BookmarkResponse} representing Hajimari bookmarks
   */
  public List<BookmarkResponse> retrieveHajimariBookmarks() {
    Log.debug("Retrieving Hajimari bookmarks from all clusters");
    List<BookmarkResponse> allBookmarks = new LinkedList<>();

    try {
      ResourceDefinitionContext resourceDefinitionContext =
          new ResourceDefinitionContext.Builder()
              .withGroup("hajimari.io")
              .withVersion("v1alpha1")
              .withPlural("bookmarks")
              .withNamespaced(true)
              .build();

      // Get all cluster clients
      Map<String, KubernetesClient> clusterClients = clusterClientService.getAllClusterClients();
      Log.debugf("Retrieving Hajimari bookmarks from %d clusters", clusterClients.size());

      // Iterate over each cluster
      for (Map.Entry<String, KubernetesClient> entry : clusterClients.entrySet()) {
        String clusterName = entry.getKey();
        KubernetesClient client = entry.getValue();
        Log.debugf("Fetching Hajimari bookmarks from cluster: %s", clusterName);

        try {
          GenericKubernetesResourceList list = getResourceList(client, resourceDefinitionContext);
          List<BookmarkResponse> bookmarks = mapResourcesToBookmarks(list, clusterName);
          allBookmarks.addAll(bookmarks);
          Log.debugf(
              "Retrieved %d Hajimari bookmarks from cluster %s", bookmarks.size(), clusterName);
        } catch (Exception e) {
          Log.errorf(e, "Error retrieving Hajimari bookmarks from cluster %s", clusterName);
          // Continue with other clusters
        }
      }

      Log.debugf("Total Hajimari bookmarks retrieved across all clusters: %d", allBookmarks.size());
      return allBookmarks;
    } catch (Exception e) {
      Log.error("Error retrieving hajimari bookmarks", e);
      return List.of();
    }
  }

  /**
   * Generates groups of bookmarks grouped by their group name.
   *
   * @param bookmarklist list of bookmarks to group
   * @return list of {@link BookmarkGroup} containing grouped bookmarks
   */
  public List<BookmarkGroup> generateBookmarkGroups(List<BookmarkResponse> bookmarklist) {
    Log.debugf("Generating bookmark groups from %d bookmarks", bookmarklist.size());
    var groups = new LinkedList<BookmarkGroup>();

    // Group the bookmarks by their group property
    for (BookmarkResponse bookmark : bookmarklist) {
      // Find the existing group
      BookmarkGroup group = null;
      for (BookmarkGroup g : groups) {
        if (g.getName().equals(bookmark.getGroup())) {
          group = g;
          break;
        }
      }

      // If the group doesn't exist, create a new one
      if (group == null) {
        group = new BookmarkGroup(bookmark.getGroup());
        groups.add(group);
        Log.debugf("Created new bookmark group: %s", bookmark.getGroup());
      }

      // Add the bookmark to the group
      group.addBookmark(bookmark);
    }

    return groups;
  }

  /**
   * Extracts the 'spec' map from a generic Kubernetes resource.
   *
   * @param item Kubernetes resource item
   * @return map representing the spec of the resource, or empty map if none present
   */
  private Map<String, Object> getSpec(GenericKubernetesResource item) {
    Map<String, Object> props = item.getAdditionalProperties();
    if (props == null) {
      return Map.of();
    }
    @SuppressWarnings("unchecked")
    Map<String, Object> spec = (Map<String, Object>) props.get("spec");
    return spec != null ? spec : Map.of();
  }
}
