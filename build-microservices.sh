#!/bin/bash
set -e

# Build script for Startpunkt microservices
# This script builds both frontend and backend containers separately

echo "=========================================="
echo "Building Startpunkt Microservices"
echo "=========================================="

# Build the application once (includes both backend and frontend build)
echo ""
echo "Building application..."
export JAVA_HOME=/usr/lib/jvm/temurin-21-jdk-amd64
./mvnw clean package -DskipTests

echo ""
echo "Building backend Docker image..."
docker build -f src/main/docker/Dockerfile.backend -t startpunkt-backend:latest .

# Build frontend
echo ""
echo "Building frontend Docker image..."
docker build -f src/main/docker/Dockerfile.frontend -t startpunkt-frontend:latest .

echo ""
echo "=========================================="
echo "Build complete!"
echo "=========================================="
echo ""
echo "To start the services, run:"
echo "  docker-compose up"
echo ""
echo "Backend API will be available at: http://localhost:8081"
echo "Frontend will be available at: http://localhost:8080"
echo ""
