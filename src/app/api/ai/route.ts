import { NextRequest, NextResponse } from 'next/server'
import { X402_MODELS } from '@/lib/x402-client'
import { Connection } from '@solana/web3.js'
import { PythHttpClient, getPythProgramKeyForCluster } from '@pythnetwork/client'

// Mock merchant wallet - in production, use env var
const MERCHANT_WALLET = process.env.MERCHANT_WALLET || '11111111111111111111111111111111'

// SOL price cache (5 minute TTL)
let solPriceCache: { price: number; timestamp: number } | null = null
const PRICE_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Fetch real-time SOL price from Pyth Network via Helius RPC
 */
async function getSolPriceUsd(): Promise<number> {
  // Check cache first
  if (solPriceCache && Date.now() - solPriceCache.timestamp < PRICE_CACHE_TTL) {
    return solPriceCache.price
  }

  const heliusApiKey = process.env.HELIUS_RPC_API_KEY
  const cluster = process.env.SOLANA_CLUSTER || 'mainnet-beta'

  if (!heliusApiKey) {
    console.warn('HELIUS_RPC_API_KEY not configured, using fallback price')
    // Use cached price if available, even if expired
    if (solPriceCache) {
      return solPriceCache.price
    }
    return 150 // Fallback price
  }

  try {
    const clusterName = (cluster as 'mainnet-beta' | 'devnet' | 'testnet') ?? 'mainnet-beta'

    if (clusterName !== 'mainnet-beta') {
      console.warn(
        `SOL price feed is only available on mainnet-beta. Overriding cluster '${clusterName}' with 'mainnet-beta' for price lookup.`,
      )
    }

    const heliusRpc = `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`
    const connection = new Connection(heliusRpc, 'confirmed')
    const pythProgramKey = getPythProgramKeyForCluster('mainnet-beta')
    const pythClient = new PythHttpClient(connection, pythProgramKey)

    const data = await pythClient.getData()

    // Find a SOL/USD product either by exact symbol or by metadata
    const entry =
      Array.from(data.productPrice.entries()).find(([symbol]) => symbol.toUpperCase().includes('SOL/USD')) ??
      Array.from(data.productPrice.entries()).find(([symbol]) => {
        const product = data.productFromSymbol.get(symbol)
        const base = product?.base || product?.['base']
        const quote = product?.quote || product?.['quote']
        return base?.toUpperCase() === 'SOL' && (quote?.toUpperCase() === 'USD' || quote?.toUpperCase() === 'USDC')
      })

    const priceData = entry?.[1]

    if (!priceData) {
      throw new Error('Could not fetch SOL price from Pyth (no matching product)')
    }

    const exponent = priceData.exponent
    const rawPrice = priceData.price ?? priceData.aggregate?.price ?? priceData.previousPrice ?? undefined

    if (rawPrice === undefined || exponent === undefined) {
      throw new Error('Could not fetch SOL price from Pyth')
    }

    const price = rawPrice * Math.pow(10, exponent)

    if (isNaN(price) || price <= 0) {
      throw new Error('Invalid price value received from Pyth')
    }

    solPriceCache = { price, timestamp: Date.now() }

    return price
  } catch (error) {
    console.error('Failed to fetch SOL price from Pyth via Helius:', error)

    // Use cached price if available, even if expired
    if (solPriceCache) {
      console.warn('Using cached SOL price due to fetch error')
      return solPriceCache.price
    }

    // Fallback to default
    console.warn('Using fallback SOL price')
    return 150
  }
}

type AIRequest = {
  prompt: string
  modelId: string
}

export async function POST(request: NextRequest) {
  try {
    const body: AIRequest = await request.json()
    const { prompt, modelId } = body

    // Check for X-PAYMENT header (payment proof)
    const paymentHeader = request.headers.get('X-PAYMENT')
    
    if (!paymentHeader) {
      // Return 402 Payment Required
      const model = X402_MODELS.find((m) => m.id === modelId) || X402_MODELS[0]
      const priceUsd = model.priceUsd
      
      // Fetch real SOL price from RPC
      const solPriceUsd = await getSolPriceUsd()
      const priceSol = priceUsd / solPriceUsd
      const amountLamports = Math.round(priceSol * 1_000_000_000) // Convert to lamports
      
      // Generate unique reference for replay protection
      const reference = `${Date.now()}-${Math.random().toString(36).substring(7)}`

      return NextResponse.json(
        {
          paymentRequirements: {
            recipient: MERCHANT_WALLET,
            amountLamports: amountLamports.toString(),
            price: {
              tokenSymbol: 'SOL',
              tokenDecimals: 9,
              amountTokens: priceSol.toFixed(9),
              amountUsd: priceUsd,
            },
            reference,
          },
        },
        { status: 402 }
      )
    }

    // Payment proof provided - verify and process
    const paymentProof = JSON.parse(paymentHeader)
    const { txSignature, reference } = paymentProof

    // TODO: Verify transaction on Solana RPC
    // For now, we'll trust the payment proof and proceed
    
    // Route to appropriate LLM provider
    const model = X402_MODELS.find((m) => m.id === modelId) || X402_MODELS[0]
    
    let output = ''
    let usage = { inputTokens: 0, outputTokens: 0 }
    
    // Call appropriate LLM provider
    switch (model.provider) {
      case 'openai': {
        const apiKey = process.env.OPENAI_API_KEY
        if (!apiKey) {
          throw new Error('OPENAI_API_KEY not configured')
        }
        // TODO: Implement OpenAI API call
        // For now, return mock response
        output = `[OpenAI ${modelId} Response]\n\n${prompt}\n\nThis is a mock response. Configure OPENAI_API_KEY to enable real API calls.`
        usage = { inputTokens: Math.ceil(prompt.length / 4), outputTokens: Math.ceil(output.length / 4) }
        break
      }
      case 'anthropic': {
        const apiKey = process.env.ANTHROPIC_API_KEY
        if (!apiKey) {
          throw new Error('ANTHROPIC_API_KEY not configured')
        }
        // TODO: Implement Anthropic API call
        // For now, return mock response
        output = `[Claude ${modelId} Response]\n\n${prompt}\n\nThis is a mock response. Configure ANTHROPIC_API_KEY to enable real API calls.`
        usage = { inputTokens: Math.ceil(prompt.length / 4), outputTokens: Math.ceil(output.length / 4) }
        break
      }
      case 'google': {
        const apiKey = process.env.GOOGLE_API_KEY
        if (!apiKey) {
          throw new Error('GOOGLE_API_KEY not configured')
        }
        // TODO: Implement Google Gemini API call
        // For now, return mock response
        output = `[Gemini ${modelId} Response]\n\n${prompt}\n\nThis is a mock response. Configure GOOGLE_API_KEY to enable real API calls.`
        usage = { inputTokens: Math.ceil(prompt.length / 4), outputTokens: Math.ceil(output.length / 4) }
        break
      }
      case 'perplexity': {
        const apiKey = process.env.PERPLEXITY_API_KEY
        if (!apiKey) {
          throw new Error('PERPLEXITY_API_KEY not configured')
        }
        // TODO: Implement Perplexity API call
        // For now, return mock response
        output = `[Perplexity ${modelId} Response]\n\n${prompt}\n\nThis is a mock response. Configure PERPLEXITY_API_KEY to enable real API calls.`
        usage = { inputTokens: Math.ceil(prompt.length / 4), outputTokens: Math.ceil(output.length / 4) }
        break
      }
      default:
        throw new Error(`Unknown provider: ${model.provider}`)
    }

    // TODO: Optionally record receipt on-chain via Anchor program

    return NextResponse.json({
      output,
      modelId,
      usage,
    })
  } catch (error) {
    console.error('AI API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

