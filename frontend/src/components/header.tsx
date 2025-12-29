"use client";

import { ConnectWallet } from "./connect-wallet";
import { Bell, Search, Sun, Moon } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";

export function Header() {
  const [isDark, setIsDark] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-gray-950/80 backdrop-blur-xl border-b border-gray-800/50">
      <div className="flex items-center justify-between px-6 py-4">
        {/* Search */}
        <div className="flex-1 max-w-md">
          <motion.div
            initial={false}
            animate={{ width: searchOpen ? "100%" : "auto" }}
            className="relative"
          >
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="lg:hidden p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <Search className="w-5 h-5 text-gray-400" />
            </button>
            <div className="hidden lg:flex items-center gap-2 px-4 py-2.5 bg-gray-800/50 border border-gray-700/50 rounded-xl focus-within:border-violet-500/50 transition-colors">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search proposals, addresses..."
                className="flex-1 bg-transparent text-sm text-white placeholder-gray-400 outline-none"
              />
              <kbd className="hidden xl:inline-flex items-center gap-1 px-2 py-1 text-xs text-gray-400 bg-gray-700/50 rounded-md">
                ⌘K
              </kbd>
            </div>
          </motion.div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle */}
          <button
            onClick={() => setIsDark(!isDark)}
            className="p-2.5 hover:bg-white/5 rounded-xl transition-colors"
          >
            {isDark ? (
              <Sun className="w-5 h-5 text-gray-400" />
            ) : (
              <Moon className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {/* Notifications */}
          <button className="relative p-2.5 hover:bg-white/5 rounded-xl transition-colors">
            <Bell className="w-5 h-5 text-gray-400" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-violet-500 rounded-full" />
          </button>

          {/* Wallet */}
          <ConnectWallet />
        </div>
      </div>
    </header>
  );
}
