# Console Plugin Development Quick Start

Quick reference guide for developing and testing the OpenShift Console Plugin.

## Prerequisites

```bash
# Ensure you have Node.js 18+ and npm installed
node --version  # Should be v18+
npm --version
```

## Development Setup

### 1. Install Dependencies

```bash
cd console-plugin
npm install
```

### 2. Start Development Server

```bash
npm run dev
```

This starts a webpack dev server on `http://localhost:9001` with hot reload enabled.

### 3. Configure OpenShift Console (Local Development)

To test the plugin with a local OpenShift console, you need to configure the console to load your plugin:

**Option A: Using oc CLI**

```bash
oc patch consoles.operator.openshift.io cluster \
  --type json \
  --patch '[{"op": "add", "path": "/spec/plugins/-", "value": "startpunkt-console-plugin"}]'
```

**Option B: Environment Variable (for local console development)**

If running the console locally:

```bash
export BRIDGE_PLUGINS="startpunkt-console-plugin=http://localhost:9001"
./bin/bridge
```

## Building

### Build Plugin

```bash
# From project root
./build-console-plugin.sh

# Or manually
cd console-plugin
npm run build
```

Output will be in `console-plugin/dist/`

### Build Container Image

```bash
# From project root
docker build -t startpunkt-console-plugin:dev -f Dockerfile.console-plugin .
```

### Build Everything (Backend + Frontend + Plugin)

```bash
# Build main Startpunkt application
./mvnw clean package

# Build console plugin
./build-console-plugin.sh

# Build both container images
docker build -t startpunkt:dev .
docker build -t startpunkt-console-plugin:dev -f Dockerfile.console-plugin .
```

## Testing

### Run Plugin Tests

```bash
cd console-plugin
npm test
```

(Note: Tests need to be added - see TODOs below)

### Test in OpenShift

1. **Deploy Startpunkt with plugin enabled**:

```bash
helm upgrade --install startpunkt ./deploy/kubernetes/charts/startpunkt \
  --namespace startpunkt \
  --create-namespace \
  --set consolePlugin.enabled=true \
  --set consolePlugin.image.repository=your-registry/startpunkt-console-plugin \
  --set consolePlugin.image.tag=dev
```

2. **Enable plugin in console**:

The ConsolePlugin resource should automatically register. If not:

```bash
oc get consoleplugin
oc patch consoles.operator.openshift.io cluster \
  --type json \
  --patch '[{"op": "add", "path": "/spec/plugins/-", "value": "startpunkt-console-plugin"}]'
```

3. **Access the plugin**:

- Open OpenShift web console
- Navigate to **Home** → **Startpunkt**

## Project Structure

```
console-plugin/
├── src/
│   ├── index.ts                    # Plugin entry point
│   └── components/
│       ├── StartpunktPage.tsx      # Main page component
│       └── StartpunktPage.css      # Component styles
├── package.json                     # NPM dependencies
├── tsconfig.json                    # TypeScript config
├── webpack.config.js                # Webpack config
├── ConsolePlugin.yaml               # K8s ConsolePlugin manifest
└── README.md                        # Plugin documentation
```

## Common Tasks

### Update Dependencies

```bash
cd console-plugin
npm update
npm audit fix
```

### Add a New Component

1. Create component file in `src/components/`
2. Import and use in `StartpunktPage.tsx`
3. Update webpack config if needed

### Modify Navigation

Edit `src/index.ts`:

```typescript
{
  type: 'console.navigation/href',
  properties: {
    id: 'startpunkt',
    name: 'Startpunkt',           // Change display name
    section: 'home',              // Change section (home, admin, dev, etc.)
    insertAfter: 'search',        // Change position
  }
}
```

### Change Theme/Styling

PatternFly components automatically inherit console theme. To customize:

1. Edit `src/components/StartpunktPage.css`
2. Use PatternFly CSS variables for consistency
3. Test in both light and dark modes

## Troubleshooting

### Plugin Not Loading

```bash
# Check plugin service and pod
kubectl get pods -n startpunkt -l app.kubernetes.io/component=console-plugin
kubectl logs -n startpunkt -l app.kubernetes.io/component=console-plugin

# Check ConsolePlugin resource
kubectl get consoleplugin startpunkt-console-plugin -o yaml

# Check console operator
kubectl get co console
```

### Build Failures

```bash
# Clear cache and reinstall
cd console-plugin
rm -rf node_modules package-lock.json dist
npm install
npm run build
```

### CORS Issues

Ensure backend CORS is configured in `src/main/resources/application.properties`:

```properties
quarkus.http.cors=true
quarkus.http.cors.origins=*
```

### SSL/TLS Certificate Issues

```bash
# Check certificate secret exists
kubectl get secret -n startpunkt startpunkt-console-plugin-cert

# Verify service annotation
kubectl get svc -n startpunkt startpunkt-console-plugin -o yaml | grep serving-cert
```

## Development Workflow

1. **Make changes** in `console-plugin/src/`
2. **Test locally** with `npm run dev`
3. **Build** with `npm run build`
4. **Build container** with `docker build`
5. **Deploy to cluster** for integration testing
6. **Verify** in OpenShift console

## Performance Tips

- Keep bundle size small (use code splitting if needed)
- Lazy load heavy components
- Minimize API calls
- Use React.memo for expensive components
- Test with slow network conditions

## Security Checklist

- [ ] All dependencies up to date
- [ ] No hardcoded credentials
- [ ] Proper iframe sandbox attributes
- [ ] CORS properly configured
- [ ] CSP headers respected
- [ ] Authentication tokens handled securely

## TODO Items for Production

- [ ] Add unit tests for React components
- [ ] Add integration tests with console SDK mocks
- [ ] Set up CI/CD pipeline for plugin builds
- [ ] Add E2E tests in real OpenShift environment
- [ ] Performance benchmarking
- [ ] Accessibility testing (WCAG compliance)
- [ ] Internationalization support
- [ ] Error boundaries and fallback UI
- [ ] Loading states and skeleton screens
- [ ] Analytics/telemetry integration

## Resources

- [Console Plugin SDK](https://github.com/openshift/console/tree/master/frontend/packages/console-dynamic-plugin-sdk)
- [PatternFly Components](https://www.patternfly.org/v4/components/about-modal)
- [Console Plugin Examples](https://github.com/openshift/console-plugin-template)
- [Dynamic Plugins Guide](https://docs.openshift.com/container-platform/latest/web_console/dynamic-plug-ins.html)
