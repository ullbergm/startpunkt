package us.ullberg.startpunkt.service;

import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import us.ullberg.startpunkt.objects.ApplicationResponse;

/**
 * Service that maintains an in-memory cache of all Kubernetes applications.
 *
 * <p>This service stores ApplicationResponse objects in a thread-safe map, indexed by a composite
 * key of namespace + resource name + source type. The cache is populated on startup and updated by
 * Kubernetes watch handlers.
 *
 * <p>Thread-safe operations ensure multiple watch handlers can update the cache concurrently
 * without data corruption.
 */
@ApplicationScoped
public class ApplicationCacheService {

  // Thread-safe map for storing applications
  // Key format: "cluster/namespace/resourceName" - since app.name may differ from
  // resourceName,
  // we use the Kubernetes metadata (cluster + namespace + resource name) as the unique
  // identifier
  private final Map<String, ApplicationResponse> applicationCache = new ConcurrentHashMap<>();

  /**
   * Generate a cache key for an application.
   *
   * @param cluster the cluster name
   * @param namespace the namespace
   * @param resourceName the resource name
   * @return the cache key
   */
  private String getCacheKey(String cluster, String namespace, String resourceName) {
    return String.format("%s/%s/%s", cluster, namespace, resourceName);
  }

  /**
   * Generate a cache key from an ApplicationResponse.
   *
   * @param app the application response
   * @return the cache key
   */
  private String getCacheKey(ApplicationResponse app) {
    return getCacheKey(
        app.getCluster() != null ? app.getCluster() : "local",
        app.getNamespace() != null ? app.getNamespace() : "unknown",
        app.getResourceName() != null ? app.getResourceName() : "unknown");
  }

  /**
   * Add or update an application in the cache.
   *
   * @param app the application to add or update
   */
  public void put(ApplicationResponse app) {
    if (app == null) {
      Log.warn("Attempted to add null application to cache");
      return;
    }

    String key = getCacheKey(app);
    ApplicationResponse existing = applicationCache.put(key, app);

    if (existing == null) {
      Log.debugf("Added application to cache: %s", key);
    } else {
      Log.debugf("Updated application in cache: %s", key);
    }
  }

  /**
   * Add or update multiple applications in the cache.
   *
   * @param apps the applications to add or update
   */
  public void putAll(List<ApplicationResponse> apps) {
    if (apps == null || apps.isEmpty()) {
      return;
    }

    for (ApplicationResponse app : apps) {
      put(app);
    }

    Log.infof("Cached %d applications", apps.size());
  }

  /**
   * Remove an application from the cache.
   *
   * @param cluster the cluster name
   * @param namespace the namespace
   * @param resourceName the resource name
   * @return the removed application, or null if not found
   */
  public ApplicationResponse remove(String cluster, String namespace, String resourceName) {
    String key = getCacheKey(cluster, namespace, resourceName);
    ApplicationResponse removed = applicationCache.remove(key);

    if (removed != null) {
      Log.debugf("Removed application from cache: %s", key);
    } else {
      Log.debugf("Application not found in cache for removal: %s", key);
    }

    return removed;
  }

  /**
   * Get an application from the cache.
   *
   * @param cluster the cluster name
   * @param namespace the namespace
   * @param resourceName the resource name
   * @return the application, or null if not found
   */
  public ApplicationResponse get(String cluster, String namespace, String resourceName) {
    String key = getCacheKey(cluster, namespace, resourceName);
    return applicationCache.get(key);
  }

  /**
   * Get all applications from the cache.
   *
   * @return a list of all cached applications
   */
  public List<ApplicationResponse> getAll() {
    return new ArrayList<>(applicationCache.values());
  }

  /**
   * Get the number of applications in the cache.
   *
   * @return the cache size
   */
  public int size() {
    return applicationCache.size();
  }

  /**
   * Clear all applications from the cache.
   *
   * <p>This is primarily for testing or emergency reset scenarios.
   */
  public void clear() {
    int size = applicationCache.size();
    applicationCache.clear();
    Log.infof("Cleared application cache (%d applications removed)", size);
  }

  /**
   * Remove all applications from a specific cluster and namespace.
   *
   * @param cluster the cluster name
   * @param namespace the namespace
   * @return the number of applications removed
   */
  public int removeByClusterAndNamespace(String cluster, String namespace) {
    List<String> keysToRemove = new ArrayList<>();
    String prefix = cluster + "/" + namespace + "/";

    for (String key : applicationCache.keySet()) {
      if (key.startsWith(prefix)) {
        keysToRemove.add(key);
      }
    }

    for (String key : keysToRemove) {
      applicationCache.remove(key);
    }

    if (!keysToRemove.isEmpty()) {
      Log.infof(
          "Removed %d applications from cache (cluster=%s, namespace=%s)",
          keysToRemove.size(), cluster, namespace);
    }

    return keysToRemove.size();
  }

  /**
   * Remove all applications from a specific namespace (across all clusters).
   *
   * @param namespace the namespace
   * @return the number of applications removed
   */
  public int removeByNamespace(String namespace) {
    List<String> keysToRemove = new ArrayList<>();

    for (String key : applicationCache.keySet()) {
      String[] parts = key.split("/");
      if (parts.length >= 2 && parts[1].equals(namespace)) {
        keysToRemove.add(key);
      }
    }

    for (String key : keysToRemove) {
      applicationCache.remove(key);
    }

    if (!keysToRemove.isEmpty()) {
      Log.infof(
          "Removed %d applications from cache (namespace=%s)", keysToRemove.size(), namespace);
    }

    return keysToRemove.size();
  }

  /**
   * Remove all applications from a specific cluster.
   *
   * @param cluster the cluster name
   * @return the number of applications removed
   */
  public int removeByCluster(String cluster) {
    List<String> keysToRemove = new ArrayList<>();
    String prefix = cluster + "/";

    for (String key : applicationCache.keySet()) {
      if (key.startsWith(prefix)) {
        keysToRemove.add(key);
      }
    }

    for (String key : keysToRemove) {
      applicationCache.remove(key);
    }

    if (!keysToRemove.isEmpty()) {
      Log.infof("Removed %d applications from cache (cluster=%s)", keysToRemove.size(), cluster);
    }

    return keysToRemove.size();
  }
}
