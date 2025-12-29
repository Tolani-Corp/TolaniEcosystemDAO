"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  FileText,
  Vote,
  Vault,
  Users,
  Settings,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Proposals", href: "/proposals", icon: FileText },
  { name: "Vote", href: "/vote", icon: Vote },
  { name: "Treasury", href: "/treasury", icon: Vault },
  { name: "Delegates", href: "/delegates", icon: Users },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
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
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center shadow-lg shadow-violet-500/25">
              <span className="text-xl font-bold text-white">T</span>
            </div>
            {!isCollapsed && (
              <div>
                <h1 className="font-bold text-white">Tolani DAO</h1>
                <p className="text-xs text-gray-400">Governance Portal</p>
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
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <motion.div
                  whileHover={{ x: 4 }}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                    isActive
                      ? "bg-gradient-to-r from-violet-600/20 to-purple-600/20 text-white border border-violet-500/30"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  )}
                >
                  <item.icon className={cn("w-5 h-5", isActive && "text-violet-400")} />
                  {!isCollapsed && (
                    <span className="font-medium">{item.name}</span>
                  )}
                  {isActive && !isCollapsed && (
                    <motion.div
                      layoutId="activeIndicator"
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-violet-400"
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
            <div className="p-4 rounded-xl bg-gradient-to-br from-violet-600/10 to-purple-600/10 border border-violet-500/20">
              <p className="text-xs text-gray-400 mb-2">TUT Token</p>
              <p className="text-lg font-bold text-white">Governance Token</p>
              <p className="text-xs text-gray-400 mt-1">
                Stake TUT to participate in governance
              </p>
            </div>
          </div>
        )}
      </motion.aside>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-gray-900/95 backdrop-blur-xl border-t border-gray-800/50 z-50">
        <div className="flex items-center justify-around py-2">
          {navigation.slice(0, 5).map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link key={item.name} href={item.href}>
                <div
                  className={cn(
                    "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-colors",
                    isActive ? "text-violet-400" : "text-gray-400"
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
