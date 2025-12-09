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
        // Use eval source map - faster and shows less detail in network tab
        // This reduces the number of individual module files shown
        config.devtool = 'eval'
        
        config.optimization = {
          ...config.optimization,
          moduleIds: 'deterministic',
          minimize: false,
          // Chunk modules to reduce individual file requests
          splitChunks: {
            chunks: 'all',
            cacheGroups: {
              default: false,
              vendors: false,
              // Group vendor chunks - this bundles node_modules together
              vendor: {
                name: 'vendor',
                chunks: 'all',
                test: /[\\/]node_modules[\\/]/,
                priority: 20,
                enforce: true,
              },
              // Group common chunks
              common: {
                name: 'common',
                minChunks: 2,
                chunks: 'all',
                priority: 10,
                reuseExistingChunk: true,
              },
            },
          },
        }
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
  
  // Suppress React hydration warnings in development
  reactStrictMode: true,
  
  // Optimize production builds
  productionBrowserSourceMaps: false,
}

export default nextConfig
