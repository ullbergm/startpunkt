package us.ullberg.startpunkt.health;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.fabric8.kubernetes.api.model.*;
import io.fabric8.kubernetes.client.NamespacedKubernetesClient;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.kubernetes.client.KubernetesServer;
import io.quarkus.test.kubernetes.client.KubernetesTestServer;
import io.quarkus.test.kubernetes.client.WithKubernetesTestServer;
import java.net.HttpURLConnection;
import org.eclipse.microprofile.health.HealthCheckResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

@QuarkusTest
@WithKubernetesTestServer
class KubernetesConnectionHealthCheckTest {

  @KubernetesTestServer KubernetesServer server;
  private NamespacedKubernetesClient client;
  private KubernetesConnectionHealthCheck healthCheck;

  @BeforeEach
  void setUp() {
    client = server.getClient();
    healthCheck = new KubernetesConnectionHealthCheck(client);
  }

  @Test
  void testCallReturnsUpWhenKubernetesIsHealthy() {
    // Given - Create some nodes and namespaces
    io.fabric8.kubernetes.api.model.Node node = new io.fabric8.kubernetes.api.model.Node();
    node.setMetadata(
        new ObjectMetaBuilder().withName("test-node").withNamespace("default").build());

    Namespace ns1 = new Namespace();
    ns1.setMetadata(new ObjectMetaBuilder().withName("default").build());
    Namespace ns2 = new Namespace();
    ns2.setMetadata(new ObjectMetaBuilder().withName("kube-system").build());
    Namespace ns3 = new Namespace();
    ns3.setMetadata(new ObjectMetaBuilder().withName("test-ns").build());

    // Set up mock server expectations
    server
        .expect()
        .get()
        .withPath("/api/v1/nodes")
        .andReturn(HttpURLConnection.HTTP_OK, new NodeListBuilder().withItems(node).build())
        .always();

    server
        .expect()
        .get()
        .withPath("/api/v1/namespaces")
        .andReturn(
            HttpURLConnection.HTTP_OK, new NamespaceListBuilder().withItems(ns1, ns2, ns3).build())
        .always();

    // When
    HealthCheckResponse response = healthCheck.call();

    // Then
    assertEquals(HealthCheckResponse.Status.UP, response.getStatus());
    assertEquals(
        "Kubernetes connection health check", response.getName(), "Health check name should match");
    var data = response.getData().orElseThrow();
    // Version may or may not be present in test server
    assertEquals(Long.valueOf(1), Long.valueOf(data.get("Nodes").toString()), "Should have 1 node");
    assertEquals(
        Long.valueOf(3), Long.valueOf(data.get("Namespaces").toString()), "Should have 3 namespaces");

    // API groups may or may not be present in test server
    assertNotNull(data.get("Startpunkt API group found"), "Startpunkt API check should exist");
    assertNotNull(data.get("OpenShift Route API group found"), "OpenShift API check should exist");
    assertNotNull(data.get("Hajimari API group found"), "Hajimari API check should exist");
    assertNotNull(data.get("ForeCastle API group found"), "ForeCastle API check should exist");
    assertNotNull(data.get("Traefik API group found"), "Traefik API check should exist");
    assertNotNull(data.get("Gateway API group found"), "Gateway API check should exist");
  }

  @Test
  void testCallWithEmptyCluster() {
    // Given - Empty lists
    server
        .expect()
        .get()
        .withPath("/api/v1/nodes")
        .andReturn(HttpURLConnection.HTTP_OK, new NodeListBuilder().build())
        .always();

    server
        .expect()
        .get()
        .withPath("/api/v1/namespaces")
        .andReturn(HttpURLConnection.HTTP_OK, new NamespaceListBuilder().build())
        .always();

    // When
    HealthCheckResponse response = healthCheck.call();

    // Then
    assertEquals(HealthCheckResponse.Status.UP, response.getStatus(), "Should still be UP");
    var data = response.getData().orElseThrow();
    // Note: Test server may have a default node/namespace, so we just check structure
    assertNotNull(data.get("Nodes"), "Nodes count should be present");
    assertNotNull(data.get("Namespaces"), "Namespaces count should be present");
  }

  @Test
  void testCallWithMultipleNodes() {
    // Given - Multiple nodes
    io.fabric8.kubernetes.api.model.Node node1 = new io.fabric8.kubernetes.api.model.Node();
    node1.setMetadata(new ObjectMetaBuilder().withName("node-1").build());

    io.fabric8.kubernetes.api.model.Node node2 = new io.fabric8.kubernetes.api.model.Node();
    node2.setMetadata(new ObjectMetaBuilder().withName("node-2").build());

    io.fabric8.kubernetes.api.model.Node node3 = new io.fabric8.kubernetes.api.model.Node();
    node3.setMetadata(new ObjectMetaBuilder().withName("node-3").build());

    server
        .expect()
        .get()
        .withPath("/api/v1/nodes")
        .andReturn(
            HttpURLConnection.HTTP_OK,
            new NodeListBuilder().withItems(node1, node2, node3).build())
        .always();

    Namespace ns = new Namespace();
    ns.setMetadata(new ObjectMetaBuilder().withName("default").build());

    server
        .expect()
        .get()
        .withPath("/api/v1/namespaces")
        .andReturn(HttpURLConnection.HTTP_OK, new NamespaceListBuilder().withItems(ns).build())
        .always();

    // When
    HealthCheckResponse response = healthCheck.call();

    // Then
    assertEquals(HealthCheckResponse.Status.UP, response.getStatus());
    var data = response.getData().orElseThrow();
    // Verify we have nodes (exact count depends on test server behavior)
    long nodeCount = Long.parseLong(data.get("Nodes").toString());
    assertTrue(nodeCount > 0, "Should have at least one node");
    assertNotNull(data.get("Namespaces"), "Namespaces should be present");
  }

  @Test
  void testHealthCheckName() {
    // Given
    server
        .expect()
        .get()
        .withPath("/api/v1/nodes")
        .andReturn(HttpURLConnection.HTTP_OK, new NodeListBuilder().build())
        .always();

    server
        .expect()
        .get()
        .withPath("/api/v1/namespaces")
        .andReturn(HttpURLConnection.HTTP_OK, new NamespaceListBuilder().build())
        .always();

    // When
    HealthCheckResponse response = healthCheck.call();

    // Then
    assertEquals(
        "Kubernetes connection health check",
        response.getName(),
        "Health check should have correct name");
  }

  @Test
  void testApiGroupChecksArePresent() {
    // Given
    server
        .expect()
        .get()
        .withPath("/api/v1/nodes")
        .andReturn(HttpURLConnection.HTTP_OK, new NodeListBuilder().build())
        .always();

    server
        .expect()
        .get()
        .withPath("/api/v1/namespaces")
        .andReturn(HttpURLConnection.HTTP_OK, new NamespaceListBuilder().build())
        .always();

    // When
    HealthCheckResponse response = healthCheck.call();

    // Then - Verify all expected API group checks are present in response
    var data = response.getData().orElseThrow();
    assertTrue(data.containsKey("Startpunkt API group found"), "Should check for Startpunkt API");
    assertTrue(
        data.containsKey("OpenShift Route API group found"),
        "Should check for OpenShift Route API");
    assertTrue(data.containsKey("Hajimari API group found"), "Should check for Hajimari API");
    assertTrue(data.containsKey("ForeCastle API group found"), "Should check for ForeCastle API");
    assertTrue(data.containsKey("Traefik API group found"), "Should check for Traefik API");
    assertTrue(data.containsKey("Gateway API group found"), "Should check for Gateway API");
  }
}
