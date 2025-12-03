'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { useSolana } from '@/components/solana/use-solana'
import { WalletDropdown } from '@/components/wallet-dropdown'
import { ChatMessageBubble } from '@/components/chat/chat-message'
import { ChatInput } from '@/components/chat/chat-input'
import { Button } from '@/components/ui/button'
import { X402AIClient, X402_MODELS, X402PaymentRequiredError } from '@/lib/x402-client'
import { getChatHistory, saveChatMessage, clearChatHistory, type ChatMessage } from '@/lib/chat-history'
import { createTransaction, signAndSendTransactionMessageWithSigners, getBase58Decoder, Address } from 'gill'
import { getTransferSolInstruction } from 'gill/programs'
import { useWalletUiSigner } from '@wallet-ui/react'
import type { UiWalletAccount } from '@wallet-ui/react'
import { toast } from 'sonner'
import { Trash2, Sparkles } from 'lucide-react'

type GillClient = ReturnType<typeof useSolana>['client']

type ChatSessionProps = {
  account: UiWalletAccount
  client: GillClient
}

export function ChatInterface() {
  const { account, client } = useSolana()

  if (!account || !client) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-background px-4 text-center">
        <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
        <p className="text-muted-foreground mb-6 max-w-md">
          Connect your Solana wallet to start using the x402 AI gateway and pay per request using SOL micropayments.
        </p>
        <WalletDropdown />
      </div>
    )
  }

  return <ChatSession account={account} client={client} />
}

function ChatSession({ account, client }: ChatSessionProps) {
  const signer = useWalletUiSigner({ account })
  const [modelId, setModelId] = useState<string>('gpt-5.1')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const selectedModel = useMemo(
    () => X402_MODELS.find((m) => m.id === modelId) ?? X402_MODELS[0],
    [modelId],
  )

  const endpoint = typeof window === 'undefined' ? '' : process.env.NEXT_PUBLIC_X402_ENDPOINT ?? '/api/ai'

  // Load chat history when wallet connects
  useEffect(() => {
    const history = getChatHistory(account.address.toString())
    setMessages(history)
    return () => {
      setMessages([])
    }
  }, [account.address])

  // Scroll to bottom when messages change
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

    // Add user message
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      modelId: selectedModel.id,
      timestamp: Date.now(),
    }

    setMessages((prev) => [...prev, userMessage])
    saveChatMessage(account.address.toString(), userMessage)

    try {
      const sdk = new X402AIClient({ endpoint })

      // First attempt - will get 402 if payment needed
      let response
      try {
        response = await sdk.completion({
          prompt: content,
          modelId: selectedModel.id,
        })
      } catch (err) {
        if (err instanceof X402PaymentRequiredError) {
          // Handle payment
          const { paymentRequirements } = err
          
          toast.info('Payment required. Processing transaction...')

          // Get latest blockhash
          const { value: latestBlockhash } = await client.rpc
            .getLatestBlockhash({ commitment: 'confirmed' })
            .send()

          // Create transfer transaction
          const destinationAddress = paymentRequirements.recipient as Address
          const amount = BigInt(paymentRequirements.amountLamports)
          
          const transferInstruction = getTransferSolInstruction({
            amount,
            destination: destinationAddress,
            source: signer,
          })
          
          const transaction = createTransaction({
            feePayer: signer,
            version: 0,
            latestBlockhash,
            instructions: [transferInstruction],
          })

          // Sign and send
          const signatureBytes = await signAndSendTransactionMessageWithSigners(transaction)
          const txSignature = getBase58Decoder().decode(signatureBytes)

          toast.success('Payment sent! Processing AI request...')

          // Retry with payment proof
          const retry = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-PAYMENT': JSON.stringify({
                txSignature,
                reference: paymentRequirements.reference,
              }),
            },
            body: JSON.stringify({
              prompt: content,
              modelId: selectedModel.id,
            }),
          })

          if (!retry.ok) {
            const text = await retry.text()
            throw new Error(`Request failed after payment: ${retry.status} ${text}`)
          }

          response = (await retry.json()) as { output: string; modelId: string }
        } else {
          throw err
        }
      }

      // Add assistant message
      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.output,
        modelId: response.modelId,
        timestamp: Date.now(),
      }

      setMessages((prev) => [...prev, assistantMessage])
      saveChatMessage(account.address.toString(), assistantMessage)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleClearHistory = () => {
    if (account?.address) {
      clearChatHistory(account.address.toString())
      setMessages([])
      toast.success('Chat history cleared')
    }
  }

  if (!account) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <Sparkles className="h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
        <p className="text-muted-foreground mb-6">Connect your Solana wallet to start chatting with AI</p>
        <WalletDropdown />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between px-4 py-3 max-w-4xl mx-auto w-full">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold">x402 AI Gateway</h1>
            <select
              value={modelId}
              onChange={(e) => setModelId(e.target.value)}
              className="text-sm rounded-md border border-input bg-background px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {X402_MODELS.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.label} (~${model.priceUsd.toFixed(3)})
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleClearHistory} disabled={messages.length === 0}>
              <Trash2 className="h-4 w-4 mr-2" />
              Clear
            </Button>
            <WalletDropdown />
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <Sparkles className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Start a conversation</h3>
              <p className="text-muted-foreground max-w-md">
                Ask anything! Each message requires a small Solana payment via the x402 protocol.
              </p>
            </div>
          ) : (
            <>
              {messages.map((message) => (
                <ChatMessageBubble key={message.id} message={message} />
              ))}
              {isLoading && (
                <div className="flex gap-4 mb-6">
                  <div className="h-8 w-8 shrink-0 rounded-full bg-muted animate-pulse" />
                  <div className="flex-1">
                    <div className="inline-block rounded-lg px-4 py-2 bg-muted animate-pulse">
                      <div className="h-4 w-32 bg-muted-foreground/20 rounded" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
          {error && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive mb-4">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <ChatInput
        onSend={handleSendMessage}
        disabled={isLoading}
        placeholder={`Message ${selectedModel.label}... (Pay ~$${selectedModel.priceUsd.toFixed(3)} per message)`}
      />
    </div>
  )
}

