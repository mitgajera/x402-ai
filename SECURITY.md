# Security Policy

## Overview

x402-ai-gateway is a Solana-powered, pay-per-request AI inference gateway. We take security seriously and appreciate responsible disclosure of vulnerabilities.

## Reporting a Vulnerability

**IMPORTANT: Do NOT report security vulnerabilities through public GitHub issues, discussions, or pull requests.**

### How to Report

**Email (Preferred):**
- Address: `gajeramit180@gmail.com`
- Subject: Include `[SECURITY]` prefix
- Response: Within 48 hours

**GitHub Security Advisory:**
- Use GitHub's private vulnerability reporting
- Link: https://github.com/mitgajera/x402-ai/security/advisories/new

**Security.txt:**
- Location: `x402_receipts/security.txt`

### What to Include

- Vulnerability type and affected component
- Severity assessment (Critical/High/Medium/Low)
- Steps to reproduce
- Potential impact
- Suggested fix (if available)
- Environment details (devnet/mainnet)

### Response Timeline

| Severity | Response Time      |
| -------- | ------------------ |
| Critical | 24-48 hours        |
| High     | Within 1 week      |
| Medium   | Within 2 weeks     |
| Low      | Within 1 month     |

You will receive:
1. Acknowledgment within 48 hours
2. Regular status updates
3. Security advisory publication (with credit, if desired)
4. Patch release

## Vulnerability Scope

### In Scope

- Smart contract vulnerabilities (Anchor program)
- Payment flow security issues (replay attacks, amount manipulation)
- API endpoint vulnerabilities (auth bypass, injection)
- Frontend security (XSS, wallet connection issues)
- Private key exposure or environment variable leaks
- Transaction validation bugs
- Data privacy issues

### Out of Scope

- Denial of Service (DoS/DDoS) attacks
- Social engineering attacks
- Physical security issues
- Third-party dependency vulnerabilities (report to maintainer)
- Issues in services we don't control (Solana network, wallet extensions)
- Self-XSS or issues requiring root/admin access
- Theoretical vulnerabilities without proof-of-concept

**If unsure, report it anyway. We'd rather review a false positive than miss a real vulnerability.**

## Security Testing Guidelines

### Do:
- Act in good faith and follow responsible disclosure
- Test only on your own accounts or with permission
- Minimize impact on other users
- Use testnet/devnet for testing
- Report vulnerabilities promptly

### Do Not:
- Access or modify data that doesn't belong to you
- Perform attacks that could harm the service or users
- Violate laws or breach agreements
- Publicly disclose before we address the issue
- Test on mainnet with real funds
- Use automated scanning tools that impact availability

## Severity Classification

**Critical:** Complete system compromise, fund loss, remote code execution (24-48 hour fix)

**High:** Significant data breach, unauthorized access, payment bypass (1 week fix)

**Medium:** Limited data exposure, privilege escalation (2 week fix)

**Low:** Minor security issues, configuration problems (1 month fix)

## Security Best Practices

**For Users:**
- Never share private keys or seed phrases
- Verify transaction details before signing
- Use hardware wallets for significant amounts
- Keep wallet software updated

**For Developers:**
- Follow Anchor security best practices
- Validate all inputs
- Never commit private keys
- Use environment variables for secrets
- Rotate keys regularly
- Use separate keys for devnet/mainnet

## Rewards & Recognition

While we don't currently offer monetary rewards, we provide:
- Public acknowledgment in security advisories (with permission)
- Security hall of fame recognition
- Early access to security patches
- Special thanks for significant contributions

## Program Information

- **Program ID:** `12wpFdqZm2bwCUNSiqB8UJTwRJFkevU5vUuE8XxhpHE1`
- **Network:** Devnet (testing), Mainnet-beta (production)
- **Repository:** https://github.com/mitgajera/x402-ai
- **Security Email:** `gajeramit180@gmail.com`
- **PGP Key:** Available upon request

## Security Resources

- [Anchor Security Best Practices](https://www.anchor-lang.com/docs/security)
- [Solana Security Guidelines](https://docs.solana.com/developing/programming-model/security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Common Solana Vulnerabilities](https://github.com/coral-xyz/sealevel-attacks)

## Legal & Safe Harbor

We provide safe harbor for security researchers who:
- Act in good faith
- Follow responsible disclosure practices
- Comply with this security policy
- Don't access/modify data beyond what's necessary to demonstrate the vulnerability

Security researchers acting in accordance with this policy will not face legal action from us.

## Questions?

Contact us at `gajeramit180@gmail.com` with subject line `[SECURITY QUESTION]`.

---

**Thank you for helping keep x402-ai-gateway and its users safe!**

*Last Updated: 2024*
