package us.ullberg.startpunkt.service;

import io.fabric8.kubernetes.api.model.GenericKubernetesResource;
import io.fabric8.kubernetes.client.KubernetesClient;
import io.fabric8.kubernetes.client.Watch;
import io.fabric8.kubernetes.client.Watcher;
import io.fabric8.kubernetes.client.WatcherException;
import io.fabric8.kubernetes.client.dsl.base.ResourceDefinitionContext;
import io.quarkus.logging.Log;
import io.quarkus.runtime.ShutdownEvent;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import us.ullberg.startpunkt.messaging.EventBroadcaster;

/**
 * Service for watching Kubernetes resources and broadcasting events when changes occur. Uses
 * Kubernetes Watch API to monitor resources in real-time instead of polling.
 */
@ApplicationScoped
public class KubernetesResourceWatcher {

  @ConfigProperty(name = "startpunkt.watch.enabled", defaultValue = "true")
  private boolean watchEnabled;

  @ConfigProperty(name = "startpunkt.hajimari.enabled", defaultValue = "false")
  private boolean hajimariEnabled;

  @ConfigProperty(name = "startpunkt.ingress.enabled", defaultValue = "false")
  private boolean ingressEnabled;

  @ConfigProperty(name = "startpunkt.openshift.enabled", defaultValue = "false")
  private boolean openshiftEnabled;

  @ConfigProperty(name = "startpunkt.istio.virtualservice.enabled", defaultValue = "false")
  private boolean istioVirtualServiceEnabled;

  @ConfigProperty(name = "startpunkt.gatewayapi.httproute.enabled", defaultValue = "false")
  private boolean gatewayApiEnabled;

  @ConfigProperty(name = "startpunkt.namespaceSelector.any", defaultValue = "true")
  private boolean anyNamespace;

  @ConfigProperty(name = "startpunkt.namespaceSelector.matchNames")
  private Optional<List<String>> matchNames;

  private final KubernetesClient kubernetesClient;
  private final EventBroadcaster eventBroadcaster;
  private final ApplicationCacheManager cacheManager;
  private final List<Watch> watches = new ArrayList<>();

  // Track resource versions to detect actual changes
  private final Map<String, String> resourceVersions = new ConcurrentHashMap<>();

  public KubernetesResourceWatcher(
      KubernetesClient kubernetesClient,
      EventBroadcaster eventBroadcaster,
      ApplicationCacheManager cacheManager) {
    this.kubernetesClient = kubernetesClient;
    this.eventBroadcaster = eventBroadcaster;
    this.cacheManager = cacheManager;
  }

  /** Starts watching Kubernetes resources when the application starts. */
  void onStart(@Observes StartupEvent ev) {
    if (!watchEnabled) {
      Log.info("Kubernetes resource watching is disabled");
      return;
    }

    Log.info("Starting Kubernetes resource watchers");

    // Watch Startpunkt Applications
    startWatch("startpunkt.ullberg.us", "v1alpha4", "applications", "Startpunkt Application");

    // Watch Startpunkt Bookmarks
    startWatch("startpunkt.ullberg.us", "v1alpha4", "bookmarks", "Startpunkt Bookmark");

    // Watch Hajimari Applications if enabled
    if (hajimariEnabled) {
      startWatch("hajimari.io", "v1alpha1", "applications", "Hajimari Application");
      startWatch("hajimari.io", "v1alpha1", "bookmarks", "Hajimari Bookmark");
    }

    // Watch Ingress resources if enabled
    if (ingressEnabled) {
      startWatch("networking.k8s.io", "v1", "ingresses", "Ingress");
    }

    // Watch OpenShift Routes if enabled
    if (openshiftEnabled) {
      startWatch("route.openshift.io", "v1", "routes", "OpenShift Route");
    }

    // Watch Istio VirtualServices if enabled
    if (istioVirtualServiceEnabled) {
      startWatch("networking.istio.io", "v1beta1", "virtualservices", "Istio VirtualService");
    }

    // Watch Gateway API HTTPRoutes if enabled
    if (gatewayApiEnabled) {
      startWatch("gateway.networking.k8s.io", "v1", "httproutes", "Gateway API HTTPRoute");
    }

    Log.infof("Started %d Kubernetes resource watchers", watches.size());
  }

  /** Stops all watches when the application shuts down. */
  void onStop(@Observes ShutdownEvent ev) {
    Log.info("Stopping Kubernetes resource watchers");
    for (Watch watch : watches) {
      watch.close();
    }
    watches.clear();
    resourceVersions.clear();
    Log.info("Kubernetes resource watchers stopped");
  }

  /**
   * Starts watching a specific Kubernetes resource type.
   *
   * @param group the API group
   * @param version the API version
   * @param plural the plural resource name
   * @param displayName human-readable name for logging
   */
  private void startWatch(String group, String version, String plural, String displayName) {
    try {
      ResourceDefinitionContext context =
          new ResourceDefinitionContext.Builder()
              .withGroup(group)
              .withVersion(version)
              .withPlural(plural)
              .withNamespaced(true)
              .build();

      Watch watch;
      if (anyNamespace) {
        Log.infof("Starting watch for %s in all namespaces", displayName);
        watch =
            kubernetesClient
                .genericKubernetesResources(context)
                .inAnyNamespace()
                .watch(new ResourceWatcher(displayName, plural));
      } else {
        // Watch specific namespaces
        List<String> namespaces = matchNames.orElse(List.of());
        Log.infof("Starting watch for %s in namespaces: %s", displayName, namespaces);

        // For multiple namespaces, we need to create a watch for each namespace
        for (String namespace : namespaces) {
          Watch nsWatch =
              kubernetesClient
                  .genericKubernetesResources(context)
                  .inNamespace(namespace)
                  .watch(new ResourceWatcher(displayName, plural));
          watches.add(nsWatch);
        }
        return; // Don't add a single watch at the end
      }

      watches.add(watch);
      Log.infof("Successfully started watch for %s", displayName);
    } catch (Exception e) {
      Log.errorf(e, "Failed to start watch for %s", displayName);
    }
  }

  /** Watcher implementation that handles resource events. */
  private class ResourceWatcher implements Watcher<GenericKubernetesResource> {
    private final String displayName;
    private final String resourceType;

    ResourceWatcher(String displayName, String resourceType) {
      this.displayName = displayName;
      this.resourceType = resourceType;
    }

    @Override
    public void eventReceived(Action action, GenericKubernetesResource resource) {
      String resourceKey = getResourceKey(resource);
      String resourceVersion = resource.getMetadata().getResourceVersion();

      // Check if this is a real change by comparing resource versions
      String previousVersion = resourceVersions.get(resourceKey);
      if (previousVersion != null && previousVersion.equals(resourceVersion)) {
        Log.debugf(
            "Skipping duplicate event for %s: %s (version %s)",
            displayName, resourceKey, resourceVersion);
        return;
      }

      // Update the tracked version
      if (action != Action.DELETED) {
        resourceVersions.put(resourceKey, resourceVersion);
      } else {
        resourceVersions.remove(resourceKey);
      }

      Log.infof(
          "%s %s: %s/%s",
          displayName,
          action,
          resource.getMetadata().getNamespace(),
          resource.getMetadata().getName());

      // Invalidate caches
      if (isApplicationResource(resourceType)) {
        cacheManager.invalidateApplicationCaches();

        // Broadcast appropriate event
        Map<String, Object> eventData =
            Map.of(
                "namespace",
                resource.getMetadata().getNamespace(),
                "name",
                resource.getMetadata().getName(),
                "resourceType",
                displayName);

        switch (action) {
          case ADDED:
            eventBroadcaster.broadcastApplicationAdded(eventData);
            break;
          case MODIFIED:
            eventBroadcaster.broadcastApplicationUpdated(eventData);
            break;
          case DELETED:
            eventBroadcaster.broadcastApplicationRemoved(eventData);
            break;
          case ERROR:
            Log.warnf("Error event received for %s: %s", displayName, resourceKey);
            break;
        }
      } else if (isBookmarkResource(resourceType)) {
        cacheManager.invalidateBookmarkCaches();

        // Broadcast appropriate bookmark event
        Map<String, Object> eventData =
            Map.of(
                "namespace",
                resource.getMetadata().getNamespace(),
                "name",
                resource.getMetadata().getName(),
                "resourceType",
                displayName);

        switch (action) {
          case ADDED:
            eventBroadcaster.broadcastBookmarkAdded(eventData);
            break;
          case MODIFIED:
            eventBroadcaster.broadcastBookmarkUpdated(eventData);
            break;
          case DELETED:
            eventBroadcaster.broadcastBookmarkRemoved(eventData);
            break;
          case ERROR:
            Log.warnf("Error event received for %s: %s", displayName, resourceKey);
            break;
        }
      }
    }

    @Override
    public void onClose(WatcherException cause) {
      if (cause != null) {
        Log.errorf(cause, "Watch closed for %s with error", displayName);
        // In a production system, you might want to implement reconnection logic here
      } else {
        Log.infof("Watch closed for %s", displayName);
      }
    }

    /** Creates a unique key for a resource. */
    private String getResourceKey(GenericKubernetesResource resource) {
      return resource.getMetadata().getNamespace()
          + "/"
          + resource.getMetadata().getName()
          + "@"
          + resource.getMetadata().getUid();
    }

    /** Determines if a resource type represents applications. */
    private boolean isApplicationResource(String resourceType) {
      return resourceType.equals("applications")
          || resourceType.equals("ingresses")
          || resourceType.equals("routes")
          || resourceType.equals("virtualservices")
          || resourceType.equals("httproutes");
    }

    /** Determines if a resource type represents bookmarks. */
    private boolean isBookmarkResource(String resourceType) {
      return resourceType.equals("bookmarks");
    }
  }
}
