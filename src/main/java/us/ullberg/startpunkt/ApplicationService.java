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
import us.ullberg.startpunkt.model.Application;

@ApplicationScoped
public class ApplicationService {
  @Timed(
      value = "startpunkt.kubernetes.hajimari",
      description = "Get a list of hajimari applications")
  public List<Application> retrieveHajimariApplications() {
    Log.info("Retrieve Hajimari Applications");

    try (final KubernetesClient client = new KubernetesClientBuilder().build()) {
      ResourceDefinitionContext resourceDefinitionContext =
          new ResourceDefinitionContext.Builder()
              .withGroup("hajimari.io")
              .withVersion("v1alpha1")
              .withPlural("applications")
              .withNamespaced(true)
              .build();

      GenericKubernetesResourceList list =
          client.genericKubernetesResources(resourceDefinitionContext).inAnyNamespace().list();

      List<Application> apps =
          list.getItems().stream()
              .map(
                  item -> {
                    String name = getAppName(item);
                    String url = getUrl(item);
                    String icon = getIcon(item);
                    String iconColor = getIconColor(item);
                    String info = getInfo(item);
                    String group = getGroup(item);
                    Boolean targetBlank = getTargetBlank(item);
                    int location = getLocation(item);
                    Boolean enable = getEnable(item);

                    return new Application(
                        name, group, icon, iconColor, url, info, targetBlank, location, enable);
                  })
              .toList();

      return apps;
    } catch (Exception e) {
      return List.of();
    }
  }

  @Timed(value = "startpunkt.kubernetes.openshift", description = "Get a list of openshift routes")
  public List<Application> retrieveRoutesApplications() {
    Log.info("Retrieve OpenShift Routes");
    try (final KubernetesClient client = new KubernetesClientBuilder().build()) {
      ResourceDefinitionContext resourceDefinitionContext =
          new ResourceDefinitionContext.Builder()
              .withGroup("route.openshift.io")
              .withVersion("v1")
              .withPlural("routes")
              .withNamespaced(true)
              .build();

      GenericKubernetesResourceList list =
          client.genericKubernetesResources(resourceDefinitionContext).inAnyNamespace().list();

      List<Application> apps =
          list.getItems().stream()
              .map(
                  item -> {
                    String name = getAppName(item);
                    String url = getUrl(item);
                    String icon = getIcon(item);
                    String iconColor = getIconColor(item);
                    String info = getInfo(item);
                    String group = getGroup(item);
                    Boolean targetBlank = getTargetBlank(item);
                    int location = getLocation(item);
                    Boolean enable = getEnable(item);

                    return new Application(
                        name, group, icon, iconColor, url, info, targetBlank, location, enable);
                  })
              .toList();

      return apps;
    } catch (Exception e) {
      return List.of();
    }
  }

  private String getUrl(GenericKubernetesResource item) {
    Map<String, Object> props = item.getAdditionalProperties();
    Map<String, Object> spec = (Map<String, Object>) props.get("spec");
    Map<String, String> annotations = item.getMetadata().getAnnotations();

    if (annotations.containsKey("hajimari.io/url")) return annotations.get("hajimari.io/url");
    if (annotations.containsKey("forecastle.stakater.com/url"))
      return annotations.get("forecastle.stakater.com/url");
    if (spec.containsKey("url")) return spec.get("url").toString();

    String protocol = spec.containsKey("tls") ? "https://" : "http://";
    String host = spec.containsKey("host") ? spec.get("host").toString() : "localhost";
    String path = spec.containsKey("path") ? spec.get("path").toString() : "";

    return protocol + host + path;
  }

  private String getIcon(GenericKubernetesResource item) {
    Map<String, Object> props = item.getAdditionalProperties();
    Map<String, Object> spec = (Map<String, Object>) props.get("spec");
    Map<String, String> annotations = item.getMetadata().getAnnotations();

    if (annotations.containsKey("hajimari.io/icon")) return annotations.get("hajimari.io/icon");
    if (annotations.containsKey("forecastle.stakater.com/icon"))
      return annotations.get("forecastle.stakater.com/icon");

    return spec.containsKey("icon") ? spec.get("icon").toString() : null;
  }

  private String getIconColor(GenericKubernetesResource item) {
    Map<String, Object> props = item.getAdditionalProperties();
    Map<String, Object> spec = (Map<String, Object>) props.get("spec");
    Map<String, String> annotations = item.getMetadata().getAnnotations();

    if (annotations.containsKey("hajimari.io/iconColor"))
      return annotations.get("hajimari.io/iconColor");

    return spec.containsKey("iconColor") ? spec.get("iconColor").toString() : null;
  }

  private String getInfo(GenericKubernetesResource item) {
    Map<String, Object> props = item.getAdditionalProperties();
    Map<String, Object> spec = (Map<String, Object>) props.get("spec");
    Map<String, String> annotations = item.getMetadata().getAnnotations();

    if (annotations.containsKey("hajimari.io/info")) return annotations.get("hajimari.io/info");

    return spec.containsKey("info") ? spec.get("info").toString() : null;
  }

  private String getGroup(GenericKubernetesResource item) {
    Map<String, Object> props = item.getAdditionalProperties();
    Map<String, Object> spec = (Map<String, Object>) props.get("spec");
    Map<String, String> annotations = item.getMetadata().getAnnotations();

    if (annotations.containsKey("hajimari.io/group"))
      return annotations.get("hajimari.io/group").toLowerCase();
    if (annotations.containsKey("forecastle.stakater.com/group"))
      return annotations.get("forecastle.stakater.com/group").toLowerCase();

    return (spec.containsKey("group")
            ? spec.get("group").toString()
            : item.getMetadata().getNamespace())
        .toLowerCase();
  }

  private String getAppName(GenericKubernetesResource item) {
    Map<String, Object> props = item.getAdditionalProperties();
    Map<String, String> annotations = item.getMetadata().getAnnotations();

    if (annotations.containsKey("hajimari.io/appName"))
      return annotations.get("hajimari.io/appName").toLowerCase();
    if (annotations.containsKey("forecastle.stakater.com/appName"))
      return annotations.get("forecastle.stakater.com/appName").toLowerCase();

    return item.getMetadata().getName().toLowerCase();
  }

  private Boolean getTargetBlank(GenericKubernetesResource item) {
    Map<String, Object> props = item.getAdditionalProperties();
    Map<String, Object> spec = (Map<String, Object>) props.get("spec");
    Map<String, String> annotations = item.getMetadata().getAnnotations();

    if (annotations.containsKey("hajimari.io/targetBlank"))
      return Boolean.parseBoolean(annotations.get("hajimari.io/targetBlank"));

    return spec.containsKey("targetBlank")
        ? Boolean.parseBoolean(spec.get("targetBlank").toString())
        : null;
  }

  private int getLocation(GenericKubernetesResource item) {
    Map<String, Object> props = item.getAdditionalProperties();
    Map<String, Object> spec = (Map<String, Object>) props.get("spec");
    Map<String, String> annotations = item.getMetadata().getAnnotations();

    if (annotations.containsKey("hajimari.io/location"))
      return Integer.parseInt(annotations.get("hajimari.io/location"));

    if( !spec.containsKey("location") )
      return 1000;

    int location = spec.containsKey("location") ? Integer.parseInt(spec.get("location").toString()) : 1000;

    // This is for backwards compatibility with Hajimari, 0 is the same as blank
    if (location == 0) {
      return 1000;
    }

    return location;
  }

  private Boolean getEnable(GenericKubernetesResource item) {
    Map<String, Object> props = item.getAdditionalProperties();
    Map<String, Object> spec = (Map<String, Object>) props.get("spec");
    Map<String, String> annotations = item.getMetadata().getAnnotations();

    if (annotations.containsKey("hajimari.io/appName"))
      return Boolean.parseBoolean(annotations.get("hajimari.io/appName"));
    if (annotations.containsKey("forecastle.stakater.com/expose"))
      return Boolean.parseBoolean(annotations.get("forecastle.stakater.com/expose"));

    return spec.containsKey("enable") ? Boolean.parseBoolean(spec.get("enable").toString()) : null;
  }
}
