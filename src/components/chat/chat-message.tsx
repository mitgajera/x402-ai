'use client'

import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Bot, User } from 'lucide-react'
import { type ChatMessage } from '@/lib/chat-history'
import { X402_MODELS } from '@/lib/x402-client'
import { OpenAIIcon, GeminiIcon, AnthropicIcon, PerplexityIcon, GrokIcon, DeepSeekIcon } from '@/components/llm-icons'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useTheme } from 'next-themes'
import { CopyButton } from '@/components/copy-button'

function getModelIcon(modelId: string) {
  const model = X402_MODELS.find(m => m.id === modelId)
  if (!model) return <Bot className="h-4 w-4" />
  
  switch (model.provider) {
    case 'openai':
      return <OpenAIIcon className="h-4 w-4" />
    case 'google':
      return <GeminiIcon className="h-4 w-4" />
    case 'anthropic':
      return <AnthropicIcon className="h-4 w-4" />
    case 'perplexity':
      return <PerplexityIcon className="h-4 w-4" />
    case 'xai':
      return <GrokIcon className="h-4 w-4" />
    case 'deepseek':
      return <DeepSeekIcon className="h-4 w-4" />
    default:
      return <Bot className="h-4 w-4" />
  }
}

export function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  const { resolvedTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'

  return (
    <div className={`flex gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'} mb-6`}>
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback className={isUser ? 'bg-primary text-primary-foreground' : 'bg-muted'}>
          {isUser ? <User className="h-4 w-4" /> : getModelIcon(message.modelId)}
        </AvatarFallback>
      </Avatar>
      <div className={`flex-1 ${isUser ? 'text-right' : 'text-left'}`}>
        <div
          className={`inline-block rounded-lg px-4 py-2 max-w-[80%] ${
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground'
          }`}
        >
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="text-sm [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:ml-4 [&_ol]:list-decimal [&_ol]:ml-4">
              <ReactMarkdown
                components={{
                  pre: ({ children }) => {
                    return <>{children}</>
                  },
                  code: ({ className, children, ...props }) => {
                    const match = /language-(\w+)/.exec(className || '')
                    const isInline = !match
                    const language = match ? match[1] : ''
                    
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
                    
                    const codeString = String(children).replace(/\n$/, '')
                    
                    return (
                      <div className="relative group/codeblock my-2">
                        <CopyButton 
                          text={codeString} 
                          size="sm"
                          className="absolute top-2 right-2 opacity-0 group-hover/codeblock:opacity-100 z-10"
                        />
                        <SyntaxHighlighter
                          language={language}
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          style={isDark ? oneDark : oneLight as any}
                          customStyle={{
                            margin: 0,
                            borderRadius: '0.5rem',
                            padding: '1rem',
                            fontSize: '0.875rem',
                            lineHeight: '1.5',
                          }}
                          PreTag="div"
                        >
                          {codeString}
                        </SyntaxHighlighter>
                      </div>
                    )
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {new Date(message.timestamp).toLocaleTimeString()}
        </p>
      </div>
    </div>
  )
}

