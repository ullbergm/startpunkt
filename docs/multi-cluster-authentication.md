# Multi-Cluster Authentication

Startpunkt supports aggregating applications from multiple Kubernetes clusters using various authentication methods. This document covers the supported authentication methods and how to configure them securely.

## Authentication Methods

Startpunkt supports three authentication methods for connecting to remote clusters, listed in order of precedence:

1. **Hostname + Token** (highest precedence)
2. **Secret-based kubeconfig**
3. **File-based kubeconfig** (lowest precedence, for development only)

### 1. Hostname + Token Authentication

This method connects directly to a Kubernetes API server using its hostname and a bearer token. It's the most lightweight approach and recommended when you have a service account token.

**Configuration:**

```yaml
startpunkt:
  clusters:
    remote:
      - name: "prod-cluster"
        hostname: "https://api.prod-cluster.example.com:6443"
        tokenSecret: "prod-cluster-token"  # Recommended: read from Secret
        tokenSecretNamespace: "startpunkt"  # Optional, defaults to current namespace
        tokenSecretKey: "token"  # Optional, defaults to "token"
        enabled: true
```

**Creating the token Secret:**

```bash
# Get the service account token (Kubernetes 1.24+)
kubectl create token startpunkt-sa -n startpunkt --duration=87600h > token.txt

# Create the Secret
kubectl create secret generic prod-cluster-token \
  --from-file=token=token.txt \
  --namespace=startpunkt

# Clean up the token file
rm token.txt
```

**Alternative: Direct token (not recommended for production):**

```yaml
startpunkt:
  clusters:
    remote:
      - name: "prod-cluster"
        hostname: "https://api.prod-cluster.example.com:6443"
        token: "eyJhbGciOiJSUzI1NiIsImtpZCI6..."  # Token in plain text
        enabled: true
```

⚠️ **Security Warning**: Storing tokens directly in configuration is insecure. Always use `tokenSecret` in production.

### 2. Secret-based Kubeconfig

This method stores a complete kubeconfig file in a Kubernetes Secret. It's recommended when you need full kubeconfig features (multiple contexts, client certificates, etc.).

**Configuration:**

```yaml
startpunkt:
  clusters:
    remote:
      - name: "staging-cluster"
        kubeconfigSecret: "staging-cluster-kubeconfig"
        kubeconfigSecretNamespace: "startpunkt"  # Optional, defaults to current namespace
        kubeconfigSecretKey: "kubeconfig"  # Optional, defaults to "kubeconfig"
        enabled: true
```

**Creating the kubeconfig Secret:**

```bash
# Create Secret from kubeconfig file
kubectl create secret generic staging-cluster-kubeconfig \
  --from-file=kubeconfig=./staging-kubeconfig \
  --namespace=startpunkt
```

### 3. File-based Kubeconfig

This method reads a kubeconfig file from the filesystem. It's useful for development and testing but **not recommended for production** deployments.

**Configuration:**

```yaml
startpunkt:
  clusters:
    remote:
      - name: "dev-cluster"
        kubeconfigPath: "/path/to/dev-kubeconfig"
        enabled: true
```

⚠️ **Production Warning**: File-based kubeconfig requires mounting files into containers and is harder to rotate. Use Secret-based methods in production.

## Required RBAC Permissions

### On the Startpunkt Cluster

Startpunkt needs permission to read Secrets in its own namespace:

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: startpunkt-secrets-reader
  namespace: startpunkt
rules:
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get", "list"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: startpunkt-secrets-reader
  namespace: startpunkt
subjects:
- kind: ServiceAccount
  name: startpunkt
  namespace: startpunkt
roleRef:
  kind: Role
  name: startpunkt-secrets-reader
  apiGroup: rbac.authorization.k8s.io
```

### On Remote Clusters

Create a ServiceAccount with read-only access to the resources Startpunkt needs:

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: startpunkt-remote
  namespace: default
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: startpunkt-remote-reader
rules:
- apiGroups: [""]
  resources: ["namespaces"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["networking.k8s.io"]
  resources: ["ingresses"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["route.openshift.io"]
  resources: ["routes"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["networking.istio.io"]
  resources: ["virtualservices"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["gateway.networking.k8s.io"]
  resources: ["httproutes"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["startpunkt.ullberg.us"]
  resources: ["applications"]
  verbs: ["get", "list", "watch"]
- apiGroups: ["hajimari.io"]
  resources: ["applications"]
  verbs: ["get", "list", "watch"]
---
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: startpunkt-remote-reader
subjects:
- kind: ServiceAccount
  name: startpunkt-remote
  namespace: default
roleRef:
  kind: ClusterRole
  name: startpunkt-remote-reader
  apiGroup: rbac.authorization.k8s.io
```

## Best Practices

### 1. Use Secrets for Credentials

Always store sensitive credentials (tokens, kubeconfigs) in Kubernetes Secrets, never in ConfigMaps or plain configuration files.

### 2. Limit Token Scope

Create service accounts with minimal required permissions on remote clusters. Use the RBAC example above as a starting point.

### 3. Token Rotation

Set up a process to rotate tokens periodically:

```bash
# Generate new token
kubectl create token startpunkt-remote -n default --duration=87600h > new-token.txt

# Update the Secret
kubectl create secret generic prod-cluster-token \
  --from-file=token=new-token.txt \
  --namespace=startpunkt \
  --dry-run=client -o yaml | kubectl apply -f -

# Restart Startpunkt to pick up new token
kubectl rollout restart deployment startpunkt -n startpunkt
```

### 4. Use Separate Namespaces

Keep Startpunkt's Secrets in a dedicated namespace with strict RBAC controls:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: startpunkt
---
# Only allow Startpunkt pods to access Secrets
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: startpunkt-secrets-reader
  namespace: startpunkt
rules:
- apiGroups: [""]
  resources: ["secrets"]
  verbs: ["get"]
  resourceNames: ["prod-cluster-token", "staging-cluster-kubeconfig"]
```

### 5. Monitor Connection Health

Startpunkt logs connection status for each cluster. Monitor these logs for failures:

```bash
kubectl logs -n startpunkt deployment/startpunkt | grep -i "cluster"
```

Example log output:

```log
INFO  [us.ull.sta.ser.MultiClusterKubernetesClientService] Initializing remote cluster 'prod-cluster' with hostname and token authentication
INFO  [us.ull.sta.ser.MultiClusterKubernetesClientService] Connected to remote cluster 'prod-cluster' (version: v1.28.3)
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
