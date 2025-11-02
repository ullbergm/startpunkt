package us.ullberg.startpunkt.service;

import io.fabric8.kubernetes.api.model.ObjectMetaBuilder;
import io.fabric8.kubernetes.api.model.OwnerReference;
import io.fabric8.kubernetes.client.KubernetesClient;
import io.quarkus.logging.Log;
import jakarta.enterprise.context.ApplicationScoped;
import java.util.List;
import java.util.Optional;
import us.ullberg.startpunkt.crd.v1alpha4.Application;
import us.ullberg.startpunkt.crd.v1alpha4.ApplicationSpec;

/**
 * Service class for managing Application custom resources in Kubernetes. Provides CRUD operations
 * for Application CRDs.
 */
@ApplicationScoped
public class ApplicationService {

  private final KubernetesClient kubernetesClient;

  /**
   * Constructor with injected Kubernetes client.
   *
   * @param kubernetesClient the Kubernetes client
   */
  public ApplicationService(KubernetesClient kubernetesClient) {
    this.kubernetesClient = kubernetesClient;
  }

  /**
   * Creates a new Application custom resource in the specified namespace.
   *
   * @param namespace the namespace to create the application in
   * @param name the name for the application resource
   * @param spec the application specification
   * @return the created Application resource
   */
  public Application createApplication(String namespace, String name, ApplicationSpec spec) {
    Log.debugf("Creating application %s in namespace %s", name, namespace);

    Application app = new Application();
    app.setMetadata(new ObjectMetaBuilder().withName(name).withNamespace(namespace).build());
    app.setSpec(spec);

    Application created =
        kubernetesClient.resources(Application.class).inNamespace(namespace).resource(app).create();

    Log.infof("Created application %s in namespace %s", name, namespace);
    return created;
  }

  /**
   * Updates an existing Application custom resource.
   *
   * @param namespace the namespace of the application
   * @param name the name of the application resource
   * @param spec the updated application specification
   * @return the updated Application resource
   */
  public Application updateApplication(String namespace, String name, ApplicationSpec spec) {
    Log.debugf("Updating application %s in namespace %s", name, namespace);

    Application app =
        kubernetesClient.resources(Application.class).inNamespace(namespace).withName(name).get();

    if (app == null) {
      throw new IllegalArgumentException(
          "Application not found: " + name + " in namespace " + namespace);
    }

    app.setSpec(spec);

    Application updated =
        kubernetesClient.resources(Application.class).inNamespace(namespace).resource(app).update();

    Log.infof("Updated application %s in namespace %s", name, namespace);
    return updated;
  }

  /**
   * Deletes an Application custom resource.
   *
   * @param namespace the namespace of the application
   * @param name the name of the application resource
   * @return true if deleted successfully
   */
  public boolean deleteApplication(String namespace, String name) {
    Log.debugf("Deleting application %s in namespace %s", name, namespace);

    List<io.fabric8.kubernetes.api.model.StatusDetails> deleted =
        kubernetesClient
            .resources(Application.class)
            .inNamespace(namespace)
            .withName(name)
            .delete();

    boolean success = deleted != null && !deleted.isEmpty();
    if (success) {
      Log.infof("Deleted application %s in namespace %s", name, namespace);
    } else {
      Log.warnf("Application not found or already deleted: %s in namespace %s", name, namespace);
    }
    return success;
  }

  /**
   * Gets an Application custom resource.
   *
   * @param namespace the namespace of the application
   * @param name the name of the application resource
   * @return the Application resource or null if not found
   */
  public Application getApplication(String namespace, String name) {
    return kubernetesClient
        .resources(Application.class)
        .inNamespace(namespace)
        .withName(name)
        .get();
  }

  /**
   * Checks if an Application is owned by another resource (read-only).
   *
   * @param application the application to check
   * @return true if the application has owner references
   */
  public boolean isReadOnly(Application application) {
    if (application == null || application.getMetadata() == null) {
      return false;
    }
    List<OwnerReference> owners = application.getMetadata().getOwnerReferences();
    return owners != null && !owners.isEmpty();
  }

  /**
   * Gets the first owner reference for an application.
   *
   * @param application the application to check
   * @return Optional containing the first owner reference if present
   */
  public Optional<OwnerReference> getOwner(Application application) {
    if (application == null || application.getMetadata() == null) {
      return Optional.empty();
    }
    List<OwnerReference> owners = application.getMetadata().getOwnerReferences();
    if (owners != null && !owners.isEmpty()) {
      return Optional.of(owners.get(0));
    }
    return Optional.empty();
  }
}
