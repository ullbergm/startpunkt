#!/bin/bash
set -e

echo "🚀 Starting Startpunkt devcontainer post-create setup..."

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
if ./mvnw dependency:go-offline -B 2>&1 | grep -v "^\[INFO\] Downloading\|^\[INFO\] Downloaded"; then
    echo "Maven dependencies downloaded successfully"
else
    echo "⚠️  Some Maven dependencies may not have been downloaded (this is often okay if they were cached)"
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
