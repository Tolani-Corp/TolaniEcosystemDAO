import {
  CHAIN_IDS,
  DEFAULT_CHAIN_ID,
  getChainName,
} from "@/config/contracts";

type ExplorerType = "address" | "tx" | "token";

const EXPLORERS: Record<number, { name: string; url: string }> = {
  [CHAIN_IDS.MAINNET]: { name: "Etherscan", url: "https://etherscan.io" },
  [CHAIN_IDS.SEPOLIA]: { name: "Sepolia Etherscan", url: "https://sepolia.etherscan.io" },
  [CHAIN_IDS.POLYGON]: { name: "Polygonscan", url: "https://polygonscan.com" },
  [CHAIN_IDS.ARBITRUM]: { name: "Arbiscan", url: "https://arbiscan.io" },
  [CHAIN_IDS.BASE_SEPOLIA]: { name: "Base Sepolia Explorer", url: "https://sepolia.basescan.org" },
  [CHAIN_IDS.BASE]: { name: "Basescan", url: "https://basescan.org" },
};

export function getExplorer(chainId = DEFAULT_CHAIN_ID) {
  return EXPLORERS[chainId] ?? EXPLORERS[DEFAULT_CHAIN_ID];
}

export function getExplorerName(chainId = DEFAULT_CHAIN_ID) {
  return getExplorer(chainId).name;
}

export function getExplorerLink(
  type: ExplorerType,
  value: string | undefined,
  chainId = DEFAULT_CHAIN_ID
) {
  const explorer = getExplorer(chainId);
  const safeValue = value ?? "";
  return `${explorer.url}/${type}/${safeValue}`;
}

export function getNetworkExplorerLabel(chainId = DEFAULT_CHAIN_ID) {
  return `${getChainName(chainId)} on ${getExplorerName(chainId)}`;
}
