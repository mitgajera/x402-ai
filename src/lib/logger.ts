const isDevelopment = typeof window !== 'undefined' 
  ? process.env.NODE_ENV === 'development'
  : process.env.NODE_ENV === 'development'

function sanitizeUrl(url: string): string {
  if (!url) return '***'
  return url.replace(/\?api-key=[^&]+/, '?api-key=***')
}

function sanitizeAddress(address: string): string {
  if (!address || address.length < 8) return '***'
  return `${address.slice(0, 4)}...${address.slice(-4)}`
}

function sanitizeSignature(sig: string): string {
  if (!sig || sig.length < 16) return '***'
  return `${sig.slice(0, 8)}...${sig.slice(-8)}`
}

export const logger = {
  log: (...args: unknown[]) => {
    if (!isDevelopment) return
    console.log(...args)
  },
  
  warn: (...args: unknown[]) => {
    if (!isDevelopment) return
    console.warn(...args)
  },
  
  error: (...args: unknown[]) => {
    console.error(...args)
  },
  
  info: (...args: unknown[]) => {
    if (!isDevelopment) return
    console.info(...args)
  },
  
  sanitize: {
    url: sanitizeUrl,
    address: sanitizeAddress,
    signature: sanitizeSignature,
  },
}

