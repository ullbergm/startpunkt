package us.ullberg.startpunkt.service;

import static org.junit.jupiter.api.Assertions.*;

import io.fabric8.kubernetes.api.model.ObjectMetaBuilder;
import io.fabric8.kubernetes.api.model.OwnerReference;
import io.fabric8.kubernetes.api.model.OwnerReferenceBuilder;
import io.fabric8.kubernetes.api.model.apiextensions.v1.CustomResourceDefinition;
import io.fabric8.kubernetes.client.NamespacedKubernetesClient;
import io.fabric8.kubernetes.client.dsl.base.CustomResourceDefinitionContext;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.kubernetes.client.KubernetesServer;
import io.quarkus.test.kubernetes.client.KubernetesTestServer;
import io.quarkus.test.kubernetes.client.WithKubernetesTestServer;
import java.net.HttpURLConnection;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import us.ullberg.startpunkt.crd.v1alpha4.Application;
import us.ullberg.startpunkt.crd.v1alpha4.ApplicationSpec;

@QuarkusTest
@WithKubernetesTestServer
class ApplicationServiceTest {
  private static final Class<Application> RESOURCE_TYPE = Application.class;

  @KubernetesTestServer KubernetesServer server;
  private NamespacedKubernetesClient client;
  private ApplicationService applicationService;

  @BeforeEach
  public void before() {
    // Create a CustomResourceDefinition (CRD) for the Application resource
    CustomResourceDefinition crd =
        CustomResourceDefinitionContext.v1CRDFromCustomResourceType(RESOURCE_TYPE).build();

    // Set up the mock server to expect a POST request for creating the CRD
    server
        .expect()
        .post()
        .withPath("/apis/apiextensions.k8s.io/v1/customresourcedefinitions")
        .andReturn(HttpURLConnection.HTTP_OK, crd)
        .once();

    // Get the Kubernetes client from the mock server
    client = server.getClient();

    // Create the CRD in the mock Kubernetes cluster
    CustomResourceDefinition createdApplicationCrd =
        client.apiextensions().v1().customResourceDefinitions().resource(crd).create();

    assertNotNull(createdApplicationCrd);

    // Initialize the service
    applicationService = new ApplicationService(client);
  }

  @Test
  void testCreateApplication() {
    // Create a new application
    ApplicationSpec spec = new ApplicationSpec();
    spec.setName("Create Test App");
    spec.setGroup("Test Group");
    spec.setUrl("https://create-test.example.com");
    spec.setEnabled(true);

    Application created = applicationService.createApplication("default", "create-test-app", spec);

    assertNotNull(created);
    assertNotNull(created.getMetadata());
    assertEquals("create-test-app", created.getMetadata().getName());
    assertEquals("default", created.getMetadata().getNamespace());
    assertEquals("Create Test App", created.getSpec().getName());
  }

  @Test
  void testUpdateApplication() {
    // First create an application
    ApplicationSpec spec = new ApplicationSpec();
    spec.setName("Update Test App");
    spec.setGroup("Test Group");
    spec.setUrl("https://update-test.example.com");
    spec.setEnabled(true);

    applicationService.createApplication("default", "update-test-app", spec);

    // Now update it
    spec.setName("Updated App");
    spec.setUrl("https://updated.example.com");

    Application updated = applicationService.updateApplication("default", "update-test-app", spec);

    assertNotNull(updated);
    assertEquals("Updated App", updated.getSpec().getName());
    assertEquals("https://updated.example.com", updated.getSpec().getUrl());
  }

  @Test
  void testUpdateNonExistentApplication() {
    ApplicationSpec spec = new ApplicationSpec();
    spec.setName("Test App");
    spec.setGroup("Test Group");
    spec.setUrl("https://test.example.com");

    assertThrows(
        IllegalArgumentException.class,
        () -> applicationService.updateApplication("default", "nonexistent", spec));
  }

  @Test
  void testDeleteApplication() {
    // Create an application first
    ApplicationSpec spec = new ApplicationSpec();
    spec.setName("Delete Test App");
    spec.setGroup("Test Group");
    spec.setUrl("https://delete-test.example.com");

    applicationService.createApplication("default", "delete-test-app", spec);

    // Delete it
    boolean deleted = applicationService.deleteApplication("default", "delete-test-app");

    assertTrue(deleted);

    // Verify it's gone
    Application app = applicationService.getApplication("default", "delete-test-app");
    assertNull(app);
  }

  @Test
  void testDeleteNonExistentApplication() {
    boolean deleted = applicationService.deleteApplication("default", "nonexistent");
    assertFalse(deleted);
  }

  @Test
  void testGetApplication() {
    // Create an application
    ApplicationSpec spec = new ApplicationSpec();
    spec.setName("Get Test App");
    spec.setGroup("Test Group");
    spec.setUrl("https://get-test.example.com");

    applicationService.createApplication("default", "get-test-app", spec);

    // Get it
    Application app = applicationService.getApplication("default", "get-test-app");

    assertNotNull(app);
    assertEquals("get-test-app", app.getMetadata().getName());
    assertEquals("Get Test App", app.getSpec().getName());
  }

  @Test
  void testIsReadOnly() {
    // Create an application without owner reference
    Application app = new Application();
    app.setMetadata(new ObjectMetaBuilder().withName("test-app").build());

    assertFalse(applicationService.isReadOnly(app));

    // Add an owner reference
    OwnerReference owner =
        new OwnerReferenceBuilder()
            .withKind("Deployment")
            .withName("test-deployment")
            .withUid("test-uid")
            .withApiVersion("apps/v1")
            .build();
    app.getMetadata().setOwnerReferences(List.of(owner));

    assertTrue(applicationService.isReadOnly(app));
  }

  @Test
  void testGetOwner() {
    // Create an application without owner reference
    Application app = new Application();
    app.setMetadata(new ObjectMetaBuilder().withName("test-app").build());

    assertTrue(applicationService.getOwner(app).isEmpty());

    // Add an owner reference
    OwnerReference owner =
        new OwnerReferenceBuilder()
            .withKind("Deployment")
            .withName("test-deployment")
            .withUid("test-uid")
            .withApiVersion("apps/v1")
            .build();
    app.getMetadata().setOwnerReferences(List.of(owner));

    assertTrue(applicationService.getOwner(app).isPresent());
    assertEquals("Deployment", applicationService.getOwner(app).get().getKind());
  }
}
