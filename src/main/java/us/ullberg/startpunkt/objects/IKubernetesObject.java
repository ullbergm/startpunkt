package us.ullberg.startpunkt.objects;

import io.fabric8.kubernetes.client.KubernetesClient;
import java.util.List;
import us.ullberg.startpunkt.crd.ApplicationSpec;

interface IKubernetesObject {
  String getGroup();

  String getVersion();

  String getPluralKind();

  List<ApplicationSpec> getApplicationSpecs(KubernetesClient client, Boolean anyNamespace,
      String[] matchNames);
}
