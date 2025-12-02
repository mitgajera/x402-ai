type SupportedModelId = 'gpt-4.1' | 'gemini-1.5-pro' | 'perplexity-sonar-small-online' | 'claude-3.5-sonnet'

export type X402ModelConfig = {
  id: SupportedModelId
  label: string
  provider: 'openai' | 'google' | 'perplexity' | 'anthropic'
  priceUsd: number
}

export const X402_MODELS: X402ModelConfig[] = [
  {
    id: 'gpt-4.1',
    label: 'GPT‑4.1 (OpenAI)',
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
}

/**
 * Thin client-side SDK implementing the x402 HTTP 402 flow.
 *
 * 1. First request → expect HTTP 402 + `X402PaymentRequirements`.
 * 2. Surface `X402PaymentRequiredError` with on-chain payment requirements.
 * 3. Callers are responsible for constructing + sending the transaction and retrying with `X-PAYMENT` proof.
 */
export class X402AIClient {
  private readonly endpoint: string

  constructor(options: X402ClientOptions) {
    this.endpoint = options.endpoint
  }

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

    throw new X402PaymentRequiredError(paymentRequirements)
  }
}


