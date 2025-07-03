package us.ullberg.startpunkt.service;

import java.util.LinkedList;
import java.util.List;
import java.util.Map;

import org.eclipse.microprofile.config.inject.ConfigProperty;

import io.fabric8.kubernetes.api.model.GenericKubernetesResource;
import io.fabric8.kubernetes.api.model.GenericKubernetesResourceList;
import io.fabric8.kubernetes.client.KubernetesClient;
import io.fabric8.kubernetes.client.KubernetesClientBuilder;
import io.fabric8.kubernetes.client.dsl.base.ResourceDefinitionContext;
import io.micrometer.core.annotation.Timed;
import io.quarkus.logging.Log;
import jakarta.annotation.Nullable;
import jakarta.enterprise.context.ApplicationScoped;
import us.ullberg.startpunkt.crd.BookmarkSpec;
import us.ullberg.startpunkt.objects.BookmarkGroup;

// Service class for managing bookmarks
@ApplicationScoped
public class BookmarkService {

  // Configuration properties for namespace selection
  @ConfigProperty(name = "startpunkt.namespaceSelector.any", defaultValue = "true")
  private boolean anyNamespace;

  @ConfigProperty(name = "startpunkt.namespaceSelector.matchNames", defaultValue = "[]")
  private String[] matchNames;

  // Method to retrieve the list of bookmarks
  @Timed(value = "startpunkt.kubernetes.bookmarks", description = "Get a list of bookmarks")
  public List<BookmarkSpec> retrieveBookmarks() {
    try (KubernetesClient client = new KubernetesClientBuilder().build()) {
      ResourceDefinitionContext ctx =
          new ResourceDefinitionContext.Builder().withGroup("startpunkt.ullberg.us")
              .withVersion("v1alpha1").withPlural("bookmarks").withNamespaced(true).build();

      GenericKubernetesResourceList list = getResourceList(client, ctx);
      return mapResourcesToBookmarks(list);
    } catch (Exception e) {
      Log.error("Error retrieving bookmarks", e);
      return List.of();
    }
  }

  // Method to get the list of resources from the Kubernetes cluster
  private GenericKubernetesResourceList getResourceList(final KubernetesClient client,
      ResourceDefinitionContext resourceDefinitionContext) {
    if (anyNamespace) {
      return client.genericKubernetesResources(resourceDefinitionContext).inAnyNamespace().list();
    }

    // For each specified namespace, get the resource
    GenericKubernetesResourceList list = new GenericKubernetesResourceList();
    for (String ns : matchNames) {
      list.getItems().addAll(client.genericKubernetesResources(resourceDefinitionContext)
          .inNamespace(ns).list().getItems());
    }

    return list;
  }

  private List<BookmarkSpec> mapResourcesToBookmarks(GenericKubernetesResourceList list) {
    return list.getItems().stream().map(item -> {
      Map<String, Object> spec = getSpec(item);
      String name = spec.getOrDefault("name", item.getMetadata().getName()).toString();
      String url = (String) spec.get("url");
      String icon = (String) spec.get("icon");
      String info = (String) spec.get("info");
      String group = (spec.containsKey("group") ? spec.get("group").toString()
          : item.getMetadata().getNamespace()).toLowerCase();
      Boolean targetBlank =
          spec.containsKey("targetBlank") ? Boolean.parseBoolean(spec.get("targetBlank").toString())
              : null;
      int location =
          spec.containsKey("location") ? Integer.parseInt(spec.get("location").toString()) : 1000;
      if (location == 0)
        location = 1000;

      return new BookmarkSpec(name, group, icon, url, info, targetBlank, location);
    }).toList();
  }



  // Method to retrieve the list of Hajimari bookmarks
  public List<BookmarkSpec> retrieveHajimariBookmarks() {
    Log.info("Retrieve Hajimari Bookmarks");
    try (KubernetesClient client = new KubernetesClientBuilder().build()) {
      ResourceDefinitionContext resourceDefinitionContext =
          new ResourceDefinitionContext.Builder().withGroup("hajimari.io").withVersion("v1alpha1")
              .withPlural("bookmarks").withNamespaced(true).build();

      GenericKubernetesResourceList list = getResourceList(client, resourceDefinitionContext);

      return mapResourcesToBookmarks(list);
    } catch (Exception e) {
      Log.error("Error retrieving hajimari bookmarks", e);
      return List.of();
    }
  }

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

  private Map<String, Object> getSpec(GenericKubernetesResource item) {
    Map<String, Object> props = item.getAdditionalProperties();
    if (props == null)
      return Map.of();
    @SuppressWarnings("unchecked")
    Map<String, Object> spec = (Map<String, Object>) props.get("spec");
    return spec != null ? spec : Map.of();
  }

  // Helper method to get the URL of a bookmark from the resource
  private String getUrl(GenericKubernetesResource item) {
    Map<String, Object> spec = getSpec(item);

    if (spec.containsKey("url"))
      return spec.get("url").toString();

    return null;
  }

  // Helper method to get the icon of a bookmark from the resource
  private String getIcon(GenericKubernetesResource item) {
    Map<String, Object> spec = getSpec(item);

    if (spec.containsKey("icon"))
      return spec.get("icon").toString();

    return null;
  }

  // Helper method to get the info of a bookmark from the resource
  private String getInfo(GenericKubernetesResource item) {
    Map<String, Object> spec = getSpec(item);

    if (spec.containsKey("info"))
      return spec.get("info").toString();

    return null;
  }

  // Helper method to get the group of a bookmark from the resource
  private String getGroup(GenericKubernetesResource item) {
    Map<String, Object> spec = getSpec(item);

    return (spec.containsKey("group") ? spec.get("group").toString()
        : item.getMetadata().getNamespace()).toLowerCase();
  }

  // Helper method to get the bookmark name from the resource
  private String getBookmarkName(GenericKubernetesResource item) {
    Map<String, Object> spec = getSpec(item);

    if (spec.containsKey("name"))
      return spec.get("name").toString();

    return item.getMetadata().getName().toLowerCase();
  }

  // Helper method to determine if the bookmark URL should open in a new tab
  @Nullable
  private Boolean getTargetBlank(GenericKubernetesResource item) {
    Map<String, Object> spec = getSpec(item);

    if (spec.containsKey("targetBlank"))
      return Boolean.parseBoolean(spec.get("targetBlank").toString());

    return null;
  }

  // Helper method to get the location of the bookmark from the resource
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
