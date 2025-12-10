'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useSolana } from '@/components/solana/use-solana'
import { WalletDropdown } from '@/components/wallet-dropdown'
import { ChatMessageBubbleV2 } from '@/components/chat/chat-message-v2'
import { ChatInputV2 } from '@/components/chat/chat-input-v2'
import { ModelSelector } from '@/components/model-selector'
import { Button } from '@/components/ui/button'
import { X402AIClient, X402_MODELS, X402PaymentRequiredError, type X402CompletionResponse } from '@/lib/x402-client'
import { getChatHistory, saveChatMessage, getTotalMessageCount, type ChatMessage, MAX_MESSAGES } from '@/lib/chat-history'
import { logger } from '@/lib/logger'
import { getRecordReceiptInstruction } from '@/lib/x402-receipts-instruction'
import { Address, AccountRole } from 'gill'
import { useWalletUiSigner } from '@wallet-ui/react'
import type { UiWalletAccount } from '@wallet-ui/react'
import { toast } from 'sonner'
import { Sparkles, MessageSquare, ChevronDown, DollarSign, Bot, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EmptyStatePrompts } from '@/components/empty-state-prompts'
import { Connection, PublicKey, Transaction, SystemProgram, TransactionInstruction } from '@solana/web3.js'
import { OpenAIIcon, GeminiIcon, AnthropicIcon, PerplexityIcon, GrokIcon, DeepSeekIcon } from '@/components/llm-icons'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

type GillClient = ReturnType<typeof useSolana>['client']

type ChatSessionProps = {
  account: UiWalletAccount
  client: GillClient
}


export function ChatInterface() {
  const { account, client } = useSolana()

  if (!account || !client) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 bg-gradient-to-br from-background via-background to-muted/5 px-3 sm:px-4 overflow-hidden">
        <div className="max-w-6xl w-full space-y-6 sm:space-y-8 md:space-y-10 text-center py-12 sm:py-16 md:py-20">
          {/* Animated Icon */}
          <div className="relative flex items-center justify-center pt-4 sm:pt-6 md:pt-8">
            <div className="absolute inset-0 bg-primary/15 blur-3xl rounded-md animate-float-infinite" />
            <div className="relative">
              <div className="bg-gradient-to-br from-primary/15 via-primary/10 to-primary/5 p-4 sm:p-5 md:p-6 rounded-lg sm:rounded-xl border border-primary/20 backdrop-blur-sm shadow-lg">
                <Sparkles className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 text-primary" />
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="space-y-3 sm:space-y-4 px-2">
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-r from-foreground via-foreground/95 to-foreground/80 bg-clip-text text-transparent">
              Welcome to x402 AI
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base md:text-lg lg:text-xl max-w-2xl mx-auto leading-relaxed px-2">
              Connect your Solana wallet to start chatting with AI models using secure, trustless micropayments
            </p>
          </div>

          {/* CTA Button */}
          <div className="pt-2">
            <WalletDropdown />
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-4 py-10 pt-6 sm:pt-8 max-w-4xl mx-auto px-2">
            <div className="flex flex-col items-center gap-2 sm:gap-3 p-4 sm:p-5 rounded-lg sm:rounded-xl bg-card/60 border border-border/60 backdrop-blur-sm hover:bg-card/80 hover:border-border transition-all hover:scale-[1.02] hover:shadow-md">
              <div className="h-9 w-9 sm:h-10 sm:w-10 md:h-11 md:w-11 rounded-lg sm:rounded-xl bg-primary/15 flex items-center justify-center">
                <DollarSign className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div className="space-y-0.5 sm:space-y-1">
                <h3 className="text-xs sm:text-sm font-semibold">Pay Per Request</h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Only pay for what you use</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2 sm:gap-3 p-4 sm:p-5 rounded-lg sm:rounded-xl bg-card/60 border border-border/60 backdrop-blur-sm hover:bg-card/80 hover:border-border transition-all hover:scale-[1.02] hover:shadow-md">
              <div className="h-9 w-9 sm:h-10 sm:w-10 md:h-11 md:w-11 rounded-lg sm:rounded-xl bg-primary/15 flex items-center justify-center">
                <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div className="space-y-0.5 sm:space-y-1">
                <h3 className="text-xs sm:text-sm font-semibold">Multiple Models</h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground">ChatGPT, Gemini, Claude & more</p>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2 sm:gap-3 p-4 sm:p-5 rounded-lg sm:rounded-xl bg-card/60 border border-border/60 backdrop-blur-sm hover:bg-card/80 hover:border-border transition-all hover:scale-[1.02] hover:shadow-md">
              <div className="h-9 w-9 sm:h-10 sm:w-10 md:h-11 md:w-11 rounded-lg sm:rounded-xl bg-primary/15 flex items-center justify-center">
                <Lock className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div className="space-y-0.5 sm:space-y-1">
                <h3 className="text-xs sm:text-sm font-semibold">Trustless</h3>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Secure on-chain payments</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <ChatSession account={account} client={client} />
  )
}

function TypingIndicator({ modelId }: { modelId: string }) {
  const getModelIcon = (modelId: string) => {
    const model = X402_MODELS.find(m => m.id === modelId)
    if (!model) return <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
    
    switch (model.provider) {
      case 'openai':
        return <OpenAIIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      case 'google':
        return <GeminiIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      case 'anthropic':
        return <AnthropicIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      case 'perplexity':
        return <PerplexityIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      case 'xai':
        return <GrokIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      case 'deepseek':
        return <DeepSeekIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
      default:
        return <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
    }
  }

  return (
    <div className="flex gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <Avatar className="h-8 w-8 sm:h-9 sm:w-9 shrink-0 ring-2 ring-muted">
        <AvatarFallback className="bg-gradient-to-br from-muted to-muted/80">
          {getModelIcon(modelId)}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 flex items-center">
        <div className="inline-block rounded-xl sm:rounded-2xl px-3 py-2 sm:px-4 sm:py-3 bg-card border border-border/50">
          <div className="flex gap-1.5 sm:gap-2">
            <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 bg-muted-foreground/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    </div>
  )
}

function ChatSession({ account }: ChatSessionProps) {
  const signer = useWalletUiSigner({ account })
  const { cluster, wallet, connected } = useSolana()
  const [modelId, setModelId] = useState<string>('gemini-2.5-flash-lite')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loadedOffset, setLoadedOffset] = useState(0)
  const [totalMessages, setTotalMessages] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesStartRef = useRef<HTMLDivElement>(null)

  const selectedModel = useMemo(
    () => X402_MODELS.find((m) => m.id === modelId) ?? X402_MODELS[0],
    [modelId],
  )

  const endpoint = typeof window === 'undefined' ? '/api/ai' : (process.env.NEXT_PUBLIC_X402_ENDPOINT || '/api/ai')

  useEffect(() => {
    const history = getChatHistory(account.address.toString(), MAX_MESSAGES, 0)
    const total = getTotalMessageCount(account.address.toString())
    // Deduplicate messages by ID and filter out empty assistant messages
    const uniqueMessages = history.filter((msg, index, self) => 
      index === self.findIndex(m => m.id === msg.id) && 
      (msg.content.trim() || msg.role === 'user')
    )
    setMessages(uniqueMessages)
    setLoadedOffset(0)
    setTotalMessages(total)
    return () => {
      setMessages([])
      setLoadedOffset(0)
      setTotalMessages(0)
    }
  }, [account.address])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSendMessage = async (content: string) => {
    if (!signer) {
      setError('Wallet signer unavailable. Please reconnect your wallet.')
      return
    }

    setIsLoading(true)
    setError(null)

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      modelId: selectedModel.id,
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, userMessage])
    saveChatMessage(account.address.toString(), userMessage)
    const newTotal = getTotalMessageCount(account.address.toString())
    setTotalMessages(newTotal)

    // Create assistant message ID for streaming (but don't add empty message to array)
    const assistantMessageId = `assistant-${Date.now()}`

    try {
      const sdk = new X402AIClient({ endpoint })

      let response: X402CompletionResponse | undefined
      let streamingContent = ''
      let messageAdded = false
      try {
        response = await sdk.completion(
          {
            prompt: content,
            modelId: selectedModel.id,
          },
          (chunk: string) => {
            // Update message content as chunks arrive
            streamingContent += chunk
            setMessages((prev) => {
              const existing = prev.find(msg => msg.id === assistantMessageId)
              if (existing) {
                // Update existing message
                return prev.map((msg) =>
                  msg.id === assistantMessageId
                    ? { ...msg, content: streamingContent }
                    : msg
                )
              } else {
                // Add message when we have first chunk
                if (!messageAdded && streamingContent.trim()) {
                  messageAdded = true
                  // Hide typing indicator as soon as first chunk arrives
                  setIsLoading(false)
                  return [...prev, {
                    id: assistantMessageId,
                    role: 'assistant' as const,
                    content: streamingContent,
                    modelId: selectedModel.id,
                    timestamp: Date.now(),
                  }]
                }
                return prev
              }
            })
          }
        )
      } catch (err) {
        // If we already have streaming content, preserve it
        if (err instanceof X402PaymentRequiredError) {
          const { paymentRequirements } = err

          const initialSolAmount = Number(paymentRequirements.amountLamports) / 1_000_000_000
          const initialUsdAmount = paymentRequirements.price?.amountUsd || selectedModel.priceUsd
          
          logger.log('Payment required:', {
            model: selectedModel.label,
            priceUsd: `$${initialUsdAmount.toFixed(3)}`,
            solAmount: `${initialSolAmount.toFixed(9)} SOL`,
          })

          if (!paymentRequirements.recipient) {
            throw new Error('Invalid payment requirements: recipient address is missing')
          }

          if (!paymentRequirements.amountLamports) {
            throw new Error('Invalid payment requirements: amountLamports is missing')
          }

          // parse amount safely
          let amount: bigint
          try {
            amount = BigInt(paymentRequirements.amountLamports)
          } catch {
            throw new Error(`Invalid payment amount: ${String(paymentRequirements.amountLamports)}`)
          }
          
          const paymentSolAmount = Number(amount) / 1_000_000_000
          const paymentUsdAmount = paymentRequirements.price?.amountUsd || selectedModel.priceUsd

          if (paymentRequirements.recipient === '11111111111111111111111111111111') {
            throw new Error(
              'MERCHANT_WALLET is not configured on the server. ' +
                'Please set MERCHANT_WALLET environment variable to a valid Solana wallet address.',
            )
          }

          toast.info('Payment required. Processing transaction...')

          try {
            if (!cluster) {
              throw new Error('No Solana network selected. Please select a network using the cluster dropdown.')
            }
            
            if (!account || !account.address) {
              throw new Error('Wallet account not available. Please reconnect your wallet.')
            }
            
            if (!signer) {
              throw new Error('Wallet signer not available. Please reconnect your wallet.')
            }
            
            if (!wallet) {
              throw new Error('Wallet not properly connected. Please disconnect and reconnect your wallet.')
            }
            
            if (!connected) {
              throw new Error(
                `❌ WALLET NOT CONNECTED!\n\n` +
                `Your wallet appears to be disconnected.\n\n` +
                `✅ FIX:\n` +
                `1. Make sure ${wallet.name} extension is open and unlocked\n` +
                `2. DISCONNECT wallet in this app (if shown as connected)\n` +
                `3. Wait 2 seconds\n` +
                `4. RECONNECT wallet using the wallet dropdown\n` +
                `5. Try again\n\n` +
                `💡 The wallet must be actively connected for transactions to work!`
              )
            }
            
            const appClusterId = cluster.id
            const walletChains = account.chains || []
            const walletSupportsCluster = walletChains.includes(appClusterId)
            
            logger.log('Network check:', {
              network: appClusterId.includes('devnet') ? 'devnet' : appClusterId.includes('mainnet') ? 'mainnet' : 'testnet',
              match: walletSupportsCluster,
            })
            
            if (!walletSupportsCluster && walletChains.length > 0) {
              const walletChain = walletChains[0]
              const walletNetwork = walletChain.includes('devnet') ? 'devnet' :
                                  walletChain.includes('testnet') ? 'testnet' :
                                  walletChain.includes('mainnet') ? 'mainnet' : 'unknown'
              const appNetwork = appClusterId.includes('devnet') ? 'devnet' :
                                appClusterId.includes('testnet') ? 'testnet' :
                                appClusterId.includes('mainnet') ? 'mainnet' : 'unknown'
              
              const fixSteps = wallet.name === 'Phantom' 
                ? '1. Open Phantom → Settings → Developer Mode\n2. Turn OFF "Testnet Mode" toggle (must be grey, not yellow)\n3. If you see yellow "Testnet Mode" banner, you\'re on TESTNET!\n4. DISCONNECT wallet in this app\n5. Wait 3 seconds\n6. RECONNECT wallet'
                : `1. Open ${wallet.name} → Network dropdown\n2. Select "${appNetwork.charAt(0).toUpperCase() + appNetwork.slice(1)}"\n3. DISCONNECT wallet in this app\n4. Wait 3 seconds\n5. RECONNECT wallet`
              
              throw new Error(
                `❌ NETWORK MISMATCH!\n\n` +
                `Wallet: ${walletNetwork.toUpperCase()}\n` +
                `App: ${appNetwork.toUpperCase()}\n\n` +
                `✅ FIX:\n${fixSteps}\n\n` +
                `💡 Both MUST be on ${appNetwork.toUpperCase()}!`
              )
            }
            
            try {
              if (cluster && cluster.id) {
                let rpcUrl: string
                if (cluster.id.includes('devnet')) {
                  rpcUrl = 'https://api.devnet.solana.com'
                } else if (cluster.id.includes('testnet')) {
                  rpcUrl = 'https://api.testnet.solana.com'
                } else if (cluster.id.includes('mainnet')) {
                  rpcUrl = 'https://api.mainnet-beta.solana.com'
                } else {
                  logger.warn('Unknown cluster, skipping balance check')
                  rpcUrl = ''
                }
                
                if (rpcUrl) {
                  const connection = new Connection(rpcUrl, 'confirmed')
                  const publicKey = new PublicKey(account.address.toString())
                  const balance = await connection.getBalance(publicKey)
                  
                  const recipientPublicKey = new PublicKey(paymentRequirements.recipient)
                  const recipientAccountInfo = await connection.getAccountInfo(recipientPublicKey)
                  const recipientExists = recipientAccountInfo !== null
                  
                  const transactionFee = BigInt(5000)
                  
                  const receiptAccountSize = 324
                  const rentPerByte = await connection.getMinimumBalanceForRentExemption(receiptAccountSize)
                  const receiptRent = BigInt(rentPerByte)
                  
                  const requiredAmount = amount + transactionFee + receiptRent
                  
                  if (!recipientExists) {
                    logger.warn('Recipient account does not exist - will be created')
                  }
                  
                  logger.log('Balance check:', {
                    balanceSol: (Number(balance) / 1_000_000_000).toFixed(9),
                    requiredSol: (Number(requiredAmount) / 1_000_000_000).toFixed(9),
                    sufficient: balance >= requiredAmount,
                    network: cluster.label,
                  })
                  
                  if (balance < requiredAmount) {
                    const balanceSol = Number(balance) / 1_000_000_000
                    const requiredSol = Number(requiredAmount) / 1_000_000_000
                    const shortfall = requiredSol - balanceSol
                    
                    throw new Error(
                      `❌ INSUFFICIENT BALANCE!\n\n` +
                      `You don't have enough SOL to complete this transaction.\n\n` +
                      `Your balance: ${balanceSol.toFixed(9)} SOL\n` +
                      `Required: ${requiredSol.toFixed(9)} SOL (payment + fees)\n` +
                      `Shortfall: ${shortfall.toFixed(9)} SOL\n\n` +
                      `Network: ${cluster.label}\n\n` +
                      `✅ FIX:\n` +
                      `1. Get devnet SOL from: https://faucet.solana.com/\n` +
                      `2. Make sure you're requesting SOL for ${cluster.label}\n` +
                      `3. Verify your wallet address: ${account.address.toString().slice(0, 8)}...\n` +
                      `4. Wait for SOL to arrive (usually instant)\n` +
                      `5. Try again`
                    )
                  }
                }
              }
            } catch (balanceErr) {
              if (balanceErr instanceof Error && balanceErr.message.includes('INSUFFICIENT BALANCE')) {
                throw balanceErr
              }
              logger.warn('Balance check failed, continuing anyway')
            }
            
            const destinationAddress = paymentRequirements.recipient as Address
            const payerAddress = account.address.toString() as Address
            
            logger.log('Building transaction:', {
              amount: `${paymentSolAmount.toFixed(9)} SOL`,
              amountUsd: `$${paymentUsdAmount.toFixed(3)}`,
              network: cluster.label,
              modelId: selectedModel.id,
            })
            
            if (amount <= 0n) {
              throw new Error(`Invalid payment amount: ${amount.toString()}`)
            }
            
            try {
              new PublicKey(destinationAddress)
              new PublicKey(payerAddress)
            } catch (err) {
              throw new Error(`Invalid wallet address: ${err instanceof Error ? err.message : String(err)}`)
            }
            
            logger.log('Addresses validated')
            
            let txSignature: string | undefined
            try {
              if (!cluster || !cluster.id) {
                throw new Error('Cluster not properly configured. Please select a network using the cluster dropdown.')
              }
              
              if (!connected) {
                throw new Error('Wallet not connected. Please reconnect your wallet.')
              }
              
              if (!signer) {
                throw new Error('Wallet signer unavailable. Please reconnect your wallet.')
              }
              
              const clusterId = cluster.id
              const clusterName = clusterId.includes('devnet') ? 'devnet' 
                : clusterId.includes('testnet') ? 'testnet'
                : 'mainnet-beta'
              
              // Use public RPC endpoints only - never expose API keys in frontend
              let rpcUrl: string
              if (clusterName === 'devnet') {
                rpcUrl = 'https://api.devnet.solana.com'
              } else if (clusterName === 'testnet') {
                rpcUrl = 'https://api.testnet.solana.com'
              } else {
                rpcUrl = 'https://api.mainnet-beta.solana.com'
              }
              
              // Allow custom RPC URL from env (without API key)
              const envRpcUrl = process.env.NEXT_PUBLIC_SOLANA_RPC_URL
              if (envRpcUrl && envRpcUrl.includes(clusterName) && !envRpcUrl.includes('api-key')) {
                rpcUrl = envRpcUrl
              }
              
              logger.log('Sending transaction:', {
                network: cluster.label,
                amount: `${paymentSolAmount.toFixed(9)} SOL`,
              })
              
              toast.info(
                `Sending ${paymentSolAmount.toFixed(9)} SOL ($${paymentUsdAmount.toFixed(3)}) on ${cluster.label}...`,
                { duration: 3000 }
              )
              
              const connection = new Connection(rpcUrl, 'confirmed')
              
              const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
              
              const transactionPayerPublicKey = new PublicKey(account.address.toString())
              const transactionDestinationPublicKey = new PublicKey(destinationAddress)
              
              const recipientAccountInfo = await connection.getAccountInfo(transactionDestinationPublicKey)
              const recipientExists = recipientAccountInfo !== null
              const minimumRentExemptBalance = 890880
              
              const transferAmount = Number(amount)
              if (!recipientExists && transferAmount < minimumRentExemptBalance) {
                logger.warn('Recipient account may need initialization')
              }
              
              const receiptInstructionGill = getRecordReceiptInstruction({
                payer: payerAddress,
                merchant: destinationAddress,
                reference: paymentRequirements.reference,
                modelId: selectedModel.id,
                amount: amount,
                txSig: '',
              })
              
              if (!receiptInstructionGill || !receiptInstructionGill.programAddress) {
                throw new Error('Failed to build receipt instruction')
              }
              
              if (!receiptInstructionGill.accounts || receiptInstructionGill.accounts.length === 0) {
                throw new Error('Receipt instruction has no accounts')
              }
              
              if (!receiptInstructionGill.data) {
                throw new Error('Receipt instruction has no data')
              }
              
              const receiptInstruction = new TransactionInstruction({
                programId: new PublicKey(receiptInstructionGill.programAddress),
                keys: receiptInstructionGill.accounts.map(acc => ({
                  pubkey: new PublicKey(acc.address),
                  isSigner: acc.role === AccountRole.WRITABLE_SIGNER || acc.role === AccountRole.READONLY_SIGNER,
                  isWritable: acc.role === AccountRole.WRITABLE || acc.role === AccountRole.WRITABLE_SIGNER,
                })),
                data: Buffer.from(receiptInstructionGill.data),
              })
              
              const transaction = new Transaction()
                .add(
                  SystemProgram.transfer({
                    fromPubkey: transactionPayerPublicKey,
                    toPubkey: transactionDestinationPublicKey,
                    lamports: transferAmount,
                  })
                )
                .add(receiptInstruction)
              
              transaction.recentBlockhash = blockhash
              transaction.feePayer = transactionPayerPublicKey
              
              logger.log('Transaction built, requesting signature')
              
              if (!wallet) {
                throw new Error(
                  'No wallet selected. Please connect your wallet using the wallet dropdown.'
                )
              }
              
              type WalletProvider = {
                signTransaction?: (transaction: Transaction) => Promise<Transaction>
                sendTransaction?: unknown
                isConnected?: boolean
                name?: string
                isPhantom?: boolean
                isSolflare?: boolean
              }
              
              type WalletWithAdapter = {
                adapter?: WalletProvider
                provider?: WalletProvider
                getAccounts?: () => unknown[]
              }
              
              let provider: WalletProvider | null = null
              
              const walletWithAdapter = wallet as unknown as WalletWithAdapter
              
              if (walletWithAdapter.adapter) {
                provider = walletWithAdapter.adapter as WalletProvider
              } else if (walletWithAdapter.provider) {
                provider = walletWithAdapter.provider as WalletProvider
              }
              
              if (!provider && walletWithAdapter.getAccounts) {
                provider = wallet as unknown as WalletProvider
              }
              
              if (!provider) {
                const walletName = wallet.name.toLowerCase()
                const walletId = (wallet as { id?: string }).id?.toLowerCase() || walletName
                
                type WindowWithWallets = {
                  solana?: WalletProvider
                  solflare?: WalletProvider
                  backpack?: WalletProvider
                  glow?: WalletProvider
                  coin98?: { solana?: WalletProvider }
                  sollet?: WalletProvider
                  solong?: WalletProvider
                  mathwallet?: { solana?: WalletProvider }
                }
                
                const windowWithWallets = window as unknown as WindowWithWallets
                
                const possibleProviders = [
                  windowWithWallets.solana,
                  windowWithWallets.solflare,
                  windowWithWallets.backpack,
                  windowWithWallets.glow,
                  windowWithWallets.coin98?.solana,
                  windowWithWallets.sollet,
                  windowWithWallets.solong,
                  windowWithWallets.mathwallet?.solana,
                ]
                
                for (const possibleProvider of possibleProviders) {
                  if (possibleProvider) {
                    const providerName = possibleProvider.name?.toLowerCase() || 
                                       possibleProvider.isPhantom ? 'phantom' :
                                       possibleProvider.isSolflare ? 'solflare' : ''
                    
                    if (providerName && (walletId.includes(providerName) || providerName.includes(walletId))) {
                      provider = possibleProvider
                      break
                    }
                  }
                }
                
                if (!provider) {
                  for (const possibleProvider of possibleProviders) {
                    if (possibleProvider && possibleProvider.isConnected) {
                      provider = possibleProvider
                      logger.warn('Using fallback provider')
                      break
                    }
                  }
                }
              }
              
              if (!provider) {
                throw new Error(
                  `Wallet provider not found for ${wallet.name}. ` +
                  `Please make sure your wallet extension is installed, enabled, and connected. ` +
                  `If the issue persists, try disconnecting and reconnecting your wallet.`
                )
              }
              
              if (provider.isConnected !== undefined && !provider.isConnected) {
                throw new Error(
                  `Wallet ${wallet.name} is not connected. Please connect your wallet using the wallet dropdown.`
                )
              }
              
              logger.log('Requesting wallet signature')
              
              let signedTransaction: Transaction
              
              try {
                if (typeof provider.signTransaction === 'function') {
                  signedTransaction = await provider.signTransaction(transaction)
                } 
                else if (provider.sendTransaction && typeof provider.sendTransaction === 'function') {
                  throw new Error(
                    `${wallet.name} uses sendTransaction instead of signTransaction. ` +
                    `This wallet may not support manual transaction signing.`
                  )
                }
                else {
                  throw new Error(
                    `${wallet.name} does not support transaction signing. ` +
                    `Please try a different wallet or ensure your wallet extension is up to date.`
                  )
                }
              } catch (signErr) {
                const errorMsg = signErr instanceof Error ? signErr.message : String(signErr)
                throw new Error(
                  `Failed to sign transaction with ${wallet.name}: ${errorMsg}\n\n` +
                  `Please ensure:\n` +
                  `1. Your ${wallet.name} extension is open and unlocked\n` +
                  `2. You approve the transaction in the wallet popup\n` +
                  `3. Your wallet is on the correct network (${cluster?.label || 'devnet'})\n` +
                  `4. Try disconnecting and reconnecting your wallet`
                )
              }
              
              logger.log('Transaction signed, broadcasting')
              
              try {
                txSignature = await connection.sendRawTransaction(signedTransaction.serialize(), {
                  skipPreflight: false,
                  maxRetries: 3,
                  preflightCommitment: 'confirmed',
                })
              } catch {
                logger.warn('Preflight failed, retrying')
                txSignature = await connection.sendRawTransaction(signedTransaction.serialize(), {
                  skipPreflight: true,
                  maxRetries: 3,
                })
              }
              
              if (!txSignature) {
                throw new Error('Failed to send transaction')
              }
              
              logger.log('Transaction broadcasted')
              
              logger.log('Waiting for confirmation')
              
              let confirmation
              try {
                confirmation = await connection.confirmTransaction({
                  signature: txSignature,
                  blockhash,
                  lastValidBlockHeight,
                }, 'confirmed')
                
                if (confirmation.value.err) {
                  logger.error('Transaction failed on-chain:', confirmation.value.err)
                  
                  const errorObj = confirmation.value.err as { InsufficientFundsForRent?: { account_index: number } }
                  if (errorObj?.InsufficientFundsForRent) {
                    const accountIndex = errorObj.InsufficientFundsForRent.account_index
                    throw new Error(
                      `❌ TRANSACTION FAILED: Insufficient Funds For Rent\n\n` +
                      `Account index ${accountIndex} needs rent but doesn't have enough funds.\n\n` +
                      `This usually means:\n` +
                      `1. The recipient account doesn't exist and needs to be created with rent\n` +
                      `2. The transfer amount is less than the minimum rent-exempt balance (~0.00089 SOL)\n\n` +
                      `✅ FIX:\n` +
                      `1. Ensure the merchant wallet exists on ${cluster.label}\n` +
                      `2. If the wallet doesn't exist, it needs to be initialized first\n` +
                      `3. Contact the merchant to initialize their wallet\n\n` +
                      `Transaction signature: ${txSignature.slice(0, 16)}...`
                    )
                  }
                  
                  throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`)
                }
              } catch (confirmErr) {
                logger.warn('Confirmation check failed, checking status directly')
                const txStatus = await connection.getSignatureStatus(txSignature)
                
                if (txStatus.value?.err) {
                  throw confirmErr
                }
                
                if (txStatus.value && !txStatus.value.err) {
                  logger.log('Transaction appears successful')
                  confirmation = { value: { err: null } }
                } else {
                  throw confirmErr
                }
              }
              
              logger.log('Transaction confirmed')
              toast.success('Transaction confirmed!')
              
            } catch (sendErr) {
              logger.error('Transaction failed:', sendErr instanceof Error ? sendErr.message : String(sendErr))
              
              const errorMessage = sendErr instanceof Error ? sendErr.message : String(sendErr)
              
              const lowerMessage = errorMessage.toLowerCase()
              
              const errorStack = sendErr instanceof Error ? sendErr.stack || '' : ''
              const errorCause = sendErr instanceof Error ? String(sendErr.cause || '') : ''
              const fullErrorText = `${errorMessage} ${errorStack} ${errorCause}`.toLowerCase()
              
              if (errorMessage.includes('WALLET_DISCONNECTED') ||
                  fullErrorText.includes('disconnected port') || 
                  fullErrorText.includes('failed to send message to service worker') ||
                  fullErrorText.includes('service worker') ||
                  fullErrorText.includes('extension context invalidated') ||
                  fullErrorText.includes('message port closed') ||
                  (errorMessage.includes('Unexpected error') && fullErrorText.includes('chrome-extension'))) {
                throw new Error(
                  `❌ WALLET DISCONNECTED!\n\n` +
                  `Your wallet extension lost connection. This usually happens when:\n\n` +
                  `1. Wallet extension was closed or reloaded\n` +
                  `2. Browser extension context was invalidated\n` +
                  `3. Wallet service worker disconnected\n\n` +
                  `✅ FIX:\n` +
                  `1. Make sure ${wallet?.name || 'your wallet'} extension is open and active\n` +
                  `2. Refresh the wallet extension (if possible)\n` +
                  `3. DISCONNECT wallet in this app\n` +
                  `4. Wait 3 seconds\n` +
                  `5. RECONNECT wallet\n` +
                  `6. If still not working, refresh this page and reconnect\n\n` +
                  `💡 The wallet extension must stay open and connected for transactions to work!`
                )
              }
              
              if (lowerMessage.includes('network') && (lowerMessage.includes('mismatch') || lowerMessage.includes('different'))) {
                throw new Error(
                  `❌ NETWORK/RPC MISMATCH!\n\n` +
                  `Your wallet's RPC endpoint doesn't match the selected network.\n\n` +
                  `App Network: ${cluster?.label || 'devnet'}\n\n` +
                  `✅ FIX:\n` +
                  `1. Make sure your wallet is on ${cluster?.label || 'devnet'}\n` +
                  `2. Phantom: Settings → Developer Mode → "Testnet Mode" OFF (grey)\n` +
                  `3. Solflare: Network dropdown → Select "${cluster?.label || 'Devnet'}"\n` +
                  `4. If using custom RPC, make sure it matches ${cluster?.label || 'devnet'}\n` +
                  `5. DISCONNECT wallet in this app\n` +
                  `6. Wait 3 seconds\n` +
                  `7. RECONNECT wallet\n\n` +
                  `💡 Both wallet AND RPC must be on ${cluster?.label || 'devnet'}!`
                )
              }
              
              if (lowerMessage.includes('insufficient') || 
                  (lowerMessage.includes('balance') && (lowerMessage.includes('not enough') || lowerMessage.includes('too low')))) {
                throw new Error(
                  `❌ INSUFFICIENT BALANCE!\n\n` +
                  `You don't have enough SOL to complete this transaction.\n\n` +
                  `Required: ${(Number(amount) / 1_000_000_000).toFixed(9)} SOL + fees (~0.000005 SOL)\n` +
                  `Network: ${cluster?.label || 'devnet'}\n\n` +
                  `✅ FIX:\n` +
                  `1. Get devnet SOL from: https://faucet.solana.com/\n` +
                  `2. Make sure you're requesting SOL for ${cluster?.label || 'devnet'}\n` +
                  `3. Verify your wallet address: ${account.address.toString().slice(0, 8)}...\n` +
                  `4. Wait for SOL to arrive (usually instant)\n` +
                  `5. Try again`
                )
              }
              
              if (errorMessage.includes('timeout') || errorMessage.includes('did not respond')) {
                throw new Error(
                  `❌ Transaction Timeout\n\n` +
                  `Your wallet did not respond. This usually means:\n\n` +
                  `1. Network Mismatch - Wallet is on different network than app\n` +
                  `   → Check: App is on ${cluster?.label || 'devnet'}, wallet must match!\n` +
                  `   → Phantom: Settings → Developer Mode → "Testnet Mode" OFF (grey)\n` +
                  `   → Solflare: Network dropdown → Select "${cluster?.label || 'Devnet'}"\n\n` +
                  `2. Wallet Extension Issue\n` +
                  `   → Disconnect and reconnect wallet\n` +
                  `   → Update wallet extension\n` +
                  `   → Try different wallet\n\n` +
                  `3. Transaction Rejected\n` +
                  `   → Check wallet popup (might be hidden)\n` +
                  `   → Approve transaction in wallet`
                )
              }
              
              if (lowerMessage.includes('user rejected') || lowerMessage.includes('cancelled') || lowerMessage.includes('declined')) {
                throw new Error('Transaction was cancelled by user')
              }
              
              if (lowerMessage.includes('simulation_warning:') ||
                  (lowerMessage.includes('simulation failed') || 
                   lowerMessage.includes('simulation') ||
                   lowerMessage.includes('simulation warning'))) {
                
                if (lowerMessage.includes('insufficient') || 
                    lowerMessage.includes('balance') || 
                    lowerMessage.includes('network') || 
                    lowerMessage.includes('mismatch') ||
                    lowerMessage.includes('user rejected') ||
                    lowerMessage.includes('cancelled') ||
                    lowerMessage.includes('declined')) {
                  throw new Error(
                    `❌ Transaction Rejected\n\n` +
                    `Your wallet rejected the transaction.\n\n` +
                    `Possible causes:\n` +
                    `1. Insufficient SOL balance (need payment + ~0.00001 SOL for fees + rent)\n` +
                    `2. Network mismatch (wallet ≠ app network)\n` +
                    `3. Wallet settings blocking transaction\n\n` +
                    `✅ Try:\n` +
                    `1. Check SOL balance on ${cluster?.label || 'devnet'}\n` +
                    `2. Verify wallet is on ${cluster?.label || 'devnet'}\n` +
                    `3. Disconnect and reconnect wallet\n` +
                    `4. Try again`
                  )
                }
                
                logger.warn('Simulation warning detected')
                
                toast.info(
                  'Simulation warning detected. Please check your wallet popup - you can still approve the transaction.',
                  { duration: 5000 }
                )
                
                throw new Error(
                  `⚠️ Simulation Warning\n\n` +
                  `Your wallet showed a simulation warning, but the transaction may still be valid.\n\n` +
                  `This is common with Anchor programs (like our receipt recording). The wallet's ` +
                  `simulation can't always predict PDA creation, but the transaction will succeed.\n\n` +
                  `✅ Please:\n` +
                  `1. Check your wallet popup - you should see an approval button\n` +
                  `2. Click "Approve" even if you see a warning\n` +
                  `3. The transaction includes:\n` +
                  `   - SOL transfer to merchant\n` +
                  `   - Receipt recording (Anchor program)\n\n` +
                  `If you see an approval button, click it to proceed. The transaction is valid!`
                )
              }
              
              throw new Error(
                `❌ Payment Failed\n\n` +
                `Error: ${errorMessage}\n\n` +
                `✅ Troubleshooting:\n` +
                `1. Verify wallet is on ${cluster?.label || 'devnet'}\n` +
                `2. Check you have enough SOL (balance + fees)\n` +
                `3. Disconnect and reconnect wallet\n` +
                `4. Try again\n\n` +
                `If the problem persists, check the browser console for more details.`
              )
            }

            if (!txSignature || typeof txSignature !== 'string' || txSignature.length < 32) {
              throw new Error(`Invalid transaction signature: ${String(txSignature)}`)
            }

            // Handle streaming response after payment
            const retry = await fetch(endpoint, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-PAYMENT': JSON.stringify({
                  txSignature,
                  reference: paymentRequirements.reference,
                }),
                'X-STREAM': 'true', // Enable streaming
              },
              body: JSON.stringify({
                prompt: content,
                modelId: selectedModel.id,
              }),
            })

            if (!retry.ok) {
              let refunded = false
              let refundSignature: string | undefined
              let refundAmountSol = ''
              let refundStatus = 'pending'
              let transactionId: string | undefined
              
              try {
                const errorBody = await retry.json().catch(() => null)
                if (errorBody && typeof errorBody === 'object') {
                  if ('refunded' in errorBody) {
                    refunded = (errorBody as { refunded: boolean }).refunded
                    refundStatus = refunded ? 'completed' : 'failed'
                    refundSignature = (errorBody as { refundSignature?: string }).refundSignature
                    const refundAmount = (errorBody as { refundAmount?: string }).refundAmount
                    refundAmountSol = refundAmount ? (Number(refundAmount) / 1_000_000_000).toFixed(9) : ''
                  }
                  
                  transactionId = (errorBody as { transactionId?: string }).transactionId
                }
              } catch {
              }
              
              if (refunded) {
                const clusterName = cluster?.id?.includes('devnet') ? 'devnet' 
                  : cluster?.id?.includes('testnet') ? 'testnet'
                  : 'mainnet-beta'
                
                const refundMessage = refundSignature 
                  ? `Service Error\n\nThe AI service encountered an error after payment.\n\nYour payment of ${refundAmountSol} SOL has been automatically refunded.\n\nTransaction: https://explorer.solana.com/tx/${refundSignature}?cluster=${clusterName === 'mainnet-beta' ? 'mainnet-beta' : clusterName}\n\nYou can try again or switch to a different AI model.\n\nIf you were charged, please contact support.`
                  : `✅ Refund Processing\n\nYour payment of ${refundAmountSol} SOL is being refunded.\n\nPlease wait a moment and check your wallet balance.`
                throw new Error(refundMessage)
              } else {
                const txIdDisplay = transactionId ? `\n\nTransaction ID: ${transactionId.slice(0, 16)}...` : ''
                throw new Error(`⚠️ Service Unavailable\n\nThe AI service failed after payment.${refundStatus === 'failed' ? '\n\nAutomatic refund could not be processed. Please contact support with your transaction ID.' : '\n\nPlease try again later or contact support.'}${txIdDisplay}`)
              }
            }

            // Handle streaming response after payment
            // Reset streamingContent for payment retry (don't shadow outer variable)
            streamingContent = ''
            if (retry.headers.get('content-type')?.includes('text/event-stream')) {
              const reader = retry.body?.getReader()
              const decoder = new TextDecoder()
              let buffer = ''
              let modelId = selectedModel.id
              let usage = { inputTokens: 0, outputTokens: 0 }

              if (reader) {
                try {
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
                            modelId = data.modelId || selectedModel.id
                          } else if (data.type === 'chunk') {
                            streamingContent += data.content
                            setMessages((prev) => {
                              const existing = prev.find(msg => msg.id === assistantMessageId)
                              if (existing) {
                                // Update existing message
                                return prev.map((msg) =>
                                  msg.id === assistantMessageId
                                    ? { ...msg, content: streamingContent, modelId }
                                    : msg
                                )
                              } else {
                                // Add message when we have first chunk
                                if (streamingContent.trim()) {
                                  // Hide typing indicator as soon as first chunk arrives
                                  setIsLoading(false)
                                  return [...prev, {
                                    id: assistantMessageId,
                                    role: 'assistant' as const,
                                    content: streamingContent,
                                    modelId,
                                    timestamp: Date.now(),
                                  }]
                                }
                                return prev
                              }
                            })
                          } else if (data.type === 'done') {
                            usage = data.usage || usage
                          }
                        } catch (e) {
                          logger.warn('Error parsing streaming data:', e)
                          // Skip invalid JSON but continue processing
                        }
                      }
                    }
                  }
                } catch (streamError) {
                  logger.error('Streaming error:', streamError)
                  throw new Error(`Failed to read streaming response: ${streamError instanceof Error ? streamError.message : String(streamError)}`)
                }
              } else {
                throw new Error('Stream reader not available')
              }

              // Ensure we have content before setting response
              if (!streamingContent.trim()) {
                throw new Error('Received empty response from AI service after payment')
              }

              response = {
                output: streamingContent,
                modelId,
                usage,
              }
              // Message will be saved in the final update below to avoid duplication
            } else {
              const jsonResponse = await retry.json() as { output?: string; modelId?: string; error?: string }
              if (jsonResponse.error) {
                throw new Error(jsonResponse.error)
              }
              if (!jsonResponse.output) {
                throw new Error('Received empty response from AI service after payment')
              }
              response = {
                output: jsonResponse.output,
                modelId: jsonResponse.modelId || selectedModel.id,
                usage: { inputTokens: 0, outputTokens: 0 },
              }
            }
          } catch (paymentError) {
            // If paymentError is already a refund message or service error, re-throw it as-is
            if (paymentError instanceof Error) {
              const errorMsg = paymentError.message
              // Check if it's already a formatted refund/error message
              if (errorMsg.includes('Refund Complete') || 
                  errorMsg.includes('Refund Processing') || 
                  errorMsg.includes('Service Error') ||
                  errorMsg.includes('Service Unavailable') ||
                  errorMsg.includes('automatically refunded')) {
                throw paymentError
              }
            }
            
            logger.error('Payment error:', paymentError instanceof Error ? paymentError.message : String(paymentError))
            
            // For other errors, provide a generic message
            const errorMsg = paymentError instanceof Error ? paymentError.message : String(paymentError)
            throw new Error(`⚠️ Service Error\n\nThe AI service encountered an error after payment.\n\n${errorMsg}\n\nIf you were charged, please contact support.`)
          }
        } else {
          throw err
        }
      }

      // Update final message with complete response
      // Use response.output if available (from non-streaming), otherwise use streamingContent
      const finalContent = response?.output || streamingContent
      
      // Check if we have content - if not, show an error
      if (!finalContent || !finalContent.trim()) {
        throw new Error('No response received from AI service. Please try again.')
      }
      
      // Update message with content
      {
        setMessages((prev) => {
          const existing = prev.find(msg => msg.id === assistantMessageId)
          if (existing) {
            // Update existing message
            return prev.map((msg) =>
              msg.id === assistantMessageId
                ? {
                    ...msg,
                    content: finalContent,
                    modelId: response?.modelId || msg.modelId,
                  }
                : msg
            )
          } else {
            // Add message if it doesn't exist yet
            return [...prev, {
              id: assistantMessageId,
              role: 'assistant' as const,
              content: finalContent,
              modelId: response?.modelId || selectedModel.id,
              timestamp: Date.now(),
            }]
          }
        })
        
        // Save the final message only once
        const finalMessage: ChatMessage = {
          id: assistantMessageId,
          role: 'assistant',
          content: finalContent,
          modelId: response?.modelId || selectedModel.id,
          timestamp: Date.now(),
        }
        saveChatMessage(account.address.toString(), finalMessage)
        const newTotal = getTotalMessageCount(account.address.toString())
        setTotalMessages(newTotal)
      }
    } catch (err) {
      // Remove the assistant message if there was an error
      setMessages((prev) => prev.filter((msg) => msg.id !== assistantMessageId))
      
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      
      // Handle refund messages - show success toast and error banner
      if (errorMessage.includes('Refund Complete')) {
        toast.success('Refund Complete - Payment refunded', { duration: 8000 })
        setError(errorMessage)
      } else if (errorMessage.includes('Refund Processing')) {
        toast.info('⏳ Refund Processing', { duration: 8000 })
        setError(errorMessage)
      } else {
        // Regular errors - show error banner and toast
        setError(errorMessage)
        // Remove emoji and clean up the first line for toast
        const toastMessage = errorMessage.split('\n')[0].replace(/⚠️|✅|❌|⏳|▲/g, '').trim()
        toast.error(toastMessage || 'An error occurred', { duration: 6000 })
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Clear history is handled by context via header dropdown

  const handleLoadPreviousMessages = () => {
    if (!account?.address) return
    
    const newOffset = loadedOffset + MAX_MESSAGES
    const previousMessages = getChatHistory(account.address.toString(), MAX_MESSAGES, newOffset)
    
    if (previousMessages.length > 0) {
      setMessages((prev) => [...previousMessages, ...prev])
      setLoadedOffset(newOffset)
      setTimeout(() => {
        messagesStartRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }

  const hasMoreMessages = totalMessages > messages.length

  const [showModelSelector, setShowModelSelector] = useState(false)

  return (
    <div className="flex flex-col flex-1 bg-gradient-to-br from-background via-background to-muted/10 overflow-hidden">

      {/* Model Selector - Collapsible */}
      {showModelSelector && (
        <div className="border-b bg-card/50 backdrop-blur-sm animate-in slide-in-from-top duration-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Select AI Model
              </h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowModelSelector(false)}
                className="h-6 w-6 p-0"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
            <ModelSelector selectedModelId={modelId} onSelect={(id) => {
              setModelId(id)
              setShowModelSelector(false)
            }} />
          </div>
        </div>
      )}

      {/* Chat Area */}
      <div className={cn(
        "flex-1 overflow-x-hidden",
        messages.length === 0 ? "overflow-hidden" : "overflow-y-auto"
      )}>
        <div className={cn(
          "max-w-4xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8",
          messages.length === 0 ? "h-full flex items-center justify-center py-6 sm:py-8" : "py-4 sm:py-6 md:py-8"
        )}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center w-full text-center space-y-4 sm:space-y-6 px-2">
              {/* Chat Logo */}
              <div className="relative">
                <div className="absolute inset-0 bg-primary/10 blur-2xl rounded-full animate-pulse" />
                <div className="relative bg-gradient-to-br from-muted/50 to-muted/30 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-border/50 backdrop-blur-sm">
                  <MessageSquare className="h-8 w-8 sm:h-10 sm:w-10 text-primary mx-auto" />
                </div>
              </div>
              
              {/* Title */}
              <div className="space-y-1.5 sm:space-y-2">
                <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Start a conversation
                </h3>
                <p className="text-muted-foreground text-xs sm:text-sm md:text-base px-4">
                  Click on the prompt below or type your own message
                </p>
              </div>
              
              {/* Prompt */}
              <div className="w-full max-w-md flex justify-center px-2">
                <EmptyStatePrompts onPromptSelect={(prompt) => {
                  handleSendMessage(prompt)
                }} />
              </div>
            </div>
          ) : (
            <>
              {hasMoreMessages && (
                <div className="flex justify-center mb-4 sm:mb-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLoadPreviousMessages}
                    className="rounded-full text-xs sm:text-sm h-8 sm:h-9 px-3 sm:px-4"
                  >
                    <ChevronDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                    <span className="hidden sm:inline">
                      Load Previous {Math.min(MAX_MESSAGES, totalMessages - messages.length)} Messages
                    </span>
                    <span className="sm:hidden">
                      Load {Math.min(MAX_MESSAGES, totalMessages - messages.length)} More
                    </span>
                  </Button>
                </div>
              )}
              {messages.length >= MAX_MESSAGES && !hasMoreMessages && (
                <div className="rounded-lg sm:rounded-xl bg-muted/30 border border-border/50 p-2 sm:p-3 text-[10px] sm:text-xs text-muted-foreground mb-4 sm:mb-6 text-center backdrop-blur-sm">
                  Showing all {messages.length} messages
                </div>
              )}
              <div ref={messagesStartRef} />
              {messages.filter(msg => msg.content.trim() || msg.role === 'user').map((message) => (
                <ChatMessageBubbleV2 key={message.id} message={message} />
              ))}
              {isLoading && (
                <TypingIndicator modelId={selectedModel.id} />
              )}
              <div ref={messagesEndRef} />
            </>
          )}
          
          {error && (
            <div className="rounded-lg sm:rounded-xl bg-destructive/10 border-2 border-destructive/20 p-3 sm:p-4 mb-4 sm:mb-6 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2">
              <div className="flex items-start gap-2 sm:gap-3">
                <div className="h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-destructive/20 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-destructive text-[10px] sm:text-xs">!</span>
                </div>
                <div className="flex-1 text-xs sm:text-sm text-destructive whitespace-pre-wrap break-words">
                  {error.split('\n').map((line, idx) => {
                    const genericUrlMatch = line.match(/(https?:\/\/[^\s]+)/)
                    if (genericUrlMatch) {
                      const url = genericUrlMatch[1]
                      const parts = line.split(url)
                      const explorerMatch = url.match(/explorer\.solana\.com\/tx\/([A-Za-z0-9]+)/)
                      
                      return (
                        <div key={idx} className="mb-1 last:mb-0">
                          {parts[0]}
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              "font-mono hover:underline",
                              explorerMatch ? "text-primary" : "text-primary"
                            )}
                          >
                            {explorerMatch 
                              ? `${explorerMatch[1].slice(0, 8)}...${explorerMatch[1].slice(-8)}`
                              : url
                            }
                          </a>
                          {parts[1]}
                        </div>
                      )
                    }
                    
                    const transactionLineMatch = line.match(/^Transaction:\s*([A-Za-z0-9]{8})\.\.\.([A-Za-z0-9]{8})$/)
                    if (transactionLineMatch) {
                      const fullError = error
                      const urlMatch = fullError.match(/https:\/\/explorer\.solana\.com\/tx\/([A-Za-z0-9]+)/)
                      if (urlMatch) {
                        const txSig = urlMatch[1]
                        const clusterName = cluster?.id?.includes('devnet') ? 'devnet' 
                          : cluster?.id?.includes('testnet') ? 'testnet'
                          : 'mainnet-beta'
                        const explorerUrl = `https://explorer.solana.com/tx/${txSig}?cluster=${clusterName === 'mainnet-beta' ? 'mainnet-beta' : clusterName}`
                        
                        return (
                          <div key={idx} className="mb-1 last:mb-0">
                            Transaction:{' '}
                            <a
                              href={explorerUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline font-mono"
                            >
                              {transactionLineMatch[1]}...{transactionLineMatch[2]}
                            </a>
                          </div>
                        )
                      }
                    }
                    
                    return <div key={idx} className="mb-1 last:mb-0">{line}</div>
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input Area */}
      <ChatInputV2
        onSend={handleSendMessage}
        disabled={isLoading}
        placeholder={`Message ${selectedModel.label.split('(')[0].trim()}...`}
        selectedModelId={modelId}
        onModelSelect={setModelId}
      />
    </div>
  )
}


