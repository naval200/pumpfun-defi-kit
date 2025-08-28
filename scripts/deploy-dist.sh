#!/bin/bash

# Improved deploy to dist branch script
set -e

echo "🚀 Starting dist deployment..."

# Ensure we're on main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo "⚠️  Warning: Not on main branch (currently on $CURRENT_BRANCH)"
    echo "Switching to main branch..."
    git checkout main
fi

# Clean and build the project
echo "Cleaning and building project..."
npm run build:clean

# Check if dist folder exists
if [ ! -d "dist" ]; then
    echo "❌ Error: dist folder not found after build"
    exit 1
fi

echo "📁 Found dist folder with contents:"
ls -la dist/

DIST_FILES="dist/ docs/ examples/ package.json README.md LICENSE"

tar -czf .dist.tar.gz $DIST_FILES >/dev/null

echo "✅ Build completed successfully"

# Switch to dist branch (create if doesn't exist)
echo "Switching to dist branch..."
git checkout dist

# Clean up any existing dist directory to avoid conflicts
if [ -d "dist" ]; then
    echo "Cleaning up existing dist directory..."
    rm -rf dist/
fi

# Force add all dist files (this will detect changes even if files look similar)
echo "Adding to main..."

tar -xzf .dist.tar.gz >/dev/null
git add -f $DIST_FILES

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
echo "Returning to main branch..."
git checkout main

# Clean up temporary files
echo "Cleaning up temporary files..."
rm -rf dist/ .dist.tar.gz

echo "✅ Deployment completed successfully!"
