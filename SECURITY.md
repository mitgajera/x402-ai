# Security Policy

## Supported Versions

We actively maintain and provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of the x402-ai-gateway project seriously. If you discover a security vulnerability, please report it to us as described below.

### How to Report

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please report them via one of the following methods:

1. **Email (Preferred):**
   - Send an email to: security@example.com
   - Include "SECURITY" in the subject line
   - Provide a detailed description of the vulnerability
   - Include steps to reproduce (if applicable)

2. **GitHub Security Advisory:**
   - Use GitHub's private vulnerability reporting feature
   - Go to: https://github.com/mitgajera/x402-ai/security/advisories/new

### What to Include

When reporting a vulnerability, please include:

- **Type of vulnerability** (e.g., smart contract bug, frontend issue, API vulnerability)
- **Component affected** (e.g., Anchor program, payment flow, API route)
- **Severity assessment** (Critical, High, Medium, Low)
- **Steps to reproduce** (if applicable)
- **Potential impact** (what could an attacker do?)
- **Suggested fix** (if you have one)

### Response Timeline

- **Initial Response:** Within 48 hours
- **Status Update:** Within 7 days
- **Resolution:** Depends on severity
  - Critical: As soon as possible (typically within 24-48 hours)
  - High: Within 1 week
  - Medium: Within 2 weeks
  - Low: Within 1 month

### What to Expect

1. **Acknowledgment:** You will receive an acknowledgment of your report within 48 hours
2. **Investigation:** We will investigate the vulnerability and assess its severity
3. **Updates:** We will provide regular updates on the status of the vulnerability
4. **Resolution:** Once fixed, we will:
   - Credit you in the security advisory (if desired)
   - Publish a security advisory with details
   - Release a patch/update

### Scope

**In Scope:**
- Smart contract vulnerabilities (Anchor program)
- Payment flow security issues
- API endpoint vulnerabilities
- Authentication/authorization flaws
- Private key handling issues
- Transaction validation bugs

**Out of Scope:**
- Denial of Service (DoS) attacks
- Social engineering attacks
- Physical security issues
- Issues in third-party dependencies (report to the dependency maintainer)
- Issues requiring physical access to the user's device

### Security Best Practices

When testing for vulnerabilities, please:

- **Do not** access or modify data that does not belong to you
- **Do not** perform any attack that could harm the service or its users
- **Do not** violate any laws or breach any agreements
- **Do** act in good faith and follow responsible disclosure practices

### Rewards

Currently, we do not offer monetary rewards for security vulnerabilities. However, we will:

- Publicly acknowledge your contribution (if desired)
- Add you to our security hall of fame
- Provide early access to security patches

### Program Information

- **Program ID:** `12wpFdqZm2bwCUNSiqB8UJTwRJFkevU5vUuE8XxhpHE1`
- **Network:** Devnet (for testing), Mainnet (for production)
- **Security Contact:** security@example.com
- **PGP Key:** Available upon request

### Additional Resources

- [Anchor Security Best Practices](https://www.anchor-lang.com/docs/security)
- [Solana Security Guidelines](https://docs.solana.com/developing/programming-model/security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

Thank you for helping keep x402-ai-gateway and its users safe!