import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatNumber(num: number, decimals = 2): string {
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(decimals) + "B";
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(decimals) + "M";
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(decimals) + "K";
  }
  return num.toFixed(decimals);
}

export function formatEther(wei: bigint, decimals = 4): string {
  const ether = Number(wei) / 1e18;
  return formatNumber(ether, decimals);
}

export function getProposalStateColor(state: string): string {
  const colors: Record<string, string> = {
    Pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    Active: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    Canceled: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    Defeated: "bg-red-500/20 text-red-400 border-red-500/30",
    Succeeded: "bg-green-500/20 text-green-400 border-green-500/30",
    Queued: "bg-purple-500/20 text-purple-400 border-purple-500/30",
    Expired: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    Executed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  };
  return colors[state] || colors.Pending;
}

export function getTimeRemaining(deadline: Date): string {
  const now = new Date();
  const diff = deadline.getTime() - now.getTime();
  
  if (diff <= 0) return "Ended";
  
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) return `${days}d ${hours}h remaining`;
  if (hours > 0) return `${hours}h ${minutes}m remaining`;
  return `${minutes}m remaining`;
}
