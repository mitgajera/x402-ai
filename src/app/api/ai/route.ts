import { NextRequest, NextResponse } from 'next/server'
import { X402_MODELS } from '@/lib/x402-client'
import { Connection, PublicKey, Transaction, SystemProgram, Keypair, sendAndConfirmTransaction } from '@solana/web3.js'
import { PythHttpClient, getPythProgramKeyForCluster } from '@pythnetwork/client'
import { X402_RECEIPTS_PROGRAM_ID } from '@/lib/x402-receipts-idl'
import { logger } from '@/lib/logger'
import bs58 from 'bs58'

// Merchant wallet - use env var or generate a devnet wallet for testing
// For devnet testing, we'll use a known devnet wallet if MERCHANT_WALLET is not set
const MERCHANT_WALLET = process.env.MERCHANT_WALLET  // Devnet test wallet

// SOL price cache (5 minute TTL)
let solPriceCache: { price: number; timestamp: number } | null = null
const PRICE_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

async function getSolPriceUsd(): Promise<number> {
  // Check cache first
  if (solPriceCache && Date.now() - solPriceCache.timestamp < PRICE_CACHE_TTL) {
    return solPriceCache.price
  }

  try {
    const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd')
    if (res.ok) {
      const data = await res.json()
      const cgPrice = Number(data?.solana?.usd)
      if (!isNaN(cgPrice) && cgPrice > 0) {
        solPriceCache = { price: cgPrice, timestamp: Date.now() }
        return cgPrice
      }
    }
  } catch {
    logger.warn('CoinGecko price lookup failed')
  }

  const heliusApiKey = process.env.HELIUS_RPC_API_KEY
  if (!heliusApiKey) {
    logger.warn('HELIUS_RPC_API_KEY not configured, using fallback price')
    if (solPriceCache) return solPriceCache.price
    return 150 
  }

  const cluster = process.env.NEXT_PUBLIC_SOLANA_CLUSTER
  const isDevnet = cluster === 'devnet' || cluster === 'testnet'
  
  // For devnet, skip Pyth and use CoinGecko price (already fetched above)
  if (isDevnet) {
    if (solPriceCache) return solPriceCache.price
    return 150 // fallback USD price for devnet
  }
  
  // For mainnet, use Helius RPC with Pyth
  try {
    const heliusRpc = `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`
    const connection = new Connection(heliusRpc, 'confirmed')
    const pythProgramKey = getPythProgramKeyForCluster('mainnet-beta')
    const pythClient = new PythHttpClient(connection, pythProgramKey)

    const data = await pythClient.getData()
    const entry =
      Array.from(data.productPrice.entries()).find(([symbol]) => symbol.toUpperCase().includes('SOL/USD')) ||
      Array.from(data.productPrice.entries()).find(([symbol]) => {
        const product = data.productFromSymbol.get(symbol)
        const base = product?.base || product?.['base']
        const quote = product?.quote || product?.['quote']
        return base?.toUpperCase() === 'SOL' && (quote?.toUpperCase() === 'USD' || quote?.toUpperCase() === 'USDC')
      })

    const priceData = entry?.[1]

    // Try multiple possible fields that may contain numeric price
    const candidate =
      priceData?.price ??
      // some Pyth versions embed aggregate or other fields
      priceData?.aggregate?.price ??
      priceData?.['price'] ??
      null

    const price = Number(candidate)
    if (isNaN(price) || price <= 0) {
      throw new Error('Invalid price value received from Pyth')
    }

    solPriceCache = { price, timestamp: Date.now() }
    return price
  } catch {
    logger.error('Failed to fetch SOL price from all sources')
    if (solPriceCache) return solPriceCache.price
    return 150
  }
}

type AIRequest = {
  prompt: string
  modelId: string
}

export async function POST(request: NextRequest) {
  const paymentHeader = request.headers.get('X-PAYMENT')
  
  try {
    const body: AIRequest = await request.json()
    const { prompt, modelId } = body

    // Check for X-PAYMENT header (payment proof)
    
    if (!paymentHeader) {
      // Return 402 Payment Required
      const model = X402_MODELS.find((m) => m.id === modelId) || X402_MODELS[0]
      const priceUsd = model.priceUsd
      
      // Validate merchant wallet - cannot use system program address
      // For devnet, we allow the default test wallet
      const isSystemProgram = MERCHANT_WALLET === '11111111111111111111111111111111'
      if (isSystemProgram) {
        return NextResponse.json(
          { 
            error: 'MERCHANT_WALLET not configured. Please set MERCHANT_WALLET environment variable to a valid Solana wallet address. ' +
                   'For devnet testing, you can use the default test wallet or set your own.'
          },
          { status: 500 }
        )
      }
      
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

    // Verify transaction on Solana RPC
    try {
      const cluster = process.env.NEXT_PUBLIC_SOLANA_CLUSTER || 'devnet'

      let rpcUrl: string
      // Use server-side only environment variable
      const heliusApiKey = process.env.HELIUS_RPC_API_KEY
      
      if (heliusApiKey) {
        // Use Helius RPC for the cluster
        if (cluster === 'devnet') {
          rpcUrl = `https://devnet.helius-rpc.com/?api-key=${heliusApiKey}`
        } else if (cluster === 'testnet') {
          rpcUrl = `https://testnet.helius-rpc.com/?api-key=${heliusApiKey}`
        } else {
          rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`
        }
        logger.log(`Using Helius RPC for ${cluster}`)
      } else {
        // Fall back to public RPC
        if (cluster === 'devnet') {
          rpcUrl = 'https://api.devnet.solana.com'
        } else if (cluster === 'testnet') {
          rpcUrl = 'https://api.testnet.solana.com'
        } else {
          rpcUrl = 'https://api.mainnet-beta.solana.com'
        }
        logger.warn('HELIUS_RPC_API_KEY not configured, using public RPC')
      }
      
      // Log for debugging
      const envRpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL
      if (envRpcUrl && !heliusApiKey) {
        // Only use env RPC if Helius is not configured
        if (envRpcUrl.includes(cluster)) {
          rpcUrl = envRpcUrl
          logger.log('Using SOLANA_RPC_URL from environment')
        } else {
          logger.warn('SOLANA_RPC_URL does not match cluster')
        }
      }
      
      logger.log(`Transaction verification for ${cluster}`)
      
      const connection = new Connection(rpcUrl, 'confirmed')
      
      // First, try to get the transaction immediately (it might already be confirmed)
      // If not found, wait a bit and retry with confirmation
      logger.log('Looking up transaction:', logger.sanitize.signature(txSignature))
      
      // Try immediate lookup first
      let tx = await connection.getTransaction(txSignature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0,
      })
      
      if (tx) {
        logger.log('Transaction found immediately')
      } else {
        logger.log('Transaction not found immediately, waiting for confirmation')
        try {
          // Use Promise.race to add a timeout to confirmation
          const confirmationPromise = connection.confirmTransaction(txSignature, 'confirmed')
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Confirmation timeout')), 30000)
          )
          
          const confirmation = await Promise.race([confirmationPromise, timeoutPromise]) as Awaited<ReturnType<typeof connection.confirmTransaction>>
          
          if (confirmation.value.err) {
            throw new Error(`Transaction failed on-chain: ${JSON.stringify(confirmation.value.err)}`)
          }
          logger.log('Transaction confirmed')
          
          // Now try to get the transaction
          tx = await connection.getTransaction(txSignature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0,
          })
        } catch {
          // If confirmation times out or fails, we'll still try to get the transaction with retries
          // Sometimes the transaction is confirmed but the confirmation API times out
          logger.warn('Transaction confirmation check failed, retrying')
        }
      }
      
      // If transaction still not found, retry with exponential backoff
      // Transactions can take a few seconds to appear on RPC, especially on devnet
      if (!tx) {
        const maxRetries = 10
        const retryDelay = 1000 // Start with 1 second
        
        for (let attempt = 0; attempt < maxRetries; attempt++) {
          try {
            tx = await connection.getTransaction(txSignature, {
              commitment: 'confirmed',
              maxSupportedTransactionVersion: 0,
            })
            
            if (tx) {
              logger.log(`Transaction found on retry ${attempt + 1}`)
              break
            }
          } catch {
            logger.warn(`Transaction lookup attempt ${attempt + 1} failed`)
          }
          
          // If transaction not found, wait before retrying
          if (!tx && attempt < maxRetries - 1) {
            const delay = retryDelay * (attempt + 1) // Exponential backoff
            logger.log(`Waiting before retry ${attempt + 2}/${maxRetries}`)
            await new Promise(resolve => setTimeout(resolve, delay))
          }
        }
      }

      if (!tx) {
        // Last attempt: try with 'finalized' commitment which might be more reliable
        logger.log('Trying finalized commitment')
        try {
          tx = await connection.getTransaction(txSignature, {
            commitment: 'finalized',
            maxSupportedTransactionVersion: 0,
          })
        } catch {
          logger.warn('Finalized commitment lookup failed')
        }
      }

      if (!tx) {
        throw new Error(
          `Transaction not found on Solana after multiple attempts. ` +
          `Transaction signature: ${txSignature}. ` +
          `This usually means the transaction was never sent to the blockchain. ` +
          `Possible causes:\n` +
          `1. Wallet did not actually broadcast the transaction (check wallet)\n` +
          `2. Network mismatch (wallet RPC ≠ app network)\n` +
          `3. Transaction was rejected silently\n\n` +
          `Please check:\n` +
          `- Your wallet is on ${cluster} network\n` +
          `- Transaction appears in wallet history\n` +
          `- Try disconnecting and reconnecting wallet\n` +
          `- Check transaction on Solana Explorer: https://explorer.solana.com/tx/${txSignature}?cluster=${cluster}`
        )
      }

      if (!tx.meta || tx.meta.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(tx.meta?.err)}`)
      }

      // Verify the transaction transferred SOL to the merchant wallet
      const preBalances = tx.meta.preBalances
      const postBalances = tx.meta.postBalances
      
      // Handle both legacy and versioned transactions
      let accountKeys: string[] = []
      if ('staticAccountKeys' in tx.transaction.message) {
        // Versioned transaction
        accountKeys = tx.transaction.message.staticAccountKeys.map((key: PublicKey) => key.toString())
      } else {
        // Legacy transaction - use type assertion for legacy format
        const legacyTx = tx.transaction as { message: { accountKeys: PublicKey[] } }
        if ('accountKeys' in legacyTx.message) {
          accountKeys = legacyTx.message.accountKeys.map((key: PublicKey) => key.toString())
        }
      }

      // Find merchant wallet index
      const merchantIndex = accountKeys.findIndex(key => key === MERCHANT_WALLET)
      if (merchantIndex === -1) {
        throw new Error('Merchant wallet not found in transaction accounts')
      }

      // Check if merchant received SOL (balance increased)
      const balanceIncrease = postBalances[merchantIndex] - preBalances[merchantIndex]
      if (balanceIncrease <= 0) {
        throw new Error('Merchant wallet did not receive payment')
      }

      // Verify minimum payment amount
      const model = X402_MODELS.find((m) => m.id === modelId) || X402_MODELS[0]
      const priceUsd = model.priceUsd
      const solPriceUsd = await getSolPriceUsd()
      const expectedAmountLamports = Math.round((priceUsd / solPriceUsd) * 1_000_000_000)
      
      // Allow 5% tolerance for price fluctuations
      const minAmount = Math.floor(expectedAmountLamports * 0.95)
      if (balanceIncrease < minAmount) {
        throw new Error(`Payment amount too low: received ${balanceIncrease} lamports, expected at least ${minAmount}`)
      }

      // Verify Anchor program receipt was created
      try {
        const receiptProgramId = new PublicKey(X402_RECEIPTS_PROGRAM_ID)
        const [receiptPda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from('receipt'),
            Buffer.from(reference),
          ],
          receiptProgramId
        )
        
        // Check if receipt account exists
        const receiptAccountInfo = await connection.getAccountInfo(receiptPda)
        if (!receiptAccountInfo) {
          logger.warn('Receipt account not found (non-critical)')
          // Don't fail the request - payment was successful, receipt is optional
        } else {
          logger.log('Receipt verified')
        }
      } catch {
        logger.warn('Receipt verification failed (non-critical)')
        // Don't fail the request - payment was successful
      }
      
      logger.log(`Payment verified for ${modelId}`)
    } catch (verifyError) {
      logger.error('Transaction verification failed')
      return NextResponse.json(
        { error: `Payment verification failed: ${verifyError instanceof Error ? verifyError.message : 'Unknown error'}` },
        { status: 400 }
      )
    }
    
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
        
        // Map model IDs to OpenAI model names
        const openaiModelMap: Record<string, string> = {
          'gpt-4o': 'gpt-4o', // Fallback to gpt-4o if gpt-4o doesn't exist
        }
        const openaiModel = openaiModelMap[modelId] || 'gpt-4o'
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: openaiModel,
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
          }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          let errorObj: { error?: { message?: string } } | null = null
          try {
            errorObj = JSON.parse(errorText) as { error?: { message?: string } }
          } catch {
            errorObj = { error: { message: errorText } }
          }
          
          const errorMessage = errorObj?.error?.message || errorText
          if (errorMessage.includes('quota') || errorMessage.includes('insufficient_quota')) {
            throw new Error(`Please try again later or contact the service provider.`)
          }
          throw new Error(`OpenAI API error: ${errorMessage}`)
        }

        const data = await response.json()
        output = data.choices[0]?.message?.content || 'No response from OpenAI'
        usage = {
          inputTokens: data.usage?.prompt_tokens || 0,
          outputTokens: data.usage?.completion_tokens || 0,
        }
        break
      }
      case 'anthropic': {
        const apiKey = process.env.ANTHROPIC_API_KEY
        if (!apiKey) {
          throw new Error('ANTHROPIC_API_KEY not configured')
        }
        
        // Map model IDs to Anthropic model names
        const anthropicModelMap: Record<string, string> = {
          'claude-3.5-sonnet': 'claude-3-5-sonnet-20241022',
        }
        const anthropicModel = anthropicModelMap[modelId] || 'claude-3-5-sonnet-20241022'
        
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: anthropicModel,
            max_tokens: 4096,
            messages: [{ role: 'user', content: prompt }],
          }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          let errorObj: { error?: { message?: string } } | null = null
          try {
            errorObj = JSON.parse(errorText) as { error?: { message?: string } }
          } catch {
            errorObj = { error: { message: errorText } }
          }
          
          const errorMessage = errorObj?.error?.message || errorText
          if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
            throw new Error(`Anthropic API error: The AI service quota has been exceeded. Please try again later or contact the service provider.`)
          }
          throw new Error(`Anthropic API error: ${errorMessage}`)
        }

        const data = await response.json()
        output = data.content[0]?.text || 'No response from Anthropic'
        usage = {
          inputTokens: data.usage?.input_tokens || 0,
          outputTokens: data.usage?.output_tokens || 0,
        }
        break
      }
      case 'google': {
        const apiKey = process.env.GOOGLE_API_KEY
        if (!apiKey) {
          throw new Error('GOOGLE_API_KEY not configured')
        }
        
        // Map model IDs to Google model names
        const googleModelMap: Record<string, string> = {
          'gemini-2.5-flash-lite': 'gemini-2.5-flash-lite',
        }
        const googleModel = googleModelMap[modelId] || 'gemini-2.5-flash-lite'
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${googleModel}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: prompt }],
            }],
          }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          let errorObj: { error?: { message?: string } } | null = null
          try {
            errorObj = JSON.parse(errorText) as { error?: { message?: string } }
          } catch {
            errorObj = { error: { message: errorText } }
          }
          
          const errorMessage = errorObj?.error?.message || errorText
          if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
            throw new Error(`Google API error: The AI service quota has been exceeded. Please try again later or contact the service provider.`)
          }
          throw new Error(`Google API error: ${errorMessage}`)
        }

        const data = await response.json()
        output = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from Google'
        usage = {
          inputTokens: data.usageMetadata?.promptTokenCount || 0,
          outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
        }
        break
      }
      case 'perplexity': {
        const apiKey = process.env.PERPLEXITY_API_KEY
        if (!apiKey) {
          throw new Error('PERPLEXITY_API_KEY not configured')
        }
        
        // Map model IDs to Perplexity model names
        const perplexityModelMap: Record<string, string> = {
          'sonar-pro': 'sonar-pro',
        }
        const perplexityModel = perplexityModelMap[modelId] || 'sonar-pro'
        
        const response = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: perplexityModel,
            messages: [{ role: 'user', content: prompt }],
          }),
        })

        if (!response.ok) {
          const errorText = await response.text()
          let errorObj: { error?: { message?: string } } | null = null
          try {
            errorObj = JSON.parse(errorText) as { error?: { message?: string } }
          } catch {
            errorObj = { error: { message: errorText } }
          }
          
          const errorMessage = errorObj?.error?.message || errorText
          if (errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
            throw new Error(`Perplexity API error: The AI service quota has been exceeded. Please try again later or contact the service provider.`)
          }
          throw new Error(`Perplexity API error: ${errorMessage}`)
        }

        const data = await response.json()
        output = data.choices[0]?.message?.content || 'No response from Perplexity'
        usage = {
          inputTokens: data.usage?.prompt_tokens || 0,
          outputTokens: data.usage?.completion_tokens || 0,
        }
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
    logger.error('AI API error:', error instanceof Error ? error.message : 'Internal server error')
    
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    
    if (paymentHeader) {
      logger.log('Attempting automatic refund')
      try {
        const paymentProof = JSON.parse(paymentHeader)
        const { txSignature } = paymentProof
        
        const cluster = process.env.NEXT_PUBLIC_SOLANA_CLUSTER || 'devnet'
        let rpcUrl: string
        // Use server-side only environment variable
      const heliusApiKey = process.env.HELIUS_RPC_API_KEY
        
        if (heliusApiKey) {
          if (cluster === 'devnet') {
            rpcUrl = `https://devnet.helius-rpc.com/?api-key=${heliusApiKey}`
          } else if (cluster === 'testnet') {
            rpcUrl = `https://testnet.helius-rpc.com/?api-key=${heliusApiKey}`
          } else {
            rpcUrl = `https://mainnet.helius-rpc.com/?api-key=${heliusApiKey}`
          }
        } else {
          if (cluster === 'devnet') {
            rpcUrl = 'https://api.devnet.solana.com'
          } else if (cluster === 'testnet') {
            rpcUrl = 'https://api.testnet.solana.com'
          } else {
            rpcUrl = 'https://api.mainnet-beta.solana.com'
          }
        }
        
        logger.log('Connecting to RPC for refund')
        
        const connection = new Connection(rpcUrl, 'confirmed')
        const tx = await connection.getTransaction(txSignature, {
          commitment: 'confirmed',
          maxSupportedTransactionVersion: 0,
        })
        
        if (!tx) {
          logger.error('Transaction not found for refund')
        } else if (!tx.meta || tx.meta.err) {
          logger.error('Transaction has error')
        } else {
          logger.log('Transaction found for refund')
          
          const preBalances = tx.meta.preBalances
          const postBalances = tx.meta.postBalances
          
          let accountKeys: string[] = []
          if ('staticAccountKeys' in tx.transaction.message) {
            accountKeys = tx.transaction.message.staticAccountKeys.map((key: PublicKey) => key.toString())
          } else {
            const legacyTx = tx.transaction as { message: { accountKeys: PublicKey[] } }
            if ('accountKeys' in legacyTx.message) {
              accountKeys = legacyTx.message.accountKeys.map((key: PublicKey) => key.toString())
            }
          }
          
          logger.log(`Transaction accounts: ${accountKeys.length} found`)
          
          const merchantIndex = accountKeys.findIndex(key => key === MERCHANT_WALLET)
          
          let payerIndex = -1
          let payerAddress: string | null = null
          
          const signers: number[] = []
          if (tx.transaction.message && 'header' in tx.transaction.message) {
            const numRequiredSignatures = tx.transaction.message.header.numRequiredSignatures
            for (let i = 0; i < numRequiredSignatures && i < accountKeys.length; i++) {
              signers.push(i)
            }
          }
          
          for (let idx = 0; idx < accountKeys.length; idx++) {
            const preBalance = preBalances[idx] || 0
            const postBalance = postBalances[idx] || 0
            const balanceDecrease = preBalance - postBalance
            
            if (balanceDecrease > 0 && idx !== merchantIndex) {
              if (signers.includes(idx) || idx === 0) {
                payerIndex = idx
                payerAddress = accountKeys[idx]
                logger.log('Found payer for refund')
                break
              }
            }
          }
          
          if (payerIndex === -1) {
            for (let idx = 0; idx < accountKeys.length; idx++) {
              const preBalance = preBalances[idx] || 0
              const postBalance = postBalances[idx] || 0
              const balanceDecrease = preBalance - postBalance
              
              if (balanceDecrease > 0 && idx !== merchantIndex) {
                payerIndex = idx
                payerAddress = accountKeys[idx]
                logger.log('Found payer (fallback) for refund')
                break
              }
            }
          }
          
          if (merchantIndex !== -1 && payerIndex !== -1 && payerAddress) {
            const balanceIncrease = postBalances[merchantIndex] - preBalances[merchantIndex]
            
            logger.log(`Balance increase: ${(balanceIncrease / 1_000_000_000).toFixed(9)} SOL`)
            
            if (balanceIncrease > 0) {
              const MERCHANT_PRIVATE_KEY = process.env.MERCHANT_PRIVATE_KEY
              
              if (MERCHANT_PRIVATE_KEY) {
                logger.log('Processing refund')
                try {
                  const merchantKeypair = Keypair.fromSecretKey(
                    typeof MERCHANT_PRIVATE_KEY === 'string' && MERCHANT_PRIVATE_KEY.startsWith('[')
                      ? Uint8Array.from(JSON.parse(MERCHANT_PRIVATE_KEY))
                      : bs58.decode(MERCHANT_PRIVATE_KEY)
                  )
                  
                  const merchantBalance = await connection.getBalance(merchantKeypair.publicKey)
                  
                  if (merchantBalance < balanceIncrease + 5000) {
                    logger.error('Insufficient merchant balance for refund')
                    return NextResponse.json(
                      { 
                        error: `The AI service is currently unavailable. We're unable to process an automatic refund at this time. Please contact support with your transaction ID.`,
                        refunded: false,
                        refundStatus: 'failed',
                        refundError: 'Insufficient merchant balance',
                        transactionId: txSignature,
                        userMessage: `⚠️ Service Unavailable\n\nThe AI service failed and we couldn't process an automatic refund.\n\nPlease contact support with:\nTransaction: ${txSignature.slice(0, 16)}...\n\nWe'll process your refund manually.`,
                      },
                      { status: 500 }
                    )
                  }
                  
                  const { blockhash } = await connection.getLatestBlockhash('confirmed')
                  
                  const refundTransaction = new Transaction().add(
                    SystemProgram.transfer({
                      fromPubkey: merchantKeypair.publicKey,
                      toPubkey: new PublicKey(payerAddress),
                      lamports: balanceIncrease,
                    })
                  )
                  
                  refundTransaction.recentBlockhash = blockhash
                  refundTransaction.feePayer = merchantKeypair.publicKey
                  
                  logger.log('Sending refund transaction')
                  const refundSignature = await sendAndConfirmTransaction(
                    connection,
                    refundTransaction,
                    [merchantKeypair],
                    { commitment: 'confirmed' }
                  )
                  
                  logger.log('Refund processed successfully')
                  
                  const refundAmountSol = (balanceIncrease / 1_000_000_000).toFixed(9)
                  return NextResponse.json(
                    { 
                      error: `The AI service is currently unavailable. Your payment of ${refundAmountSol} SOL has been automatically refunded to your wallet.`,
                      refunded: true,
                      refundStatus: 'completed',
                      refundSignature,
                      refundAmount: balanceIncrease.toString(),
                      refundAmountSol,
                      userMessage: `✅ Refund Complete\n\nYour payment of ${refundAmountSol} SOL has been automatically refunded.\n\nTransaction: ${refundSignature}\n\nYou can try again later or switch to a different AI model.`,
                    },
                    { status: 500 }
                  )
                } catch (refundErr) {
                  logger.error('Failed to process refund')
                  return NextResponse.json(
                    { 
                      error: `The AI service is currently unavailable. We're unable to process an automatic refund at this time. Please contact support with your transaction ID.`,
                      refunded: false,
                      refundStatus: 'failed',
                      refundError: refundErr instanceof Error ? refundErr.message : String(refundErr),
                      transactionId: txSignature,
                      userMessage: `⚠️ Service Unavailable\n\nThe AI service failed and we couldn't process an automatic refund.\n\nPlease contact support with:\nTransaction: ${txSignature.slice(0, 16)}...\n\nWe'll process your refund manually.`,
                    },
                    { status: 500 }
                  )
                }
              } else {
                logger.warn('MERCHANT_PRIVATE_KEY not configured - cannot process refund')
                return NextResponse.json(
                  { 
                    error: `The AI service is currently unavailable. Automatic refunds are not configured. Please contact support with your transaction ID.`,
                    refunded: false,
                    refundStatus: 'not_configured',
                    transactionId: txSignature,
                    userMessage: `⚠️ Service Unavailable\n\nThe AI service failed. Automatic refunds are not available.\n\nPlease contact support with:\nTransaction: ${txSignature.slice(0, 16)}...\n\nWe'll process your refund manually.`,
                  },
                  { status: 500 }
                )
              }
            } else {
              logger.warn('No balance increase found - nothing to refund')
            }
          } else {
            logger.warn('Could not find merchant or payer in transaction')
          }
        }
      } catch (refundErr) {
        logger.error('Error processing refund')
        
        return NextResponse.json(
          { 
            error: `The AI service is currently unavailable. We encountered an error while processing your refund. Please contact support.`,
            refunded: false,
            refundStatus: 'error',
            refundError: refundErr instanceof Error ? refundErr.message : String(refundErr),
            userMessage: `⚠️ Service Unavailable\n\nThe AI service failed and we encountered an error processing the refund.\n\nPlease contact support for assistance.`,
          },
          { status: 500 }
        )
      }
    }
    
    if (paymentHeader) {
      return NextResponse.json(
        { 
          error: errorMessage,
          refunded: false,
          refundStatus: 'not_attempted',
          userMessage: `⚠️ Service Error\n\n${errorMessage}\n\nYour payment was processed, but the service encountered an error.`,
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}