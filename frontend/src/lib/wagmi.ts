"use client";

import { http, createConfig } from "wagmi";
import { mainnet, sepolia, polygon, polygonMumbai, arbitrum, baseSepolia, base } from "wagmi/chains";
import { injected, walletConnect, coinbaseWallet } from "wagmi/connectors";

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

export const config = createConfig({
  chains: [mainnet, sepolia, polygon, polygonMumbai, arbitrum, baseSepolia, base],
  connectors: [
    injected(),
    walletConnect({ projectId }),
    coinbaseWallet({ appName: "Tolani Ecosystem DAO" }),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [polygon.id]: http(),
    [polygonMumbai.id]: http(),
    [arbitrum.id]: http(),
    [baseSepolia.id]: http(),
    [base.id]: http(),
  },
});

// Localhost config for development
export const localConfig = createConfig({
  chains: [
    {
      id: 31337,
      name: "Hardhat",
      nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
      rpcUrls: {
        default: { http: ["http://127.0.0.1:8545"] },
      },
    },
  ],
  transports: {
    31337: http("http://127.0.0.1:8545"),
  },
});
