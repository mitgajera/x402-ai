export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
  modelId: string
  timestamp: number
}

export type ChatSession = {
  walletAddress: string
  messages: ChatMessage[]
  createdAt: number
  updatedAt: number
}

const STORAGE_KEY_PREFIX = 'x402_chat_'

export function getChatHistory(walletAddress: string): ChatMessage[] {
  if (typeof window === 'undefined') return []
  
  try {
    const key = `${STORAGE_KEY_PREFIX}${walletAddress}`
    const stored = localStorage.getItem(key)
    if (!stored) return []
    
    const session: ChatSession = JSON.parse(stored)
    return session.messages || []
  } catch (error) {
    console.error('Error loading chat history:', error)
    return []
  }
}

export function saveChatMessage(walletAddress: string, message: ChatMessage): void {
  if (typeof window === 'undefined') return
  
  try {
    const key = `${STORAGE_KEY_PREFIX}${walletAddress}`
    const existing = localStorage.getItem(key)
    
    let session: ChatSession
    
    if (existing) {
      session = JSON.parse(existing)
      session.messages.push(message)
      session.updatedAt = Date.now()
    } else {
      session = {
        walletAddress,
        messages: [message],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
    }
    
    localStorage.setItem(key, JSON.stringify(session))
  } catch (error) {
    console.error('Error saving chat message:', error)
  }
}

export function clearChatHistory(walletAddress: string): void {
  if (typeof window === 'undefined') return
  
  try {
    const key = `${STORAGE_KEY_PREFIX}${walletAddress}`
    localStorage.removeItem(key)
  } catch (error) {
    console.error('Error clearing chat history:', error)
  }
}

