#!/bin/bash

# Build script for the console plugin
set -e

echo "Building Startpunkt Console Plugin..."

cd console-plugin

# Install dependencies
echo "Installing dependencies..."
npm ci

# Build the plugin
echo "Building plugin..."
npm run build

echo "Console plugin built successfully!"
echo "Output in: console-plugin/dist/"
