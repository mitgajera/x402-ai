'use client'

import { X402_MODELS, type X402ModelConfig } from '@/lib/x402-client'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Check, Sparkles } from 'lucide-react'
import { OpenAIIcon, GeminiIcon, AnthropicIcon, PerplexityIcon, GrokIcon, DeepSeekIcon } from '@/components/llm-icons'

type ModelSelectorProps = {
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

export function ModelSelector({ selectedModelId, onSelect }: ModelSelectorProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {X402_MODELS.map((model) => {
        const isSelected = model.id === selectedModelId
        const isFree = model.label.includes('FREE')
        
        return (
          <Card
            key={model.id}
            className={cn(
              'relative cursor-pointer transition-all duration-200 hover:shadow-md',
              'border-2 p-4 group',
              isSelected
                ? 'border-primary bg-primary/5 shadow-sm'
                : 'border-border hover:border-primary/50 bg-card'
            )}
            onClick={() => onSelect(model.id)}
          >
            {isSelected && (
              <div className="absolute top-2 right-2">
                <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              </div>
            )}
            
            <div className="flex items-start gap-3">
              <div className={cn(
                'h-10 w-10 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                isSelected ? 'bg-primary/10' : 'bg-muted'
              )}>
                {getModelIcon(model, 'h-5 w-5')}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-sm leading-tight">
                    {model.label.split('(')[0].trim()}
                  </h3>
                  {isFree && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/10 text-green-600 dark:text-green-400 font-medium">
                      FREE
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  ${model.priceUsd.toFixed(3)} per request
                </p>
              </div>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

