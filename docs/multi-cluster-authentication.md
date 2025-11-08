# Multi-Cluster Support# Multi-Cluster Support



Startpunkt supports aggregating applications and bookmarks from multiple remote Startpunkt instances via GraphQL. This allows you to create a unified dashboard that displays resources from multiple clusters by connecting to other Startpunkt instances running in those clusters.Startpunkt supports aggregating applications and bookmarks from multiple remote Startpunkt instances via GraphQL. This allows you to create a unified dashboard that displays resources from multiple clusters by connecting to other Startpunkt instances running in those clusters.



## Overview## Overview



- **Local Cluster**: Startpunkt reads resources directly from the Kubernetes cluster where it's running- **Local Cluster**: Startpunkt reads resources directly from the Kubernetes cluster where it's running

- **Remote Clusters**: Startpunkt connects to other Startpunkt instances via their GraphQL APIs to fetch applications and bookmarks- **Remote Clusters**: Startpunkt connects to other Startpunkt instances via their GraphQL APIs to fetch applications and bookmarks



## Configuration## Configuration



### Basic Configuration### Basic Configuration



Add remote Startpunkt instances to your `application.yaml`:Add remote Startpunkt instances to your `application.yaml`:



```yaml
startpunkt:
  clusters:
    local:
      enabled: true  # Read from local Kubernetes cluster
    remote:
      - name: "production"
        graphql-url: "https://startpunkt.prod.example.com/graphql"
        # graphql-token: "optional-bearer-token"  # Optional, if the remote requires authentication
        enabled: true
      - name: "staging"
        graphql-url: "https://startpunkt.staging.example.com/graphql"
        enabled: true
```

**Creating the token Secret:**

### Configuration Options

```bash

#### Local Cluster# Get the service account token (Kubernetes 1.24+)

kubectl create token startpunkt-sa -n startpunkt --duration=87600h > token.txt

- `enabled`: Whether to read from the local Kubernetes cluster (default: `true`)

# Create the Secret

#### Remote Clusterskubectl create secret generic prod-cluster-token \

  --from-file=token=token.txt \

Each remote cluster configuration supports:  --namespace=startpunkt



- `name` (required): Unique identifier for the remote cluster# Clean up the token file

- `graphql-url` (required): GraphQL endpoint URL of the remote Startpunkt instancerm token.txt

- `graphql-token` (optional): Bearer token for authentication if the remote instance requires it```

- `enabled` (optional): Whether to fetch from this cluster (default: `true`)

**Alternative: Direct token (not recommended for production):**

## Authentication

```yaml

### No Authenticationstartpunkt:

  clusters:

If the remote Startpunkt instance doesn't require authentication:    remote:

      - name: "prod-cluster"

```yaml        hostname: "https://api.prod-cluster.example.com:6443"

remote:        token: "eyJhbGciOiJSUzI1NiIsImtpZCI6..."  # Token in plain text

  - name: "dev-cluster"        enabled: true

    graphql-url: "https://startpunkt.dev.example.com/graphql"```

    enabled: true

```⚠️ **Security Warning**: Storing tokens directly in configuration is insecure. Always use `tokenSecret` in production.



### Bearer Token Authentication### 2. Secret-based Kubeconfig



If the remote Startpunkt instance requires authentication, provide a bearer token:This method stores a complete kubeconfig file in a Kubernetes Secret. It's recommended when you need full kubeconfig features (multiple contexts, client certificates, etc.).



```yaml**Configuration:**

remote:

  - name: "prod-cluster"```yaml

    graphql-url: "https://startpunkt.prod.example.com/graphql"startpunkt:

    graphql-token: "your-bearer-token-here"  clusters:

    enabled: true    remote:

```      - name: "staging-cluster"

        kubeconfigSecret: "staging-cluster-kubeconfig"

**Security Best Practice**: Store sensitive tokens in Kubernetes Secrets and reference them using environment variables:        kubeconfigSecretNamespace: "startpunkt"  # Optional, defaults to current namespace

        kubeconfigSecretKey: "kubeconfig"  # Optional, defaults to "kubeconfig"

```yaml        enabled: true

# Secret containing the token```

apiVersion: v1

kind: Secret**Creating the kubeconfig Secret:**

metadata:

  name: remote-cluster-token```bash

  namespace: startpunkt# Create Secret from kubeconfig file

type: Opaquekubectl create secret generic staging-cluster-kubeconfig \

stringData:  --from-file=kubeconfig=./staging-kubeconfig \

  token: "your-bearer-token-here"  --namespace=startpunkt

---```

# Deployment referencing the secret

apiVersion: apps/v1### 3. File-based Kubeconfig

kind: Deployment

metadata:This method reads a kubeconfig file from the filesystem. It's useful for development and testing but **not recommended for production** deployments.

  name: startpunkt

spec:**Configuration:**

  template:

    spec:```yaml

      containers:startpunkt:

      - name: startpunkt  clusters:

        env:    remote:

        - name: REMOTE_CLUSTER_TOKEN      - name: "dev-cluster"

          valueFrom:        kubeconfigPath: "/path/to/dev-kubeconfig"

            secretKeyRef:        enabled: true

              name: remote-cluster-token```

              key: token

```⚠️ **Production Warning**: File-based kubeconfig requires mounting files into containers and is harder to rotate. Use Secret-based methods in production.



Then reference the environment variable in `application.yaml`:## Required RBAC Permissions



```yaml### On the Startpunkt Cluster

remote:

  - name: "prod-cluster"Startpunkt needs permission to read Secrets in its own namespace:

    graphql-url: "https://startpunkt.prod.example.com/graphql"

    graphql-token: "${REMOTE_CLUSTER_TOKEN}"```yaml

    enabled: trueapiVersion: rbac.authorization.k8s.io/v1

```kind: Role

metadata:

## How It Works  name: startpunkt-secrets-reader

  namespace: startpunkt

1. **Local Cluster**: Startpunkt uses Kubernetes Informers to watch for resources (Ingress, Routes, VirtualServices, etc.) in the local clusterrules:

2. **Remote Clusters**: Startpunkt periodically queries the GraphQL endpoints of remote Startpunkt instances- apiGroups: [""]

3. **Data Aggregation**: Applications and bookmarks from all clusters are merged and displayed in a unified dashboard  resources: ["secrets"]

4. **Cluster Identification**: Each application/bookmark is tagged with its source cluster name for easy identification  verbs: ["get", "list"]

---

## GraphQL QueriesapiVersion: rbac.authorization.k8s.io/v1

kind: RoleBinding

Startpunkt uses these GraphQL queries to fetch data from remote instances:metadata:

  name: startpunkt-secrets-reader

### Applications Query  namespace: startpunkt

subjects:

```graphql- kind: ServiceAccount

query {  name: startpunkt

  applicationGroups {  namespace: startpunkt

    nameroleRef:

    applications {  kind: Role

      name  name: startpunkt-secrets-reader

      group  apiGroup: rbac.authorization.k8s.io

      icon```

      url

      targetBlank### On Remote Clusters

      location

      infoCreate a ServiceAccount with read-only access to the resources Startpunkt needs:

      tags

      rootPath```yaml

      namespaceapiVersion: v1

      resourceNamekind: ServiceAccount

      hasOwnerReferencesmetadata:

    }  name: startpunkt-remote

  }  namespace: default

}---

```apiVersion: rbac.authorization.k8s.io/v1

kind: ClusterRole

### Bookmarks Querymetadata:

  name: startpunkt-remote-reader

```graphqlrules:

query {- apiGroups: [""]

  bookmarkGroups {  resources: ["namespaces"]

    name  verbs: ["get", "list", "watch"]

    bookmarks {- apiGroups: ["networking.k8s.io"]

      name  resources: ["ingresses"]

      group  verbs: ["get", "list", "watch"]

      icon- apiGroups: ["route.openshift.io"]

      url  resources: ["routes"]

      info  verbs: ["get", "list", "watch"]

      targetBlank- apiGroups: ["networking.istio.io"]

      location  resources: ["virtualservices"]

      namespace  verbs: ["get", "list", "watch"]

      resourceName- apiGroups: ["gateway.networking.k8s.io"]

      hasOwnerReferences  resources: ["httproutes"]

    }  verbs: ["get", "list", "watch"]

  }- apiGroups: ["startpunkt.ullberg.us"]

}  resources: ["applications"]

```  verbs: ["get", "list", "watch"]

- apiGroups: ["hajimari.io"]

## Network Requirements  resources: ["applications"]

  verbs: ["get", "list", "watch"]

- Remote Startpunkt instances must be accessible from the cluster where your Startpunkt is running---

- Network policies must allow outbound HTTPS/HTTP connections to remote GraphQL endpointsapiVersion: rbac.authorization.k8s.io/v1

- Firewalls must allow traffic to remote Startpunkt URLskind: ClusterRoleBinding

metadata:

## Troubleshooting  name: startpunkt-remote-reader

subjects:

### "Failed to fetch applications from remote Startpunkt"- kind: ServiceAccount

  name: startpunkt-remote

Check:  namespace: default

1. The GraphQL URL is correct and accessibleroleRef:

2. Network connectivity from your cluster to the remote instance  kind: ClusterRole

3. The remote Startpunkt instance is running and healthy  name: startpunkt-remote-reader

4. If using authentication, the token is valid  apiGroup: rbac.authorization.k8s.io

```

Test connectivity:

## Best Practices

```bash

# From within the Startpunkt pod### 1. Use Secrets for Credentials

kubectl exec -n startpunkt deployment/startpunkt -- curl -v https://remote-startpunkt.example.com/graphql

```Always store sensitive credentials (tokens, kubeconfigs) in Kubernetes Secrets, never in ConfigMaps or plain configuration files.



### "GraphQL request failed with status 401"### 2. Limit Token Scope



The remote instance requires authentication. Add `graphql-token` to your configuration.Create service accounts with minimal required permissions on remote clusters. Use the RBAC example above as a starting point.



### "GraphQL request failed with status 404"### 3. Token Rotation



The GraphQL endpoint URL may be incorrect. Ensure the URL ends with `/graphql`.Set up a process to rotate tokens periodically:



## Complete Example```bash

# Generate new token

```yamlkubectl create token startpunkt-remote -n default --duration=87600h > new-token.txt

startpunkt:

  clusters:# Update the Secret

    local:kubectl create secret generic prod-cluster-token \

      enabled: true  # Read from local cluster  --from-file=token=new-token.txt \

    remote:  --namespace=startpunkt \

      # Production cluster with authentication  --dry-run=client -o yaml | kubectl apply -f -

      - name: "production"

        graphql-url: "https://startpunkt.prod.example.com/graphql"# Restart Startpunkt to pick up new token

        graphql-token: "${PROD_CLUSTER_TOKEN}"kubectl rollout restart deployment startpunkt -n startpunkt

        enabled: true```

      

      # Staging cluster without authentication### 4. Use Separate Namespaces

      - name: "staging"

        graphql-url: "https://startpunkt.staging.example.com/graphql"Keep Startpunkt's Secrets in a dedicated namespace with strict RBAC controls:

        enabled: true

      ```yaml

      # Development cluster (disabled)apiVersion: v1

      - name: "development"kind: Namespace

        graphql-url: "https://startpunkt.dev.example.com/graphql"metadata:

        enabled: false  name: startpunkt

```---

# Only allow Startpunkt pods to access Secrets

## Security ChecklistapiVersion: rbac.authorization.k8s.io/v1

kind: Role

- [ ] GraphQL tokens stored in Kubernetes Secrets, not plain textmetadata:

- [ ] Environment variables used to reference secrets in configuration  name: startpunkt-secrets-reader

- [ ] Network policies restrict egress to only required endpoints  namespace: startpunkt

- [ ] TLS/HTTPS used for all remote connectionsrules:

- [ ] Regular token rotation process in place- apiGroups: [""]

- [ ] Remote Startpunkt instances properly secured with authentication  resources: ["secrets"]

- [ ] Monitoring and logging enabled for connection failures  verbs: ["get"]

  resourceNames: ["prod-cluster-token", "staging-cluster-kubeconfig"]

## Limitations```



- Remote clusters are read-only; you cannot create/update/delete applications or bookmarks on remote clusters through the local instance### 5. Monitor Connection Health

- Real-time updates via GraphQL subscriptions are not supported for remote clusters (polling only)

- Remote cluster health/availability is not monitored; failed connections are logged but don't prevent local cluster data from loadingStartpunkt logs connection status for each cluster. Monitor these logs for failures:


```bash
kubectl logs -n startpunkt deployment/startpunkt | grep -i "cluster"
```

Example log output:

```log
INFO  [us.ull.sta.ser.MultiClusterService] Initializing multi-cluster service
INFO  [us.ull.sta.ser.MultiClusterService] Registered remote GraphQL cluster 'prod-cluster' at https://prod.example.com/graphql
INFO  [us.ull.sta.ser.MultiClusterService] Multi-cluster service initialization complete
```

## Troubleshooting

### "Secret not found"

Ensure the Secret exists in the correct namespace:

```bash
kubectl get secret prod-cluster-token -n startpunkt
```

### "Failed to create Kubernetes client"

Check that the hostname is correct and accessible from the Startpunkt pod:

```bash
kubectl exec -n startpunkt deployment/startpunkt -- curl -k https://api.prod-cluster.example.com:6443/version
```

### "Unauthorized" or "403 Forbidden"

Verify the token has the correct RBAC permissions on the remote cluster:

```bash
# Test the token (replace TOKEN with actual token)
kubectl --token="TOKEN" --server="https://api.prod-cluster.example.com:6443" auth can-i get ingresses --all-namespaces
```

### Secrets Not Being Read

Check RBAC permissions for the Startpunkt ServiceAccount:

```bash
kubectl auth can-i get secrets --as=system:serviceaccount:startpunkt:startpunkt -n startpunkt
```

## Complete Example

Here's a complete configuration example with multiple clusters using different authentication methods:

```yaml
startpunkt:
  clusters:
    local:
      enabled: true  # Read from local cluster
    remote:
      # Production cluster: hostname + token from Secret
      - name: "production"
        hostname: "https://api.prod.example.com:6443"
        tokenSecret: "prod-cluster-token"
        tokenSecretNamespace: "startpunkt"
        enabled: true
      
      # Staging cluster: kubeconfig from Secret
      - name: "staging"
        kubeconfigSecret: "staging-kubeconfig"
        kubeconfigSecretNamespace: "startpunkt"
        enabled: true
      
      # Development cluster: file-based (dev only)
      - name: "development"
        kubeconfigPath: "/etc/startpunkt/kubeconfig-dev"
        enabled: true
```

## Security Checklist

- [ ] Tokens and kubeconfigs stored in Secrets, not ConfigMaps or files
- [ ] Separate ServiceAccounts per remote cluster with minimal permissions
- [ ] RBAC configured to limit Secret access to Startpunkt ServiceAccount
- [ ] Token rotation process documented and scheduled
- [ ] Network policies in place to restrict Startpunkt egress
- [ ] Audit logging enabled for Secret access
- [ ] Secrets encrypted at rest in etcd
- [ ] Regular security reviews of remote cluster permissions
