'use client'

import { ChatInterface } from './chat-interface'
import { ChatProvider } from '@/contexts/chat-context'
import { useSolana } from '@/components/solana/use-solana'
import { useState, useEffect, useCallback } from 'react'
import { getTotalMessageCount, clearChatHistory, clearLastNMessages } from '@/lib/chat-history'
import { toast } from 'sonner'

export default function DashboardFeature() {
  const { account } = useSolana()
  const [canClear, setCanClear] = useState(false)

  const updateCanClear = useCallback(() => {
    if (account?.address) {
      const total = getTotalMessageCount(account.address.toString())
      setCanClear(total > 0)
    } else {
      setCanClear(false)
    }
  }, [account?.address])

  useEffect(() => {
    updateCanClear()
    const interval = setInterval(updateCanClear, 1000)
    return () => clearInterval(interval)
  }, [updateCanClear])

  const handleClearHistory = useCallback(() => {
    if (account?.address) {
      clearChatHistory(account.address.toString())
      setCanClear(false)
      toast.success('All chat history cleared')
      window.dispatchEvent(new CustomEvent('chatHistoryCleared'))
      setTimeout(updateCanClear, 100)
    }
  }, [account?.address, updateCanClear])

  const handleClearLast10 = useCallback(() => {
    if (account?.address) {
      clearLastNMessages(account.address.toString(), 10)
      toast.success('Last 10 messages cleared')
      // Trigger a refresh by dispatching a custom event
      window.dispatchEvent(new CustomEvent('chatHistoryCleared'))
      setTimeout(updateCanClear, 100)
    }
  }, [account?.address, updateCanClear])

  return (
    <ChatProvider 
      onClearHistory={handleClearHistory} 
      onClearLast10={handleClearLast10}
      canClear={canClear}
    >
      <ChatInterface />
    </ChatProvider>
  )
}
