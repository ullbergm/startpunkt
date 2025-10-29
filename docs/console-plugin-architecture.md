# OpenShift Console Plugin Architecture

This document describes the architecture of the Startpunkt OpenShift Console Plugin.

## Overview

The Startpunkt Console Plugin is an OpenShift Dynamic Plugin that embeds the Startpunkt application directly into the OpenShift web console, providing users with seamless access to their application dashboard without leaving the console interface.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    OpenShift Console                         │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │          Console Plugin Framework                   │     │
│  │                                                     │     │
│  │  ┌──────────────────────────────────────────┐     │     │
│  │  │   Startpunkt Console Plugin             │     │     │
│  │  │                                          │     │     │
│  │  │  • Navigation Item                       │     │     │
│  │  │  • Route Registration                    │     │     │
│  │  │  • StartpunktPage Component              │     │     │
│  │  │    - PatternFly UI                       │     │     │
│  │  │    - Iframe Integration                  │     │     │
│  │  └──────────────────────────────────────────┘     │     │
│  │                                                     │     │
│  │  ┌──────────────────────────────────────────┐     │     │
│  │  │            Console Proxy                 │     │     │
│  │  │  • Backend API Proxy                     │     │     │
│  │  │  • Authentication Forwarding             │     │     │
│  │  └──────────────────────────────────────────┘     │     │
│  └────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────┘
                           │
                           │ HTTPS (with OAuth token)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│              Startpunkt Backend Service                      │
│                                                              │
│  • REST APIs (/api/apps, /api/bookmarks, etc.)              │
│  • CORS Configuration                                        │
│  • Kubernetes Resource Watchers                             │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. Console Plugin Package

**Location**: `console-plugin/`

The plugin is built as a separate npm package using TypeScript and React, following OpenShift's dynamic plugin architecture.

**Key Files**:
- `src/index.ts` - Plugin entry point, defines extensions (navigation, routes)
- `src/components/StartpunktPage.tsx` - Main page component
- `webpack.config.js` - Build configuration using ConsoleRemotePlugin
- `package.json` - Dependencies and plugin metadata

**Build Process**:
1. TypeScript compilation
2. Webpack bundling with ConsoleRemotePlugin
3. Output: static assets in `dist/` directory

### 2. Plugin Container

**Dockerfile**: `Dockerfile.console-plugin`

The plugin is packaged as a separate container running nginx to serve the static assets.

**Features**:
- UBI9-based nginx image
- TLS/SSL support via OpenShift service-ca
- CORS headers for console integration
- Minimal footprint (static files only)

**Port**: 9443 (HTTPS)

### 3. Kubernetes Resources

**Location**: `deploy/kubernetes/charts/startpunkt/templates/`

The plugin deployment includes:

- **Deployment**: `console-plugin-deployment.yaml`
  - Runs the plugin container
  - Mounts TLS certificate from secret
  - Environment variables for configuration
  
- **Service**: `console-plugin-service.yaml`
  - ClusterIP service on port 9443
  - Automatic TLS certificate generation via service-ca-operator
  
- **ConsolePlugin**: `console-plugin.yaml`
  - Registers the plugin with OpenShift console
  - Defines service endpoint
  - Configures proxy for backend API access

### 4. Plugin Extensions

The plugin registers the following extensions with the console:

#### Navigation Extension
```typescript
{
  type: 'console.navigation/href',
  properties: {
    id: 'startpunkt',
    name: 'Startpunkt',
    href: '/startpunkt',
    perspective: 'admin',
    section: 'home',
  }
}
```

Adds a "Startpunkt" menu item under the Home section in the admin perspective.

#### Route Extension
```typescript
{
  type: 'console.page/route',
  properties: {
    path: '/startpunkt',
    component: { $codeRef: 'StartpunktPage' }
  }
}
```

Registers a route that renders the StartpunktPage component.

## Data Flow

### 1. Plugin Loading

```
1. User logs into OpenShift Console
2. Console loads enabled plugins from ConsolePlugin resources
3. Console fetches plugin manifest from plugin service
4. Console loads plugin JavaScript bundle
5. Plugin registers its extensions (nav items, routes)
```

### 2. Page Navigation

```
1. User clicks "Startpunkt" in console navigation
2. Console router navigates to /startpunkt
3. StartpunktPage component renders
4. Component creates iframe with Startpunkt URL
5. Iframe loads Startpunkt application
```

### 3. API Communication

```
1. Startpunkt frontend makes API requests
2. Requests go through console proxy (if configured)
3. Console adds OAuth token to request headers
4. Backend validates token and processes request
5. Response flows back through proxy to frontend
```

## Authentication & Authorization

### Console SSO

The plugin automatically inherits authentication from the OpenShift console:

1. User authenticates to OpenShift console via OAuth
2. Console obtains OAuth token
3. Plugin can access token via console SDK
4. Token is forwarded to backend APIs via proxy

### Backend Integration

The Startpunkt backend can validate OpenShift OAuth tokens:

1. Extract bearer token from Authorization header
2. Validate token with OpenShift OAuth server
3. Authorize request based on user's Kubernetes RBAC permissions

## Security

### Transport Security

- All communication uses TLS/SSL
- Certificates auto-generated by OpenShift service-ca-operator
- Certificate mounted to plugin container at runtime

### Content Security

- Iframe sandbox restrictions applied
- CORS headers properly configured
- CSP headers from OpenShift console

### RBAC

- Plugin respects OpenShift RBAC
- Users see only resources they have permissions for
- Backend enforces authorization checks

## Performance Considerations

### Caching

- Static assets cached at edge
- API responses cached per configuration
- Console caches plugin manifest

### Resource Usage

- Minimal CPU/memory footprint (static file serving)
- Configurable replicas for HA
- Resource limits prevent resource exhaustion

### Scaling

- Plugin pods can scale independently
- Backend scales separately
- Load balancing via Kubernetes service

## Development Workflow

### Local Development

1. Start OpenShift console in development mode
2. Run plugin dev server: `npm run dev`
3. Configure console to load plugin from localhost:9001
4. Hot reload enabled for rapid iteration

### Building

```bash
# Build plugin
cd console-plugin
npm install
npm run build

# Build container
docker build -f Dockerfile.console-plugin -t startpunkt-console-plugin .
```

### Testing

- Unit tests for React components
- Integration tests with console SDK mocks
- E2E tests in full OpenShift environment

## Configuration

### Environment Variables

- `STARTPUNKT_URL` - URL to Startpunkt backend service

### Helm Values

See `values.yaml` for full configuration options:

```yaml
consolePlugin:
  enabled: true
  replicas: 2
  image:
    repository: ghcr.io/ullbergm/startpunkt-console-plugin
    tag: v3.1.0
  startpunktUrl: ""  # Auto-detected if not set
  proxy:
    enabled: true
    authorize: true
```

## Troubleshooting

### Common Issues

1. **Plugin not loading**
   - Check ConsolePlugin resource exists
   - Verify service/deployment are running
   - Check console operator logs

2. **SSL/TLS errors**
   - Verify serving-cert secret exists
   - Check service annotation for cert generation
   - Validate certificate is mounted in pod

3. **CORS errors**
   - Ensure CORS enabled in backend
   - Check proxy configuration
   - Verify allowed origins include console domain

### Debug Mode

Enable debug logging:

```yaml
consolePlugin:
  env:
    - name: DEBUG
      value: "true"
```

## Future Enhancements

Potential improvements for future versions:

1. **Dashboard Cards**: Add console dashboard widgets showing app summaries
2. **Custom Perspective**: Create dedicated console perspective for Startpunkt
3. **Quick Actions**: Add actions to console overview pages
4. **Notification Integration**: Push notifications to console notification drawer
5. **Multi-cluster**: Support for multiple Startpunkt instances across clusters

## References

- [OpenShift Console Plugin SDK](https://github.com/openshift/console/tree/master/frontend/packages/console-dynamic-plugin-sdk)
- [Dynamic Plugins Documentation](https://docs.openshift.com/container-platform/latest/web_console/dynamic-plug-ins.html)
- [PatternFly Design System](https://www.patternfly.org/)
