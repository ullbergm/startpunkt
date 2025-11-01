package us.ullberg.startpunkt.crd.v1alpha4;

import io.quarkus.test.junit.QuarkusIntegrationTest;

// This annotation marks the class as a Quarkus integration test, which runs the tests in packaged
// mode
@QuarkusIntegrationTest
public class BookmarkListIT extends BookmarkListTest {
  // This class executes the same tests as BookmarkListTest but in packaged
  // mode.
  // Packaged mode tests ensure that the application runs as it would in production,
  // providing a higher level of confidence that it will work correctly when deployed.
}
