# Contributing to @pumpfun/defi-kit

Thank you for your interest in contributing to the PumpFun Solana Trading library! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Code Style](#code-style)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Release Process](#release-process)

## Code of Conduct

This project and everyone participating in it is governed by our Code of Conduct. By participating, you are expected to uphold this code.

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Solana CLI tools (for testing)
- Basic knowledge of Solana development

### Development Setup

1. **Fork the repository**

   ```bash
   git clone https://github.com/yourusername/pumpfun-solana-trading.git
   cd pumpfun-solana-trading
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp env.example .env
   # Edit .env with your configuration
   ```

4. **Install git hooks**
   ```bash
   npm run prepare
   ```

## Development

### Available Scripts

- `npm run build` - Build the project
- `npm run dev` - Run in development mode
- `npm test` - Run tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:coverage` - Run tests with coverage
- `npm run lint` - Run ESLint
- `npm run lint:fix` - Fix ESLint issues automatically
- `npm run format` - Format code with Prettier
- `npm run check-format` - Check code formatting

### Code Style

We use ESLint and Prettier to maintain consistent code style:

- **ESLint**: Catches potential errors and enforces code quality
- **Prettier**: Ensures consistent formatting
- **TypeScript**: Strict typing with modern ES2022+ features

#### Code Style Rules

- Use single quotes for strings
- Use trailing commas in objects and arrays
- Maximum line length: 100 characters
- Use meaningful variable names
- Include JSDoc comments for public functions
- Handle errors gracefully with try/catch blocks

#### Example

```typescript
/**
 * Creates a new PumpFun token with the specified metadata
 * @param options - Token creation options
 * @returns Promise resolving to token creation result
 */
export async function createToken(options: CreateTokenOptions): Promise<CreateTokenResult> {
  try {
    const { connection, wallet, tokenData, network } = options;

    // Implementation here...

    return {
      success: true,
      tokenMint: mintAddress,
      signature: txSignature,
    };
  } catch (error) {
    console.error('Token creation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
```

### Testing

#### Writing Tests

- Place tests in the `tests/` directory
- Use descriptive test names
- Test both success and failure scenarios
- Mock external dependencies when appropriate
- Use the Jest testing framework

#### Example Test

```typescript
import { createToken } from '../src/bonding-curve/createToken';

describe('createToken', () => {
  it('should create a token successfully with valid parameters', async () => {
    const mockConnection = {} as Connection;
    const mockWallet = {} as Keypair;
    const tokenData = {
      name: 'Test Token',
      symbol: 'TEST',
      description: 'A test token',
    };

    const result = await createToken({
      connection: mockConnection,
      wallet: mockWallet,
      tokenData,
      network: 'devnet',
    });

    expect(result.success).toBe(true);
    expect(result.tokenMint).toBeDefined();
  });

  it('should handle errors gracefully', async () => {
    // Test error handling...
  });
});
```

#### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/bonding-curve/createToken.test.ts
```

## Pull Request Process

### Before Submitting

1. **Ensure tests pass**

   ```bash
   npm test
   npm run lint
   npm run build
   ```

2. **Update documentation** if needed
3. **Add tests** for new functionality
4. **Update CHANGELOG.md** with your changes

### Pull Request Guidelines

- **Title**: Use clear, descriptive titles
- **Description**: Explain what and why, not how
- **Related Issues**: Link to relevant issues
- **Breaking Changes**: Clearly mark breaking changes
- **Screenshots**: Include screenshots for UI changes

### Example Pull Request

```markdown
## Description

Adds support for custom slippage tolerance in AMM trading operations.

## Changes

- New `slippage` parameter in `buyFromPool` and `sellToPool` functions
- Default slippage of 1% (100 basis points)
- Input validation for slippage values

## Testing

- Added unit tests for slippage validation
- Integration tests with various slippage values
- All existing tests pass

## Breaking Changes

None - new optional parameter with sensible defaults

## Related Issues

Closes #123
```

## Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes, backward compatible

### Release Steps

1. **Update version** in `package.json`
2. **Update CHANGELOG.md** with release notes
3. **Create git tag**
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```
4. **Create GitHub release** with release notes
5. **Publish to NPM** (automated via GitHub Actions)

### Release Notes Format

```markdown
## [1.0.0] - 2024-01-XX

### Added

- Initial public release
- Core trading functionality
- AMM and bonding curve support

### Changed

- Improved error handling
- Better TypeScript types

### Fixed

- Resolved transaction confirmation issues
- Fixed pool discovery edge cases
```

## Getting Help

- **Issues**: Use GitHub Issues for bug reports and feature requests
- **Discussions**: Use GitHub Discussions for questions and general discussion
- **Documentation**: Check the README.md and inline code comments

## License

By contributing to this project, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to @pumpfun/defi-kit! 🚀
