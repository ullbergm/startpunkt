package us.ullberg.startpunkt.service;

import io.fabric8.kubernetes.api.model.GenericKubernetesResource;
import io.fabric8.kubernetes.api.model.GenericKubernetesResourceList;
import io.fabric8.kubernetes.client.KubernetesClient;
import io.fabric8.kubernetes.client.KubernetesClientBuilder;
import io.fabric8.kubernetes.client.dsl.base.ResourceDefinitionContext;
import io.micrometer.core.annotation.Timed;
import io.quarkus.logging.Log;
import jakarta.annotation.Nullable;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.LinkedList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import us.ullberg.startpunkt.crd.v1alpha3.BookmarkSpec;
import us.ullberg.startpunkt.objects.BookmarkGroup;

/**
 * Service class for managing bookmarks retrieved from Kubernetes Custom Resources. Supports
 * retrieval from multiple namespaces and grouping bookmarks by their group property.
 */
@ApplicationScoped
public class BookmarkService {

  // Configuration properties for namespace selection
  @ConfigProperty(name = "startpunkt.namespaceSelector.any", defaultValue = "true")
  private boolean anyNamespace;

  @ConfigProperty(name = "startpunkt.namespaceSelector.matchNames")
  private Optional<List<String>> matchNames;

  /** Default constructor. */
  public BookmarkService() {
    // No special initialization needed
  }

  /**
   * Retrieves a list of bookmarks from the Kubernetes cluster based on configured namespaces.
   *
   * @return list of {@link BookmarkSpec} representing the bookmarks
   */
  @Timed(value = "startpunkt.kubernetes.bookmarks", description = "Get a list of bookmarks")
  public List<BookmarkSpec> retrieveBookmarks() {
    try (KubernetesClient client = new KubernetesClientBuilder().build()) {
      ResourceDefinitionContext ctx =
          new ResourceDefinitionContext.Builder()
              .withGroup("startpunkt.ullberg.us")
              .withVersion("v1alpha3")
              .withPlural("bookmarks")
              .withNamespaced(true)
              .build();

      GenericKubernetesResourceList list = getResourceList(client, ctx);
      return mapResourcesToBookmarks(list);
    } catch (Exception e) {
      Log.error("Error retrieving bookmarks", e);
      return List.of();
    }
  }

  // Method to get the list of resources from the Kubernetes cluster
  private GenericKubernetesResourceList getResourceList(
      final KubernetesClient client, ResourceDefinitionContext resourceDefinitionContext) {
    if (anyNamespace) {
      return client.genericKubernetesResources(resourceDefinitionContext).inAnyNamespace().list();
    }

    // For each specified namespace, get the resource
    GenericKubernetesResourceList list = new GenericKubernetesResourceList();
    for (String ns : matchNames.orElse(List.of())) {
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
   * Maps a list of generic Kubernetes resources to a list of {@link BookmarkSpec} objects.
   *
   * @param list Kubernetes resource list to map
   * @return list of {@link BookmarkSpec}
   */
  private List<BookmarkSpec> mapResourcesToBookmarks(GenericKubernetesResourceList list) {
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

              return new BookmarkSpec(name, group, icon, url, info, targetBlank, location);
            })
        .toList();
  }

  /**
   * Retrieves bookmarks from the "hajimari.io" group namespace.
   *
   * @return list of {@link BookmarkSpec} representing Hajimari bookmarks
   */
  public List<BookmarkSpec> retrieveHajimariBookmarks() {
    Log.debug("Retrieve Hajimari Bookmarks");
    try (KubernetesClient client = new KubernetesClientBuilder().build()) {
      ResourceDefinitionContext resourceDefinitionContext =
          new ResourceDefinitionContext.Builder()
              .withGroup("hajimari.io")
              .withVersion("v1alpha1")
              .withPlural("bookmarks")
              .withNamespaced(true)
              .build();

      GenericKubernetesResourceList list = getResourceList(client, resourceDefinitionContext);

      return mapResourcesToBookmarks(list);
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
  public List<BookmarkGroup> generateBookmarkGroups(List<BookmarkSpec> bookmarklist) {
    var groups = new LinkedList<BookmarkGroup>();

    // Group the bookmarks by their group property
    for (BookmarkSpec bookmark : bookmarklist) {
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

  /**
   * Gets the URL of the bookmark from the Kubernetes resource.
   *
   * @param item Kubernetes resource item
   * @return URL string or null if not present
   */
  private String getUrl(GenericKubernetesResource item) {
    Map<String, Object> spec = getSpec(item);

    if (spec.containsKey("url")) {
      return spec.get("url").toString();
    }

    return null;
  }

  /**
   * Gets the icon of the bookmark from the Kubernetes resource.
   *
   * @param item Kubernetes resource item
   * @return icon string or null if not present
   */
  private String getIcon(GenericKubernetesResource item) {
    Map<String, Object> spec = getSpec(item);

    if (spec.containsKey("icon")) {
      return spec.get("icon").toString();
    }

    return null;
  }

  /**
   * Gets the info/description of the bookmark from the Kubernetes resource.
   *
   * @param item Kubernetes resource item
   * @return info string or null if not present
   */
  private String getInfo(GenericKubernetesResource item) {
    Map<String, Object> spec = getSpec(item);

    if (spec.containsKey("info")) {
      return spec.get("info").toString();
    }

    return null;
  }

  /**
   * Gets the group name of the bookmark from the Kubernetes resource. Falls back to the resource's
   * namespace if group is not specified.
   *
   * @param item Kubernetes resource item
   * @return group name string in lowercase
   */
  private String getGroup(GenericKubernetesResource item) {
    Map<String, Object> spec = getSpec(item);

    return (spec.containsKey("group")
            ? spec.get("group").toString()
            : item.getMetadata().getNamespace())
        .toLowerCase();
  }

  /**
   * Gets the bookmark name from the Kubernetes resource. Falls back to resource metadata name if
   * not specified.
   *
   * @param item Kubernetes resource item
   * @return bookmark name string in lowercase
   */
  private String getBookmarkName(GenericKubernetesResource item) {
    Map<String, Object> spec = getSpec(item);

    if (spec.containsKey("name")) {
      return spec.get("name").toString();
    }

    return item.getMetadata().getName().toLowerCase();
  }

  /**
   * Gets whether the bookmark URL should open in a new tab.
   *
   * @param item Kubernetes resource item
   * @return Boolean true/false or null if not specified
   */
  @Nullable
  private Boolean getTargetBlank(GenericKubernetesResource item) {
    Map<String, Object> spec = getSpec(item);

    if (spec.containsKey("targetBlank")) {
      return Boolean.parseBoolean(spec.get("targetBlank").toString());
    }
    return null;
  }

  /**
   * Gets the location (sorting order) of the bookmark. Treats 0 as 1000 for backwards
   * compatibility.
   *
   * @param item Kubernetes resource item
   * @return location integer
   */
  private int getLocation(GenericKubernetesResource item) {
    Map<String, Object> spec = getSpec(item);

    var location =
        spec.containsKey("location") ? Integer.parseInt(spec.get("location").toString()) : 1000;

    // This is for backwards compatibility with Hajimari, 0 is the same as blank
    if (location == 0) {
      return 1000;
    }

    return location;
  }
}
