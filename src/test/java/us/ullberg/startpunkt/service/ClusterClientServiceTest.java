package us.ullberg.startpunkt.service;

import static org.junit.jupiter.api.Assertions.*;

import io.fabric8.kubernetes.client.KubernetesClient;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import java.util.Map;
import org.junit.jupiter.api.Test;
import us.ullberg.startpunkt.objects.ClusterConfig;

/**
 * Basic tests for ClusterClientService multi-cluster functionality. Note: Full multi-cluster
 * testing requires configuring remote clusters in application.yaml which is better suited for
 * integration tests.
 */
@QuarkusTest
class ClusterClientServiceTest {

  @Inject KubernetesClient kubernetesClient;

  @Test
  void testClusterConfigCreation() {
    // Test ClusterConfig object creation
    ClusterConfig config = new ClusterConfig("test-cluster", "https://test.example.com:6443");
    config.setDisplayName("Test Cluster");
    config.setEnabled(true);
    config.setToken("test-token");

    assertEquals("test-cluster", config.getName());
    assertEquals("Test Cluster", config.getDisplayName());
    assertEquals("https://test.example.com:6443", config.getApiServerUrl());
    assertTrue(config.isEnabled());
    assertEquals("test-token", config.getToken());
  }

  @Test
  void testClusterConfigDefaultDisplayName() {
    // Test that display name defaults to name if not set
    ClusterConfig config = new ClusterConfig("prod", "https://prod.example.com:6443");

    assertEquals("prod", config.getName());
    assertEquals("prod", config.getDisplayName(), "Display name should default to name");
  }

  @Test
  void testClusterConfigEquality() {
    // Test that configs with same name are equal
    ClusterConfig config1 = new ClusterConfig("cluster1", "https://url1.example.com");
    ClusterConfig config2 = new ClusterConfig("cluster1", "https://url2.example.com");
    ClusterConfig config3 = new ClusterConfig("cluster2", "https://url1.example.com");

    assertEquals(config1, config2, "Configs with same name should be equal");
    assertNotEquals(config1, config3, "Configs with different names should not be equal");
    assertEquals(config1.hashCode(), config2.hashCode(), "Equal configs should have same hash");
  }

  @Test
  void testClusterConfigToString() {
    // Test toString method
    ClusterConfig config = new ClusterConfig("test", "https://test.example.com");
    String toString = config.toString();

    assertNotNull(toString);
    assertTrue(toString.contains("test"), "ToString should contain cluster name");
    assertTrue(toString.contains("https://test.example.com"), "ToString should contain API URL");
  }

  @Test
  void testClusterClientServiceCanBeInjected() {
    // Basic test that the service can be instantiated with a client
    ClusterClientService service = new ClusterClientService(kubernetesClient);

    assertNotNull(service, "Service should be created");

    // Test that we can get clients (even if empty list due to no remote config)
    Map<String, KubernetesClient> clients = service.getAllClusterClients();
    assertNotNull(clients, "Clients map should not be null");
  }
}
