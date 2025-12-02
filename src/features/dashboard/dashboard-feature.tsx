'use client'

import React, { FormEvent, useMemo, useState } from 'react'
import { AppHero } from '@/components/app-hero'
import { WalletDropdown } from '@/components/wallet-dropdown'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useSolana } from '@/components/solana/use-solana'
import { X402AIClient, X402_MODELS, X402PaymentRequiredError, type X402CompletionResponse } from '@/lib/x402-client'

export default function DashboardFeature() {
  const { account } = useSolana()
  const [modelId, setModelId] = useState<string>('gpt-4.1-mini')
  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentInfo, setPaymentInfo] = useState<{
    recipient: string
    amountLamports: string
    reference: string
  } | null>(null)
  const [result, setResult] = useState<X402CompletionResponse | null>(null)

  const selectedModel = useMemo(
    () => X402_MODELS.find((m) => m.id === modelId) ?? X402_MODELS[0],
    [modelId],
  )

  const endpoint =
    typeof window === 'undefined'
      ? ''
      : process.env.NEXT_PUBLIC_X402_ENDPOINT ?? '/api/ai'

  const sdk = useMemo(() => {
    if (!endpoint) return null
    return new X402AIClient({ endpoint })
  }, [endpoint])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!sdk) {
      setError('Connect a wallet to run paid AI requests.')
      return
    }

    if (!prompt.trim()) {
      setError('Enter a prompt to continue.')
      return
    }

    setIsLoading(true)
    setError(null)
    setPaymentInfo(null)
    setResult(null)

    try {
      const response = await sdk.completion({
        prompt: prompt.trim(),
        modelId: selectedModel.id,
      })
      setResult(response)
    } catch (err) {
      if (err instanceof X402PaymentRequiredError) {
        setPaymentInfo({
          recipient: err.paymentRequirements.recipient,
          amountLamports: err.paymentRequirements.amountLamports,
          reference: err.paymentRequirements.reference,
        })
        setError(
          'Payment required. Review the payment details below and integrate your Solana transaction flow to complete the request.',
        )
      } else {
        setError(err instanceof Error ? err.message : 'Unknown error')
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-8">
      <AppHero
        title="x402-AI-GATEWAY.AI"
        subtitle="Solana-powered, pay-per-request AI inference using the x402 HTTP 402 Payment Required protocol."
      >
        <div className="mt-6 flex justify-center">
          <WalletDropdown />
        </div>
      </AppHero>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>AI Playground</CardTitle>
            <CardDescription>
              Select a model, pay once per request on Solana, and receive AI output – no API keys or subscriptions.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium">Model</label>
                  <select
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                    value={modelId}
                    onChange={(e) => setModelId(e.target.value)}
                  >
                    {X402_MODELS.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Price per request</label>
                  <p className="text-sm text-muted-foreground">
                    ~${selectedModel.priceUsd.toFixed(3)} USD (paid in SOL via x402)
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium">Prompt</label>
                <Textarea
                  rows={6}
                  placeholder="Ask any question. Payment and routing will be handled automatically via x402."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </div>

              {error ? <p className="text-sm text-red-500">{error}</p> : null}

              {paymentInfo ? (
                <div className="rounded-md border border-dashed border-muted-foreground/40 p-3 text-xs space-y-1">
                  <p className="font-medium">x402 Payment Requirements</p>
                  <p>
                    <span className="font-mono">Recipient:</span> {paymentInfo.recipient}
                  </p>
                  <p>
                    <span className="font-mono">Amount (lamports):</span> {paymentInfo.amountLamports}
                  </p>
                  <p>
                    <span className="font-mono">Reference:</span> {paymentInfo.reference}
                  </p>
                  <p className="text-muted-foreground">
                    Construct a Solana transfer that matches these requirements, then retry the request with an
                    <code className="mx-1 rounded bg-muted px-1 py-0.5">X-PAYMENT</code> header containing the payment
                    proof.
                  </p>
                </div>
              ) : null}
            </CardContent>
            <CardFooter className="flex flex-col items-start gap-4">
              <Button type="submit" disabled={isLoading || !account}>
                {isLoading ? 'Paying + calling LLM…' : account ? 'Pay & Run AI' : 'Connect wallet to continue'}
              </Button>
            </CardFooter>
          </form>
        </Card>

        {result && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>AI Output</CardTitle>
              <CardDescription>Model: {result.modelId}</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap text-sm">{result.output}</pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

