#!/bin/bash

# Deploy to dist branch script
# This script builds the project and deploys the dist folder to a separate branch

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command_exists git; then
        print_error "Git is not installed. Please install git first."
        exit 1
    fi
    
    if ! command_exists npm; then
        print_error "npm is not installed. Please install Node.js and npm first."
        exit 1
    fi
    
    if ! command_exists node; then
        print_error "Node.js is not installed. Please install Node.js first."
        exit 1
    fi
    
    print_success "All prerequisites are satisfied"
}

# Check if we're in a git repository
check_git_repo() {
    print_status "Checking git repository..."
    
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        print_error "Not in a git repository. Please run this script from the project root."
        exit 1
    fi
    
    # Check if we have a remote origin
    if ! git remote get-url origin > /dev/null 2>&1; then
        print_error "No remote origin found. Please add a remote origin first."
        exit 1
    fi
    
    print_success "Git repository is valid"
}

# Check for uncommitted changes
check_uncommitted_changes() {
    print_status "Checking for uncommitted changes..."
    
    if ! git diff-index --quiet HEAD --; then
        print_warning "You have uncommitted changes in your working directory."
        echo "Current changes:"
        git status --porcelain
        
        read -p "Do you want to continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_status "Aborting deployment. Please commit or stash your changes first."
            exit 1
        fi
    else
        print_success "No uncommitted changes found"
    fi
}

# Build the project
build_project() {
    print_status "Building the project..."
    
    # Clean install dependencies
    print_status "Installing dependencies..."
    npm ci
    
    # Run the build
    print_status "Running build..."
    npm run build
    
    if [ ! -d "dist" ]; then
        print_error "Build failed - dist folder not found"
        exit 1
    fi
    
    print_success "Project built successfully"
}

# Deploy to dist branch
deploy_to_dist_branch() {
    print_status "Deploying to dist branch..."
    
    # Get current branch name
    CURRENT_BRANCH=$(git branch --show-current)
    print_status "Current branch: $CURRENT_BRANCH"
    
    # Check if dist branch exists remotely
    if git ls-remote --heads origin dist | grep -q dist; then
        print_status "Dist branch exists remotely, fetching latest..."
        git fetch origin dist
    fi
    
    # Create or checkout dist branch
    if git show-ref --verify --quiet refs/heads/dist; then
        print_status "Checking out existing dist branch..."
        git checkout dist
        git pull origin dist
    else
        print_status "Creating new dist branch..."
        git checkout -b dist
    fi
    
    # Remove old dist folder and add new one
    print_status "Updating dist folder..."
    git rm -rf dist/ 2>/dev/null || true
    git add dist/
    
    # Check if there are changes to commit
    if git diff-index --quiet HEAD --; then
        print_warning "No changes to commit in dist folder"
    else
        # Commit the changes
        print_status "Committing dist folder changes..."
        git commit -m "Update dist folder - $(date '+%Y-%m-%d %H:%M:%S')"
        
        # Push to remote
        print_status "Pushing to remote dist branch..."
        git push origin dist
        
        print_success "Successfully deployed to dist branch"
    fi
    
    # Return to original branch
    print_status "Returning to original branch: $CURRENT_BRANCH"
    git checkout "$CURRENT_BRANCH"
}

# Main execution
main() {
    echo "🚀 Starting dist branch deployment..."
    echo "=================================="
    
    check_prerequisites
    check_git_repo
    check_uncommitted_changes
    build_project
    deploy_to_dist_branch
    
    echo "=================================="
    print_success "Deployment completed successfully!"
    echo ""
    echo "Users can now install your package with:"
    echo "  npm install github:naval200/pumpfun-defi-kit#dist"
    echo ""
    echo "Or from the main branch (source only):"
    echo "  npm install github:naval200/pumpfun-defi-kit"
}

# Run the script
main "$@"
