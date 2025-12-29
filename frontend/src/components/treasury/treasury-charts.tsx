"use client";

import { motion } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { formatNumber } from "@/lib/utils";

interface TreasuryData {
  ethBalance: number;
  tokenBalance: number;
  totalValue: number;
  assets: { name: string; value: number; color: string }[];
  history: { date: string; value: number }[];
}

interface TreasuryChartProps {
  data: TreasuryData;
}

export function TreasuryOverview({ data }: TreasuryChartProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Asset Distribution */}
      <div className="rounded-2xl bg-gray-900/50 border border-gray-800/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-6">
          Asset Distribution
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.assets}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={4}
                dataKey="value"
              >
                {data.assets.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl">
                        <p className="text-white font-medium">{data.name}</p>
                        <p className="text-gray-400">
                          ${formatNumber(data.value)}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        {/* Legend */}
        <div className="flex flex-wrap justify-center gap-4 mt-4">
          {data.assets.map((asset, index) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: asset.color }}
              />
              <span className="text-sm text-gray-400">{asset.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Treasury Value Over Time */}
      <div className="rounded-2xl bg-gray-900/50 border border-gray-800/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-6">
          Treasury Value Over Time
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data.history}>
              <defs>
                <linearGradient id="treasuryGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 12 }} />
              <YAxis
                stroke="#9ca3af"
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `$${formatNumber(value)}`}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl">
                        <p className="text-gray-400 text-sm">{label}</p>
                        <p className="text-white font-medium">
                          ${formatNumber(payload[0].value as number)}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke="#8b5cf6"
                strokeWidth={2}
                fill="url(#treasuryGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

interface AssetRowProps {
  name: string;
  symbol: string;
  balance: string;
  value: string;
  change: string;
  changeType: "positive" | "negative";
  icon: React.ReactNode;
}

export function AssetRow({
  name,
  symbol,
  balance,
  value,
  change,
  changeType,
  icon,
}: AssetRowProps) {
  return (
    <motion.div
      whileHover={{ backgroundColor: "rgba(255, 255, 255, 0.02)" }}
      className="flex items-center justify-between p-4 rounded-xl transition-colors"
    >
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500/20 to-purple-500/20 flex items-center justify-center">
          {icon}
        </div>
        <div>
          <p className="font-medium text-white">{name}</p>
          <p className="text-sm text-gray-400">{symbol}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-medium text-white">{balance}</p>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">{value}</span>
          <span
            className={`text-xs ${
              changeType === "positive" ? "text-green-400" : "text-red-400"
            }`}
          >
            {change}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
