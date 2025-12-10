type SupportedModelId = 'gpt-4o' | 'gemini-2.5-flash-lite' | 'sonar-pro' | 'claude-3.5-sonnet' | 'grok-beta' | 'deepseek-chat'

export type X402ModelConfig = {
  id: SupportedModelId
  label: string
  provider: 'openai' | 'google' | 'perplexity' | 'anthropic' | 'xai' | 'deepseek'
  priceUsd: number
}

export const X402_MODELS: X402ModelConfig[] = [
  {
    id: 'gemini-2.5-flash-lite',
    label: 'Gemini 2.5 Flash Lite (Google)',
    provider: 'google',
    priceUsd: 0.045,
  },
  {
    id: 'gpt-4o',
    label: 'GPT‑4o (OpenAI)',
    provider: 'openai',
    priceUsd: 0.05,
  },
  {
    id: 'sonar-pro',
    label: 'Perplexity Sonar-Pro',
    provider: 'perplexity',
    priceUsd: 0.02,
  },
  {
    id: 'claude-3.5-sonnet',
    label: 'Claude 3.5 Sonnet (Anthropic)',
    provider: 'anthropic',
    priceUsd: 0.06,
  },
  {
    id: 'grok-beta',
    label: 'Grok Beta (xAI)',
    provider: 'xai',
    priceUsd: 0.04,
  },
  {
    id: 'deepseek-chat',
    label: 'DeepSeek Chat',
    provider: 'deepseek',
    priceUsd: 0.03,
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

export class X402AIClient {
  private readonly endpoint: string

  constructor(options: X402ClientOptions) {
    this.endpoint = options.endpoint
  }


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

    // Better error parsing: prefer JSON { error } payload when available
    let errMsg = `Request failed: ${response.status}`
    try {
      const body = await response.json().catch(() => null)
      if (body && typeof body === 'object') {
        if ('error' in body && body.error) {
          errMsg = String((body as { error: unknown }).error)
        } else {
          errMsg = JSON.stringify(body)
        }
      } else {
        const text = await response.text().catch(() => '')
        if (text) errMsg = text
      }
    } catch {
      /* fallback to status message */
    }
    throw new Error(errMsg)
  }

  async completion(params: X402CompletionParams, onChunk?: (chunk: string) => void): Promise<X402CompletionResponse> {
    // Always enable streaming to avoid exposing full responses in network tab
    const first = await fetch(this.endpoint, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-STREAM': 'true', // Always enable streaming
      },
      body: JSON.stringify(params),
    })

    // Handle streaming response (always enabled)
    if (first.headers.get('content-type')?.includes('text/event-stream')) {
      const reader = first.body?.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullOutput = ''
      let modelId = params.modelId
      let usage = { inputTokens: 0, outputTokens: 0 }

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6))
                if (data.type === 'start') {
                  modelId = data.modelId || params.modelId
                } else if (data.type === 'chunk') {
                  fullOutput += data.content
                  // Call onChunk if provided
                  if (onChunk) {
                    onChunk(data.content)
                  }
                } else if (data.type === 'done') {
                  usage = data.usage || usage
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
      }

      return {
        output: fullOutput,
        modelId,
        usage,
      }
    }

    if (first.ok) {
      return (await first.json()) as X402CompletionResponse
    }

    if (first.status !== 402) {
      // parse server error payload for better UX
      let errMsg = `Request failed: ${first.status}`
      try {
        const body = await first.json().catch(() => null)
        if (body && typeof body === 'object' && 'error' in body && body.error) {
          errMsg = String((body as { error: unknown }).error)
        } else {
          const text = await first.text().catch(() => '')
          if (text) errMsg = text
        }
      } catch {
        /* fallback */
      }
      throw new Error(errMsg)
    }

    const json = (await first.json()) as { paymentRequirements: X402PaymentRequirements }
    const { paymentRequirements } = json

    // Always throw payment required error - payment is handled by the caller
    throw new X402PaymentRequiredError(paymentRequirements)
  }

}


