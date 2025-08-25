#!/bin/bash

# Simple deploy to dist branch script
set -e

echo "🚀 Starting simple dist deployment..."

# Build the project
echo "Building project..."
npm run build

# Switch to dist branch (create if doesn't exist)
echo "Switching to dist branch..."
git checkout dist 2>/dev/null || git checkout -b dist

# Add and commit dist folder
echo "Adding dist folder..."
git add -f dist/
git commit -m "Update dist - $(date)" || echo "No changes to commit"

# Push to remote
echo "Pushing to remote..."
git push origin dist

# Return to main branch
git checkout main

echo "✅ Deployment completed successfully!"
