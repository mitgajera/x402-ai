'use client'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ThemeSelect } from '@/components/theme-select'
import { WalletDropdown } from '@/components/wallet-dropdown'
import { Sparkles, Trash2, ChevronDown, ExternalLink } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useChatContext } from '@/contexts/chat-context'
import { useSolana } from '@/components/solana/use-solana'
import { getTotalMessageCount, clearChatHistory, clearLastNMessages } from '@/lib/chat-history'
import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const ClusterDropdown = dynamic(() => import('@/components/cluster-dropdown').then((m) => m.ClusterDropdown), {
  ssr: false,
})

export function AppHeader() {
  const { account } = useSolana()
  const { resolvedTheme } = useTheme()
  const { onClearHistory, onClearLast10, canClear: contextCanClear } = useChatContext()
  const [canClear, setCanClear] = useState(false)
  const [messageCount, setMessageCount] = useState(0)

  const updateCanClear = useCallback(() => {
    if (account?.address) {
      const total = getTotalMessageCount(account.address.toString())
      setMessageCount(total)
      setCanClear(total > 0)
    } else {
      setMessageCount(0)
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
      // Also call context handler if available
      onClearHistory?.()
    }
  }, [account?.address, updateCanClear, onClearHistory])

  const handleClearLast10 = useCallback(() => {
    if (account?.address) {
      clearLastNMessages(account.address.toString(), 10)
      toast.success('Last 10 messages cleared')
      window.dispatchEvent(new CustomEvent('chatHistoryCleared'))
      setTimeout(updateCanClear, 100)
      // Also call context handler if available
      onClearLast10?.()
    }
  }, [account?.address, updateCanClear, onClearLast10])

  const showClearButton = canClear || contextCanClear
  const finalCanClear = canClear || contextCanClear
  const hasAtLeast10Messages = messageCount >= 10

  return (
    <header className="relative z-50 border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 shrink-0">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Left side - Logo and name */}
          <Link href="/" className="flex items-center gap-1.5 sm:gap-2 hover:opacity-80 transition-opacity">
            <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary-foreground" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              <span className="">x402 AI</span>
            </h1>
          </Link>
          
          {/* Right side - Clear, Wallet, Cluster, GitHub, Theme */}
          <div className="flex items-center gap-1 sm:gap-2">
            {showClearButton && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    disabled={!finalCanClear}
                    className="h-8 sm:h-9 px-2 sm:px-3"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="hidden sm:inline ml-1.5">Clear</span>
                    <ChevronDown className="h-3 w-3 hidden sm:inline ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 sm:w-56">
                  {hasAtLeast10Messages && (
                    <>
                      <DropdownMenuItem 
                        onClick={handleClearLast10}
                        disabled={!finalCanClear}
                        className="cursor-pointer text-sm"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Clear Last 10 Messages
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem 
                    onClick={handleClearHistory}
                    disabled={!finalCanClear}
                    className="cursor-pointer text-destructive focus:text-destructive text-sm"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All History
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <WalletDropdown />
            <div className="hidden md:block">
              <ClusterDropdown />
            </div>
            <Button asChild variant="outline" size="sm" className="h-8 sm:h-9 px-2 sm:px-3">
              <a href="https://github.com/mitgajera/x402-ai" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5">
                <span className="hidden sm:inline">GitHub</span>
                {resolvedTheme === 'dark' ? (
                  <img 
                    width="20" 
                    height="20" 
                    src="https://img.icons8.com/material-outlined/24/github.png" 
                    alt="github"
                    className="h-5 w-5 sm:h-4 sm:w-4 opacity-90"
                    style={{ filter: 'brightness(0) invert(1)' }}
                  />
                ) : (
                  <img 
                    width="20" 
                    height="20" 
                    src="https://img.icons8.com/fluency-systems-regular/48/github.png" 
                    alt="github"
                    className="h-5 w-5 sm:h-4 sm:w-4"
                  />
                )}
              </a>
            </Button>
            <ThemeSelect />
          </div>
        </div>
      </div>
    </header>
  )
}
