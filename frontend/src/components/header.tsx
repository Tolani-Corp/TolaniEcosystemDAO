"use client";

import { ConnectWallet } from "./connect-wallet";
import Link from "next/link";
import { Bell, Moon, Network, Search, Sun } from "lucide-react";
import { useState } from "react";
import { motion } from "framer-motion";
import { usePages } from "@/context/pages-context";

export function Header() {
  const { breadcrumbs, currentPage, searchPages } = usePages();
  const [isDark, setIsDark] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const searchResults = searchPages(query).slice(0, 6);

  return (
    <header className="sticky top-0 z-40 border-b border-gray-800/50 bg-gray-950/80 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
        <div className="hidden min-w-0 flex-1 items-center gap-3 lg:flex">
          <div className="flex min-w-0 flex-col">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              {breadcrumbs.map((page, index) => (
                <span key={page.id} className="flex min-w-0 items-center gap-2">
                  {index > 0 && <span>/</span>}
                  <span className={index === breadcrumbs.length - 1 ? "text-cyan-200" : ""}>
                    {page.shortName ?? page.name}
                  </span>
                </span>
              ))}
            </div>
            <p className="mt-1 truncate text-sm text-gray-300">{currentPage.description}</p>
          </div>
        </div>

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
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => window.setTimeout(() => setSearchFocused(false), 120)}
                placeholder={`Search ${currentPage.name.toLowerCase()} context...`}
                className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-gray-400"
              />
              <kbd className="hidden items-center gap-1 rounded-md bg-gray-700/50 px-2 py-1 text-xs text-gray-400 xl:inline-flex">
                Ctrl K
              </kbd>
            </div>
            {searchFocused && (
              <div className="absolute left-0 right-0 top-full z-50 mt-2 hidden overflow-hidden rounded-lg border border-gray-700/60 bg-gray-950/95 shadow-2xl backdrop-blur-xl lg:block">
                <div className="border-b border-gray-800 px-3 py-2 text-xs font-medium uppercase text-gray-500">
                  Page Context
                </div>
                <div className="max-h-80 overflow-y-auto p-2">
                  {searchResults.map((page) => (
                    <Link
                      key={page.id}
                      href={page.href}
                      className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition hover:bg-white/5"
                    >
                      <page.icon className="mt-0.5 h-4 w-4 text-cyan-300" />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-white">{page.name}</span>
                        <span className="block truncate text-xs text-gray-500">
                          {page.description}
                        </span>
                      </span>
                    </Link>
                  ))}
                  {!searchResults.length && (
                    <div className="px-3 py-6 text-center text-sm text-gray-500">
                      No matching DAO pages.
                    </div>
                  )}
                </div>
              </div>
            )}
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
