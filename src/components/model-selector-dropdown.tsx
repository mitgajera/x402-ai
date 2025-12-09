'use client'

import { X402_MODELS, type X402ModelConfig } from '@/lib/x402-client'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { ChevronDown, Sparkles, CircleIcon } from 'lucide-react'
import { OpenAIIcon, GeminiIcon, AnthropicIcon, PerplexityIcon, GrokIcon, DeepSeekIcon } from '@/components/llm-icons'
import { cn } from '@/lib/utils'
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'

type ModelSelectorDropdownProps = {
  selectedModelId: string
  onSelect: (modelId: string) => void
}

function getModelIcon(model: X402ModelConfig, className?: string) {
  switch (model.provider) {
    case 'openai':
      return <OpenAIIcon className={className} />
    case 'google':
      return <GeminiIcon className={className} />
    case 'anthropic':
      return <AnthropicIcon className={className} />
    case 'perplexity':
      return <PerplexityIcon className={className} />
    case 'xai':
      return <GrokIcon className={className} />
    case 'deepseek':
      return <DeepSeekIcon className={className} />
    default:
      return <Sparkles className={className} />
  }
}

export function ModelSelectorDropdown({ selectedModelId, onSelect }: ModelSelectorDropdownProps) {
  const selectedModel = X402_MODELS.find(m => m.id === selectedModelId) || X402_MODELS[0]
  const isFree = selectedModel.label.includes('FREE')

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(
            'h-auto py-1.5 px-2 sm:px-2.5 gap-1 sm:gap-1.5 justify-between',
            'hover:bg-accent/50 transition-colors text-[10px] sm:text-xs',
            'min-w-[120px] sm:min-w-[140px] max-w-[160px] sm:max-w-[180px]'
          )}
        >
          <div className="flex items-center gap-1 sm:gap-1.5 flex-1 min-w-0">
            <div className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0 flex items-center justify-center">
              {getModelIcon(selectedModel, 'h-3 w-3 sm:h-3.5 sm:w-3.5')}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="text-[10px] sm:text-xs font-medium truncate leading-tight">
                {selectedModel.label.split('(')[0].trim()}
              </div>
              <div className="text-[9px] sm:text-[10px] text-muted-foreground leading-tight">
                ${selectedModel.priceUsd.toFixed(3)} {isFree && '· FREE'}
              </div>
            </div>
          </div>
          <ChevronDown className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[200px] sm:w-[220px] max-h-[210px] overflow-y-auto">
        <DropdownMenuRadioGroup value={selectedModelId} onValueChange={onSelect}>
          {X402_MODELS.map((model) => {
            const isModelFree = model.label.includes('FREE')
            return (
              <DropdownMenuRadioItem
                key={model.id}
                value={model.id}
                className={cn(
                  "cursor-pointer p-2 pr-8 relative pl-2",
                  "[&>span:first-child]:hidden" // Hide default left indicator
                )}
              >
                <div className="flex items-center gap-2 w-full">
                  <div className="h-5 w-5 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    {getModelIcon(model, 'h-3.5 w-3.5')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium text-xs">
                        {model.label.split('(')[0].trim()}
                      </span>
                      {isModelFree && (
                        <span className="text-[10px] px-1 py-0.5 rounded bg-green-500/10 text-green-600 dark:text-green-400 font-medium">
                          FREE
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      ${model.priceUsd.toFixed(3)} per request
                    </p>
                  </div>
                </div>
                <DropdownMenuPrimitive.ItemIndicator className="pointer-events-none absolute right-2 flex size-3.5 items-center justify-center">
                  <CircleIcon className="size-2 fill-current" />
                </DropdownMenuPrimitive.ItemIndicator>
              </DropdownMenuRadioItem>
            )
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

