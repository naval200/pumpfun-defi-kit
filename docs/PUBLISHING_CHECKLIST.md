# NPM Publishing Checklist

This checklist ensures your @pumpfun/defi-kit library is ready for publication on NPM.

## ✅ Pre-Publishing Checklist

### 1. Package Configuration

- [x] **Package name**: `@pumpfun/defi-kit` (scoped package)
- [x] **Version**: `1.0.0` (initial release)
- [x] **Description**: Clear and descriptive
- [x] **Keywords**: Relevant for discoverability
- [x] **License**: MIT License
- [x] **Author**: Your name and contact info
- [x] **Repository**: GitHub repository URL
- [x] **Homepage**: README link
- [x] **Bugs**: Issue tracker URL

### 2. Build Configuration

- [x] **TypeScript config**: Optimized for library builds
- [x] **Entry points**: `main`, `module`, `types` properly set
- [x] **Exports**: ES modules and CommonJS support
- [x] **Files**: Only necessary files included
- [x] **Engines**: Node.js version requirements specified

### 3. Code Quality

- [x] **ESLint**: Configuration working (0 errors, 22 warnings acceptable)
- [x] **Prettier**: Code formatting consistent
- [x] **TypeScript**: Strict mode enabled, builds successfully
- [x] **Tests**: All tests passing
- [x] **Build**: Clean build output in `dist/` directory

### 4. Documentation

- [x] **README.md**: Comprehensive with examples
- [x] **API Reference**: Function documentation
- [x] **Installation**: Clear setup instructions
- [x] **Usage Examples**: Working code samples
- [x] **CHANGELOG.md**: Release history
- [x] **CONTRIBUTING.md**: Contribution guidelines
- [x] **SECURITY.md**: Security policy
- [x] **LICENSE**: MIT License file

### 5. Development Tools

- [x] **Git hooks**: Husky pre-commit hooks
- [x] **Lint-staged**: Pre-commit code quality checks
- [x] **CI/CD**: GitHub Actions workflow
- [x] **Scripts**: Build, test, lint, format commands

## 🚀 Publishing Steps

### Step 1: Final Verification

```bash
# Ensure everything is working
npm run build
npm run lint
npm test
npm run check-format
```

### Step 2: Update Version (if needed)

```bash
# For patch release
npm version patch

# For minor release
npm version minor

# For major release
npm version major
```

### Step 3: Build and Test

```bash
# Clean build
npm run build:clean

# Verify build output
ls -la dist/
```

### Step 4: Check Package Contents

```bash
# See what will be published
npm pack --dry-run
```

### Step 5: Publish to NPM

```bash
# Login to NPM (if not already logged in)
npm login

# Publish the package
npm publish

# Or publish with specific tag
npm publish --tag beta
```

## 🔍 Post-Publishing Verification

### 1. NPM Registry

- [ ] Package appears on npmjs.com
- [ ] Version number is correct
- [ ] Description and metadata are accurate
- [ ] Files are properly included

### 2. Installation Test

```bash
# Test installation in a new directory
mkdir test-install
cd test-install
npm init -y
npm install @pumpfun/defi-kit
```

### 3. Import Test

```typescript
// Test basic imports
import { createToken, buyToken } from '@pumpfun/defi-kit';
console.log('Import successful!');
```

### 4. GitHub Release

- [ ] Create GitHub release with tag
- [ ] Add release notes from CHANGELOG.md
- [ ] Trigger CI/CD pipeline

## 📋 Package.json Verification

Your `package.json` should look like this:

```json
{
  "name": "@pumpfun/defi-kit",
  "version": "1.0.0",
  "description": "A comprehensive Solana trading library for PumpFun tokens with bonding curve and AMM support",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist", "README.md", "LICENSE"],
  "engines": { "node": ">=18.0.0" }
}
```

## 🚨 Common Issues & Solutions

### Issue: Package name already exists

**Solution**: Use a different name or scope, or contact the existing package owner

### Issue: Build fails

**Solution**: Check TypeScript configuration and fix compilation errors

### Issue: Files missing from package

**Solution**: Verify `.npmignore` and `files` field in package.json

### Issue: Import errors

**Solution**: Check `exports` field and ensure proper module resolution

### Issue: TypeScript types not working

**Solution**: Verify `types` field points to correct `.d.ts` file

## 🎯 Next Steps After Publishing

1. **Monitor**: Watch for issues and feedback
2. **Documentation**: Keep README and examples updated
3. **Maintenance**: Regular dependency updates and security patches
4. **Community**: Engage with users and contributors
5. **Versioning**: Plan future releases and breaking changes

## 📞 Support

If you encounter issues during publishing:

- Check NPM documentation: https://docs.npmjs.com/
- Review package.json schema: https://docs.npmjs.com/cli/v8/configuring-npm/package-json
- Contact NPM support if needed

---

**Good luck with your NPM package! 🚀**
