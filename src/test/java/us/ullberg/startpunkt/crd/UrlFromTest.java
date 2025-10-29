package us.ullberg.startpunkt.crd.v1alpha3;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.Test;

class UrlFromTest {

  @Test
  void testDefaultConstructor() {
    UrlFrom urlFrom = new UrlFrom();
    assertNull(urlFrom.getApiGroup());
    assertNull(urlFrom.getApiVersion());
    assertNull(urlFrom.getKind());
    assertNull(urlFrom.getName());
    assertNull(urlFrom.getNamespace());
    assertNull(urlFrom.getProperty());
  }

  @Test
  void testParameterizedConstructor() {
    UrlFrom urlFrom =
        new UrlFrom("core", "v1", "Service", "my-service", "default", "spec.clusterIP");

    assertEquals("core", urlFrom.getApiGroup());
    assertEquals("v1", urlFrom.getApiVersion());
    assertEquals("Service", urlFrom.getKind());
    assertEquals("my-service", urlFrom.getName());
    assertEquals("default", urlFrom.getNamespace());
    assertEquals("spec.clusterIP", urlFrom.getProperty());
  }

  @Test
  void testSettersAndGetters() {
    UrlFrom urlFrom = new UrlFrom();

    urlFrom.setApiGroup("apps");
    urlFrom.setApiVersion("v1");
    urlFrom.setKind("ConfigMap");
    urlFrom.setName("app-config");
    urlFrom.setNamespace("kube-system");
    urlFrom.setProperty("data.endpoint");

    assertEquals("apps", urlFrom.getApiGroup());
    assertEquals("v1", urlFrom.getApiVersion());
    assertEquals("ConfigMap", urlFrom.getKind());
    assertEquals("app-config", urlFrom.getName());
    assertEquals("kube-system", urlFrom.getNamespace());
    assertEquals("data.endpoint", urlFrom.getProperty());
  }

  @Test
  void testEqualsAndHashCode() {
    UrlFrom a = new UrlFrom("", "v1", "Service", "svc", "default", "spec.host");
    UrlFrom b = new UrlFrom("", "v1", "Service", "svc", "default", "spec.host");
    UrlFrom c = new UrlFrom("", "v1", "Service", "other", "default", "spec.host");

    assertEquals(a, b);
    assertNotEquals(a, c);
    assertEquals(a.hashCode(), b.hashCode());
    assertNotEquals(a.hashCode(), c.hashCode());
  }

  @Test
  void testToStringIncludesFields() {
    UrlFrom urlFrom = new UrlFrom("core", "v1", "Service", "web", "prod", "spec.clusterIP");
    String output = urlFrom.toString();

    assertTrue(output.contains("core"));
    assertTrue(output.contains("v1"));
    assertTrue(output.contains("Service"));
    assertTrue(output.contains("web"));
    assertTrue(output.contains("prod"));
    assertTrue(output.contains("spec.clusterIP"));
  }
}
