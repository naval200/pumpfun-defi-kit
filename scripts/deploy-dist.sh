#!/bin/bash

# Improved deploy to dist branch script
set -e

echo "🚀 Starting dist deployment..."

# Clean and build the project
echo "Cleaning and building project..."
npm run build:clean

# Check if dist folder exists
if [ ! -d "dist" ]; then
    echo "❌ Error: dist folder not found after build"
    exit 1
fi

echo "✅ Build completed successfully"

# Switch to dist branch (create if doesn't exist)
echo "Switching to dist branch..."
git checkout dist 2>/dev/null || git checkout -b dist

# Force add all dist files (this will detect changes even if files look similar)
echo "Adding dist folder..."
git add -f dist/

# Check if there are changes to commit
if git diff --staged --quiet; then
    echo "ℹ️ No changes detected in dist folder"
else
    echo "📝 Committing dist changes..."
    git commit -m "Update dist - $(date +'%Y-%m-%d %H:%M:%S')"
fi

# Push to remote
echo "Pushing to remote..."
git push origin dist

# Return to main branch
git checkout main

echo "✅ Deployment completed successfully!"
