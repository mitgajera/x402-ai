# x402-ai-gateway

Solana-powered, pay-per-request AI inference gateway using the x402 HTTP 402 Payment Required protocol.

## Features

- 🚀 GPT-like chat interface
- 💰 Automatic Solana payment handling via x402 protocol
- 💾 Wallet-based chat history persistence
- 🤖 Multi-LLM support (GPT, Gemini, Perplexity, Claude)
- 📱 Modern UI with Tailwind and Shadcn

## Getting Started

### Installation

```shell
npm install
```

### Environment Variables

Create a `.env.local` file in the root directory with the following variables:

#### Solana Configuration

```env
# Helius RPC API Key (for fetching real-time SOL price via Pyth Network)
# Get your key from: https://www.helius.dev/
HELIUS_RPC_API_KEY=

# Solana cluster (mainnet-beta, devnet, or testnet)
# Defaults to mainnet-beta if not specified
SOLANA_CLUSTER=mainnet-beta

# Solana RPC endpoint for transaction verification (optional, uses Helius if not set)
# Example: https://api.mainnet-beta.solana.com (mainnet)
# Example: https://api.devnet.solana.com (devnet)
SOLANA_RPC_URL=

# Merchant wallet address (receives x402 payments)
MERCHANT_WALLET=
```

#### LLM API Keys

```env
# OpenAI API Key (for GPT models)
# Get from: https://platform.openai.com/api-keys
OPENAI_API_KEY=

# Anthropic API Key (for Claude models)
# Get from: https://console.anthropic.com/
ANTHROPIC_API_KEY=

# Google API Key (for Gemini models)
# Get from: https://makersuite.google.com/app/apikey
GOOGLE_API_KEY=

# Perplexity API Key (for Perplexity models)
# Get from: https://www.perplexity.ai/settings/api
PERPLEXITY_API_KEY=
```

#### Optional Configuration

```env
# Custom x402 API endpoint (defaults to /api/ai)
# NEXT_PUBLIC_X402_ENDPOINT=/api/ai
```

### Start the app

```shell
npm run dev
```

The app will be available at `http://localhost:3000`