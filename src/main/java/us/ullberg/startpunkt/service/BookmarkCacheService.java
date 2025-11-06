package us.ullberg.startpunkt.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;
import us.ullberg.startpunkt.objects.BookmarkResponse;

/**
 * Service that maintains an in-memory cache of all Kubernetes bookmarks.
 *
 * <p>
 * This service stores BookmarkResponse objects in a thread-safe map, indexed by
 * a composite key
 * of namespace + resource name. The cache is populated on startup and updated
 * by Kubernetes watch
 * handlers.
 *
 * <p>
 * Thread-safe operations ensure multiple watch handlers can update the cache
 * concurrently
 * without data corruption.
 */
@ApplicationScoped
public class BookmarkCacheService {

    // Thread-safe map for storing bookmarks
    // Key format: "namespace/resourceName"
    private final Map<String, BookmarkResponse> bookmarkCache = new ConcurrentHashMap<>();

    /**
     * Generate a cache key for a bookmark.
     *
     * @param namespace    the namespace
     * @param resourceName the resource name
     * @return the cache key
     */
    private String getCacheKey(String namespace, String resourceName) {
        return String.format("%s/%s", namespace, resourceName);
    }

    /**
     * Generate a cache key from a BookmarkResponse.
     *
     * @param bookmark the bookmark response
     * @return the cache key
     */
    private String getCacheKey(BookmarkResponse bookmark) {
        return getCacheKey(
                bookmark.getNamespace() != null ? bookmark.getNamespace() : "unknown",
                bookmark.getResourceName() != null ? bookmark.getResourceName() : "unknown");
    }

    /**
     * Add or update a bookmark in the cache.
     *
     * @param bookmark the bookmark to add or update
     */
    public void put(BookmarkResponse bookmark) {
        if (bookmark == null) {
            Log.warn("Attempted to add null bookmark to cache");
            return;
        }

        String key = getCacheKey(bookmark);
        BookmarkResponse existing = bookmarkCache.put(key, bookmark);

        if (existing == null) {
            Log.debugf("Added bookmark to cache: %s", key);
        } else {
            Log.debugf("Updated bookmark in cache: %s", key);
        }
    }

    /**
     * Add or update multiple bookmarks in the cache.
     *
     * @param bookmarks the bookmarks to add or update
     */
    public void putAll(List<BookmarkResponse> bookmarks) {
        if (bookmarks == null || bookmarks.isEmpty()) {
            return;
        }

        for (BookmarkResponse bookmark : bookmarks) {
            put(bookmark);
        }

        Log.infof("Cached %d bookmarks", bookmarks.size());
    }

    /**
     * Remove a bookmark from the cache.
     *
     * @param namespace    the namespace
     * @param resourceName the resource name
     * @return the removed bookmark, or null if not found
     */
    public BookmarkResponse remove(String namespace, String resourceName) {
        String key = getCacheKey(namespace, resourceName);
        BookmarkResponse removed = bookmarkCache.remove(key);

        if (removed != null) {
            Log.debugf("Removed bookmark from cache: %s", key);
        } else {
            Log.debugf("Bookmark not found in cache for removal: %s", key);
        }

        return removed;
    }

    /**
     * Get a bookmark from the cache.
     *
     * @param namespace    the namespace
     * @param resourceName the resource name
     * @return the bookmark, or null if not found
     */
    public BookmarkResponse get(String namespace, String resourceName) {
        String key = getCacheKey(namespace, resourceName);
        return bookmarkCache.get(key);
    }

    /**
     * Get all bookmarks from the cache.
     *
     * @return a list of all cached bookmarks
     */
    public List<BookmarkResponse> getAll() {
        return new ArrayList<>(bookmarkCache.values());
    }

    /**
     * Get the number of bookmarks in the cache.
     *
     * @return the cache size
     */
    public int size() {
        return bookmarkCache.size();
    }

    /**
     * Clear all bookmarks from the cache.
     *
     * <p>
     * This is primarily for testing or emergency reset scenarios.
     */
    public void clear() {
        int size = bookmarkCache.size();
        bookmarkCache.clear();
        Log.infof("Cleared bookmark cache (%d bookmarks removed)", size);
    }

    /**
     * Remove all bookmarks from a specific namespace.
     *
     * @param namespace the namespace
     * @return the number of bookmarks removed
     */
    public int removeByNamespace(String namespace) {
        List<String> keysToRemove = new ArrayList<>();

        for (String key : bookmarkCache.keySet()) {
            if (key.startsWith(namespace + "/")) {
                keysToRemove.add(key);
            }
        }

        for (String key : keysToRemove) {
            bookmarkCache.remove(key);
        }

        if (!keysToRemove.isEmpty()) {
            Log.infof("Removed %d bookmarks from cache (namespace=%s)", keysToRemove.size(), namespace);
        }

        return keysToRemove.size();
    }
}
