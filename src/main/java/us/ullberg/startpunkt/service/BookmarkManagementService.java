package us.ullberg.startpunkt.service;

import io.fabric8.kubernetes.api.model.ObjectMetaBuilder;
import io.fabric8.kubernetes.api.model.OwnerReference;
import io.fabric8.kubernetes.client.KubernetesClient;
import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.List;
import java.util.Optional;
import us.ullberg.startpunkt.crd.v1alpha4.Bookmark;
import us.ullberg.startpunkt.crd.v1alpha4.BookmarkSpec;

/**
 * Service class for managing Bookmark custom resources in Kubernetes. Provides CRUD operations for
 * Bookmark CRDs.
 */
@ApplicationScoped
public class BookmarkManagementService {

  private final KubernetesClient kubernetesClient;

  /**
   * Constructor with injected Kubernetes client.
   *
   * @param kubernetesClient the Kubernetes client
   */
  public BookmarkManagementService(KubernetesClient kubernetesClient) {
    this.kubernetesClient = kubernetesClient;
  }

  /**
   * Creates a new Bookmark custom resource in the specified namespace.
   *
   * @param namespace the namespace to create the bookmark in
   * @param name the name for the bookmark resource
   * @param spec the bookmark specification
   * @return the created Bookmark resource
   */
  public Bookmark createBookmark(String namespace, String name, BookmarkSpec spec) {
    Log.debugf("Creating bookmark %s in namespace %s", name, namespace);

    Bookmark bookmark = new Bookmark();
    bookmark.setMetadata(new ObjectMetaBuilder().withName(name).withNamespace(namespace).build());
    bookmark.setSpec(spec);

    Bookmark created =
        kubernetesClient
            .resources(Bookmark.class)
            .inNamespace(namespace)
            .resource(bookmark)
            .create();

    Log.infof("Created bookmark %s in namespace %s", name, namespace);
    return created;
  }

  /**
   * Updates an existing Bookmark custom resource.
   *
   * @param namespace the namespace of the bookmark
   * @param name the name of the bookmark resource
   * @param spec the updated bookmark specification
   * @return the updated Bookmark resource
   */
  public Bookmark updateBookmark(String namespace, String name, BookmarkSpec spec) {
    Log.debugf("Updating bookmark %s in namespace %s", name, namespace);

    Bookmark bookmark =
        kubernetesClient.resources(Bookmark.class).inNamespace(namespace).withName(name).get();

    if (bookmark == null) {
      throw new IllegalArgumentException(
          "Bookmark not found: " + name + " in namespace " + namespace);
    }

    bookmark.setSpec(spec);

    Bookmark updated =
        kubernetesClient
            .resources(Bookmark.class)
            .inNamespace(namespace)
            .resource(bookmark)
            .update();

    Log.infof("Updated bookmark %s in namespace %s", name, namespace);
    return updated;
  }

  /**
   * Deletes a Bookmark custom resource.
   *
   * @param namespace the namespace of the bookmark
   * @param name the name of the bookmark resource
   * @return true if deleted successfully
   */
  public boolean deleteBookmark(String namespace, String name) {
    Log.debugf("Deleting bookmark %s in namespace %s", name, namespace);

    List<io.fabric8.kubernetes.api.model.StatusDetails> deleted =
        kubernetesClient.resources(Bookmark.class).inNamespace(namespace).withName(name).delete();

    boolean success = deleted != null && !deleted.isEmpty();
    if (success) {
      Log.infof("Deleted bookmark %s in namespace %s", name, namespace);
    } else {
      Log.warnf("Bookmark not found or already deleted: %s in namespace %s", name, namespace);
    }
    return success;
  }

  /**
   * Gets a Bookmark custom resource.
   *
   * @param namespace the namespace of the bookmark
   * @param name the name of the bookmark resource
   * @return the Bookmark resource or null if not found
   */
  public Bookmark getBookmark(String namespace, String name) {
    return kubernetesClient.resources(Bookmark.class).inNamespace(namespace).withName(name).get();
  }

  /**
   * Checks if a Bookmark is owned by another resource (read-only).
   *
   * @param bookmark the bookmark to check
   * @return true if the bookmark has owner references
   */
  public boolean isReadOnly(Bookmark bookmark) {
    if (bookmark == null || bookmark.getMetadata() == null) {
      return false;
    }
    List<OwnerReference> owners = bookmark.getMetadata().getOwnerReferences();
    return owners != null && !owners.isEmpty();
  }

  /**
   * Gets the first owner reference for a bookmark.
   *
   * @param bookmark the bookmark to check
   * @return Optional containing the first owner reference if present
   */
  public Optional<OwnerReference> getOwner(Bookmark bookmark) {
    if (bookmark == null || bookmark.getMetadata() == null) {
      return Optional.empty();
    }
    List<OwnerReference> owners = bookmark.getMetadata().getOwnerReferences();
    if (owners != null && !owners.isEmpty()) {
      return Optional.of(owners.get(0));
    }
    return Optional.empty();
  }
}
