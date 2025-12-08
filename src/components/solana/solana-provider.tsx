import { ReactNode } from 'react'
import { createSolanaDevnet, createSolanaMainnet, createWalletUiConfig, WalletUi } from '@wallet-ui/react'
import { WalletUiGillProvider } from '@wallet-ui/react-gill'
import { solanaMobileWalletAdapter } from './solana-mobile-wallet-adapter'

const mainnetCluster = createSolanaMainnet()

const config = createWalletUiConfig({
  clusters: [
    createSolanaDevnet(),
    {
      ...mainnetCluster,
      label: `${mainnetCluster.label}`,
    },
  ],
})

solanaMobileWalletAdapter({ clusters: config.clusters })

export function SolanaProvider({ children }: { children: ReactNode }) {
  return (
    <WalletUi config={config}>
      <WalletUiGillProvider>{children}</WalletUiGillProvider>
    </WalletUi>
  )
}
