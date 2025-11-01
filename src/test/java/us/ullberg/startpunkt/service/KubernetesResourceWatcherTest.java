package us.ullberg.startpunkt.service;

import static org.junit.jupiter.api.Assertions.*;

import io.quarkus.runtime.ShutdownEvent;
import io.quarkus.test.junit.QuarkusTest;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.junit.jupiter.api.Test;

/** Unit tests for KubernetesResourceWatcher service. */
@QuarkusTest
class KubernetesResourceWatcherTest {

  @Inject KubernetesResourceWatcher watcher;

  @ConfigProperty(name = "startpunkt.watch.enabled", defaultValue = "true")
  boolean watchEnabled;

  @Test
  void testWatcherInitialization() {
    assertNotNull(watcher, "KubernetesResourceWatcher should be injected");
  }

  @Test
  void testWatcherStopsOnShutdownEvent() {
    // Create a shutdown event
    ShutdownEvent shutdownEvent = new ShutdownEvent();

    // Verify it doesn't throw exceptions when stopping
    assertDoesNotThrow(() -> watcher.onStop(shutdownEvent));
  }
}
