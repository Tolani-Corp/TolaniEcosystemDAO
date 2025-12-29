"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import {
  Settings,
  Bell,
  Palette,
  Shield,
  Globe,
  Moon,
  Sun,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { GlassCard, CardHeader, CardContent } from "@/components/ui/cards";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const [theme, setTheme] = useState("dark");
  const [notifications, setNotifications] = useState({
    proposals: true,
    votes: true,
    treasury: false,
    email: false,
  });

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
              {[
                { value: "light", label: "Light", icon: Sun },
                { value: "dark", label: "Dark", icon: Moon },
                { value: "system", label: "System", icon: Settings },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setTheme(option.value)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all",
                    theme === option.value
                      ? "bg-violet-600/20 border-violet-500/50 text-violet-400"
                      : "bg-gray-800/30 border-gray-700/50 text-gray-400 hover:text-white"
                  )}
                >
                  <option.icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Accent Color */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Accent Color
            </label>
            <div className="flex gap-3">
              {[
                { color: "violet", class: "bg-violet-500" },
                { color: "blue", class: "bg-blue-500" },
                { color: "emerald", class: "bg-emerald-500" },
                { color: "orange", class: "bg-orange-500" },
                { color: "pink", class: "bg-pink-500" },
              ].map((accent) => (
                <button
                  key={accent.color}
                  className={cn(
                    "w-10 h-10 rounded-full transition-transform hover:scale-110",
                    accent.class,
                    accent.color === "violet" && "ring-2 ring-white ring-offset-2 ring-offset-gray-950"
                  )}
                />
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
          {[
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
          ].map((item) => (
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
                    [item.key]: !notifications[item.key as keyof typeof notifications],
                  })
                }
                className={cn(
                  "relative w-12 h-6 rounded-full transition-colors",
                  notifications[item.key as keyof typeof notifications]
                    ? "bg-violet-600"
                    : "bg-gray-700"
                )}
              >
                <motion.div
                  initial={false}
                  animate={{
                    x: notifications[item.key as keyof typeof notifications] ? 24 : 2,
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
            {[
              { name: "Ethereum", chainId: 1, icon: "Ξ", active: false },
              { name: "Sepolia", chainId: 11155111, icon: "Ξ", active: true },
              { name: "Polygon", chainId: 137, icon: "P", active: false },
              { name: "Arbitrum", chainId: 42161, icon: "A", active: false },
            ].map((network) => (
              <button
                key={network.chainId}
                className={cn(
                  "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all",
                  network.active
                    ? "bg-violet-600/20 border-violet-500/50"
                    : "bg-gray-800/30 border-gray-700/50 hover:border-gray-600/50"
                )}
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold",
                    network.active
                      ? "bg-violet-600 text-white"
                      : "bg-gray-700 text-gray-300"
                  )}
                >
                  {network.icon}
                </div>
                <span
                  className={cn(
                    "text-sm font-medium",
                    network.active ? "text-violet-400" : "text-gray-400"
                  )}
                >
                  {network.name}
                </span>
                {network.active && (
                  <Check className="w-4 h-4 text-violet-400" />
                )}
              </button>
            ))}
          </div>
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
              <div className="p-3 rounded-xl bg-violet-500/20">
                <Shield className="w-5 h-5 text-violet-400" />
              </div>
              <div>
                <p className="text-white font-medium">Connected Wallet</p>
                <p className="text-sm text-gray-400">
                  No wallet connected
                </p>
              </div>
            </div>
            <Button variant="secondary" size="sm">
              Connect
            </Button>
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
      <div className="flex justify-end">
        <Button size="lg">Save Changes</Button>
      </div>
    </div>
  );
}
