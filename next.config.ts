import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  webpack: (config, { isServer, dev }) => {
    if (!isServer) {
      // Polyfill Buffer for browser
      config.resolve.fallback = {
        ...config.resolve.fallback,
        buffer: require.resolve('buffer'),
      }
      
      // Optimize module resolution to reduce Network tab clutter
      if (dev) {
        config.optimization = {
          ...config.optimization,
          moduleIds: 'deterministic',
          minimize: false,
        }
        
        // Exclude node_modules from source maps
        config.devtool = 'eval-cheap-module-source-map'
      }
    }
    
    // Reduce source map exposure in production
    if (!dev) {
      config.devtool = false
    }
    
    return config
  },
  
  // Optimize package imports to reduce bundle visibility
  experimental: {
    optimizePackageImports: ['@solana/web3.js', '@coral-xyz/anchor', '@wallet-ui/react'],
  },
  
  // Remove console logs in production (keep errors and warnings)
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // Reduce output verbosity
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
}

export default nextConfig
