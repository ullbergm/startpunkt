package us.ullberg.startpunkt;

import io.fabric8.kubernetes.api.model.GenericKubernetesResource;
import io.fabric8.kubernetes.api.model.GenericKubernetesResourceList;
import io.fabric8.kubernetes.client.KubernetesClient;
import io.fabric8.kubernetes.client.KubernetesClientBuilder;
import io.fabric8.kubernetes.client.dsl.base.ResourceDefinitionContext;
import io.micrometer.core.annotation.Timed;
import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.List;
import java.util.Map;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import us.ullberg.startpunkt.crd.BookmarkSpec;

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
    Log.info("Retrieve Bookmarks");

    try (final KubernetesClient client = new KubernetesClientBuilder().build()) {
      // Define the resource context for Startpunkt bookmarks
      ResourceDefinitionContext resourceDefinitionContext =
          new ResourceDefinitionContext.Builder().withGroup("startpunkt.ullberg.us")
              .withVersion("v1alpha1").withPlural("bookmarks").withNamespaced(true).build();

      // Get the list of resources
      GenericKubernetesResourceList list = getResourceList(client, resourceDefinitionContext);

      // Map the list of resources to a list of BookmarkSpec objects
      List<BookmarkSpec> bookmarks = list.getItems().stream().map(item -> {
        String name = getBookmarkName(item);
        String url = getUrl(item);
        String icon = getIcon(item);
        String info = getInfo(item);
        String group = getGroup(item);
        Boolean targetBlank = getTargetBlank(item);
        int location = getLocation(item);

        return new BookmarkSpec(name, group, icon, url, info, targetBlank, location);
      }).toList();

      return bookmarks;
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
    for (String namespace : matchNames) {
      list.getItems().addAll(client.genericKubernetesResources(resourceDefinitionContext)
          .inNamespace(namespace).list().getItems());
    }

    return list;
  }

  // Method to retrieve the list of Hajimari bookmarks
  @Timed(value = "startpunkt.kubernetes.hajimari", description = "Get a list of hajimari bookmarks")
  public List<BookmarkSpec> retrieveHajimariBookmarks() {
    Log.info("Retrieve Hajimari Bookmarks");

    try (final KubernetesClient client = new KubernetesClientBuilder().build()) {
      // Define the resource context for Hajimari bookmarks
      ResourceDefinitionContext resourceDefinitionContext =
          new ResourceDefinitionContext.Builder().withGroup("hajimari.io").withVersion("v1alpha1")
              .withPlural("bookmarks").withNamespaced(true).build();

      // Get the list of resources
      GenericKubernetesResourceList list = getResourceList(client, resourceDefinitionContext);

      // Map the list of resources to a list of BookmarkSpec objects
      List<BookmarkSpec> bookmarks = list.getItems().stream().map(item -> {
        String name = getBookmarkName(item);
        String url = getUrl(item);
        String icon = getIcon(item);
        String info = getInfo(item);
        String group = getGroup(item);
        Boolean targetBlank = getTargetBlank(item);
        int location = getLocation(item);

        return new BookmarkSpec(name, group, icon, url, info, targetBlank, location);
      }).toList();

      return bookmarks;
    } catch (Exception e) {
      Log.error("Error retrieving bookmarks", e);
      return List.of();
    }
  }

  // Helper method to get the URL of a bookmark from the resource
  private String getUrl(GenericKubernetesResource item) {
    Map<String, Object> props = item.getAdditionalProperties();
    @SuppressWarnings("unchecked")
    Map<String, Object> spec = (Map<String, Object>) props.get("spec");

    if (spec.containsKey("url"))
      return spec.get("url").toString();

    throw new IllegalArgumentException("URL is required");
  }

  // Helper method to get the icon of a bookmark from the resource
  private String getIcon(GenericKubernetesResource item) {
    Map<String, Object> props = item.getAdditionalProperties();
    @SuppressWarnings("unchecked")
    Map<String, Object> spec = (Map<String, Object>) props.get("spec");

    if (spec.containsKey("icon"))
      return spec.get("icon").toString();

    return null;
  }

  // Helper method to get the info of a bookmark from the resource
  private String getInfo(GenericKubernetesResource item) {
    Map<String, Object> props = item.getAdditionalProperties();
    @SuppressWarnings("unchecked")
    Map<String, Object> spec = (Map<String, Object>) props.get("spec");

    if (spec.containsKey("info"))
      return spec.get("info").toString();

    return null;
  }

  // Helper method to get the group of a bookmark from the resource
  private String getGroup(GenericKubernetesResource item) {
    Map<String, Object> props = item.getAdditionalProperties();
    @SuppressWarnings("unchecked")
    Map<String, Object> spec = (Map<String, Object>) props.get("spec");

    return (spec.containsKey("group") ? spec.get("group").toString()
        : item.getMetadata().getNamespace()).toLowerCase();
  }

  // Helper method to get the bookmark name from the resource
  private String getBookmarkName(GenericKubernetesResource item) {
    Map<String, Object> props = item.getAdditionalProperties();
    @SuppressWarnings("unchecked")
    Map<String, Object> spec = (Map<String, Object>) props.get("spec");

    if (spec.containsKey("name"))
      return spec.get("name").toString();

    return item.getMetadata().getName().toLowerCase();
  }

  // Helper method to determine if the bookmark URL should open in a new tab
  private Boolean getTargetBlank(GenericKubernetesResource item) {
    Map<String, Object> props = item.getAdditionalProperties();
    @SuppressWarnings("unchecked")
    Map<String, Object> spec = (Map<String, Object>) props.get("spec");

    if (spec.containsKey("targetBlank"))
      return Boolean.parseBoolean(spec.get("targetBlank").toString());

    return null;
  }

  // Helper method to get the location of the bookmark from the resource
  private int getLocation(GenericKubernetesResource item) {
    Map<String, Object> props = item.getAdditionalProperties();
    @SuppressWarnings("unchecked")
    Map<String, Object> spec = (Map<String, Object>) props.get("spec");

    return spec.containsKey("location") ? Integer.parseInt(spec.get("location").toString()) : 1000;
  }
}
