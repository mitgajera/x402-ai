'use client'

import { createContext, useContext, ReactNode } from 'react'

type ChatContextType = {
  onClearHistory?: () => void
  onClearLast10?: () => void
  canClear?: boolean
}

const ChatContext = createContext<ChatContextType>({})

export function ChatProvider({ 
  children, 
  onClearHistory, 
  onClearLast10,
  canClear 
}: { 
  children: ReactNode
  onClearHistory?: () => void
  onClearLast10?: () => void
  canClear?: boolean
}) {
  return (
    <ChatContext.Provider value={{ onClearHistory, onClearLast10, canClear }}>
      {children}
    </ChatContext.Provider>
  )
}

export function useChatContext() {
  return useContext(ChatContext)
}

