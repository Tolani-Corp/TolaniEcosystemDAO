"use client";

import { useConnect, useAccount, useDisconnect, useBalance } from "wagmi";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet,
  ChevronDown,
  Copy,
  ExternalLink,
  LogOut,
  Check,
} from "lucide-react";
import { formatAddress } from "@/lib/utils";

export function ConnectWallet() {
  const { connectors, connect, isPending } = useConnect();
  const { address, isConnected, chain } = useAccount();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address });
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    if (address) {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isConnected && address) {
    return (
      <div className="relative">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-r from-violet-600/20 to-purple-600/20 hover:from-violet-600/30 hover:to-purple-600/30 border border-violet-500/30 rounded-xl transition-all duration-200"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
            <Wallet className="w-4 h-4 text-white" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-white">
              {formatAddress(address)}
            </p>
            <p className="text-xs text-gray-400">
              {balance ? `${(Number(balance.value) / 10 ** balance.decimals).toFixed(4)} ${balance.symbol}` : "Loading..."}
            </p>
          </div>
          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
          />
        </motion.button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 top-full mt-2 w-72 bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-2xl overflow-hidden z-50"
            >
              <div className="p-4 border-b border-gray-700/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400">Connected Wallet</span>
                  <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded-full">
                    {chain?.name || "Unknown"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {formatAddress(address)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {balance ? `${(Number(balance.value) / 10 ** balance.decimals).toFixed(4)} ${balance.symbol}` : ""}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-2">
                <button
                  onClick={copyAddress}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-lg transition-colors"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400" />
                  )}
                  <span className="text-sm text-gray-300">
                    {copied ? "Copied!" : "Copy Address"}
                  </span>
                </button>
                <a
                  href={`https://etherscan.io/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-300">View on Explorer</span>
                </a>
                <button
                  onClick={() => {
                    disconnect();
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-red-500/10 rounded-lg transition-colors text-red-400"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm">Disconnect</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 rounded-xl font-medium text-white shadow-lg shadow-violet-500/25 transition-all duration-200"
      >
        <Wallet className="w-4 h-4" />
        Connect Wallet
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 top-full mt-2 w-72 bg-gray-900/95 backdrop-blur-xl border border-gray-700/50 rounded-xl shadow-2xl overflow-hidden z-50"
          >
            <div className="p-4 border-b border-gray-700/50">
              <h3 className="font-semibold text-white">Connect Wallet</h3>
              <p className="text-xs text-gray-400 mt-1">
                Choose your preferred wallet provider
              </p>
            </div>
            <div className="p-2">
              {connectors.map((connector) => (
                <button
                  key={connector.uid}
                  onClick={() => {
                    connect({ connector });
                    setIsOpen(false);
                  }}
                  disabled={isPending}
                  className="w-full flex items-center gap-3 px-3 py-3 hover:bg-white/5 rounded-lg transition-colors disabled:opacity-50"
                >
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-gray-300" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-white">
                      {connector.name}
                    </p>
                    <p className="text-xs text-gray-400">
                      {isPending ? "Connecting..." : "Click to connect"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
