import { logger } from './logger'

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
export const MAX_MESSAGES = 10
const MAX_AGE_DAYS = 30

export function getChatHistory(walletAddress: string, limit?: number, offset?: number): ChatMessage[] {
  if (typeof window === 'undefined') return []
  
  try {
    const key = `${STORAGE_KEY_PREFIX}${walletAddress}`
    const stored = localStorage.getItem(key)
    if (!stored) return []
    
    const session: ChatSession = JSON.parse(stored)
    let messages = session.messages || []
    
    const maxAge = Date.now() - (MAX_AGE_DAYS * 24 * 60 * 60 * 1000)
    messages = messages.filter(msg => msg.timestamp >= maxAge)
    
    if (offset !== undefined) {
      const startIndex = Math.max(0, messages.length - (offset + (limit || MAX_MESSAGES)))
      const endIndex = messages.length - offset
      messages = messages.slice(startIndex, endIndex)
    } else if (limit && messages.length > limit) {
      messages = messages.slice(-limit)
    }
    
    return messages
  } catch {
    logger.error('Error loading chat history')
    return []
  }
}

export function getTotalMessageCount(walletAddress: string): number {
  if (typeof window === 'undefined') return 0
  
  try {
    const key = `${STORAGE_KEY_PREFIX}${walletAddress}`
    const stored = localStorage.getItem(key)
    if (!stored) return 0
    
    const session: ChatSession = JSON.parse(stored)
    const messages = session.messages || []
    const maxAge = Date.now() - (MAX_AGE_DAYS * 24 * 60 * 60 * 1000)
    return messages.filter(msg => msg.timestamp >= maxAge).length
  } catch {
    logger.error('Error getting message count')
    return 0
  }
}

export function saveChatMessage(walletAddress: string, message: ChatMessage): void {
  if (typeof window === 'undefined') return
  
  try {
    const key = `${STORAGE_KEY_PREFIX}${walletAddress}`
    const existing = localStorage.getItem(key)
    
    let session: ChatSession
    let messages: ChatMessage[] = []
    
    if (existing) {
      session = JSON.parse(existing)
      messages = session.messages || []
    } else {
      session = {
        walletAddress,
        messages: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }
    }
    
    messages.push(message)
    
    const maxAge = Date.now() - (MAX_AGE_DAYS * 24 * 60 * 60 * 1000)
    messages = messages.filter(msg => msg.timestamp >= maxAge)
    
    const STORAGE_LIMIT = 500
    if (messages.length > STORAGE_LIMIT) {
      const removeCount = messages.length - STORAGE_LIMIT
      messages = messages.slice(removeCount)
      logger.log(`Removed ${removeCount} old messages to maintain storage limit`)
    }
    
    session.messages = messages
    session.updatedAt = Date.now()
    
    localStorage.setItem(key, JSON.stringify(session))
  } catch (error) {
    logger.error('Error saving chat message')
    
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      logger.warn('LocalStorage quota exceeded, clearing old messages')
      try {
        const key = `${STORAGE_KEY_PREFIX}${walletAddress}`
        const existing = localStorage.getItem(key)
        if (existing) {
          const session: ChatSession = JSON.parse(existing)
          const messages = session.messages || []
          
          if (messages.length > 50) {
            const keepMessages = messages.slice(-50)
            session.messages = keepMessages
            session.updatedAt = Date.now()
            localStorage.setItem(key, JSON.stringify(session))
            logger.log('Cleared old messages due to storage quota')
          }
        }
        } catch {
          logger.error('Error during cleanup')
        }
    }
  }
}

export function clearChatHistory(walletAddress: string): void {
  if (typeof window === 'undefined') return
  
  try {
    const key = `${STORAGE_KEY_PREFIX}${walletAddress}`
    localStorage.removeItem(key)
  } catch {
    logger.error('Error clearing chat history')
  }
}

