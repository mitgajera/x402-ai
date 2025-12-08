# x402 AI Gateway

A production-ready micropayment gateway that implements HTTP 402 (Payment Required) to monetize access to AI inference services. Users pay micro-amounts in SOL to query multiple LLM providers (OpenAI, Google, Anthropic, Perplexity) with automatic on-chain receipt recording.

## Overview

x402 AI Gateway enables trustless, pay-per-request AI inference with secure Solana micropayments. Each AI request requires a small SOL payment verified on-chain before processing. Payment receipts are automatically recorded on Solana using an Anchor program for full auditability and transparency.

## Features

- **Multi-LLM Support**: Access to GPT-4o, Gemini 2.5 Flash Lite, Claude 3.5 Sonnet, and Perplexity Sonar
- **Automatic Payments**: Seamless Solana payment handling via x402 protocol
- **On-Chain Receipts**: All payments recorded on Solana using Anchor program
- **Real-Time Pricing**: Dynamic SOL price calculation using Pyth Network (mainnet) or CoinGecko (devnet)
- **Automatic Refunds**: Failed AI requests trigger automatic refunds to protect users
- **Universal Wallet Support**: Works with all major Solana wallets (Phantom, Solflare, Backpack, etc.)
- **Chat Interface**: Modern, GPT-like chat interface with persistent history
- **Payment Verification**: On-chain transaction verification before processing

## How It Works

```
User Request → HTTP 402 Payment Required → User Pays SOL → Transaction Verified → AI Response
```

1. User sends a message to the AI gateway
2. Gateway returns HTTP 402 with payment requirements (amount in SOL based on model)
3. Client builds and signs Solana transaction (payment + receipt recording)
4. Gateway verifies transaction on-chain via Solana RPC
5. Gateway processes AI request and returns response
6. If AI service fails, automatic refund is processed

## Prerequisites

- Node.js 18+ and npm
- Solana wallet (Phantom, Solflare, Backpack, or compatible)
- At least one LLM provider API key
- Helius RPC API key (optional, for mainnet real-time pricing)

## Installation

```bash
# Clone the repository
git clone https://github.com/mitgajera/x402-ai.git
cd x402-ai-gateway

# Install dependencies
npm install
```

## Configuration

Create a `.env.local` file in the root directory:

## Running the Application

### Development

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Production Build

```bash
npm run build
npm start
```

## Usage

### Web Interface

1. **Connect Wallet**: Click the wallet dropdown and connect your Solana wallet
2. **Select Network**: Choose devnet for testing or mainnet for production
3. **Choose Model**: Select an AI model from the dropdown (prices shown per model)
4. **Send Message**: Type your message and send - you'll be prompted to approve the payment transaction
5. **View History**: Access previous conversations using the "Load Previous Messages" button

### API Usage

#### 1. Request AI Completion (No Payment)

```bash
POST /api/ai
Content-Type: application/json

{
  "prompt": "Explain quantum computing",
  "modelId": "gpt-4o"
}
```

**Response (402 Payment Required):**

```json
{
  "paymentRequirements": {
    "recipient": "MERCHANT_WALLET_ADDRESS",
    "amountLamports": "50000000",
    "price": {
      "tokenSymbol": "SOL",
      "tokenDecimals": 9,
      "amountTokens": "0.050000000",
      "amountUsd": 0.05
    },
    "reference": "1731523200000-abc123"
  }
}
```

#### 2. Request with Payment Proof

```bash
POST /api/ai
Content-Type: application/json
X-PAYMENT: {"txSignature":"5xK3...","reference":"1731523200000-abc123"}

{
  "prompt": "Explain quantum computing",
  "modelId": "gpt-4o"
}
```

**Response (200 Success):**

```json
{
  "output": "Quantum computing uses quantum mechanical phenomena...",
  "modelId": "gpt-4o",
  "usage": {
    "inputTokens": 10,
    "outputTokens": 150
  }
}
```

## Architecture

### System Overview

The x402 AI Gateway follows a three-tier architecture: **Frontend (Client)**, **Backend (API Gateway)**, and **Blockchain (Solana)**. The system implements the HTTP 402 Payment Required protocol to enforce payment before AI inference.

```
┌─────────────────┐
│   Frontend      │
│  (Next.js App)  │
│                 │
│  - Chat UI      │
│  - Wallet Conn  │
│  - Tx Builder   │
└────────┬────────┘
         │
         │ HTTP 402 Protocol
         │
┌────────▼─────────────────────────┐
│   Backend API Gateway            │
│   (/api/ai)                      │
│                                  │
│  - Payment Verification          │
│  - Price Oracle                  │
│  - LLM Router                    │
│  - Refund Handler                │
└────────┬─────────────────────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐  ┌──▼──────────┐
│Solana │  │ LLM APIs    │
│Block- │  │             │
│chain  │  │ - OpenAI    │
│       │  │ - Google    │
│       │  │ - Anthropic │
│       │  │ - Perplexity│
└───────┘  └─────────────┘
```

### Component Architecture

#### Frontend Layer

**Location**: `src/features/dashboard/` and `src/components/`

- **Chat Interface** (`chat-interface.tsx`): Main user interface for AI interactions
  - Message display and input handling
  - Wallet connection management
  - Transaction building and signing
  - Chat history management

- **Wallet Integration** (`solana/`): Universal wallet support
  - @wallet-ui/react for multi-wallet compatibility
  - Transaction signing abstraction
  - Network selection (devnet/mainnet)

- **UI Components** (`components/ui/`): Shadcn-based design system
  - Reusable UI primitives
  - Consistent styling with Tailwind CSS

#### Backend Layer

**Location**: `src/app/api/ai/route.ts`

- **API Gateway** (`/api/ai`): Main entry point for AI requests
  - HTTP 402 Payment Required enforcement
  - Payment verification via Solana RPC
  - LLM provider routing
  - Error handling and refund processing

- **Payment Verification** (`verify.ts` logic):
  - Transaction signature validation
  - On-chain transaction confirmation
  - Reference string validation (replay protection)
  - Balance verification

- **Price Oracle**:
  - **Mainnet**: Pyth Network via Helius RPC for real-time SOL/USD prices
  - **Devnet**: CoinGecko API fallback
  - 5-minute price caching to reduce API calls

- **LLM Router**:
  - Routes requests to appropriate provider based on `modelId`
  - Handles provider-specific API formats
  - Token usage tracking

- **Refund System**:
  - Automatic refund on AI service failure
  - Merchant wallet balance verification
  - Refund transaction broadcasting
  - Status reporting to client

#### Blockchain Layer

**Location**: `x402_receipts/programs/x402_receipts/`

- **Anchor Program** (`x402_receipts`):
  - **Program ID**: `12wpFdqZm2bwCUNSiqB8UJTwRJFkevU5vUuE8XxhpHE1`
  - **Instruction**: `record_receipt`
  - **Accounts**: Receipt PDA, Payer, Merchant, System Program
  - **Features**:
    - PDA-based receipt storage (deterministic addresses)
    - Replay protection via unique reference strings
    - Immutable payment records on-chain

### Payment Flow Architecture

```
1. User Request
   │
   ├─► Frontend sends POST /api/ai
   │
2. Payment Required (402)
   │
   ├─► Backend calculates SOL amount from USD price
   ├─► Returns payment requirements with reference
   │
3. Transaction Building
   │
   ├─► Frontend builds Solana transaction:
   │   ├─► SystemProgram.transfer (payment)
   │   └─► record_receipt instruction (on-chain receipt)
   │
4. Transaction Signing
   │
   ├─► User approves in wallet
   ├─► Transaction signed and broadcast
   │
5. Payment Verification
   │
   ├─► Backend verifies transaction on-chain
   ├─► Checks reference for replay protection
   ├─► Validates payment amount
   │
6. AI Processing
   │
   ├─► Backend routes to LLM provider
   ├─► Returns AI response
   │
7. Error Handling (if AI fails)
   │
   ├─► Backend detects failure
   ├─► Builds refund transaction
   ├─► Processes automatic refund
   └─► Returns error with refund status
```

### Integration Details

#### Solana Integration

- **RPC Connection**: Helius RPC (mainnet) or public RPC (devnet)
- **Transaction Verification**: On-chain confirmation before processing
- **Network Support**: Devnet (testing), Mainnet-beta (production)
- **Wallet Compatibility**: All Wallet Standard compatible wallets

#### LLM Provider Integration

- **OpenAI**: GPT-4o model via `/v1/chat/completions` endpoint
- **Google**: Gemini 2.5 Flash Lite via Google AI API
- **Anthropic**: Claude 3.5 Sonnet via Anthropic Messages API
- **Perplexity**: Sonar model via Perplexity API

#### Price Oracle Integration

- **Pyth Network** (Mainnet): Real-time SOL/USD price feeds via Helius RPC
- **CoinGecko** (Devnet/Fallback): Public API for price data
- **Caching**: 5-minute TTL to reduce API calls and improve performance

### Data Flow

1. **Request Flow**:
   - Client → API Gateway → Payment Check → LLM Provider → Response

2. **Payment Flow**:
   - Client → Wallet → Solana Network → Verification → Processing

3. **Receipt Flow**:
   - Transaction → Anchor Program → PDA Account → On-Chain Storage

4. **Refund Flow** (on failure):
   - Error Detection → Refund Transaction → Merchant Wallet → User Wallet

## Project Structure

```
x402-ai-gateway/
├── src/
│   ├── app/
│   │   └── api/
│   │       └── ai/              # AI inference API endpoint
│   ├── components/               # React components
│   │   ├── chat/                # Chat UI components
│   │   ├── solana/              # Solana wallet integration
│   │   └── ui/                  # Shadcn UI components
│   ├── features/
│   │   └── dashboard/           # Main chat interface
│   └── lib/                     # Utilities and helpers
│       ├── x402-client.ts       # x402 protocol client
│       ├── x402-receipts-instruction.ts  # Anchor instruction builder
│       └── chat-history.ts     # Chat history management
├── x402_receipts/               # Anchor program for receipts
│   └── programs/
│       └── x402_receipts/       # Solana program source (Rust)
│           └── src/
│               └── lib.rs       # Receipt recording instruction
├── public/                      # Static assets
└── .env.local                   # Environment configuration
```

## Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run format       # Format code with Prettier
npm run format:check # Check code formatting
```

### Anchor Program Development

The Solana program is located in `x402_receipts/`. To work with it:

```bash
cd x402_receipts
anchor build         # Build the program
anchor deploy        # Deploy to configured cluster
anchor test          # Run tests
```

## Security

Security is a top priority. Please review our [Security Policy](SECURITY.md) before reporting vulnerabilities.

**Important Security Notes:**
- Never commit private keys or API keys to the repository
- Use environment variables for all sensitive configuration
- Keep `MERCHANT_PRIVATE_KEY` secure and never expose to client-side code
- Test on devnet before deploying to mainnet
- Verify all transactions before signing

## Contributing

Contributions are welcome! Please read our [Security Policy](SECURITY.md) before submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Security Issues**: See [SECURITY.md](SECURITY.md)
- **General Questions**: Open an issue on GitHub
- **Program ID**: `12wpFdqZm2bwCUNSiqB8UJTwRJFkevU5vUuE8XxhpHE1`

## Links

- **Solana Explorer**: https://solscan.io
- **Anchor Framework**: https://www.anchor-lang.com
- **Pyth Network**: https://pyth.network
- **Helius RPC**: https://www.helius.dev

---

**Built with**: Next.js, React, Solana, Anchor, TypeScript, Tailwind CSS
