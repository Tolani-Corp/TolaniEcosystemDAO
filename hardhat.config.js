require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Optional: Enable if @openzeppelin/hardhat-upgrades is installed
try {
  require("@openzeppelin/hardhat-upgrades");
} catch (e) {
  // Package not installed - upgradeable deployments won't work
}

// Testnet uses CUSTODY key, Mainnet uses DEPLOYER key
const TESTNET_KEY = process.env.PRIVATE_KEY || process.env.PRIVATE_KEY_CUSTODY || "0x0000000000000000000000000000000000000000000000000000000000000001";
const MAINNET_KEY = process.env.PRIVATE_KEY_DEPLOYER || TESTNET_KEY;

/** @type {import("hardhat/config").HardhatUserConfig} */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.24",
        settings: {
          evmVersion: "cancun",
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
      {
        version: "0.8.28",
        settings: {
          evmVersion: "cancun",
          viaIR: true,
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337,
    },
    mainnet: {
      url: process.env.MAINNET_RPC_URL || "https://eth.llamarpc.com",
      accounts: [MAINNET_KEY],
      chainId: 1,
      gasPrice: "auto",
    },
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: [TESTNET_KEY],
      chainId: 11155111,
    },
    polygon: {
      url: process.env.POLYGON_RPC_URL || "",
      accounts: [MAINNET_KEY],
      chainId: 137,
    },
    polygonMumbai: {
      url: process.env.POLYGON_MUMBAI_RPC_URL || "",
      accounts: [TESTNET_KEY],
      chainId: 80001,
    },
    arbitrum: {
      url: process.env.ARBITRUM_RPC_URL || "",
      accounts: [MAINNET_KEY],
      chainId: 42161,
    },
    // Base L2 Networks
    base: {
      url: process.env.BASE_RPC_URL || "https://mainnet.base.org",
      accounts: [MAINNET_KEY],
      chainId: 8453,
      gasPrice: "auto",
    },
    baseSepolia: {
      url: process.env.BASE_SEPOLIA_RPC_URL || "https://sepolia.base.org",
      accounts: [TESTNET_KEY],
      chainId: 84532,
    },
  },
  sourcify: {
    enabled: true,
  },
  etherscan: {
    // Etherscan V2 API - single key works for all chains
    apiKey: process.env.ETHERSCAN_API_KEY || "",
    customChains: [
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=8453",
          browserURL: "https://basescan.org",
        },
      },
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api.etherscan.io/v2/api?chainid=84532",
          browserURL: "https://sepolia.basescan.org",
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
};
