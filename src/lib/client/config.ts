"use client";

import { metaMask, coinbaseWallet } from 'wagmi/connectors'
import { http, createConfig, createStorage } from 'wagmi'
import { baseSepolia, seiTestnet } from 'wagmi/chains'

export const wagmiConfig = createConfig({
  chains: [baseSepolia, seiTestnet],
  connectors: [
    metaMask({
      dappMetadata: {
        name: "latchmcp.app", // TODO_CHANGE change
        url: "https://latchmcp.app", // TODO_CHANGE: Change
        iconUrl: "https://latchmcp.app/latchmcp-logo.svg", // TODO_CHANGE: change
      },
    }),
    coinbaseWallet({
      appName: "latchmcp.app",
      appLogoUrl: "https://latchmcp.app/latchmcp-logo.svg",
      preference: 'all', // Support both EOA and Smart Wallet
    }),
  ],
  storage: typeof window !== 'undefined'
    ? createStorage({ storage: localStorage })
    : undefined,
  transports: {
    [baseSepolia.id]: http(),
    [seiTestnet.id]: http(),
  },
})