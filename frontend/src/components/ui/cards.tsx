"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  icon: LucideIcon;
  gradient: string;
}

export function StatCard({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  gradient,
}: StatCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      className="relative overflow-hidden rounded-2xl bg-gray-900/50 border border-gray-800/50 p-6 backdrop-blur-sm"
    >
      {/* Gradient Background */}
      <div
        className={cn(
          "absolute inset-0 opacity-10 blur-2xl",
          gradient
        )}
      />

      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className={cn("p-3 rounded-xl", gradient.replace("bg-gradient-to-br", "bg-gradient-to-br"))}>
            <Icon className="w-6 h-6 text-white" />
          </div>
          {change && (
            <span
              className={cn(
                "px-2.5 py-1 text-xs font-medium rounded-full",
                changeType === "positive" && "bg-green-500/20 text-green-400",
                changeType === "negative" && "bg-red-500/20 text-red-400",
                changeType === "neutral" && "bg-gray-500/20 text-gray-400"
              )}
            >
              {change}
            </span>
          )}
        </div>
        <p className="text-gray-400 text-sm mb-1">{title}</p>
        <p className="text-3xl font-bold text-white">{value}</p>
      </div>
    </motion.div>
  );
}

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
}

export function GlassCard({ children, className }: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-2xl bg-gray-900/50 border border-gray-800/50 backdrop-blur-sm",
        className
      )}
    >
      {children}
    </motion.div>
  );
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between p-6 border-b border-gray-800/50">
      <div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {description && (
          <p className="text-sm text-gray-400 mt-1">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function CardContent({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={cn("p-6", className)}>{children}</div>;
}
