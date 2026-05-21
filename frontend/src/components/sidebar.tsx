"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { usePages } from "@/context/pages-context";

export function Sidebar() {
  const { navigationPages, mobileNavigationPages, isActiveHref } = usePages();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 80 : 280 }}
        className="hidden lg:flex flex-col h-screen bg-gray-900/50 backdrop-blur-xl border-r border-gray-800/50 sticky top-0"
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800/50">
          <motion.div
            initial={false}
            animate={{ opacity: isCollapsed ? 0 : 1 }}
            className="flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-lg overflow-hidden shadow-lg shadow-[#007373]/25">
              <Image src="/favicon.svg" alt="TUT" width={40} height={40} className="h-full w-full" />
            </div>
            {!isCollapsed && (
              <div>
                <h1 className="font-bold text-[#E5C64B]">Tolani DAO</h1>
                <p className="text-xs text-[#00AFAF]">Governance Portal</p>
              </div>
            )}
          </motion.div>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 hover:bg-white/5 rounded-lg transition-colors"
          >
            {isCollapsed ? (
              <Menu className="w-5 h-5 text-gray-400" />
            ) : (
              <X className="w-5 h-5 text-gray-400" />
            )}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navigationPages.map((item) => {
            const isActive = isActiveHref(item.href);
            return (
              <Link key={item.name} href={item.href}>
                <motion.div
                  whileHover={{ x: 4 }}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200",
                    isActive
                      ? "bg-gradient-to-r from-[#004D4D]/30 to-[#007373]/30 text-white border border-[#E5C64B]/30"
                      : "text-gray-400 hover:text-[#E5C64B] hover:bg-white/5"
                  )}
                >
                  <item.icon className={cn("w-5 h-5", isActive && "text-[#E5C64B]")} />
                  {!isCollapsed && (
                    <span className="font-medium">{item.name}</span>
                  )}
                  {isActive && !isCollapsed && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-[#E5C64B]"
                    />
                  )}
                </motion.div>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        {!isCollapsed && (
          <div className="p-4 border-t border-gray-800/50">
            <div className="rounded-lg border border-[#E5C64B]/20 bg-[#004D4D]/20 p-4">
              <p className="text-xs text-[#00AFAF] mb-2">Base Mainnet</p>
              <p className="text-lg font-bold text-[#E5C64B]">Governance Token</p>
              <p className="text-xs text-gray-400 mt-1">
                TUT controls proposals, rewards, and treasury execution
              </p>
            </div>
          </div>
        )}
      </motion.aside>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-xl border-t border-gray-800/50 z-50">
        <div className="flex items-center justify-around py-2">
          {mobileNavigationPages.map((item) => {
            const isActive = isActiveHref(item.href);
            return (
              <Link key={item.name} href={item.href}>
                <div
                  className={cn(
                    "flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-colors",
                    isActive ? "text-[#E5C64B]" : "text-gray-400"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="text-xs">{item.name}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
