package us.ullberg.startpunkt.service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.atomic.AtomicBoolean;

import org.eclipse.microprofile.config.inject.ConfigProperty;

import io.fabric8.kubernetes.api.model.GenericKubernetesResource;
import io.fabric8.kubernetes.client.KubernetesClient;
import io.fabric8.kubernetes.client.Watch;
import io.fabric8.kubernetes.client.Watcher;
import io.fabric8.kubernetes.client.WatcherException;
import io.fabric8.kubernetes.client.dsl.base.ResourceDefinitionContext;
import io.quarkus.logging.Log;
import io.quarkus.runtime.ShutdownEvent;
import io.quarkus.runtime.StartupEvent;
import io.quarkus.scheduler.Scheduler;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.enterprise.event.Observes;
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
 * Service that watches Kubernetes resources and maintains the application and
 * bookmark caches.
 *
 * <p>
 * This service initializes on startup, loads all applications and bookmarks
 * into the cache, and
 * then watches for changes in Kubernetes resources. When resources change, it
 * updates the cache and
 * emits events via EventBroadcaster for GraphQL subscriptions.
 *
 * <p>
 * Watches are established for: - Application CRDs (startpunkt.ullberg.us) -
 * Bookmark CRDs
 * (startpunkt.ullberg.us and hajimari.io) - Ingress resources (if enabled) -
 * Route resources
 * (OpenShift, if enabled) - VirtualService resources (Istio, if enabled) -
 * HTTPRoute resources
 * (Gateway API, if enabled)
 */
@ApplicationScoped
public class KubernetesWatchService {

    private final KubernetesClient kubernetesClient;
    private final ApplicationCacheService applicationCacheService;
    private final BookmarkCacheService bookmarkCacheService;
    private final EventBroadcaster eventBroadcaster;
    private final AvailabilityCheckService availabilityCheckService;
    private final BookmarkService bookmarkService;
    private final Scheduler scheduler;

    // List to hold all active watches for cleanup on shutdown
    private final List<Watch> watches = new CopyOnWriteArrayList<>();

    // Flag to prevent watch events from triggering reloads during scheduled refresh
    private final AtomicBoolean refreshInProgress = new AtomicBoolean(false);

    // Timestamp of last generic resource reload (for debouncing)
    private volatile long lastGenericApplicationReload = 0;
    private volatile long lastGenericBookmarkReload = 0;

    // Debounce interval in milliseconds (prevent reloads more frequent than this)
    private static final long DEBOUNCE_INTERVAL_MS = 2000;

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

    @ConfigProperty(name = "startpunkt.watch.cacheRefreshIntervalMinutes", defaultValue = "5")
    int cacheRefreshIntervalMinutes;

    // Scheduled task for periodic cache refresh
    private String cacheRefreshJobId;

    /**
     * Constructor with injected dependencies.
     *
     * @param kubernetesClient         the Kubernetes client
     * @param applicationCacheService  the application cache service
     * @param bookmarkCacheService     the bookmark cache service
     * @param eventBroadcaster         the event broadcaster
     * @param availabilityCheckService the availability check service
     * @param bookmarkService          the bookmark service for retrieval logic
     * @param scheduler                the Quarkus scheduler for periodic tasks
     */
    public KubernetesWatchService(
            KubernetesClient kubernetesClient,
            ApplicationCacheService applicationCacheService,
            BookmarkCacheService bookmarkCacheService,
            EventBroadcaster eventBroadcaster,
            AvailabilityCheckService availabilityCheckService,
            BookmarkService bookmarkService,
            Scheduler scheduler) {
        this.kubernetesClient = kubernetesClient;
        this.applicationCacheService = applicationCacheService;
        this.bookmarkCacheService = bookmarkCacheService;
        this.eventBroadcaster = eventBroadcaster;
        this.availabilityCheckService = availabilityCheckService;
        this.bookmarkService = bookmarkService;
        this.scheduler = scheduler;
    }

    /**
     * Initializes the cache and starts watching Kubernetes resources on application
     * startup.
     *
     * @param event the startup event
     */
    void onStart(@Observes StartupEvent event) {
        Log.info("Initializing Kubernetes watch service");

        try {
            // Load initial data into caches
            loadApplicationsIntoCache();
            loadBookmarksIntoCache();

            // Start watches if enabled
            if (watchEnabled) {
                startWatches();
            } else {
                Log.info("Kubernetes watches disabled by configuration");
            }

            // Schedule periodic cache refresh
            if (cacheRefreshIntervalMinutes > 0) {
                schedulePeriodicCacheRefresh();
            } else {
                Log.info("Periodic cache refresh disabled (interval set to 0)");
            }

            Log.infof(
                    "Kubernetes watch service initialized: %d applications, %d bookmarks",
                    applicationCacheService.size(), bookmarkCacheService.size());
        } catch (Exception e) {
            Log.error("Failed to initialize Kubernetes watch service", e);
        }
    }

    /**
     * Stops all watches on application shutdown.
     *
     * @param event the shutdown event
     */
    void onStop(@Observes ShutdownEvent event) {
        Log.info("Stopping Kubernetes watch service");

        // Cancel scheduled refresh
        if (cacheRefreshJobId != null) {
            scheduler.unscheduleJob(cacheRefreshJobId);
            Log.info("Cancelled periodic cache refresh");
        }

        stopWatches();
    }

    /** Loads all applications from Kubernetes into the cache. */
    private void loadApplicationsIntoCache() {
        Log.info("Loading applications into cache");

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
                var wrapperApps = applicationWrapper.getApplicationSpecsWithMetadata(
                        kubernetesClient, anyNamespace, matchNames.orElse(List.of()));
                apps.addAll(wrapperApps);
            }

            // Register URLs for availability checking
            for (ApplicationResponse app : apps) {
                if (app.getUrl() != null && !app.getUrl().isEmpty()) {
                    availabilityCheckService.registerUrl(app.getUrl());
                }
            }

            // Sort and cache
            Collections.sort(apps);
            applicationCacheService.putAll(apps);

            Log.infof("Loaded %d applications into cache", apps.size());
        } catch (Exception e) {
            Log.error("Error loading applications into cache", e);
        }
    }

    /** Loads all bookmarks from Kubernetes into the cache. */
    private void loadBookmarksIntoCache() {
        Log.info("Loading bookmarks into cache");

        try {
            List<BookmarkResponse> bookmarks = new ArrayList<>();

            // Load Startpunkt bookmarks
            bookmarks.addAll(bookmarkService.retrieveBookmarks());

            // Load Hajimari bookmarks if enabled
            if (hajimariEnabled) {
                bookmarks.addAll(bookmarkService.retrieveHajimariBookmarks());
            }

            bookmarkCacheService.putAll(bookmarks);

            Log.infof("Loaded %d bookmarks into cache", bookmarks.size());
        } catch (Exception e) {
            Log.error("Error loading bookmarks into cache", e);
        }
    }

    /** Starts all Kubernetes watches. */
    private void startWatches() {
        Log.info("Starting Kubernetes watches");

        // Watch Application CRDs
        startApplicationWatch();

        // Watch Bookmark CRDs
        startBookmarkWatch();

        // Watch Hajimari Bookmarks if enabled
        if (hajimariEnabled) {
            startHajimariBookmarkWatch();
        }

        // Watch Ingress if enabled
        if (ingressEnabled) {
            startIngressWatch();
        }

        // Watch OpenShift Routes if enabled
        if (openshiftEnabled) {
            startRouteWatch();
        }

        // Watch Istio VirtualServices if enabled
        if (istioVirtualServiceEnabled) {
            startVirtualServiceWatch();
        }

        // Watch Gateway API HTTPRoutes if enabled
        if (gatewayApiEnabled) {
            startHttpRouteWatch();
        }

        Log.infof("Started %d Kubernetes watches", watches.size());
    }

    /** Stops all active watches. */
    private void stopWatches() {
        for (Watch watch : watches) {
            try {
                watch.close();
            } catch (Exception e) {
                Log.warn("Error closing watch", e);
            }
        }
        watches.clear();
        Log.info("All Kubernetes watches stopped");
    }

    /** Starts watching Application CRDs. */
    private void startApplicationWatch() {
        try {
            Watch watch = kubernetesClient
                    .resources(Application.class)
                    .inAnyNamespace()
                    .watch(
                            new Watcher<Application>() {
                                @Override
                                public void eventReceived(Action action, Application application) {
                                    handleApplicationEvent(action, application);
                                }

                                @Override
                                public void onClose(WatcherException e) {
                                    if (e != null) {
                                        Log.error("Application watch closed with error", e);
                                    } else {
                                        Log.info("Application watch closed");
                                    }
                                }
                            });

            watches.add(watch);
            Log.info("Started watching Application CRDs");
        } catch (Exception e) {
            Log.error("Failed to start Application watch", e);
        }
    }

    /** Starts watching Bookmark CRDs. */
    private void startBookmarkWatch() {
        try {
            Watch watch = kubernetesClient
                    .resources(Bookmark.class)
                    .inAnyNamespace()
                    .watch(
                            new Watcher<Bookmark>() {
                                @Override
                                public void eventReceived(Action action, Bookmark bookmark) {
                                    handleBookmarkEvent(action, bookmark);
                                }

                                @Override
                                public void onClose(WatcherException e) {
                                    if (e != null) {
                                        Log.error("Bookmark watch closed with error", e);
                                    } else {
                                        Log.info("Bookmark watch closed");
                                    }
                                }
                            });

            watches.add(watch);
            Log.info("Started watching Bookmark CRDs");
        } catch (Exception e) {
            Log.error("Failed to start Bookmark watch", e);
        }
    }

    /** Starts watching Hajimari Bookmark CRDs. */
    private void startHajimariBookmarkWatch() {
        try {
            ResourceDefinitionContext ctx = new ResourceDefinitionContext.Builder()
                    .withGroup("hajimari.io")
                    .withVersion("v1alpha1")
                    .withPlural("bookmarks")
                    .withNamespaced(true)
                    .build();

            Watch watch = kubernetesClient
                    .genericKubernetesResources(ctx)
                    .inAnyNamespace()
                    .watch(new Watcher<GenericKubernetesResource>() {
                        @Override
                        public void eventReceived(Action action, GenericKubernetesResource resource) {
                            handleGenericBookmarkEvent(action, resource, "hajimari");
                        }

                        @Override
                        public void onClose(WatcherException e) {
                            if (e != null) {
                                Log.error("Hajimari Bookmark watch closed with error", e);
                            } else {
                                Log.info("Hajimari Bookmark watch closed");
                            }
                        }
                    });

            watches.add(watch);
            Log.info("Started watching Hajimari Bookmark CRDs");
        } catch (Exception e) {
            Log.error("Failed to start Hajimari Bookmark watch", e);
        }
    }

    /** Starts watching Ingress resources. */
    private void startIngressWatch() {
        try {
            ResourceDefinitionContext ctx = new ResourceDefinitionContext.Builder()
                    .withGroup("networking.k8s.io")
                    .withVersion("v1")
                    .withPlural("ingresses")
                    .withNamespaced(true)
                    .build();

            Watch watch = kubernetesClient
                    .genericKubernetesResources(ctx)
                    .inAnyNamespace()
                    .watch(new Watcher<GenericKubernetesResource>() {
                        @Override
                        public void eventReceived(Action action, GenericKubernetesResource resource) {
                            handleGenericApplicationEvent(action, resource, "ingress");
                        }

                        @Override
                        public void onClose(WatcherException e) {
                            if (e != null) {
                                Log.error("Ingress watch closed with error", e);
                            } else {
                                Log.info("Ingress watch closed");
                            }
                        }
                    });

            watches.add(watch);
            Log.info("Started watching Ingress resources");
        } catch (Exception e) {
            Log.error("Failed to start Ingress watch", e);
        }
    }

    /** Starts watching OpenShift Route resources. */
    private void startRouteWatch() {
        try {
            ResourceDefinitionContext ctx = new ResourceDefinitionContext.Builder()
                    .withGroup("route.openshift.io")
                    .withVersion("v1")
                    .withPlural("routes")
                    .withNamespaced(true)
                    .build();

            Watch watch = kubernetesClient
                    .genericKubernetesResources(ctx)
                    .inAnyNamespace()
                    .watch(new Watcher<GenericKubernetesResource>() {
                        @Override
                        public void eventReceived(Action action, GenericKubernetesResource resource) {
                            handleGenericApplicationEvent(action, resource, "route");
                        }

                        @Override
                        public void onClose(WatcherException e) {
                            if (e != null) {
                                Log.error("Route watch closed with error", e);
                            } else {
                                Log.info("Route watch closed");
                            }
                        }
                    });

            watches.add(watch);
            Log.info("Started watching OpenShift Route resources");
        } catch (Exception e) {
            Log.error("Failed to start Route watch", e);
        }
    }

    /** Starts watching Istio VirtualService resources. */
    private void startVirtualServiceWatch() {
        try {
            ResourceDefinitionContext ctx = new ResourceDefinitionContext.Builder()
                    .withGroup("networking.istio.io")
                    .withVersion("v1beta1")
                    .withPlural("virtualservices")
                    .withNamespaced(true)
                    .build();

            Watch watch = kubernetesClient
                    .genericKubernetesResources(ctx)
                    .inAnyNamespace()
                    .watch(new Watcher<GenericKubernetesResource>() {
                        @Override
                        public void eventReceived(Action action, GenericKubernetesResource resource) {
                            handleGenericApplicationEvent(action, resource, "virtualservice");
                        }

                        @Override
                        public void onClose(WatcherException e) {
                            if (e != null) {
                                Log.error("VirtualService watch closed with error", e);
                            } else {
                                Log.info("VirtualService watch closed");
                            }
                        }
                    });

            watches.add(watch);
            Log.info("Started watching Istio VirtualService resources");
        } catch (Exception e) {
            Log.error("Failed to start VirtualService watch", e);
        }
    }

    /** Starts watching Gateway API HTTPRoute resources. */
    private void startHttpRouteWatch() {
        try {
            ResourceDefinitionContext ctx = new ResourceDefinitionContext.Builder()
                    .withGroup("gateway.networking.k8s.io")
                    .withVersion("v1")
                    .withPlural("httproutes")
                    .withNamespaced(true)
                    .build();

            Watch watch = kubernetesClient
                    .genericKubernetesResources(ctx)
                    .inAnyNamespace()
                    .watch(new Watcher<GenericKubernetesResource>() {
                        @Override
                        public void eventReceived(Action action, GenericKubernetesResource resource) {
                            handleGenericApplicationEvent(action, resource, "httproute");
                        }

                        @Override
                        public void onClose(WatcherException e) {
                            if (e != null) {
                                Log.error("HTTPRoute watch closed with error", e);
                            } else {
                                Log.info("HTTPRoute watch closed");
                            }
                        }
                    });

            watches.add(watch);
            Log.info("Started watching Gateway API HTTPRoute resources");
        } catch (Exception e) {
            Log.error("Failed to start HTTPRoute watch", e);
        }
    }

    /**
     * Schedules periodic cache refresh to catch any deleted objects that may have
     * been missed
     * by watches (e.g., due to network issues or watch disconnections).
     */
    private void schedulePeriodicCacheRefresh() {
        try {
            var trigger = scheduler.newJob("cache-refresh")
                    .setInterval(cacheRefreshIntervalMinutes + "m")
                    .setTask(executionContext -> {
                        Log.info("Running periodic cache refresh");
                        try {
                            refreshCache();
                        } catch (Exception e) {
                            Log.error("Error during periodic cache refresh", e);
                        }
                    })
                    .schedule();

            cacheRefreshJobId = trigger.getId();
            Log.infof("Scheduled periodic cache refresh every %d minutes", cacheRefreshIntervalMinutes);
        } catch (Exception e) {
            Log.error("Failed to schedule periodic cache refresh", e);
        }
    }

    /**
     * Refreshes the entire cache by reloading all resources from Kubernetes.
     * This helps catch any deleted objects that may have been missed by watches.
     */
    private void refreshCache() {
        Log.debug("Refreshing cache - loading all resources from Kubernetes");

        // Set flag to prevent watch events from triggering during refresh
        refreshInProgress.set(true);

        try {
            // Clear existing caches
            applicationCacheService.clear();
            bookmarkCacheService.clear();

            // Reload data
            loadApplicationsIntoCache();
            loadBookmarksIntoCache();

            // Clean up availability checks for deleted applications
            syncAvailabilityChecks();

            Log.infof("Cache refresh complete: %d applications, %d bookmarks",
                    applicationCacheService.size(), bookmarkCacheService.size());
        } finally {
            // Always reset the flag
            refreshInProgress.set(false);
        }
    }

    /**
     * Synchronizes the availability check service with the current set of
     * applications.
     * Removes URLs from availability checking that are no longer in the cache.
     */
    private void syncAvailabilityChecks() {
        if (!availabilityCheckService.isEnabled()) {
            return;
        }

        // Get all current application URLs
        var currentUrls = applicationCacheService.getAll().stream()
                .map(ApplicationResponse::getUrl)
                .filter(url -> url != null && !url.isEmpty())
                .collect(java.util.stream.Collectors.toSet());

        // Get all URLs currently being checked
        var trackedUrls = availabilityCheckService.getTrackedUrls();

        // Find URLs that are being checked but no longer have applications
        var orphanedUrls = new java.util.HashSet<>(trackedUrls);
        orphanedUrls.removeAll(currentUrls);

        // Unregister orphaned URLs
        for (String orphanedUrl : orphanedUrls) {
            availabilityCheckService.unregisterUrl(orphanedUrl);
        }

        if (!orphanedUrls.isEmpty()) {
            Log.infof("Cleaned up %d orphaned URLs from availability checks", orphanedUrls.size());
        }
    }

    /**
     * Handles generic application events from non-CRD resources (Ingress, Route,
     * VirtualService, HTTPRoute).
     * Since these are not strongly typed, we trigger a full cache reload to ensure
     * consistency.
     *
     * @param action       the watch action
     * @param resource     the generic Kubernetes resource
     * @param resourceType the type of resource (for logging)
     */
    private void handleGenericApplicationEvent(Watcher.Action action, GenericKubernetesResource resource,
            String resourceType) {
        if (resource == null || resource.getMetadata() == null) {
            return;
        }

        // Skip if a refresh is already in progress to prevent cascading reloads
        if (refreshInProgress.get()) {
            Log.debugf("Skipping %s event during cache refresh", resourceType);
            return;
        }

        // Debounce: skip if we recently reloaded
        long now = System.currentTimeMillis();
        long timeSinceLastReload = now - lastGenericApplicationReload;
        if (timeSinceLastReload < DEBOUNCE_INTERVAL_MS) {
            Log.debugf("Debouncing %s event (only %d ms since last reload)", resourceType, timeSinceLastReload);
            return;
        }

        String namespace = resource.getMetadata().getNamespace();
        String name = resource.getMetadata().getName();

        Log.debugf("%s event: %s for %s/%s", resourceType, action, namespace, name);

        try {
            // For generic resources, we reload the entire application cache
            // This is simpler than trying to parse each resource type individually
            Log.debugf("Reloading application cache due to %s change", resourceType);

            // Set flag to prevent cascading
            refreshInProgress.set(true);
            lastGenericApplicationReload = System.currentTimeMillis();

            try {
                // Clear and reload applications
                applicationCacheService.clear();
                loadApplicationsIntoCache();

                // Broadcast a generic status change event to trigger client refresh
                eventBroadcaster.broadcastStatusChanged(null);
            } finally {
                refreshInProgress.set(false);
            }
        } catch (Exception e) {
            Log.errorf(e, "Error handling %s event: %s for %s/%s", resourceType, action, namespace, name);
            refreshInProgress.set(false);
        }
    }

    /**
     * Handles generic bookmark events from non-CRD resources (Hajimari bookmarks).
     *
     * @param action       the watch action
     * @param resource     the generic Kubernetes resource
     * @param resourceType the type of resource (for logging)
     */
    private void handleGenericBookmarkEvent(Watcher.Action action, GenericKubernetesResource resource,
            String resourceType) {
        if (resource == null || resource.getMetadata() == null) {
            return;
        }

        // Skip if a refresh is already in progress to prevent cascading reloads
        if (refreshInProgress.get()) {
            Log.debugf("Skipping %s bookmark event during cache refresh", resourceType);
            return;
        }

        // Debounce: skip if we recently reloaded
        long now = System.currentTimeMillis();
        long timeSinceLastReload = now - lastGenericBookmarkReload;
        if (timeSinceLastReload < DEBOUNCE_INTERVAL_MS) {
            Log.debugf("Debouncing %s bookmark event (only %d ms since last reload)", resourceType,
                    timeSinceLastReload);
            return;
        }

        String namespace = resource.getMetadata().getNamespace();
        String name = resource.getMetadata().getName();

        Log.debugf("%s bookmark event: %s for %s/%s", resourceType, action, namespace, name);

        try {
            // For generic resources, we reload the entire bookmark cache
            Log.debugf("Reloading bookmark cache due to %s change", resourceType);

            // Set flag to prevent cascading
            refreshInProgress.set(true);
            lastGenericBookmarkReload = System.currentTimeMillis();

            try {
                // Clear and reload bookmarks
                bookmarkCacheService.clear();
                loadBookmarksIntoCache();

                // Broadcast a generic status change event to trigger client refresh
                eventBroadcaster.broadcastStatusChanged(null);
            } finally {
                refreshInProgress.set(false);
            }
        } catch (Exception e) {
            Log.errorf(e, "Error handling %s bookmark event: %s for %s/%s", resourceType, action, namespace, name);
            refreshInProgress.set(false);
        }
    }

    /**
     * Handles Application CRD events.
     *
     * @param action      the watch action (ADDED, MODIFIED, DELETED)
     * @param application the application resource
     */
    private void handleApplicationEvent(Watcher.Action action, Application application) {
        if (application == null || application.getMetadata() == null) {
            return;
        }

        String namespace = application.getMetadata().getNamespace();
        String name = application.getMetadata().getName();

        Log.debugf("Application event: %s for %s/%s", action, namespace, name);

        try {
            switch (action) {
                case ADDED:
                case MODIFIED:
                    // Convert to ApplicationResponse and update cache
                    ApplicationResponse appResponse = new ApplicationResponse(application.getSpec());
                    appResponse.setNamespace(namespace);
                    appResponse.setResourceName(name);
                    appResponse.setHasOwnerReferences(
                            application.getMetadata().getOwnerReferences() != null
                                    && !application.getMetadata().getOwnerReferences().isEmpty());

                    // Register URL for availability checking
                    if (appResponse.getUrl() != null && !appResponse.getUrl().isEmpty()) {
                        availabilityCheckService.registerUrl(appResponse.getUrl());
                    }

                    // Enrich with availability
                    List<ApplicationResponse> enriched = availabilityCheckService
                            .enrichWithAvailability(List.of(appResponse));
                    if (!enriched.isEmpty()) {
                        appResponse = enriched.get(0);
                    }

                    applicationCacheService.put(appResponse);

                    // Broadcast event
                    if (action == Watcher.Action.ADDED) {
                        eventBroadcaster.broadcastApplicationAdded(application);
                    } else {
                        eventBroadcaster.broadcastApplicationUpdated(application);
                    }
                    break;

                case DELETED:
                    // Remove from cache
                    ApplicationResponse removed = applicationCacheService.remove(namespace, name);

                    // Unregister URL from availability checking
                    if (removed != null && removed.getUrl() != null && !removed.getUrl().isEmpty()) {
                        availabilityCheckService.unregisterUrl(removed.getUrl());
                    }

                    // Broadcast event
                    if (removed != null) {
                        eventBroadcaster.broadcastApplicationRemoved(application);
                    }
                    break;

                default:
                    Log.debugf("Unhandled Application action: %s", action);
            }
        } catch (Exception e) {
            Log.errorf(e, "Error handling Application event: %s for %s/%s", action, namespace, name);
        }
    }

    /**
     * Handles Bookmark CRD events.
     *
     * @param action   the watch action (ADDED, MODIFIED, DELETED)
     * @param bookmark the bookmark resource
     */
    private void handleBookmarkEvent(Watcher.Action action, Bookmark bookmark) {
        if (bookmark == null || bookmark.getMetadata() == null) {
            return;
        }

        String namespace = bookmark.getMetadata().getNamespace();
        String name = bookmark.getMetadata().getName();

        Log.debugf("Bookmark event: %s for %s/%s", action, namespace, name);

        try {
            switch (action) {
                case ADDED:
                case MODIFIED:
                    // Convert to BookmarkResponse and update cache
                    BookmarkResponse bookmarkResponse = new BookmarkResponse(bookmark.getSpec());
                    bookmarkResponse.setNamespace(namespace);
                    bookmarkResponse.setResourceName(name);
                    bookmarkResponse.setHasOwnerReferences(
                            bookmark.getMetadata().getOwnerReferences() != null
                                    && !bookmark.getMetadata().getOwnerReferences().isEmpty());

                    bookmarkCacheService.put(bookmarkResponse);

                    // Broadcast event
                    if (action == Watcher.Action.ADDED) {
                        eventBroadcaster.broadcastBookmarkAdded(bookmark);
                    } else {
                        eventBroadcaster.broadcastBookmarkUpdated(bookmark);
                    }
                    break;

                case DELETED:
                    // Remove from cache
                    BookmarkResponse removed = bookmarkCacheService.remove(namespace, name);

                    // Broadcast event
                    if (removed != null) {
                        eventBroadcaster.broadcastBookmarkRemoved(bookmark);
                    }
                    break;

                default:
                    Log.debugf("Unhandled Bookmark action: %s", action);
            }
        } catch (Exception e) {
            Log.errorf(e, "Error handling Bookmark event: %s for %s/%s", action, namespace, name);
        }
    }
}
