#!/usr/bin/env node

/**
 * Deploy to dist branch script
 * This script builds the project and deploys the dist folder to a separate branch
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for output
const colors = {
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    reset: '\x1b[0m'
};

// Function to print colored output
function printStatus(message) {
    console.log(`${colors.blue}[INFO]${colors.reset} ${message}`);
}

function printSuccess(message) {
    console.log(`${colors.green}[SUCCESS]${colors.reset} ${message}`);
}

function printWarning(message) {
    console.log(`${colors.yellow}[WARNING]${colors.reset} ${message}`);
}

function printError(message) {
    console.log(`${colors.red}[ERROR]${colors.reset} ${message}`);
}

// Function to execute command and return output
function execCommand(command, options = {}) {
    try {
        return execSync(command, { 
            encoding: 'utf8', 
            stdio: options.silent ? 'pipe' : 'inherit',
            ...options 
        });
    } catch (error) {
        if (options.silent) {
            return null;
        }
        throw error;
    }
}

// Function to check if command exists
function commandExists(command) {
    try {
        execSync(`which ${command}`, { stdio: 'ignore' });
        return true;
    } catch {
        return false;
    }
}

// Check prerequisites
function checkPrerequisites() {
    printStatus('Checking prerequisites...');
    
    if (!commandExists('git')) {
        printError('Git is not installed. Please install git first.');
        process.exit(1);
    }
    
    if (!commandExists('npm')) {
        printError('npm is not installed. Please install Node.js and npm first.');
        process.exit(1);
    }
    
    if (!commandExists('node')) {
        printError('Node.js is not installed. Please install Node.js first.');
        process.exit(1);
    }
    
    printSuccess('All prerequisites are satisfied');
}

// Check if we're in a git repository
function checkGitRepo() {
    printStatus('Checking git repository...');
    
    try {
        execCommand('git rev-parse --git-dir', { silent: true });
    } catch {
        printError('Not in a git repository. Please run this script from the project root.');
        process.exit(1);
    }
    
    try {
        execCommand('git remote get-url origin', { silent: true });
    } catch {
        printError('No remote origin found. Please add a remote origin first.');
        process.exit(1);
    }
    
    printSuccess('Git repository is valid');
}

// Check for uncommitted changes
function checkUncommittedChanges() {
    printStatus('Checking for uncommitted changes...');
    
    try {
        execCommand('git diff-index --quiet HEAD --', { silent: true });
        printSuccess('No uncommitted changes found');
    } catch {
        printWarning('You have uncommitted changes in your working directory.');
        console.log('Current changes:');
        execCommand('git status --porcelain');
        
        // In Node.js, we can't easily do interactive input, so we'll just warn
        printWarning('Please commit or stash your changes before running this script.');
        printWarning('Continuing anyway...');
    }
}

// Build the project
function buildProject() {
    printStatus('Building the project...');
    
    // Clean install dependencies
    printStatus('Installing dependencies...');
    execCommand('npm ci');
    
    // Run the build
    printStatus('Running build...');
    execCommand('npm run build');
    
    if (!fs.existsSync('dist')) {
        printError('Build failed - dist folder not found');
        process.exit(1);
    }
    
    printSuccess('Project built successfully');
}

// Deploy to dist branch
function deployToDistBranch() {
    printStatus('Deploying to dist branch...');
    
    // Get current branch name
    const currentBranch = execCommand('git branch --show-current', { silent: true }).trim();
    printStatus(`Current branch: ${currentBranch}`);
    
    // Check if dist branch exists remotely
    try {
        execCommand('git ls-remote --heads origin dist', { silent: true });
        printStatus('Dist branch exists remotely, fetching latest...');
        execCommand('git fetch origin dist');
    } catch {
        printStatus('Dist branch does not exist remotely');
    }
    
    // Create or checkout dist branch
    try {
        execCommand('git show-ref --verify --quiet refs/heads/dist', { silent: true });
        printStatus('Checking out existing dist branch...');
        execCommand('git checkout dist');
        execCommand('git pull origin dist');
    } catch {
        printStatus('Creating new dist branch...');
        execCommand('git checkout -b dist');
    }
    
    // Remove old dist folder and add new one
    printStatus('Updating dist folder...');
    try {
        execCommand('git rm -rf dist/', { silent: true });
    } catch {
        // Ignore error if dist folder doesn't exist
    }
    execCommand('git add dist/');
    
    // Check if there are changes to commit
    try {
        execCommand('git diff-index --quiet HEAD --', { silent: true });
        printWarning('No changes to commit in dist folder');
    } catch {
        // Commit the changes
        printStatus('Committing dist folder changes...');
        const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
        execCommand(`git commit -m "Update dist folder - ${timestamp}"`);
        
        // Push to remote
        printStatus('Pushing to remote dist branch...');
        execCommand('git push origin dist');
        
        printSuccess('Successfully deployed to dist branch');
    }
    
    // Return to original branch
    printStatus(`Returning to original branch: ${currentBranch}`);
    execCommand(`git checkout "${currentBranch}"`);
}

// Main execution
function main() {
    console.log('🚀 Starting dist branch deployment...');
    console.log('==================================');
    
    checkPrerequisites();
    checkGitRepo();
    checkUncommittedChanges();
    buildProject();
    deployToDistBranch();
    
    console.log('==================================');
    printSuccess('Deployment completed successfully!');
    console.log('');
    console.log('Users can now install your package with:');
    console.log('  npm install github:naval200/pumpfun-defi-kit#dist');
    console.log('');
    console.log('Or from the main branch (source only):');
    console.log('  npm install github:naval200/pumpfun-defi-kit');
}

// Run the script
if (require.main === module) {
    main();
}
