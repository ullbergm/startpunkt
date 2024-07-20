package us.ullberg.startpunkt;

import java.util.ArrayList;
import java.util.Collections;

import org.eclipse.microprofile.config.inject.ConfigProperty;

import io.fabric8.kubernetes.client.KubernetesClient;
import io.fabric8.kubernetes.client.KubernetesClientBuilder;
import io.micrometer.core.annotation.Timed;
import io.micrometer.core.instrument.MeterRegistry;
import io.quarkus.cache.CacheResult;
import io.quarkus.logging.Log;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import us.ullberg.startpunkt.crd.ApplicationSpec;
import us.ullberg.startpunkt.objects.BaseKubernetesObject;
import us.ullberg.startpunkt.objects.HajimariApplicationWrapper;
import us.ullberg.startpunkt.objects.IngressApplicationWrapper;
import us.ullberg.startpunkt.objects.IstioVirtualServiceApplicationWrapper;
import us.ullberg.startpunkt.objects.RouteApplicationWrapper;
import us.ullberg.startpunkt.objects.StartpunktApplicationWrapper;

// REST API resource class for managing applications
@Path("/api/apps")
@Produces(MediaType.APPLICATION_JSON)
public class ApplicationResource {

  // Inject the MeterRegistry for metrics
  @Inject
  MeterRegistry registry;

  // Configuration properties for enabling different types of application wrappers
  @ConfigProperty(name = "startpunkt.hajimari.enabled", defaultValue = "false")
  private boolean hajimariEnabled = false;

  @ConfigProperty(name = "startpunkt.ingress.enabled", defaultValue = "false")
  private boolean ingressEnabled = false;

  @ConfigProperty(name = "startpunkt.ingress.onlyAnnotated", defaultValue = "true")
  private boolean ingressOnlyAnnotated = true;

  @ConfigProperty(name = "startpunkt.openshift.enabled", defaultValue = "false")
  private boolean openshiftEnabled = false;

  @ConfigProperty(name = "startpunkt.openshift.onlyAnnotated", defaultValue = "true")
  private boolean openshiftOnlyAnnotated = true;

  @ConfigProperty(name = "startpunkt.istio.virtualservice.enabled", defaultValue = "false")
  private boolean istioVirtualServiceEnabled = false;

  @ConfigProperty(name = "startpunkt.istio.virtualservice.onlyAnnotated", defaultValue = "true")
  private boolean istioVirtualServiceOnlyAnnotated = true;

  @ConfigProperty(name = "startpunkt.namespaceSelector.any", defaultValue = "true")
  private boolean anyNamespace;

  @ConfigProperty(name = "startpunkt.namespaceSelector.matchNames", defaultValue = "[]")
  private String[] matchNames;

  @ConfigProperty(name = "startpunkt.defaultProtocol", defaultValue = "http")
  private String defaultProtocol = "http";

  // Method to retrieve the list of applications
  private ArrayList<ApplicationSpec> retrieveApps() {
    // Create a list of application wrappers to retrieve applications from
    var applicationWrappers = new ArrayList<BaseKubernetesObject>();
    applicationWrappers.add(new StartpunktApplicationWrapper());

    if (hajimariEnabled)
      applicationWrappers.add(new HajimariApplicationWrapper());

    if (openshiftEnabled)
      applicationWrappers.add(new RouteApplicationWrapper(openshiftOnlyAnnotated));

    if (ingressEnabled)
      applicationWrappers.add(new IngressApplicationWrapper(ingressOnlyAnnotated));

    if (istioVirtualServiceEnabled)
      applicationWrappers.add(new IstioVirtualServiceApplicationWrapper(
          istioVirtualServiceOnlyAnnotated, defaultProtocol));

    // Create a list of applications
    var apps = new ArrayList<ApplicationSpec>();

    // Retrieve the applications from the application wrappers
    for (BaseKubernetesObject applicationWrapper : applicationWrappers) {
      try (final KubernetesClient client = new KubernetesClientBuilder().build()) {
        apps.addAll(applicationWrapper.getApplicationSpecs(client, anyNamespace, matchNames));
      } catch (Exception e) {
        Log.error("Error retrieving applications", e);
      }
    }

    // Sort the list of applications
    Collections.sort(apps);

    // Return the list of applications
    return apps;
  }

  // GET endpoint to retrieve an application by its name
  @GET
  @Path("{appName}")
  @CacheResult(cacheName = "getApp")
  public Response getApps(@PathParam("appName") String appName) {
    // Retrieve the list of applications
    ArrayList<ApplicationSpec> applist = retrieveApps();

    // Create a list to store the found application
    ArrayList<ApplicationSpec> retval = new ArrayList<>();

    // Find the application with the specified name
    for (ApplicationSpec a : applist) {
      if (a.getName().equals(appName)) {
        retval.add(a);
      }
    }

    // If the application was found, return it
    if (retval.size() > 0)
      return Response.ok(retval).build();

    // If the application was not found, return a 404 response
    return Response.status(404, "Application not found").build();
  }

  // GET endpoint to retrieve the list of all applications, grouped by application
  // group
  @GET
  @Timed(value = "startpunkt.api.getapps", description = "Get the list of applications")
  @CacheResult(cacheName = "getApps")
  public Response getApps() {
    // Retrieve the list of applications
    ArrayList<ApplicationSpec> applist = retrieveApps();

    // Create a list to store application groups
    ArrayList<ApplicationGroup> groups = new ArrayList<>();

    // Group the applications by their group property
    for (ApplicationSpec a : applist) {
      // Find the group
      ApplicationGroup group = null;
      for (ApplicationGroup g : groups) {
        if (g.getName().equals(a.getGroup())) {
          group = g;
          break;
        }
      }

      // If the group doesn't exist, create it
      if (group == null) {
        group = new ApplicationGroup(a.getGroup());
        groups.add(group);
      }

      // Add the application to the group
      group.addApplication(a);
    }

    // Return the list of application groups
    return Response.ok(groups).build();
  }
}
