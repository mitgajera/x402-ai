type SupportedModelId = 'gpt-5.1' | 'gemini-1.5-pro' | 'perplexity-sonar-small-online' | 'claude-3.5-sonnet'

export type X402ModelConfig = {
  id: SupportedModelId
  label: string
  provider: 'openai' | 'google' | 'perplexity' | 'anthropic'
  priceUsd: number
}

export const X402_MODELS: X402ModelConfig[] = [
  {
    id: 'gpt-5.1',
    label: 'GPT‑5.1 (OpenAI)',
    provider: 'openai',
    priceUsd: 0.05,
  },
  {
    id: 'gemini-1.5-pro',
    label: 'Gemini 1.5 Pro (Google)',
    provider: 'google',
    priceUsd: 0.045,
  },
  {
    id: 'perplexity-sonar-small-online',
    label: 'Perplexity Sonar Small Online',
    provider: 'perplexity',
    priceUsd: 0.02,
  },
  {
    id: 'claude-3.5-sonnet',
    label: 'Claude 3.5 Sonnet (Anthropic)',
    provider: 'anthropic',
    priceUsd: 0.06,
  },
]

export type X402CompletionParams = {
  prompt: string
  modelId: SupportedModelId
}

export type X402CompletionResponse = {
  output: string
  modelId: string
  usage?: {
    inputTokens?: number
    outputTokens?: number
  }
}

export type X402PaymentRequirements = {
  /** Merchant / API wallet to receive funds (base58). */
  recipient: string
  /** Amount in native units (lamports for SOL), encoded as string for JSON safety. */
  amountLamports: string
  /** Human-readable price information for display. */
  price: {
    tokenSymbol: string
    tokenDecimals: number
    amountTokens: string
    amountUsd?: number
  }
  /** Unique replay-protection reference for this request. */
  reference: string
}

export class X402PaymentRequiredError extends Error {
  readonly paymentRequirements: X402PaymentRequirements

  constructor(paymentRequirements: X402PaymentRequirements) {
    super('Payment required for x402 request')
    this.name = 'X402PaymentRequiredError'
    this.paymentRequirements = paymentRequirements
  }
}

type X402ClientOptions = {
  /** Backend x402 endpoint, e.g. `/api/ai` or full URL. */
  endpoint: string
  /** Solana client for transaction construction */
  solanaClient?: {
    rpc: {
      getLatestBlockhash: (args: { commitment?: string }) => Promise<{ value: { blockhash: string; lastValidBlockHeight: bigint } }>
    }
  }
  /** Transaction signer function */
  signAndSendTransaction?: (transaction: unknown) => Promise<string>
}

/**
 * Enhanced client-side SDK implementing the full x402 HTTP 402 flow with automatic payment.
 *
 * 1. First request → expect HTTP 402 + `X402PaymentRequirements`.
 * 2. Construct Solana payment transaction.
 * 3. Sign and send transaction.
 * 4. Retry request with `X-PAYMENT` header containing payment proof.
 * 5. Return AI completion response.
 */
export class X402AIClient {
  private readonly endpoint: string
  private readonly solanaClient?: X402ClientOptions['solanaClient']
  private readonly signAndSendTransaction?: X402ClientOptions['signAndSendTransaction']

  constructor(options: X402ClientOptions) {
    this.endpoint = options.endpoint
    this.solanaClient = options.solanaClient
    this.signAndSendTransaction = options.signAndSendTransaction
  }

  /**
   * Get payment requirements without making payment (for manual flow).
   */
  async getPaymentRequirements(params: X402CompletionParams): Promise<X402PaymentRequirements> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })

    if (response.status === 402) {
      const json = (await response.json()) as { paymentRequirements: X402PaymentRequirements }
      return json.paymentRequirements
    }

    if (response.ok) {
      throw new Error('Payment not required - request succeeded without payment')
    }

    const text = await response.text()
    throw new Error(`x402 request failed: ${response.status} ${text}`)
  }

  /**
   * Complete AI request with automatic payment handling.
   * If payment is required, it will be handled automatically.
   */
  async completion(params: X402CompletionParams): Promise<X402CompletionResponse> {
    const first = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })

    if (first.ok) {
      return (await first.json()) as X402CompletionResponse
    }

    if (first.status !== 402) {
      const text = await first.text()
      throw new Error(`x402 request failed: ${first.status} ${text}`)
    }

    const json = (await first.json()) as { paymentRequirements: X402PaymentRequirements }
    const { paymentRequirements } = json

    // If no payment handler provided, throw error for manual handling
    if (!this.solanaClient || !this.signAndSendTransaction) {
      throw new X402PaymentRequiredError(paymentRequirements)
    }

    // Automatic payment flow
    try {
      // Construct and send payment transaction
      const txSignature = await this.sendPayment(paymentRequirements)
      
      // Retry request with payment proof
      const retry = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-PAYMENT': JSON.stringify({
            txSignature,
            reference: paymentRequirements.reference,
          }),
        },
        body: JSON.stringify(params),
      })

      if (!retry.ok) {
        const text = await retry.text()
        throw new Error(`x402 request failed after payment: ${retry.status} ${text}`)
      }

      return (await retry.json()) as X402CompletionResponse
    } catch (error) {
      if (error instanceof X402PaymentRequiredError) {
        throw error
      }
      throw new Error(`Payment failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Send payment transaction on Solana.
   * This is a simplified version - in production, use proper transaction construction.
   */
  private async sendPayment(requirements: X402PaymentRequirements): Promise<string> {
    if (!this.solanaClient || !this.signAndSendTransaction) {
      throw new Error('Solana client or signer not configured')
    }

    // Get latest blockhash
    const { value: blockhash } = await this.solanaClient.rpc.getLatestBlockhash({ commitment: 'confirmed' })

    // Construct transfer instruction (simplified - use gill's getTransferSolInstruction in production)
    // For now, we'll create a minimal transaction structure
    const transaction = {
      version: 0 as const,
      feePayer: null as unknown, // Will be set by signer
      instructions: [
        {
          programAddress: '11111111111111111111111111111111' as string,
          accounts: [
            { address: null as unknown, role: 'writableSigner' },
            { address: requirements.recipient, role: 'writable' },
          ],
          data: new Uint8Array(), // Simplified - actual transfer instruction data needed
        },
      ],
      latestBlockhash: blockhash.blockhash,
    }

    // Sign and send (this is a placeholder - actual implementation depends on your wallet adapter)
    const signature = await this.signAndSendTransaction(transaction)
    return signature
  }
}


