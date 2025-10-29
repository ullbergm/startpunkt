package us.ullberg.startpunkt.rest;

import io.quarkus.test.junit.QuarkusIntegrationTest;

// This annotation marks the class as a Quarkus integration test, which runs the tests in packaged
// mode.
@QuarkusIntegrationTest
class I8nResourceIT extends I8nResourceTest {
  // This class executes the same tests as I8nResourceTest but in packaged mode.
  // Packaged mode tests ensure that the application runs as it would in production,
  // providing a higher level of confidence that it will work correctly when deployed.
}
