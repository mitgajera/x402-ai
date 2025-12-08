'use client'

import * as React from 'react'
import { SolanaClusterId, useWalletUi, useWalletUiCluster } from '@wallet-ui/react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function ClusterDropdown() {
  const { cluster } = useWalletUi()
  const { clusters, setCluster } = useWalletUiCluster()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="text-xs sm:text-sm h-8 sm:h-9 px-2 sm:px-3">
          {cluster.label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-48 sm:w-56" align="end">
        <DropdownMenuRadioGroup 
          value={cluster.id} 
          onValueChange={(clusterId) => {
            const selectedCluster = clusters.find(c => c.id === clusterId)
            if (selectedCluster?.id.includes('mainnet')) {
              return
            }
            setCluster(clusterId as SolanaClusterId)
          }}
        >
          {clusters.map((c) => {
            const isMainnet = c.id.includes('mainnet')
            const isUnavailable = isMainnet
            
            return (
              <DropdownMenuRadioItem 
                key={c.id} 
                value={c.id}
                disabled={isUnavailable}
                className={cn(
                  isUnavailable ? 'opacity-50 cursor-not-allowed' : '',
                  'text-sm'
                )}
              >
                {c.label}
                {isUnavailable && <span className="text-xs text-muted-foreground ml-1">(Coming Soon...)</span>}
              </DropdownMenuRadioItem>
            )
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
