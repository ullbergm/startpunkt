# Startpunkt OpenShift Console Plugin

This is an OpenShift Console Dynamic Plugin that integrates Startpunkt directly into the OpenShift web console.

## Overview

The plugin adds a "Startpunkt" navigation item in the OpenShift console that displays the Startpunkt application dashboard in an embedded view, providing seamless access without leaving the console.

## Features

- **Native Integration**: Embedded directly in OpenShift console
- **Automatic SSO**: Leverages OpenShift authentication
- **Consistent UI**: Follows OpenShift PatternFly design system
- **Easy Access**: Available from the console navigation menu

## Development

### Prerequisites

- Node.js 18+
- npm or yarn
- OpenShift Console (for testing)

### Building

```bash
npm install
npm run build
```

The built plugin will be in the `dist/` directory.

### Development Server

```bash
npm run dev
```

This starts a webpack dev server on port 9001 with CORS enabled for console integration.

## Deployment

The plugin is packaged as a separate container image and deployed alongside the main Startpunkt service.

### Container Image

A Dockerfile is provided to build the plugin container:

```bash
docker build -t startpunkt-console-plugin:latest -f Dockerfile.console-plugin .
```

### Helm Chart

Enable the console plugin in your Helm values:

```yaml
consolePlugin:
  enabled: true
  image:
    repository: your-registry/startpunkt-console-plugin
    tag: latest
```

## Configuration

The plugin can be configured via environment variables:

- `STARTPUNKT_URL`: URL to the Startpunkt service (default: `/api/startpunkt-proxy`)

## Architecture

The plugin uses the OpenShift Console Dynamic Plugin SDK to:

1. Register a navigation item in the console menu
2. Define a route for the Startpunkt page
3. Embed the Startpunkt UI in an iframe
4. Handle authentication via console context

## References

- [OpenShift Console Plugin SDK](https://github.com/openshift/console/tree/master/frontend/packages/console-dynamic-plugin-sdk)
- [OpenShift Console Dynamic Plugins Documentation](https://docs.openshift.com/container-platform/latest/web_console/dynamic-plug-ins.html)
- [PatternFly React Components](https://www.patternfly.org/v4/get-started/develop)
