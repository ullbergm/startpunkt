package us.ullberg.startpunkt.crd.v1alpha4;

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

  @Test
  void testParameterizedConstructorWithUrlTemplate() {
    UrlFrom urlFrom =
        new UrlFrom(
            "networking.k8s.io",
            "v1",
            "Ingress",
            "my-ingress",
            "default",
            "spec.rules[0].host",
            "https://{0}/app");

    assertEquals("networking.k8s.io", urlFrom.getApiGroup());
    assertEquals("v1", urlFrom.getApiVersion());
    assertEquals("Ingress", urlFrom.getKind());
    assertEquals("my-ingress", urlFrom.getName());
    assertEquals("default", urlFrom.getNamespace());
    assertEquals("spec.rules[0].host", urlFrom.getProperty());
    assertEquals("https://{0}/app", urlFrom.getUrlTemplate());
  }

  @Test
  void testUrlTemplateSetterGetter() {
    UrlFrom urlFrom = new UrlFrom();
    assertNull(urlFrom.getUrlTemplate());

    urlFrom.setUrlTemplate("https://{0}:8080/dashboard");
    assertEquals("https://{0}:8080/dashboard", urlFrom.getUrlTemplate());
  }

  @Test
  void testEqualsWithUrlTemplate() {
    UrlFrom a = new UrlFrom("", "v1", "Service", "svc", "default", "spec.host", "https://{0}/app");
    UrlFrom b = new UrlFrom("", "v1", "Service", "svc", "default", "spec.host", "https://{0}/app");
    UrlFrom c = new UrlFrom("", "v1", "Service", "svc", "default", "spec.host", "http://{0}");

    assertEquals(a, b);
    assertNotEquals(a, c);
    assertEquals(a.hashCode(), b.hashCode());
    assertNotEquals(a.hashCode(), c.hashCode());
  }

  @Test
  void testEqualsReflexive() {
    UrlFrom urlFrom = new UrlFrom("core", "v1", "Service", "svc", "default", "spec.host");
    assertEquals(urlFrom, urlFrom, "UrlFrom should equal itself");
  }

  @Test
  void testEqualsWithNull() {
    UrlFrom urlFrom = new UrlFrom("core", "v1", "Service", "svc", "default", "spec.host");
    assertNotEquals(urlFrom, null, "UrlFrom should not equal null");
  }

  @Test
  void testEqualsWithDifferentType() {
    UrlFrom urlFrom = new UrlFrom("core", "v1", "Service", "svc", "default", "spec.host");
    assertNotEquals(urlFrom, "Not a UrlFrom", "UrlFrom should not equal different type");
  }

  @Test
  void testHashCodeConsistency() {
    UrlFrom urlFrom = new UrlFrom("core", "v1", "Service", "svc", "default", "spec.host");
    int hash1 = urlFrom.hashCode();
    int hash2 = urlFrom.hashCode();
    assertEquals(hash1, hash2, "Hash code should be consistent");
  }

  @Test
  void testToStringWithUrlTemplate() {
    UrlFrom urlFrom =
        new UrlFrom("core", "v1", "Service", "web", "prod", "spec.clusterIP", "https://{0}:8080");
    String output = urlFrom.toString();

    assertTrue(output.contains("urlTemplate"));
    assertTrue(output.contains("https://{0}:8080"));
  }

  @Test
  void testUrlFromWithNullOptionalFields() {
    UrlFrom urlFrom = new UrlFrom(null, "v1", "Service", "svc", null, "spec.host", null);

    assertNull(urlFrom.getApiGroup());
    assertNull(urlFrom.getNamespace());
    assertNull(urlFrom.getUrlTemplate());
    assertEquals("v1", urlFrom.getApiVersion());
    assertEquals("Service", urlFrom.getKind());
  }

  @Test
  void testAllFieldsEmptyStrings() {
    UrlFrom urlFrom = new UrlFrom("", "", "", "", "", "");

    assertEquals("", urlFrom.getApiGroup());
    assertEquals("", urlFrom.getApiVersion());
    assertEquals("", urlFrom.getKind());
    assertEquals("", urlFrom.getName());
    assertEquals("", urlFrom.getNamespace());
    assertEquals("", urlFrom.getProperty());
  }

  @Test
  void testPropertyWithArrayNotation() {
    UrlFrom urlFrom =
        new UrlFrom("core", "v1", "Service", "svc", "default", "spec.ports[0].targetPort");
    assertEquals("spec.ports[0].targetPort", urlFrom.getProperty());
  }

  @Test
  void testUrlTemplateWithComplexPath() {
    UrlFrom urlFrom =
        new UrlFrom(
            "core",
            "v1",
            "Service",
            "svc",
            "default",
            "spec.host",
            "https://{0}:8443/api/v1/resource");
    assertEquals("https://{0}:8443/api/v1/resource", urlFrom.getUrlTemplate());
  }

  @Test
  void testUrlTemplateWithQueryParams() {
    UrlFrom urlFrom =
        new UrlFrom(
            "core", "v1", "Service", "svc", "default", "spec.host", "https://{0}?param=value");
    assertEquals("https://{0}?param=value", urlFrom.getUrlTemplate());
  }

  @Test
  void testSettersOverrideConstructorValues() {
    UrlFrom urlFrom = new UrlFrom("core", "v1", "Service", "svc", "default", "spec.host");

    urlFrom.setApiGroup("apps");
    urlFrom.setApiVersion("v2");
    urlFrom.setKind("Deployment");
    urlFrom.setName("deploy");
    urlFrom.setNamespace("production");
    urlFrom.setProperty("spec.template.spec.host");
    urlFrom.setUrlTemplate("https://{0}:9000");

    assertEquals("apps", urlFrom.getApiGroup());
    assertEquals("v2", urlFrom.getApiVersion());
    assertEquals("Deployment", urlFrom.getKind());
    assertEquals("deploy", urlFrom.getName());
    assertEquals("production", urlFrom.getNamespace());
    assertEquals("spec.template.spec.host", urlFrom.getProperty());
    assertEquals("https://{0}:9000", urlFrom.getUrlTemplate());
  }

  @Test
  void testSpecialKubernetesApiGroups() {
    UrlFrom networking =
        new UrlFrom("networking.k8s.io", "v1", "Ingress", "ing", "default", "spec.host");
    UrlFrom istio =
        new UrlFrom(
            "networking.istio.io", "v1beta1", "VirtualService", "vs", "default", "spec.host");

    assertEquals("networking.k8s.io", networking.getApiGroup());
    assertEquals("networking.istio.io", istio.getApiGroup());
  }

  @Test
  void testCoreApiGroup() {
    UrlFrom urlFrom = new UrlFrom("", "v1", "Service", "svc", "default", "spec.clusterIP");
    assertEquals("", urlFrom.getApiGroup());
  }

  @Test
  void testLongNamespace() {
    String longNamespace = "very-long-namespace-name-with-many-segments";
    UrlFrom urlFrom = new UrlFrom("core", "v1", "Service", "svc", longNamespace, "spec.host");
    assertEquals(longNamespace, urlFrom.getNamespace());
  }

  @Test
  void testLongServiceName() {
    String longName = "my-very-long-service-name-with-many-segments-for-testing";
    UrlFrom urlFrom = new UrlFrom("core", "v1", "Service", longName, "default", "spec.host");
    assertEquals(longName, urlFrom.getName());
  }
}
