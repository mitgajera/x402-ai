'use client'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send, Loader2 } from 'lucide-react'
import { useState, KeyboardEvent, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { ModelSelectorDropdown } from '@/components/model-selector-dropdown'

type ChatInputV2Props = {
  onSend: (message: string) => void
  disabled?: boolean
  placeholder?: string
  selectedModelId?: string
  onModelSelect?: (modelId: string) => void
}

export function ChatInputV2({ onSend, disabled, placeholder, selectedModelId, onModelSelect }: ChatInputV2Props) {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [input])

  const handleSubmit = () => {
    if (input.trim() && !disabled) {
      onSend(input.trim())
      setInput('')
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    }
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-3 sm:py-4">
        {selectedModelId && onModelSelect && (
          <div className="mb-2 sm:mb-3">
            <ModelSelectorDropdown
              selectedModelId={selectedModelId}
              onSelect={onModelSelect}
            />
          </div>
        )}
        
        <div className="relative flex gap-2 sm:gap-3 items-end">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder || 'Type your message...'}
              disabled={disabled}
              rows={1}
              className={cn(
                'min-h-[48px] sm:min-h-[56px] max-h-[200px] resize-none pr-10 sm:pr-12',
                'rounded-xl sm:rounded-2xl border-2 transition-all duration-200',
                'text-sm sm:text-base',
                'focus:border-primary focus:ring-2 focus:ring-primary/20',
                disabled && 'opacity-50 cursor-not-allowed'
              )}
            />
            <div className="absolute bottom-2 sm:bottom-3 right-2 sm:right-3 text-[10px] sm:text-xs text-muted-foreground pointer-events-none">
              {input.length > 0 && (
                <span className="hidden sm:inline">{input.length} chars</span>
              )}
            </div>
          </div>
          
          <Button
            onClick={handleSubmit}
            disabled={disabled || !input.trim()}
            size="icon"
            className={cn(
              'h-[48px] sm:h-[56px] w-[48px] sm:w-[56px] rounded-xl sm:rounded-2xl shrink-0 transition-all duration-200',
              'shadow-lg hover:shadow-xl',
              disabled || !input.trim()
                ? 'opacity-50 cursor-not-allowed'
                : 'bg-gradient-to-br from-primary to-primary/90 hover:from-primary/90 hover:to-primary'
            )}
          >
            {disabled ? (
              <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin" />
            ) : (
              <Send className="h-4 w-4 sm:h-5 sm:w-5" />
            )}
          </Button>
        </div>
        
        <p className="text-[10px] sm:text-xs text-muted-foreground mt-1.5 sm:mt-2 text-center">
          <span className="hidden sm:inline">
            Press <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">Enter</kbd> to send, 
            <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono ml-1">Shift + Enter</kbd> for new line
          </span>
          <span className="sm:hidden">Tap send or press Enter</span>
        </p>
      </div>
    </div>
  )
}

