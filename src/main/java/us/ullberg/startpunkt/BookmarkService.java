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
import us.ullberg.startpunkt.crd.BookmarkSpec;

@ApplicationScoped
public class BookmarkService {
  @Timed(value = "startpunkt.kubernetes.bookmarks", description = "Get a list of bookmarks")
  public List<BookmarkSpec> retrieveBookmarks() {
    Log.info("Retrieve Bookmarks");

    try (final KubernetesClient client = new KubernetesClientBuilder().build()) {
      ResourceDefinitionContext resourceDefinitionContext =
          new ResourceDefinitionContext.Builder()
              .withGroup("startpunkt.ullberg.us")
              .withVersion("v1alpha1")
              .withPlural("bookmarks")
              .withNamespaced(true)
              .build();

      GenericKubernetesResourceList list =
          client.genericKubernetesResources(resourceDefinitionContext).inAnyNamespace().list();

      List<BookmarkSpec> bookmarks =
          list.getItems().stream()
              .map(
                  item -> {
                    String name = getBookmarkName(item);
                    String url = getUrl(item);
                    String icon = getIcon(item);
                    String info = getInfo(item);
                    String group = getGroup(item);
                    Boolean targetBlank = getTargetBlank(item);
                    int location = getLocation(item);

                    return new BookmarkSpec(name, group, icon, url, info, targetBlank, location);
                  })
              .toList();

      return bookmarks;
    } catch (Exception e) {
      Log.error("Error retrieving bookmarks", e);
      return List.of();
    }
  }

  @Timed(value = "startpunkt.kubernetes.hajimari", description = "Get a list of hajimari bookmarks")
  public List<BookmarkSpec> retrieveHajimariBookmarks() {
    Log.info("Retrieve Hajimari Bookmarks");

    try (final KubernetesClient client = new KubernetesClientBuilder().build()) {
      ResourceDefinitionContext resourceDefinitionContext =
          new ResourceDefinitionContext.Builder()
              .withGroup("hajimari.io")
              .withVersion("v1alpha1")
              .withPlural("bookmarks")
              .withNamespaced(true)
              .build();

      GenericKubernetesResourceList list =
          client.genericKubernetesResources(resourceDefinitionContext).inAnyNamespace().list();

      List<BookmarkSpec> bookmarks =
          list.getItems().stream()
              .map(
                  item -> {
                    String name = getBookmarkName(item);
                    String url = getUrl(item);
                    String icon = getIcon(item);
                    String info = getInfo(item);
                    String group = getGroup(item);
                    Boolean targetBlank = getTargetBlank(item);
                    int location = getLocation(item);

                    return new BookmarkSpec(name, group, icon, url, info, targetBlank, location);
                  })
              .toList();

      return bookmarks;
    } catch (Exception e) {
      Log.error("Error retrieving bookmarks", e);
      return List.of();
    }
  }

  private String getUrl(GenericKubernetesResource item) {
    Map<String, Object> props = item.getAdditionalProperties();
    @SuppressWarnings("unchecked")
    Map<String, Object> spec = (Map<String, Object>) props.get("spec");

    if (spec.containsKey("url")) return spec.get("url").toString();

    throw new IllegalArgumentException("URL is required");
  }

  private String getIcon(GenericKubernetesResource item) {
    Map<String, Object> props = item.getAdditionalProperties();
    @SuppressWarnings("unchecked")
    Map<String, Object> spec = (Map<String, Object>) props.get("spec");

    if (spec.containsKey("icon")) return spec.get("icon").toString();

    return null;
  }

  private String getInfo(GenericKubernetesResource item) {
    Map<String, Object> props = item.getAdditionalProperties();
    @SuppressWarnings("unchecked")
    Map<String, Object> spec = (Map<String, Object>) props.get("spec");

    if (spec.containsKey("info")) return spec.get("info").toString();

    return null;
  }

  private String getGroup(GenericKubernetesResource item) {
    Map<String, Object> props = item.getAdditionalProperties();
    @SuppressWarnings("unchecked")
    Map<String, Object> spec = (Map<String, Object>) props.get("spec");

    return (spec.containsKey("group")
            ? spec.get("group").toString()
            : item.getMetadata().getNamespace())
        .toLowerCase();
  }

  private String getBookmarkName(GenericKubernetesResource item) {
    Map<String, Object> props = item.getAdditionalProperties();
    @SuppressWarnings("unchecked")
    Map<String, Object> spec = (Map<String, Object>) props.get("spec");

    if (spec.containsKey("name")) return spec.get("name").toString();

    return item.getMetadata().getName().toLowerCase();
  }

  private Boolean getTargetBlank(GenericKubernetesResource item) {
    Map<String, Object> props = item.getAdditionalProperties();
    @SuppressWarnings("unchecked")
    Map<String, Object> spec = (Map<String, Object>) props.get("spec");

    if (spec.containsKey("targetBlank"))
      return Boolean.parseBoolean(spec.get("targetBlank").toString());

    return null;
  }

  private int getLocation(GenericKubernetesResource item) {
    Map<String, Object> props = item.getAdditionalProperties();
    @SuppressWarnings("unchecked")
    Map<String, Object> spec = (Map<String, Object>) props.get("spec");

    return spec.containsKey("location") ? Integer.parseInt(spec.get("location").toString()) : 1000;
  }
}
