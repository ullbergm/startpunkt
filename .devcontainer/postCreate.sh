#!/bin/bash
set -e

echo "🚀 Starting Startpunkt devcontainer post-create setup..."

# Install OpenShift CLI tools (oc and kubectl)
echo "🔧 Installing OpenShift CLI tools..."
curl -sL https://mirror.openshift.com/pub/openshift-v4/x86_64/clients/ocp/stable/openshift-client-linux.tar.gz | sudo tar -xzf - -C /usr/local/bin oc kubectl
sudo chmod +x /usr/local/bin/oc /usr/local/bin/kubectl
echo "✅ OpenShift CLI tools installed: $(oc version --client --short 2>/dev/null || echo 'oc installed') and kubectl"

# Install npm dependencies for the webui
echo "📦 Installing frontend dependencies..."
cd src/main/webui
npm install
cd ../../..

# Install commitlint dependencies at root if package.json exists
if [ -f "package.json" ]; then
    echo "📦 Installing root dependencies (commitlint, etc.)..."
    npm install
fi

# Download Maven dependencies
echo "📦 Downloading Maven dependencies..."
chmod +x ./mvnw
./mvnw dependency:go-offline -B > /tmp/maven-download.log 2>&1
maven_exit_code=$?
if [ $maven_exit_code -eq 0 ]; then
    echo "Maven dependencies downloaded successfully"
else
    echo "⚠️  Maven dependency download had issues (exit code: $maven_exit_code)"
    echo "This is often okay if dependencies were already cached"
    tail -20 /tmp/maven-download.log
fi

# Set up git hooks (if pre-commit is configured)
if [ -f ".pre-commit-config.yaml" ]; then
    echo "🔧 Pre-commit configuration detected, but skipping installation in container"
    echo "   (You can install pre-commit manually if needed)"
fi

# Display welcome message
echo ""
echo "✅ Startpunkt devcontainer setup complete!"
echo ""
echo "🎯 Quick Start Commands:"
echo "   - Start development mode:    ./mvnw quarkus:dev"
echo "   - Run tests:                 ./mvnw verify"
echo "   - Format code:               ./mvnw spotless:apply"
echo "   - Frontend only dev:         cd src/main/webui && npm run dev"
echo ""
echo "🔍 The application will be available at:"
echo "   - Frontend:  http://localhost:8080"
echo "   - Backend:   http://localhost:8081"
echo "   - Debug:     localhost:5005"
echo ""
echo "📚 See README.md for more information"
echo ""
