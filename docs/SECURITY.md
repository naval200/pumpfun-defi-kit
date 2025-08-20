# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Which versions are eligible for receiving such patches depends on the CVSS v3.0 Rating:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of @pumpfun/defi-kit seriously. If you believe you have found a security vulnerability, please report it to us as described below.

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to [navalsini81@gmail.com](mailto:navalsaini81@gmail.com).

You should receive a response within 48 hours. If for some reason you do not, please follow up via email to ensure we received your original message.

Please include the requested information listed below (as much as you can provide) to help us better understand the nature and scope of the possible issue:

- Type of issue (buffer overflow, SQL injection, cross-site scripting, etc.)
- Full paths of source file(s) related to the vulnerability
- The location of the affected source code (tag/branch/commit or direct URL)
- Any special configuration required to reproduce the issue
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

This information will help us triage your report more quickly.

## Preferred Languages

We prefer to receive vulnerability reports in English, but we can also handle reports in other languages if necessary.

## Disclosure Policy

When we receive a security bug report, we will:

1. Confirm the problem and determine the affected versions
2. Audit code to find any similar problems
3. Prepare fixes for all supported versions
4. Release a new version with the fix

## Comments on this Policy

If you have suggestions on how this process could be improved, please submit a pull request.

## Security Best Practices

When using this library:

1. **Always test on devnet first** before using on mainnet
2. **Never share private keys** or seed phrases
3. **Use secure RPC endpoints** and avoid public endpoints in production
4. **Validate all inputs** before passing to library functions
5. **Handle errors gracefully** and implement proper fallbacks
6. **Keep dependencies updated** to the latest secure versions
7. **Monitor for security advisories** from the Solana ecosystem

## Acknowledgments

We would like to thank all security researchers and contributors who responsibly disclose vulnerabilities to help make our library more secure.
