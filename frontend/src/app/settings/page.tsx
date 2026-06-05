"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import {
  Settings,
  Shield,
  Globe,
  Moon,
  Sun,
  Check,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard, CardHeader, CardContent } from "@/components/ui/cards";
import { cn, formatAddress } from "@/lib/utils";
import { useTheme, type Theme } from "@/components/ThemeProvider";
import { ConnectWallet } from "@/components/connect-wallet";
import { DEFAULT_CHAIN_ID, SUPPORTED_CHAIN_IDS, getChainName } from "@/config/contracts";
import { useAccount, useChainId, useSwitchChain } from "wagmi";

type NotificationPreferences = {
  proposals: boolean;
  votes: boolean;
  treasury: boolean;
  email: boolean;
};

const DEFAULT_NOTIFICATIONS: NotificationPreferences = {
  proposals: true,
  votes: true,
  treasury: false,
  email: false,
};

const THEME_OPTIONS: { value: Theme; label: string; icon: LucideIcon }[] = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Settings },
];

const NOTIFICATION_OPTIONS: {
  key: keyof NotificationPreferences;
  label: string;
  description: string;
}[] = [
  {
    key: "proposals",
    label: "New Proposals",
    description: "Get notified when new proposals are created",
  },
  {
    key: "votes",
    label: "Voting Reminders",
    description: "Remind me before voting periods end",
  },
  {
    key: "treasury",
    label: "Treasury Updates",
    description: "Notify on significant treasury changes",
  },
  {
    key: "email",
    label: "Email Notifications",
    description: "Receive email summaries (requires email)",
  },
];

const BRAND_SWATCHES = [
  { label: "Base teal", className: "bg-[#004D4D]" },
  { label: "Circuit teal", className: "bg-[#00AFAF]" },
  { label: "Gold", className: "bg-[#E5C64B]" },
  { label: "Surface", className: "bg-gray-800" },
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain, isPending: isSwitchingNetwork } = useSwitchChain();
  const [notifications, setNotifications] =
    useState<NotificationPreferences>(DEFAULT_NOTIFICATIONS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const storedPreferences = window.localStorage.getItem("dao-notifications");
    if (!storedPreferences) return;

    try {
      setNotifications({
        ...DEFAULT_NOTIFICATIONS,
        ...JSON.parse(storedPreferences),
      });
    } catch {
      window.localStorage.removeItem("dao-notifications");
    }
  }, []);

  const savePreferences = () => {
    window.localStorage.setItem("dao-notifications", JSON.stringify(notifications));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 mt-1">
          Manage your preferences and account settings
        </p>
      </div>

      {/* Appearance */}
      <GlassCard>
        <CardHeader
          title="Appearance"
          description="Customize the look and feel of the dashboard"
        />
        <CardContent className="space-y-6">
          {/* Theme */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Theme
            </label>
            <div className="grid grid-cols-3 gap-4">
              {THEME_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all",
                    theme === option.value
                      ? "bg-[#004D4D]/30 border-[#00AFAF]/50 text-cyan-200"
                      : "bg-gray-800/30 border-gray-700/50 text-gray-400 hover:text-white"
                  )}
                >
                  <option.icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Brand System */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Brand System
            </label>
            <div className="flex gap-3">
              {BRAND_SWATCHES.map((swatch) => (
                <div key={swatch.label} className="flex flex-col items-center gap-2">
                  <span className={cn("h-10 w-10 rounded-lg border border-white/10", swatch.className)} />
                  <span className="text-xs text-gray-400">{swatch.label}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </GlassCard>

      {/* Notifications */}
      <GlassCard>
        <CardHeader
          title="Notifications"
          description="Configure how you receive notifications"
        />
        <CardContent className="space-y-4">
          {NOTIFICATION_OPTIONS.map((item) => (
            <div
              key={item.key}
              className="flex items-center justify-between p-4 rounded-xl bg-gray-800/30 hover:bg-gray-800/50 transition-colors"
            >
              <div>
                <p className="text-white font-medium">{item.label}</p>
                <p className="text-sm text-gray-400">{item.description}</p>
              </div>
              <button
                onClick={() =>
                  setNotifications({
                    ...notifications,
                    [item.key]: !notifications[item.key],
                  })
                }
                className={cn(
                  "relative w-12 h-6 rounded-full transition-colors",
                  notifications[item.key]
                    ? "bg-[#007373]"
                    : "bg-gray-700"
                )}
              >
                <motion.div
                  initial={false}
                  animate={{
                    x: notifications[item.key] ? 24 : 2,
                  }}
                  className="absolute top-1 w-4 h-4 rounded-full bg-white"
                />
              </button>
            </div>
          ))}
        </CardContent>
      </GlassCard>

      {/* Network */}
      <GlassCard>
        <CardHeader
          title="Network"
          description="Select your preferred network"
        />
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {SUPPORTED_CHAIN_IDS.map((networkId) => {
              const active = isConnected ? chainId === networkId : networkId === DEFAULT_CHAIN_ID;
              const label = getChainName(networkId);
              const icon = networkId === DEFAULT_CHAIN_ID ? "B" : label.slice(0, 2).toUpperCase();

              return (
                <button
                  key={networkId}
                  onClick={() => switchChain?.({ chainId: networkId })}
                  disabled={!isConnected || isSwitchingNetwork}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all",
                    active
                      ? "bg-[#004D4D]/30 border-[#00AFAF]/50"
                      : "bg-gray-800/30 border-gray-700/50 hover:border-gray-600/50",
                    (!isConnected || isSwitchingNetwork) && "cursor-not-allowed opacity-70"
                  )}
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold",
                      active
                        ? "bg-[#007373] text-white"
                        : "bg-gray-700 text-gray-300"
                    )}
                  >
                    {icon}
                  </div>
                  <span
                    className={cn(
                      "text-sm font-medium",
                      active ? "text-cyan-200" : "text-gray-400"
                    )}
                  >
                    {label}
                  </span>
                  {active && (
                    <Check className="w-4 h-4 text-[#E5C64B]" />
                  )}
                </button>
              );
            })}
          </div>
          {!isConnected && (
            <p className="mt-4 text-sm text-gray-400">
              Connect a wallet to switch networks. Base is the production default.
            </p>
          )}
        </CardContent>
      </GlassCard>

      {/* Security */}
      <GlassCard>
        <CardHeader
          title="Security"
          description="Manage your security preferences"
        />
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-xl bg-gray-800/30">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-[#004D4D]/30">
                <Shield className="w-5 h-5 text-cyan-200" />
              </div>
              <div>
                <p className="text-white font-medium">Connected Wallet</p>
                <p className="text-sm text-gray-400">
                  {address ? formatAddress(address) : "No wallet connected"}
                </p>
              </div>
            </div>
            <ConnectWallet />
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-gray-800/30">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-blue-500/20">
                <Globe className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-white font-medium">Session Timeout</p>
                <p className="text-sm text-gray-400">
                  Auto-disconnect after 30 minutes of inactivity
                </p>
              </div>
            </div>
            <select className="px-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white">
              <option>15 min</option>
              <option>30 min</option>
              <option>1 hour</option>
              <option>Never</option>
            </select>
          </div>
        </CardContent>
      </GlassCard>

      {/* Save Button */}
      <div className="flex items-center justify-end gap-3">
        {saved && <span className="text-sm text-green-400">Preferences saved</span>}
        <Button size="lg" onClick={savePreferences}>Save Changes</Button>
      </div>
    </div>
  );
}
