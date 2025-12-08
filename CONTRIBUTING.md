# Contributing to x402 AI Gateway

Thank you for your interest in contributing to x402 AI Gateway! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md).

## How to Contribute

### Reporting Bugs

If you find a bug, please open an issue with:

- A clear, descriptive title
- Steps to reproduce the issue
- Expected behavior vs actual behavior
- Environment details (OS, Node.js version, wallet type, Solana cluster)
- Error messages or logs (if applicable)
- Screenshots (if relevant)

### Suggesting Features

Feature suggestions are welcome! Please open an issue with:

- A clear description of the feature
- Use cases and benefits
- Potential implementation approach (if you have ideas)

### Pull Requests

1. **Fork the repository** and create a branch from `main`
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow the existing code style
   - Write clear, concise commit messages
   - Add tests if applicable
   - Update documentation as needed

3. **Test your changes**
   ```bash
   npm run build
   npm run lint
   ```

4. **Submit a pull request**
   - Provide a clear description of changes
   - Reference any related issues
   - Ensure all checks pass

## Development Setup

### Prerequisites

- Node.js 18+ and npm
- Rust and Anchor (for Anchor program development)
- Solana CLI tools

### Getting Started

```bash
# Clone your fork
git clone https://github.com/your-username/x402-ai-gateway.git
cd x402-ai-gateway

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your API keys

# Run development server
npm run dev
```

### Project Structure

```
x402-ai-gateway/
├── src/
│   ├── app/              # Next.js app router
│   ├── components/       # React components
│   ├── features/         # Feature modules
│   └── lib/              # Utility functions
├── x402_receipts/        # Anchor program
└── public/               # Static assets
```

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Avoid `any` types; use proper types or `unknown`
- Follow existing naming conventions
- Use meaningful variable and function names

### React/Next.js

- Use functional components with hooks
- Follow Next.js 13+ App Router conventions
- Use `'use client'` directive only when necessary
- Prefer server components when possible

### Solana/Anchor

- Follow Solana best practices for transaction building
- Use proper error handling for wallet interactions
- Include transaction fee calculations
- Handle network errors gracefully

### Code Style

- Use 2 spaces for indentation
- Use single quotes for strings
- Add trailing commas in multi-line objects/arrays
- Keep functions focused and small
- Add comments for complex logic

## Commit Messages

Use clear, descriptive commit messages:

```
feat: add support for new LLM provider
fix: resolve payment verification timeout
docs: update API documentation
refactor: simplify transaction building logic
test: add tests for refund mechanism
```

## Testing

- Test your changes with different wallets (Phantom, Solflare, etc.)
- Test on devnet before suggesting mainnet changes
- Verify payment flows end-to-end
- Check error handling scenarios

## Security

- Never commit API keys or private keys
- Report security vulnerabilities to [security contact](SECURITY.md)
- Follow secure coding practices
- Review transaction signing logic carefully

## Questions?

If you have questions or need help:

- Open a discussion in GitHub Discussions
- Check existing issues and pull requests
- Review the [README](README.md) for project overview

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

