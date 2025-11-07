package us.ullberg.startpunkt.service;

import io.fabric8.kubernetes.api.model.GenericKubernetesResource;
import io.fabric8.kubernetes.client.KubernetesClient;
import io.fabric8.kubernetes.client.dsl.base.ResourceDefinitionContext;
import io.fabric8.kubernetes.client.informers.ResourceEventHandler;
import io.fabric8.kubernetes.client.informers.SharedIndexInformer;
import io.quarkus.logging.Log;
import io.quarkus.runtime.ShutdownEvent;
import io.quarkus.runtime.StartupEvent;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import us.ullberg.startpunkt.crd.v1alpha4.Application;
import us.ullberg.startpunkt.crd.v1alpha4.Bookmark;
import us.ullberg.startpunkt.messaging.EventBroadcaster;
import us.ullberg.startpunkt.objects.ApplicationResponse;
import us.ullberg.startpunkt.objects.BookmarkResponse;
import us.ullberg.startpunkt.objects.kubernetes.BaseKubernetesObject;
import us.ullberg.startpunkt.objects.kubernetes.GatewayApiHttpRouteWrapper;
import us.ullberg.startpunkt.objects.kubernetes.HajimariApplicationWrapper;
import us.ullberg.startpunkt.objects.kubernetes.IngressApplicationWrapper;
import us.ullberg.startpunkt.objects.kubernetes.IstioVirtualServiceApplicationWrapper;
import us.ullberg.startpunkt.objects.kubernetes.RouteApplicationWrapper;
import us.ullberg.startpunkt.objects.kubernetes.StartpunktApplicationWrapper;

/**
 * Service that uses Kubernetes Informers to watch resources and maintain the application and
 * bookmark caches.
 *
 * <p>Informers provide automatic reconnection, resync, and resource version management, eliminating
 * the need for manual watch restart logic.
 *
 * <p>Informers are established for: - Application CRDs (startpunkt.ullberg.us) - Bookmark CRDs
 * (startpunkt.ullberg.us and hajimari.io) - Ingress resources (if enabled) - Route resources
 * (OpenShift, if enabled) - VirtualService resources (Istio, if enabled) - HTTPRoute resources
 * (Gateway API, if enabled)
 */
@ApplicationScoped
public class KubernetesInformerService {

  private final KubernetesClient kubernetesClient;
  private final MultiClusterKubernetesClientService multiClusterService;
  private final ApplicationCacheService applicationCacheService;
  private final BookmarkCacheService bookmarkCacheService;
  private final EventBroadcaster eventBroadcaster;
  private final AvailabilityCheckService availabilityCheckService;
  private final BookmarkService bookmarkService;

  // List to hold all active informers for cleanup on shutdown
  private final List<SharedIndexInformer<?>> informers = new CopyOnWriteArrayList<>();

  // Flag to suppress cache reload during initial sync
  private volatile boolean initialSyncComplete = false;

  // Flags to track which resource types are available in the cluster
  private volatile boolean hajimariResourcesAvailable = false;
  private volatile boolean ingressResourcesAvailable = false;
  private volatile boolean openshiftResourcesAvailable = false;
  private volatile boolean istioResourcesAvailable = false;
  private volatile boolean gatewayApiResourcesAvailable = false;

  // Track last reload time for debouncing cache reloads (prevent reload storms)
  private final Map<String, Instant> lastReloadTimes = new ConcurrentHashMap<>();
  private static final long RELOAD_DEBOUNCE_MS = 500;

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

  @ConfigProperty(name = "startpunkt.watch.enabled", defaultValue = "true")
  boolean watchEnabled;

  @ConfigProperty(name = "startpunkt.watch.resyncPeriodSeconds", defaultValue = "300")
  long resyncPeriodSeconds;

  /** Constructor with injected dependencies. */
  public KubernetesInformerService(
      KubernetesClient kubernetesClient,
      MultiClusterKubernetesClientService multiClusterService,
      ApplicationCacheService applicationCacheService,
      BookmarkCacheService bookmarkCacheService,
      EventBroadcaster eventBroadcaster,
      AvailabilityCheckService availabilityCheckService,
      BookmarkService bookmarkService) {
    this.kubernetesClient = kubernetesClient;
    this.multiClusterService = multiClusterService;
    this.applicationCacheService = applicationCacheService;
    this.bookmarkCacheService = bookmarkCacheService;
    this.eventBroadcaster = eventBroadcaster;
    this.availabilityCheckService = availabilityCheckService;
    this.bookmarkService = bookmarkService;
  }

  /**
   * Checks if a resource type exists in the cluster by verifying the CRD or API resource.
   *
   * @param group the API group (e.g., "networking.k8s.io")
   * @param version the API version (e.g., "v1")
   * @param plural the plural resource name (e.g., "ingresses")
   * @param resourceTypeName the friendly name for logging (e.g., "Ingress")
   * @return true if the resource type exists, false otherwise
   */
  private boolean resourceTypeExists(
      String group, String version, String plural, String resourceTypeName) {
    try {
      ResourceDefinitionContext ctx =
          new ResourceDefinitionContext.Builder()
              .withGroup(group)
              .withVersion(version)
              .withPlural(plural)
              .withNamespaced(true)
              .build();

      // Try to list resources to verify the type exists
      kubernetesClient.genericKubernetesResources(ctx).inAnyNamespace().list();
      return true;
    } catch (Exception e) {
      Log.infof(
          "%s resources (%s/%s/%s) not available in cluster - skipping informer",
          resourceTypeName, group, version, plural);
      Log.debugf(e, "Details for %s resource check", resourceTypeName);
      return false;
    }
  }

  /**
   * Initializes informers and starts watching Kubernetes resources on application startup.
   * Informers are started asynchronously to avoid blocking application startup.
   */
  void onStart(@Observes StartupEvent event) {
    Log.info("Initializing Kubernetes Informer service");

    if (!watchEnabled) {
      Log.info("Kubernetes informers disabled by configuration");
      return;
    }

    // Start informers asynchronously to avoid blocking startup
    // This is especially important for native mode where K8s API may not be available
    new Thread(
            () -> {
              try {
                // Start informers for different resource types
                startApplicationInformer();
                startBookmarkInformer();

                if (hajimariEnabled
                    && resourceTypeExists(
                        "hajimari.io", "v1alpha1", "bookmarks", "Hajimari Bookmark")) {
                  hajimariResourcesAvailable = true;
                  startHajimariBookmarkInformer();
                }

                if (ingressEnabled
                    && resourceTypeExists("networking.k8s.io", "v1", "ingresses", "Ingress")) {
                  ingressResourcesAvailable = true;
                  startIngressInformer();
                }

                if (openshiftEnabled
                    && resourceTypeExists(
                        "route.openshift.io", "v1", "routes", "OpenShift Route")) {
                  openshiftResourcesAvailable = true;
                  startRouteInformer();
                }

                if (istioVirtualServiceEnabled
                    && resourceTypeExists(
                        "networking.istio.io", "v1", "virtualservices", "Istio VirtualService")) {
                  istioResourcesAvailable = true;
                  startVirtualServiceInformer();
                }

                if (gatewayApiEnabled
                    && resourceTypeExists(
                        "gateway.networking.k8s.io", "v1", "httproutes", "Gateway API HTTPRoute")) {
                  gatewayApiResourcesAvailable = true;
                  startHttpRouteInformer();
                }

                Log.infof(
                    "Kubernetes Informer service initialized with %d informers", informers.size());

                // Perform initial cache load from all Informers, then mark sync complete
                Log.info("Performing initial cache load...");
                reloadApplicationCache();
                reloadBookmarkCache();
                initialSyncComplete = true;
                Log.info("Initial sync complete - Informers now active for real-time updates");
              } catch (Exception e) {
                Log.error("Failed to initialize Kubernetes Informer service", e);
                Log.warn("Application will continue without Kubernetes resource watching");
              }
            },
            "informer-init")
        .start();

    Log.info("Kubernetes Informer service initialization started in background");
  }

  /** Stops all informers on application shutdown. */
  void onStop(@Observes ShutdownEvent event) {
    Log.info("Stopping Kubernetes Informer service");
    stopInformers();
  }

  /** Starts the Application CRD informer. */
  private void startApplicationInformer() {
    try {
      SharedIndexInformer<Application> informer =
          kubernetesClient
              .resources(Application.class)
              .inAnyNamespace()
              .inform(
                  new ResourceEventHandler<Application>() {
                    @Override
                    public void onAdd(Application application) {
                      handleApplicationAdded(application);
                    }

                    @Override
                    public void onUpdate(Application oldApp, Application newApp) {
                      handleApplicationUpdated(oldApp, newApp);
                    }

                    @Override
                    public void onDelete(
                        Application application, boolean deletedFinalStateUnknown) {
                      handleApplicationDeleted(application);
                    }
                  },
                  resyncPeriodSeconds * 1000);

      informers.add(informer);
      Log.info("Started Application CRD informer");
    } catch (Exception e) {
      Log.error("Failed to start Application informer", e);
    }
  }

  /** Starts the Bookmark CRD informer. */
  private void startBookmarkInformer() {
    try {
      SharedIndexInformer<Bookmark> informer =
          kubernetesClient
              .resources(Bookmark.class)
              .inAnyNamespace()
              .inform(
                  new ResourceEventHandler<Bookmark>() {
                    @Override
                    public void onAdd(Bookmark bookmark) {
                      handleBookmarkAdded(bookmark);
                    }

                    @Override
                    public void onUpdate(Bookmark oldBookmark, Bookmark newBookmark) {
                      handleBookmarkUpdated(oldBookmark, newBookmark);
                    }

                    @Override
                    public void onDelete(Bookmark bookmark, boolean deletedFinalStateUnknown) {
                      handleBookmarkDeleted(bookmark);
                    }
                  },
                  resyncPeriodSeconds * 1000);

      informers.add(informer);
      Log.info("Started Bookmark CRD informer");
    } catch (Exception e) {
      Log.error("Failed to start Bookmark informer", e);
    }
  }

  /** Starts the Hajimari Bookmark informer. */
  private void startHajimariBookmarkInformer() {
    try {
      ResourceDefinitionContext ctx =
          new ResourceDefinitionContext.Builder()
              .withGroup("hajimari.io")
              .withVersion("v1alpha1")
              .withPlural("bookmarks")
              .withNamespaced(true)
              .build();

      SharedIndexInformer<GenericKubernetesResource> informer =
          kubernetesClient
              .genericKubernetesResources(ctx)
              .inAnyNamespace()
              .inform(
                  new ResourceEventHandler<GenericKubernetesResource>() {
                    @Override
                    public void onAdd(GenericKubernetesResource resource) {
                      if (initialSyncComplete) {
                        handleGenericBookmarkEvent("hajimari");
                      }
                    }

                    @Override
                    public void onUpdate(
                        GenericKubernetesResource oldResource,
                        GenericKubernetesResource newResource) {
                      if (initialSyncComplete) {
                        handleGenericBookmarkEvent("hajimari");
                      }
                    }

                    @Override
                    public void onDelete(
                        GenericKubernetesResource resource, boolean deletedFinalStateUnknown) {
                      if (initialSyncComplete) {
                        handleGenericBookmarkEvent("hajimari");
                      }
                    }
                  },
                  resyncPeriodSeconds * 1000);

      informers.add(informer);
      Log.info("Started Hajimari Bookmark informer");
    } catch (Exception e) {
      Log.error("Failed to start Hajimari Bookmark informer", e);
    }
  }

  /** Starts the Ingress informer. */
  private void startIngressInformer() {
    try {
      ResourceDefinitionContext ctx =
          new ResourceDefinitionContext.Builder()
              .withGroup("networking.k8s.io")
              .withVersion("v1")
              .withPlural("ingresses")
              .withNamespaced(true)
              .build();

      SharedIndexInformer<GenericKubernetesResource> informer =
          kubernetesClient
              .genericKubernetesResources(ctx)
              .inAnyNamespace()
              .inform(
                  new ResourceEventHandler<GenericKubernetesResource>() {
                    @Override
                    public void onAdd(GenericKubernetesResource resource) {
                      if (initialSyncComplete) {
                        handleGenericApplicationEvent("ingress");
                      }
                    }

                    @Override
                    public void onUpdate(
                        GenericKubernetesResource oldResource,
                        GenericKubernetesResource newResource) {
                      if (initialSyncComplete) {
                        handleGenericApplicationEvent("ingress");
                      }
                    }

                    @Override
                    public void onDelete(
                        GenericKubernetesResource resource, boolean deletedFinalStateUnknown) {
                      if (initialSyncComplete) {
                        handleGenericApplicationEvent("ingress");
                      }
                    }
                  },
                  resyncPeriodSeconds * 1000);

      informers.add(informer);
      Log.info("Started Ingress informer");
    } catch (Exception e) {
      Log.error("Failed to start Ingress informer", e);
    }
  }

  /** Starts the OpenShift Route informer. */
  private void startRouteInformer() {
    try {
      ResourceDefinitionContext ctx =
          new ResourceDefinitionContext.Builder()
              .withGroup("route.openshift.io")
              .withVersion("v1")
              .withPlural("routes")
              .withNamespaced(true)
              .build();

      SharedIndexInformer<GenericKubernetesResource> informer =
          kubernetesClient
              .genericKubernetesResources(ctx)
              .inAnyNamespace()
              .inform(
                  new ResourceEventHandler<GenericKubernetesResource>() {
                    @Override
                    public void onAdd(GenericKubernetesResource resource) {
                      if (initialSyncComplete) {
                        handleGenericApplicationEvent("route");
                      }
                    }

                    @Override
                    public void onUpdate(
                        GenericKubernetesResource oldResource,
                        GenericKubernetesResource newResource) {
                      if (initialSyncComplete) {
                        handleGenericApplicationEvent("route");
                      }
                    }

                    @Override
                    public void onDelete(
                        GenericKubernetesResource resource, boolean deletedFinalStateUnknown) {
                      if (initialSyncComplete) {
                        handleGenericApplicationEvent("route");
                      }
                    }
                  },
                  resyncPeriodSeconds * 1000);

      informers.add(informer);
      Log.info("Started Route informer");
    } catch (Exception e) {
      Log.error("Failed to start Route informer", e);
    }
  }

  /** Starts the Istio VirtualService informer. */
  private void startVirtualServiceInformer() {
    try {
      ResourceDefinitionContext ctx =
          new ResourceDefinitionContext.Builder()
              .withGroup("networking.istio.io")
              .withVersion("v1")
              .withPlural("virtualservices")
              .withNamespaced(true)
              .build();

      SharedIndexInformer<GenericKubernetesResource> informer =
          kubernetesClient
              .genericKubernetesResources(ctx)
              .inAnyNamespace()
              .inform(
                  new ResourceEventHandler<GenericKubernetesResource>() {
                    @Override
                    public void onAdd(GenericKubernetesResource resource) {
                      if (initialSyncComplete) {
                        handleGenericApplicationEvent("virtualservice");
                      }
                    }

                    @Override
                    public void onUpdate(
                        GenericKubernetesResource oldResource,
                        GenericKubernetesResource newResource) {
                      if (initialSyncComplete) {
                        handleGenericApplicationEvent("virtualservice");
                      }
                    }

                    @Override
                    public void onDelete(
                        GenericKubernetesResource resource, boolean deletedFinalStateUnknown) {
                      if (initialSyncComplete) {
                        handleGenericApplicationEvent("virtualservice");
                      }
                    }
                  },
                  resyncPeriodSeconds * 1000);

      informers.add(informer);
      Log.info("Started VirtualService informer");
    } catch (Exception e) {
      Log.error("Failed to start VirtualService informer", e);
    }
  }

  /** Starts the Gateway API HTTPRoute informer. */
  private void startHttpRouteInformer() {
    try {
      ResourceDefinitionContext ctx =
          new ResourceDefinitionContext.Builder()
              .withGroup("gateway.networking.k8s.io")
              .withVersion("v1")
              .withPlural("httproutes")
              .withNamespaced(true)
              .build();

      SharedIndexInformer<GenericKubernetesResource> informer =
          kubernetesClient
              .genericKubernetesResources(ctx)
              .inAnyNamespace()
              .inform(
                  new ResourceEventHandler<GenericKubernetesResource>() {
                    @Override
                    public void onAdd(GenericKubernetesResource resource) {
                      if (initialSyncComplete) {
                        handleGenericApplicationEvent("httproute");
                      }
                    }

                    @Override
                    public void onUpdate(
                        GenericKubernetesResource oldResource,
                        GenericKubernetesResource newResource) {
                      if (initialSyncComplete) {
                        handleGenericApplicationEvent("httproute");
                      }
                    }

                    @Override
                    public void onDelete(
                        GenericKubernetesResource resource, boolean deletedFinalStateUnknown) {
                      if (initialSyncComplete) {
                        handleGenericApplicationEvent("httproute");
                      }
                    }
                  },
                  resyncPeriodSeconds * 1000);

      informers.add(informer);
      Log.info("Started HTTPRoute informer");
    } catch (Exception e) {
      Log.error("Failed to start HTTPRoute informer", e);
    }
  }

  /** Handles Application CRD addition events. */
  private void handleApplicationAdded(Application application) {
    if (application == null || application.getMetadata() == null || application.getSpec() == null) {
      return;
    }

    try {
      String namespace = application.getMetadata().getNamespace();
      String name = application.getMetadata().getName();

      Log.debugf("Application added: %s/%s", namespace, name);

      // Create ApplicationResponse from spec
      ApplicationResponse appResponse = new ApplicationResponse(application.getSpec());
      appResponse.setNamespace(namespace);
      appResponse.setResourceName(name);
      appResponse.setHasOwnerReferences(
          application.getMetadata().getOwnerReferences() != null
              && !application.getMetadata().getOwnerReferences().isEmpty());

      // Enrich with availability checking
      List<ApplicationResponse> enriched =
          availabilityCheckService.enrichWithAvailability(List.of(appResponse));

      if (!enriched.isEmpty()) {
        appResponse = enriched.get(0);
      }

      // Register URL for availability checking
      if (appResponse.getUrl() != null && !appResponse.getUrl().isEmpty()) {
        availabilityCheckService.registerUrl(appResponse.getUrl());
      }

      // Store in cache
      applicationCacheService.put(appResponse);

      // Broadcast event
      eventBroadcaster.broadcastApplicationAdded(application);
    } catch (Exception e) {
      Log.errorf(e, "Error handling Application addition");
    }
  }

  /** Handles Application CRD update events. */
  private void handleApplicationUpdated(Application oldApp, Application newApp) {
    if (newApp == null || newApp.getMetadata() == null || newApp.getSpec() == null) {
      return;
    }

    // Skip updates that don't affect spec or relevant annotations (e.g., status changes)
    if (!isApplicationUpdateMeaningful(oldApp, newApp)) {
      String namespace = newApp.getMetadata().getNamespace();
      String name = newApp.getMetadata().getName();
      Log.debugf("Skipping Application update (no meaningful changes): %s/%s", namespace, name);
      return;
    }

    try {
      String namespace = newApp.getMetadata().getNamespace();
      String name = newApp.getMetadata().getName();

      Log.debugf("Application updated: %s/%s", namespace, name);

      // Create ApplicationResponse from spec
      ApplicationResponse appResponse = new ApplicationResponse(newApp.getSpec());
      appResponse.setNamespace(namespace);
      appResponse.setResourceName(name);
      appResponse.setHasOwnerReferences(
          newApp.getMetadata().getOwnerReferences() != null
              && !newApp.getMetadata().getOwnerReferences().isEmpty());

      // Enrich with availability checking
      List<ApplicationResponse> enriched =
          availabilityCheckService.enrichWithAvailability(List.of(appResponse));

      if (!enriched.isEmpty()) {
        appResponse = enriched.get(0);
      }

      // Register URL for availability checking
      if (appResponse.getUrl() != null && !appResponse.getUrl().isEmpty()) {
        availabilityCheckService.registerUrl(appResponse.getUrl());
      }

      // Update in cache
      applicationCacheService.put(appResponse);

      // Broadcast event
      eventBroadcaster.broadcastApplicationUpdated(newApp);
    } catch (Exception e) {
      Log.errorf(e, "Error handling Application update");
    }
  }

  /** Handles Application CRD deletion events. */
  private void handleApplicationDeleted(Application application) {
    if (application == null || application.getMetadata() == null) {
      return;
    }

    try {
      String namespace = application.getMetadata().getNamespace();
      String name = application.getMetadata().getName();

      Log.debugf("Application deleted: %s/%s", namespace, name);

      // Remove from cache (assuming local cluster for now)
      ApplicationResponse removed = applicationCacheService.remove("local", namespace, name);

      // Unregister URL from availability checking
      if (removed != null && removed.getUrl() != null && !removed.getUrl().isEmpty()) {
        availabilityCheckService.unregisterUrl(removed.getUrl());
      }

      // Broadcast event
      if (removed != null) {
        eventBroadcaster.broadcastApplicationRemoved(application);
      }
    } catch (Exception e) {
      Log.errorf(e, "Error handling Application deletion");
    }
  }

  /** Handles Bookmark CRD addition events. */
  private void handleBookmarkAdded(Bookmark bookmark) {
    if (bookmark == null || bookmark.getMetadata() == null || bookmark.getSpec() == null) {
      return;
    }

    try {
      String namespace = bookmark.getMetadata().getNamespace();
      String name = bookmark.getMetadata().getName();

      Log.debugf("Bookmark added: %s/%s", namespace, name);

      // Create BookmarkResponse from spec
      BookmarkResponse bookmarkResponse = new BookmarkResponse(bookmark.getSpec());
      bookmarkResponse.setNamespace(namespace);
      bookmarkResponse.setResourceName(name);
      bookmarkResponse.setHasOwnerReferences(
          bookmark.getMetadata().getOwnerReferences() != null
              && !bookmark.getMetadata().getOwnerReferences().isEmpty());

      // Store in cache
      bookmarkCacheService.put(bookmarkResponse);

      // Broadcast event
      eventBroadcaster.broadcastBookmarkAdded(bookmark);
    } catch (Exception e) {
      Log.errorf(e, "Error handling Bookmark addition");
    }
  }

  /** Handles Bookmark CRD update events. */
  private void handleBookmarkUpdated(Bookmark oldBookmark, Bookmark newBookmark) {
    if (newBookmark == null || newBookmark.getMetadata() == null || newBookmark.getSpec() == null) {
      return;
    }

    // Skip updates that don't affect spec or relevant annotations (e.g., status changes)
    if (!isBookmarkUpdateMeaningful(oldBookmark, newBookmark)) {
      String namespace = newBookmark.getMetadata().getNamespace();
      String name = newBookmark.getMetadata().getName();
      Log.debugf("Skipping Bookmark update (no meaningful changes): %s/%s", namespace, name);
      return;
    }

    try {
      String namespace = newBookmark.getMetadata().getNamespace();
      String name = newBookmark.getMetadata().getName();

      Log.debugf("Bookmark updated: %s/%s", namespace, name);

      // Create BookmarkResponse from spec
      BookmarkResponse bookmarkResponse = new BookmarkResponse(newBookmark.getSpec());
      bookmarkResponse.setNamespace(namespace);
      bookmarkResponse.setResourceName(name);
      bookmarkResponse.setHasOwnerReferences(
          newBookmark.getMetadata().getOwnerReferences() != null
              && !newBookmark.getMetadata().getOwnerReferences().isEmpty());

      // Update in cache
      bookmarkCacheService.put(bookmarkResponse);

      // Broadcast event
      eventBroadcaster.broadcastBookmarkUpdated(newBookmark);
    } catch (Exception e) {
      Log.errorf(e, "Error handling Bookmark update");
    }
  }

  /** Handles Bookmark CRD deletion events. */
  private void handleBookmarkDeleted(Bookmark bookmark) {
    if (bookmark == null || bookmark.getMetadata() == null) {
      return;
    }

    try {
      String namespace = bookmark.getMetadata().getNamespace();
      String name = bookmark.getMetadata().getName();

      Log.debugf("Bookmark deleted: %s/%s", namespace, name);

      // Remove from cache (assuming local cluster for now)
      BookmarkResponse removed = bookmarkCacheService.remove("local", namespace, name);

      // Broadcast event
      if (removed != null) {
        eventBroadcaster.broadcastBookmarkRemoved(bookmark);
      }
    } catch (Exception e) {
      Log.errorf(e, "Error handling Bookmark deletion");
    }
  }

  /**
   * Checks if a reload should be debounced to prevent reload storms.
   *
   * @param eventKey the unique key for the event type
   * @return true if the reload should be debounced, false otherwise
   */
  private boolean shouldDebounceReload(String eventKey) {
    Instant lastReload = lastReloadTimes.get(eventKey);
    if (lastReload == null) {
      lastReloadTimes.put(eventKey, Instant.now());
      return false;
    }

    Duration timeSinceLastReload = Duration.between(lastReload, Instant.now());
    if (timeSinceLastReload.toMillis() < RELOAD_DEBOUNCE_MS) {
      return true;
    }

    lastReloadTimes.put(eventKey, Instant.now());
    return false;
  }

  /**
   * Checks if an Application CRD update represents a meaningful change that requires cache reload.
   * Only changes to spec or Startpunkt/Hajimari/Forecastle annotations matter.
   *
   * @param oldApp the old application
   * @param newApp the new application
   * @return true if the update is meaningful, false if it's only status/metadata
   */
  private boolean isApplicationUpdateMeaningful(Application oldApp, Application newApp) {
    if (oldApp == null || newApp == null) {
      return true;
    }

    // Check if spec changed
    if (!java.util.Objects.equals(oldApp.getSpec(), newApp.getSpec())) {
      return true;
    }

    // Check if relevant annotations changed
    return hasRelevantAnnotationChanges(
        oldApp.getMetadata().getAnnotations(), newApp.getMetadata().getAnnotations());
  }

  /**
   * Checks if a Bookmark CRD update represents a meaningful change that requires cache reload. Only
   * changes to spec or Startpunkt/Hajimari annotations matter.
   *
   * @param oldBookmark the old bookmark
   * @param newBookmark the new bookmark
   * @return true if the update is meaningful, false if it's only status/metadata
   */
  private boolean isBookmarkUpdateMeaningful(Bookmark oldBookmark, Bookmark newBookmark) {
    if (oldBookmark == null || newBookmark == null) {
      return true;
    }

    // Check if spec changed
    if (!java.util.Objects.equals(oldBookmark.getSpec(), newBookmark.getSpec())) {
      return true;
    }

    // Check if relevant annotations changed
    return hasRelevantAnnotationChanges(
        oldBookmark.getMetadata().getAnnotations(), newBookmark.getMetadata().getAnnotations());
  }

  /**
   * Checks if relevant annotations (startpunkt.ullberg.us/*, hajimari.io/*,
   * forecastle.stakater.com/*) have changed.
   *
   * @param oldAnnotations the old annotations map
   * @param newAnnotations the new annotations map
   * @return true if relevant annotations changed
   */
  private boolean hasRelevantAnnotationChanges(
      Map<String, String> oldAnnotations, Map<String, String> newAnnotations) {
    if (oldAnnotations == null) {
      oldAnnotations = Map.of();
    }
    if (newAnnotations == null) {
      newAnnotations = Map.of();
    }

    // Prefixes we care about
    String[] relevantPrefixes = {
      "startpunkt.ullberg.us/", "hajimari.io/", "forecastle.stakater.com/"
    };

    // Collect all relevant annotation keys from both old and new
    var relevantKeys = new java.util.HashSet<String>();
    for (String key : oldAnnotations.keySet()) {
      for (String prefix : relevantPrefixes) {
        if (key.startsWith(prefix)) {
          relevantKeys.add(key);
          break;
        }
      }
    }
    for (String key : newAnnotations.keySet()) {
      for (String prefix : relevantPrefixes) {
        if (key.startsWith(prefix)) {
          relevantKeys.add(key);
          break;
        }
      }
    }

    // Check if any relevant annotation changed
    for (String key : relevantKeys) {
      String oldValue = oldAnnotations.get(key);
      String newValue = newAnnotations.get(key);
      if (!java.util.Objects.equals(oldValue, newValue)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Handles generic application resource events (Ingress, Route, VirtualService, HTTPRoute). For
   * generic resources, we reload all applications since we need to aggregate multiple resource
   * types.
   */
  private void handleGenericApplicationEvent(String resourceType) {
    String eventKey = "GENERIC_APP_" + resourceType;
    if (shouldDebounceReload(eventKey)) {
      Log.debugf("Debouncing generic application event: %s", resourceType);
      return;
    }

    Log.debugf("Generic application resource changed: %s, reloading applications", resourceType);
    reloadApplicationCache();
  }

  /**
   * Handles generic bookmark resource events (Hajimari). For generic resources, we reload all
   * bookmarks.
   */
  private void handleGenericBookmarkEvent(String resourceType) {
    String eventKey = "GENERIC_BOOKMARK_" + resourceType;
    if (shouldDebounceReload(eventKey)) {
      Log.debugf("Debouncing generic bookmark event: %s", resourceType);
      return;
    }

    Log.debugf("Generic bookmark resource changed: %s, reloading bookmarks", resourceType);
    reloadBookmarkCache();
  }

  /** Reloads the entire application cache from Kubernetes. */
  private void reloadApplicationCache() {
    try {
      Log.debug("Reloading application cache");

      var apps = new ArrayList<ApplicationResponse>();

      // Iterate through all active clusters
      for (String clusterName : multiClusterService.getActiveClusterNames()) {
        KubernetesClient client = multiClusterService.getClient(clusterName);
        if (client == null) {
          Log.warnf("Cluster '%s' is configured but client is null, skipping", clusterName);
          continue;
        }

        Log.debugf("Loading applications from cluster '%s'", clusterName);

        var applicationWrappers = new ArrayList<BaseKubernetesObject>();
        applicationWrappers.add(new StartpunktApplicationWrapper());

        // For local cluster, check resource availability
        // For remote clusters, we'll need to check availability per cluster
        // For now, we'll use the flags from local cluster
        boolean useHajimari = hajimariEnabled;
        boolean useOpenshift = openshiftEnabled;
        boolean useIngress = ingressEnabled;
        boolean useIstio = istioVirtualServiceEnabled;
        boolean useGatewayApi = gatewayApiEnabled;

        // Only apply resource availability checks for local cluster
        if ("local".equalsIgnoreCase(clusterName)) {
          useHajimari = hajimariEnabled && hajimariResourcesAvailable;
          useOpenshift = openshiftEnabled && openshiftResourcesAvailable;
          useIngress = ingressEnabled && ingressResourcesAvailable;
          useIstio = istioVirtualServiceEnabled && istioResourcesAvailable;
          useGatewayApi = gatewayApiEnabled && gatewayApiResourcesAvailable;
        }

        if (useHajimari) {
          applicationWrappers.add(new HajimariApplicationWrapper());
        }
        if (useOpenshift) {
          applicationWrappers.add(new RouteApplicationWrapper(openshiftOnlyAnnotated));
        }
        if (useIngress) {
          applicationWrappers.add(new IngressApplicationWrapper(ingressOnlyAnnotated));
        }
        if (useIstio) {
          applicationWrappers.add(
              new IstioVirtualServiceApplicationWrapper(
                  istioVirtualServiceOnlyAnnotated, defaultProtocol));
        }
        if (useGatewayApi) {
          applicationWrappers.add(
              new GatewayApiHttpRouteWrapper(gatewayApiHttpRouteOnlyAnnotated, defaultProtocol));
        }

        for (BaseKubernetesObject applicationWrapper : applicationWrappers) {
          try {
            var wrapperApps =
                applicationWrapper.getApplicationSpecsWithMetadata(
                    client, anyNamespace, matchNames.orElse(List.of()), clusterName);
            apps.addAll(wrapperApps);
          } catch (Exception e) {
            Log.warnf(
                e,
                "Error loading applications from cluster '%s' using wrapper '%s': %s",
                clusterName,
                applicationWrapper.getClass().getSimpleName(),
                e.getMessage());
          }
        }

        Log.debugf("Loaded %d applications from cluster '%s'", apps.size(), clusterName);
      }

      // Register URLs for availability checking
      for (ApplicationResponse app : apps) {
        if (app.getUrl() != null && !app.getUrl().isEmpty()) {
          availabilityCheckService.registerUrl(app.getUrl());
        }
      }

      // Sort and cache
      Collections.sort(apps);

      // Clear and repopulate cache
      applicationCacheService.clear();
      applicationCacheService.putAll(apps);

      // Note: We don't broadcast STATUS_CHANGED here to avoid feedback loops.
      // Individual add/update/delete handlers already broadcast specific events.
      // The AvailabilityCheckService will broadcast STATUS_CHANGED when availability changes.

      Log.debugf("Reloaded %d applications into cache from all clusters", apps.size());
    } catch (Exception e) {
      Log.error("Error reloading application cache", e);
    }
  }

  /** Reloads the entire bookmark cache from Kubernetes. */
  private void reloadBookmarkCache() {
    try {
      Log.debug("Reloading bookmark cache");

      List<BookmarkResponse> bookmarks = new ArrayList<>();

      // Load Startpunkt bookmarks
      bookmarks.addAll(bookmarkService.retrieveBookmarks());

      // Load Hajimari bookmarks if enabled and available
      if (hajimariEnabled && hajimariResourcesAvailable) {
        bookmarks.addAll(bookmarkService.retrieveHajimariBookmarks());
      }

      // Clear and repopulate cache
      bookmarkCacheService.clear();
      bookmarkCacheService.putAll(bookmarks);

      // Note: We don't broadcast STATUS_CHANGED here to avoid feedback loops.
      // Individual add/update/delete handlers already broadcast specific events.

      Log.debugf("Reloaded %d bookmarks into cache", bookmarks.size());
    } catch (Exception e) {
      Log.error("Error reloading bookmark cache", e);
    }
  }

  /** Stops all informers. */
  private void stopInformers() {
    for (SharedIndexInformer<?> informer : informers) {
      try {
        informer.stop();
      } catch (Exception e) {
        Log.warn("Error stopping informer", e);
      }
    }
    informers.clear();
  }
}
