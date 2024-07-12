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
import us.ullberg.startpunkt.crd.ApplicationSpec;

@ApplicationScoped
public class ApplicationService {
  @ConfigProperty(name = "startpunkt.namespaceSelector.any", defaultValue = "true")
  private boolean anyNamespace;

  @ConfigProperty(name = "startpunkt.namespaceSelector.matchNames", defaultValue = "[]")
  private String[] matchNames;

  @Timed(value = "startpunkt.kubernetes.applications", description = "Get a list of applications")
  public List<ApplicationSpec> retrieveApplications() {
    Log.info("Retrieve Applications");

    try (final KubernetesClient client = new KubernetesClientBuilder().build()) {
      ResourceDefinitionContext resourceDefinitionContext =
          new ResourceDefinitionContext.Builder().withGroup("startpunkt.ullberg.us")
              .withVersion("v1alpha1").withPlural("applications").withNamespaced(true).build();

      GenericKubernetesResourceList list = getResourceList(client, resourceDefinitionContext);

      List<ApplicationSpec> apps = list.getItems().stream().map(item -> {
        String name = getAppName(item);
        String url = getUrl(item);
        String icon = getIcon(item);
        String iconColor = getIconColor(item);
        String info = getInfo(item);
        String group = getGroup(item);
        Boolean targetBlank = getTargetBlank(item);
        int location = getLocation(item);
        Boolean enable = getEnable(item);

        return new ApplicationSpec(name, group, icon, iconColor, url, info, targetBlank, location,
            enable);
      }).toList();

      return apps;
    } catch (Exception e) {
      return List.of();
    }
  }

  private GenericKubernetesResourceList getResourceList(final KubernetesClient client,
      ResourceDefinitionContext resourceDefinitionContext) {
    if (anyNamespace) {
      return client.genericKubernetesResources(resourceDefinitionContext).inAnyNamespace().list();
    }

    // For each namespace, get the resource
    GenericKubernetesResourceList list = new GenericKubernetesResourceList();
    for (String namespace : matchNames) {
      list.getItems().addAll(client.genericKubernetesResources(resourceDefinitionContext)
          .inNamespace(namespace).list().getItems());
    }

    return list;
  }

  @Timed(value = "startpunkt.kubernetes.hajimari",
      description = "Get a list of hajimari applications")
  public List<ApplicationSpec> retrieveHajimariApplications() {
    Log.info("Retrieve Hajimari Applications");

    try (final KubernetesClient client = new KubernetesClientBuilder().build()) {
      ResourceDefinitionContext resourceDefinitionContext =
          new ResourceDefinitionContext.Builder().withGroup("hajimari.io").withVersion("v1alpha1")
              .withPlural("applications").withNamespaced(true).build();

      GenericKubernetesResourceList list = getResourceList(client, resourceDefinitionContext);

      List<ApplicationSpec> apps = list.getItems().stream().map(item -> {
        Boolean enable = getEnable(item);
        String name = getAppName(item);
        String url = getUrl(item);
        String icon = getIcon(item);
        String iconColor = getIconColor(item);
        String info = getInfo(item);
        String group = getGroup(item);
        Boolean targetBlank = getTargetBlank(item);
        int location = getLocation(item);

        return new ApplicationSpec(name, group, icon, iconColor, url, info, targetBlank, location,
            enable);
      }).toList();

      return apps;
    } catch (Exception e) {
      return List.of();
    }
  }

  @Timed(value = "startpunkt.kubernetes.openshift", description = "Get a list of openshift routes")
  public List<ApplicationSpec> retrieveRoutesApplications() {
    Log.info("Retrieve OpenShift Routes");
    try (final KubernetesClient client = new KubernetesClientBuilder().build()) {
      ResourceDefinitionContext resourceDefinitionContext =
          new ResourceDefinitionContext.Builder().withGroup("route.openshift.io").withVersion("v1")
              .withPlural("routes").withNamespaced(true).build();

      GenericKubernetesResourceList list = getResourceList(client, resourceDefinitionContext);

      return list.getItems().stream().map(item -> {
        String name = getAppName(item);
        String url = getUrl(item);
        String icon = getIcon(item);
        String iconColor = getIconColor(item);
        String info = getInfo(item);
        String group = getGroup(item);
        Boolean targetBlank = getTargetBlank(item);
        int location = getLocation(item);
        Boolean enable = getEnable(item);

        return new ApplicationSpec(name, group, icon, iconColor, url, info, targetBlank, location,
            enable);
      }).toList();
    } catch (Exception e) {
      return List.of();
    }
  }

  @Timed(value = "startpunkt.kubernetes.ingress", description = "Get a list of ingress objects")
  public List<ApplicationSpec> retrieveIngressApplications() {
    Log.info("Retrieve Ingress objects");
    try (final KubernetesClient client = new KubernetesClientBuilder().build()) {
      ResourceDefinitionContext resourceDefinitionContext =
          new ResourceDefinitionContext.Builder().withGroup("networking.k8s.io").withVersion("v1")
              .withPlural("ingresses").withNamespaced(true).build();

      GenericKubernetesResourceList list = getResourceList(client, resourceDefinitionContext);

      return list.getItems().stream().map(item -> {
        String name = getAppName(item);
        String url = getUrl(item);
        String icon = getIcon(item);
        String iconColor = getIconColor(item);
        String info = getInfo(item);
        String group = getGroup(item);
        Boolean targetBlank = getTargetBlank(item);
        int location = getLocation(item);
        Boolean enable = getEnable(item);

        return new ApplicationSpec(name, group, icon, iconColor, url, info, targetBlank, location,
            enable);
      }).toList();
    } catch (Exception e) {
      return List.of();
    }
  }

  public List<ApplicationSpec> retrieveRoutesApplications(boolean onlyAnnotated) {
    var apps = retrieveRoutesApplications();

    if (onlyAnnotated)
      return apps.stream().filter(app -> app.getEnabled() != null && app.getEnabled()).toList();
    else
      return apps;
  }

  private String getUrl(GenericKubernetesResource item) {
    Map<String, Object> props = item.getAdditionalProperties();
    @SuppressWarnings("unchecked")
    Map<String, Object> spec = (Map<String, Object>) props.get("spec");
    Map<String, String> annotations = item.getMetadata().getAnnotations();

    if (spec.containsKey("url"))
      return spec.get("url").toString();
    else if (annotations.containsKey("hajimari.io/url"))
      return annotations.get("hajimari.io/url");
    else if (annotations.containsKey("forecastle.stakater.com/url"))
      return annotations.get("forecastle.stakater.com/url");

    String protocol = spec.containsKey("tls") ? "https://" : "http://";
    String host = spec.containsKey("host") ? spec.get("host").toString() : "localhost";
    String path = spec.containsKey("path") ? spec.get("path").toString() : "";

    return protocol + host + path;
  }

  private String getIcon(GenericKubernetesResource item) {
    Map<String, Object> props = item.getAdditionalProperties();
    @SuppressWarnings("unchecked")
    Map<String, Object> spec = (Map<String, Object>) props.get("spec");
    Map<String, String> annotations = item.getMetadata().getAnnotations();

    if (spec.containsKey("icon"))
      return spec.get("icon").toString();
    else if (annotations.containsKey("hajimari.io/icon"))
      return annotations.get("hajimari.io/icon");
    else if (annotations.containsKey("forecastle.stakater.com/icon"))
      return annotations.get("forecastle.stakater.com/icon");

    return null;
  }

  private String getIconColor(GenericKubernetesResource item) {
    Map<String, Object> props = item.getAdditionalProperties();
    @SuppressWarnings("unchecked")
    Map<String, Object> spec = (Map<String, Object>) props.get("spec");
    Map<String, String> annotations = item.getMetadata().getAnnotations();

    if (spec.containsKey("iconColor"))
      return spec.get("iconColor").toString();
    else if (annotations.containsKey("hajimari.io/iconColor"))
      return annotations.get("hajimari.io/iconColor");

    return null;
  }

  private String getInfo(GenericKubernetesResource item) {
    Map<String, Object> props = item.getAdditionalProperties();
    @SuppressWarnings("unchecked")
    Map<String, Object> spec = (Map<String, Object>) props.get("spec");
    Map<String, String> annotations = item.getMetadata().getAnnotations();

    if (spec.containsKey("info"))
      return spec.get("info").toString();
    else if (annotations.containsKey("hajimari.io/info"))
      return annotations.get("hajimari.io/info");

    return null;
  }

  private String getGroup(GenericKubernetesResource item) {
    Map<String, Object> props = item.getAdditionalProperties();
    @SuppressWarnings("unchecked")
    Map<String, Object> spec = (Map<String, Object>) props.get("spec");
    Map<String, String> annotations = item.getMetadata().getAnnotations();

    if (spec.containsKey("group"))
      return spec.get("group").toString().toLowerCase();
    else if (annotations.containsKey("hajimari.io/group"))
      return annotations.get("hajimari.io/group").toLowerCase();
    else if (annotations.containsKey("forecastle.stakater.com/group"))
      return annotations.get("forecastle.stakater.com/group").toLowerCase();

    return item.getMetadata().getNamespace().toLowerCase();
  }

  private String getAppName(GenericKubernetesResource item) {
    Map<String, Object> props = item.getAdditionalProperties();
    @SuppressWarnings("unchecked")
    Map<String, Object> spec = (Map<String, Object>) props.get("spec");
    Map<String, String> annotations = item.getMetadata().getAnnotations();

    if (spec.containsKey("name"))
      return spec.get("name").toString().toLowerCase();
    else if (annotations.containsKey("hajimari.io/appName"))
      return annotations.get("hajimari.io/appName").toLowerCase();
    else if (annotations.containsKey("forecastle.stakater.com/appName"))
      return annotations.get("forecastle.stakater.com/appName").toLowerCase();

    return item.getMetadata().getName().toLowerCase();
  }

  private Boolean getTargetBlank(GenericKubernetesResource item) {
    Map<String, Object> props = item.getAdditionalProperties();
    @SuppressWarnings("unchecked")
    Map<String, Object> spec = (Map<String, Object>) props.get("spec");
    Map<String, String> annotations = item.getMetadata().getAnnotations();

    if (spec.containsKey("targetBlank"))
      return Boolean.parseBoolean(spec.get("targetBlank").toString());

    if (annotations.containsKey("hajimari.io/targetBlank"))
      return Boolean.parseBoolean(annotations.get("hajimari.io/targetBlank"));

    return null;
  }

  private int getLocation(GenericKubernetesResource item) {
    Map<String, Object> props = item.getAdditionalProperties();
    @SuppressWarnings("unchecked")
    Map<String, Object> spec = (Map<String, Object>) props.get("spec");
    Map<String, String> annotations = item.getMetadata().getAnnotations();

    if (annotations.containsKey("hajimari.io/location"))
      return Integer.parseInt(annotations.get("hajimari.io/location"));

    if (!spec.containsKey("location"))
      return 1000;

    int location =
        spec.containsKey("location") ? Integer.parseInt(spec.get("location").toString()) : 1000;

    // This is for backwards compatibility with Hajimari, 0 is the same as blank
    if (location == 0) {
      return 1000;
    }

    return location;
  }

  private Boolean getEnable(GenericKubernetesResource item) {
    Map<String, Object> props = item.getAdditionalProperties();
    @SuppressWarnings("unchecked")
    Map<String, Object> spec = (Map<String, Object>) props.get("spec");
    Map<String, String> annotations = item.getMetadata().getAnnotations();

    if (spec.containsKey("enable"))
      return Boolean.parseBoolean(spec.get("enable").toString());
    else if (annotations.containsKey("startpunkt.ullberg.us/enable"))
      return Boolean.parseBoolean(annotations.get("startpunkt.ullberg.us/enable"));
    else if (annotations.containsKey("hajimari.io/enable"))
      return Boolean.parseBoolean(annotations.get("hajimari.io/enable"));
    else if (annotations.containsKey("forecastle.stakater.com/expose"))
      return Boolean.parseBoolean(annotations.get("forecastle.stakater.com/expose"));

    return null;
  }
}
