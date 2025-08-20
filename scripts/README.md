# Deployment Scripts

This directory contains scripts to automate the deployment of your package to a `dist` branch on GitHub.

## Why a Dist Branch?

When users install your package from GitHub using `npm install github:username/repo`, npm downloads the source code but doesn't automatically build it. This means the `dist` folder (containing compiled JavaScript) won't exist, causing import errors.

By maintaining a separate `dist` branch with built files, users can install directly from GitHub without needing to build the package themselves.

## Available Scripts

### 1. Node.js Script (Cross-platform)
```bash
npm run deploy:dist
```

### 2. Shell Script (Unix/macOS)
```bash
npm run deploy:dist:shell
```

Or directly:
```bash
./scripts/deploy-dist.sh
```

## What the Scripts Do

1. **Check Prerequisites**: Verify git, npm, and Node.js are installed
2. **Validate Repository**: Ensure you're in a git repo with remote origin
3. **Check Changes**: Warn about uncommitted changes
4. **Build Project**: Run `npm ci` and `npm run build`
5. **Deploy to Dist Branch**: 
   - Create or checkout `dist` branch
   - Update the `dist` folder
   - Commit and push changes
   - Return to original branch

## Usage

### First Time Setup
```bash
# Build and deploy to dist branch
npm run deploy:dist

# This will create a new 'dist' branch with built files
```

### Subsequent Updates
```bash
# After making changes to your code
npm run deploy:dist

# This will update the existing dist branch
```

## Installation Commands for Users

### From Dist Branch (Recommended)
```bash
npm install github:naval200/pumpfun-defi-kit#dist
```

### From Main Branch (Source only)
```bash
npm install github:naval200/pumpfun-defi-kit
# Note: Users will need to run 'npm run build' after installation
```

## GitHub Actions Integration

You can also automate this process using GitHub Actions. Create `.github/workflows/deploy-dist.yml`:

```yaml
name: Deploy to Dist Branch

on:
  push:
    tags:
      - 'v*'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run build
      - run: |
          git config --global user.name 'GitHub Action'
          git config --global user.email 'action@github.com'
          git checkout -b dist
          git add dist/
          git commit -m "Build for release ${{ github.ref_name }}"
          git push origin dist --force
```

## Troubleshooting

### Script Fails with Git Errors
- Ensure you have write access to the repository
- Check that your git credentials are properly configured
- Verify the remote origin is set correctly

### Build Fails
- Check that all dependencies are properly installed
- Verify TypeScript configuration is correct
- Look for compilation errors in the build output

### Permission Denied (Shell Script)
- Make the script executable: `chmod +x scripts/deploy-dist.sh`
- Ensure you're running from the project root directory

## Best Practices

1. **Always commit your source changes** before running the deployment script
2. **Test the build locally** before deploying
3. **Use semantic versioning** for releases
4. **Keep the dist branch clean** - only built files should be committed there
5. **Automate with GitHub Actions** for consistent deployments

## File Structure After Deployment

```
your-repo/
├── main branch (source code)
│   ├── src/
│   ├── package.json
│   └── ...
└── dist branch (built files)
    ├── dist/
    │   ├── index.js
    │   ├── index.d.ts
    │   └── ...
    └── package.json
```
