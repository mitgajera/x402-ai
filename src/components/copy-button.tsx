'use client'

import { Button } from '@/components/ui/button'
import { Copy, Check } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type CopyButtonProps = {
  text: string
  className?: string
  size?: 'sm' | 'default'
}

export function CopyButton({ text, className, size = 'default' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success('Copied to clipboard')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy')
    }
  }

  return (
    <Button
      variant="ghost"
      size={size === 'sm' ? 'sm' : 'icon'}
      onClick={handleCopy}
      className={cn(
        'h-7 w-7 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity',
        className
      )}
    >
      {copied ? (
        <Check className={cn(size === 'sm' ? 'h-3 w-3' : 'h-4 w-4', 'text-green-500')} />
      ) : (
        <Copy className={cn(size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />
      )}
    </Button>
  )
}

