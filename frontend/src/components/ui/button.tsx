"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ButtonProps {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
}

export function Button({
  variant = "primary",
  size = "md",
  isLoading,
  children,
  className,
  disabled,
  onClick,
  type = "button",
}: ButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      disabled={disabled || isLoading}
      onClick={onClick}
      type={type}
      className={cn(
        "inline-flex items-center justify-center font-medium transition-all duration-200 rounded-xl",
        // Variants
        variant === "primary" &&
          "bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 text-white shadow-lg shadow-violet-500/25",
        variant === "secondary" &&
          "bg-gray-800/50 hover:bg-gray-700/50 text-white border border-gray-700/50",
        variant === "ghost" &&
          "hover:bg-white/5 text-gray-300 hover:text-white",
        variant === "danger" &&
          "bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30",
        // Sizes
        size === "sm" && "px-3 py-1.5 text-sm",
        size === "md" && "px-4 py-2.5 text-sm",
        size === "lg" && "px-6 py-3 text-base",
        // States
        (disabled || isLoading) && "opacity-50 cursor-not-allowed",
        className
      )}
    >
      {isLoading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </motion.button>
  );
}

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "success" | "warning" | "error" | "info";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        variant === "default" && "bg-gray-500/20 text-gray-400 border-gray-500/30",
        variant === "success" && "bg-green-500/20 text-green-400 border-green-500/30",
        variant === "warning" && "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
        variant === "error" && "bg-red-500/20 text-red-400 border-red-500/30",
        variant === "info" && "bg-blue-500/20 text-blue-400 border-blue-500/30",
        className
      )}
    >
      {children}
    </span>
  );
}

interface ProgressBarProps {
  value: number;
  max?: number;
  variant?: "default" | "success" | "warning" | "error";
  showLabel?: boolean;
  className?: string;
}

export function ProgressBar({
  value,
  max = 100,
  variant = "default",
  showLabel = false,
  className,
}: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className={cn("space-y-1", className)}>
      {showLabel && (
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">Progress</span>
          <span className="text-white">{percentage.toFixed(0)}%</span>
        </div>
      )}
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={cn(
            "h-full rounded-full",
            variant === "default" && "bg-gradient-to-r from-violet-500 to-purple-500",
            variant === "success" && "bg-gradient-to-r from-green-500 to-emerald-500",
            variant === "warning" && "bg-gradient-to-r from-yellow-500 to-orange-500",
            variant === "error" && "bg-gradient-to-r from-red-500 to-pink-500"
          )}
        />
      </div>
    </div>
  );
}
