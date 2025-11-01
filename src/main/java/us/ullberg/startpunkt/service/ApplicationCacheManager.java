package us.ullberg.startpunkt.service;

import io.quarkus.cache.CacheInvalidate;
import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;

/**
 * Service for managing cache invalidation across the application. Provides centralized cache
 * management for applications and bookmarks.
 */
@ApplicationScoped
public class ApplicationCacheManager {

  /**
   * Invalidates all application-related caches. Called when Kubernetes resources change to ensure
   * fresh data on next request.
   */
  public void invalidateApplicationCaches() {
    invalidateGetAppCache();
    invalidateGetAppsCache();
    invalidateGetAppsFilteredCache();
    Log.debug("Invalidated application caches due to resource changes");
  }

  /**
   * Invalidates all bookmark-related caches. Called when bookmark resources change to ensure fresh
   * data on next request.
   */
  public void invalidateBookmarkCaches() {
    invalidateGetBookmarksCache();
    Log.debug("Invalidated bookmark caches due to resource changes");
  }

  /** Invalidates all caches in the application. */
  public void invalidateAllCaches() {
    invalidateApplicationCaches();
    invalidateBookmarkCaches();
    Log.debug("Invalidated all caches");
  }

  @CacheInvalidate(cacheName = "getApp")
  protected void invalidateGetAppCache() {
    // No-op: annotation triggers cache invalidation
  }

  @CacheInvalidate(cacheName = "getApps")
  protected void invalidateGetAppsCache() {
    // No-op: annotation triggers cache invalidation
  }

  @CacheInvalidate(cacheName = "getAppsFiltered")
  protected void invalidateGetAppsFilteredCache() {
    // No-op: annotation triggers cache invalidation
  }

  @CacheInvalidate(cacheName = "getBookmarks")
  protected void invalidateGetBookmarksCache() {
    // No-op: annotation triggers cache invalidation
  }
}
