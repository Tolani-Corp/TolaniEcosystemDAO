"use client";

import { ConnectWallet } from "./connect-wallet";
import { Bell, Moon, Network, Search, Sun } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

export function Header() {
  const [isDark, setIsDark] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-gray-800/50 bg-gray-950/80 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="min-w-0 flex-1 lg:max-w-xl">
          <motion.div
            initial={false}
            animate={{ width: searchOpen ? "100%" : "auto" }}
            className="relative"
          >
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="rounded-lg p-2 transition-colors hover:bg-white/5 lg:hidden"
              aria-label="Open search"
            >
              <Search className="h-5 w-5 text-gray-400" />
            </button>
            <div className="hidden items-center gap-2 rounded-lg border border-gray-700/50 bg-gray-800/50 px-4 py-2.5 transition-colors focus-within:border-cyan-500/50 lg:flex">
              <Search className="h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search proposals, contracts, routes..."
                className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-gray-400"
              />
              <kbd className="hidden items-center gap-1 rounded-md bg-gray-700/50 px-2 py-1 text-xs text-gray-400 xl:inline-flex">
                Ctrl K
              </kbd>
            </div>
          </motion.div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 rounded-lg border border-cyan-400/20 bg-cyan-950/20 px-3 py-2 text-xs font-medium text-cyan-200 md:flex">
            <Network className="h-4 w-4" />
            Base ready
          </div>

          <button
            onClick={() => setIsDark(!isDark)}
            className="rounded-lg p-2.5 transition-colors hover:bg-white/5"
            aria-label="Toggle theme"
          >
            {isDark ? (
              <Sun className="h-5 w-5 text-gray-400" />
            ) : (
              <Moon className="h-5 w-5 text-gray-400" />
            )}
          </button>

          <button
            className="relative rounded-lg p-2.5 transition-colors hover:bg-white/5"
            aria-label="Notifications"
          >
            <Bell className="h-5 w-5 text-gray-400" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-cyan-400" />
          </button>

          <ConnectWallet />
        </div>
      </div>
    </header>
  );
}
