'use client'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { User } from 'lucide-react'
import { type ChatMessage } from '@/lib/chat-history'
import { X402_MODELS } from '@/lib/x402-client'
import { OpenAIIcon, GeminiIcon, AnthropicIcon, PerplexityIcon } from '@/components/llm-icons'
import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'
import { Sparkles } from 'lucide-react'
import { CopyButton } from '@/components/copy-button'

function getModelIcon(modelId: string, className?: string) {
  const model = X402_MODELS.find(m => m.id === modelId)
  if (!model) return <Sparkles className={className} />
  
  switch (model.provider) {
    case 'openai':
      return <OpenAIIcon className={className} />
    case 'google':
      return <GeminiIcon className={className} />
    case 'anthropic':
      return <AnthropicIcon className={className} />
    case 'perplexity':
      return <PerplexityIcon className={className} />
    default:
      return <Sparkles className={className} />
  }
}

function getModelName(modelId: string) {
  const model = X402_MODELS.find(m => m.id === modelId)
  return model?.label.split('(')[0].trim() || 'AI Assistant'
}

export function ChatMessageBubbleV2({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  return (
    <div 
      className={cn(
        'flex gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300',
        isUser ? 'flex-row-reverse justify-end' : 'flex-row justify-start'
      )}
    >
      {/* Avatar - AI on left, User on right */}
      <Avatar className={cn(
        'h-8 w-8 sm:h-9 sm:w-9 shrink-0 transition-transform hover:scale-105',
        isUser ? 'ring-2 ring-primary/20' : 'ring-2 ring-muted'
      )}>
        <AvatarFallback className={cn(
          'text-xs sm:text-sm font-medium',
          isUser 
            ? 'bg-gradient-to-br from-primary to-primary/80 text-primary-foreground' 
            : 'bg-gradient-to-br from-muted to-muted/80'
        )}>
          {isUser ? (
            <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          ) : (
            getModelIcon(message.modelId, 'h-3.5 w-3.5 sm:h-4 sm:w-4')
          )}
        </AvatarFallback>
      </Avatar>
      
      {/* Message content */}
      <div className={cn(
        'flex-1 min-w-0 flex flex-col',
        isUser ? 'items-end text-right' : 'items-start text-left'
      )}>
        {/* AI model name and timestamp - shown above message on left */}
        {!isUser && (
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-1.5">
            <span className="text-[10px] sm:text-xs font-medium text-foreground">
              {getModelName(message.modelId)}
            </span>
            <span className="text-[10px] sm:text-xs text-muted-foreground">·</span>
            <span className="text-[10px] sm:text-xs text-muted-foreground">
              {new Date(message.timestamp).toLocaleTimeString([], { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          </div>
        )}
        
        {/* Message bubble */}
        <div className="relative inline-block max-w-[90%] sm:max-w-[85%] md:max-w-[75%]">
          <div
            className={cn(
              'rounded-xl sm:rounded-2xl px-3 py-2 sm:px-4 sm:py-3',
              'transition-all duration-200',
              isUser
                ? 'bg-gradient-to-br from-primary to-primary/90 text-primary-foreground shadow-lg shadow-primary/20'
                : 'bg-card border border-border/50 text-foreground shadow-sm hover:shadow-md'
            )}
          >
            {isUser ? (
              <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words">
                {message.content}
              </p>
            ) : (
              <MarkdownContent content={message.content} />
            )}
          </div>
        </div>
        
        {/* User timestamp - shown below message on right */}
        {isUser && (
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 sm:mt-1.5">
            {new Date(message.timestamp).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </p>
        )}
      </div>
    </div>
  )
}

// Enhanced markdown component with copy buttons for code blocks
function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="text-sm sm:text-base leading-relaxed">
      <ReactMarkdown
        components={{
          pre: ({ children, ...props }) => {
            // Extract code content from children
            let codeContent = ''
            if (children && typeof children === 'object' && 'props' in children) {
              const codeProps = (children as { props?: { children?: string | Array<{ props?: { children?: string } } | string> } }).props
              if (codeProps?.children) {
                if (typeof codeProps.children === 'string') {
                  codeContent = codeProps.children
                } else if (Array.isArray(codeProps.children)) {
                  codeContent = codeProps.children
                    .map((c) => (typeof c === 'string' ? c : (c as { props?: { children?: string } })?.props?.children || ''))
                    .join('')
                }
              }
            }
            
            return (
              <div className="relative group/codeblock my-2">
                {codeContent && (
                  <CopyButton 
                    text={codeContent} 
                    size="sm"
                    className="absolute top-2 right-2 opacity-0 group-hover/codeblock:opacity-100 z-10"
                  />
                )}
                <pre 
                  {...props}
                  className="bg-muted/50 p-3 rounded-lg overflow-x-auto [&_code]:bg-transparent [&_code]:p-0"
                >
                  {children}
                </pre>
              </div>
            )
          },
          code: ({ className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '')
            const isInline = !match
            
            if (isInline) {
              return (
                <code 
                  className="bg-muted/50 px-1.5 py-0.5 rounded text-xs font-mono"
                  {...props}
                >
                  {children}
                </code>
              )
            }
            
            return (
              <code className={className} {...props}>
                {children}
              </code>
            )
          },
          p: ({ children }) => (
            <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc ml-4 my-2 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal ml-4 my-2 space-y-1">{children}</ol>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-muted-foreground/30 pl-4 italic my-2 text-muted-foreground">
              {children}
            </blockquote>
          ),
          h1: ({ children }) => (
            <h1 className="text-lg font-bold mt-4 mb-2 first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-bold mt-3 mb-2 first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-bold mt-2 mb-1 first:mt-0">{children}</h3>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

