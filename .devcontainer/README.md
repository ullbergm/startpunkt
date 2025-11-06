# Startpunkt Development Container

This directory contains the VS Code devcontainer configuration for Startpunkt development.

## Features

The devcontainer provides a fully configured development environment with:

- **Java 21** - Required for Quarkus 3 development
- **Node.js 20** - For frontend development with Preact + Vite
- **Maven** - Build tool for the backend
- **Docker-in-Docker** - For building and running containers
- **Git** - Version control

## VS Code Extensions

The following extensions are automatically installed:

### Java Development
- Red Hat Java extension pack
- Java debugger
- Maven for Java
- Quarkus Tools

### JavaScript/Preact Development
- ESLint
- Prettier
- Jest runner

### GraphQL
- GraphQL syntax highlighting
- GraphQL language support

### Additional Tools
- Docker extension
- GitLens
- EditorConfig support
- YAML support
- Markdown support

## Port Forwarding

The devcontainer automatically forwards the following ports:

- **8080** - Application frontend (Vite dev server or Quarkus)
- **8081** - Backend API (when running in microservices mode)
- **5005** - Java debugger port

## Getting Started

### Prerequisites

- [Visual Studio Code](https://code.visualstudio.com/)
- [Dev Containers extension](https://marketplace.visualstudio.com/items?itemName=ms-vscode-remote.remote-containers)
- [Docker Desktop](https://www.docker.com/products/docker-desktop) or compatible Docker installation

### Opening in a Dev Container

1. Open the project in VS Code
2. When prompted, click "Reopen in Container"
   - Or use Command Palette (F1) → "Dev Containers: Reopen in Container"
3. Wait for the container to build and initialize (first time may take several minutes)
4. The post-create script will automatically:
   - Install frontend dependencies
   - Download Maven dependencies
   - Display quick start commands

### Development Workflow

Once the container is running:

```bash
# Start Quarkus in development mode (with hot reload)
./mvnw quarkus:dev

# Run tests
./mvnw verify

# Format code
./mvnw spotless:apply

# Frontend-only development
cd src/main/webui
npm run dev
```

## Customization

### Adding Extensions

Edit `.devcontainer/devcontainer.json` and add extension IDs to the `extensions` array:

```json
"customizations": {
  "vscode": {
    "extensions": [
      "publisher.extension-id"
    ]
  }
}
```

### Modifying Settings

Edit the `settings` section in `devcontainer.json` to change VS Code settings for the container environment.

### Changing Features

The devcontainer uses [Dev Container Features](https://containers.dev/features) for installing tools. Modify the `features` section to add or update tools:

```json
"features": {
  "ghcr.io/devcontainers/features/node:1": {
    "version": "20"
  }
}
```

## Troubleshooting

### Container Build Issues

If the container fails to build:

1. Rebuild the container: Command Palette → "Dev Containers: Rebuild Container"
2. Check Docker Desktop is running
3. Check internet connectivity

### Port Conflicts

If ports are already in use:

- Stop other applications using ports 8080, 8081, or 5005
- Or modify the `forwardPorts` in `devcontainer.json`

### Maven/npm Issues

If dependencies fail to download:

1. Rebuild the container
2. Manually run the post-create script:
   ```bash
   bash .devcontainer/postCreate.sh
   ```

### Performance Issues

If the container is slow:

- Allocate more resources to Docker Desktop
- The Maven `.m2` directory is mounted for caching - ensure it's not on a slow filesystem

## Additional Resources

- [VS Code Dev Containers documentation](https://code.visualstudio.com/docs/devcontainers/containers)
- [Dev Container Features](https://containers.dev/features)
- [Startpunkt project README](../README.md)
