"use client";

import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
} from "recharts";
import { formatNumber } from "@/lib/utils";

interface ActivityData {
  date: string;
  proposals: number;
  votes: number;
  participation: number;
}

interface ActivityChartProps {
  data: ActivityData[];
}

export function ActivityChart({ data }: ActivityChartProps) {
  return (
    <div className="rounded-2xl bg-gray-900/50 border border-gray-800/50 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Governance Activity</h3>
          <p className="text-sm text-gray-400 mt-1">
            Proposals and voting activity over time
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-violet-500" />
            <span className="text-xs text-gray-400">Proposals</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-xs text-gray-400">Votes</span>
          </div>
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="proposalGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="votesGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" stroke="#9ca3af" tick={{ fontSize: 12 }} />
            <YAxis stroke="#9ca3af" tick={{ fontSize: 12 }} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl">
                      <p className="text-gray-400 text-sm mb-2">{label}</p>
                      {payload.map((entry, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: entry.color }}
                          />
                          <span className="text-white">
                            {entry.name}: {formatNumber(entry.value as number)}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="proposals"
              name="Proposals"
              stroke="#8b5cf6"
              strokeWidth={2}
              fill="url(#proposalGradient)"
            />
            <Area
              type="monotone"
              dataKey="votes"
              name="Votes"
              stroke="#10b981"
              strokeWidth={2}
              fill="url(#votesGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface ParticipationData {
  month: string;
  rate: number;
}

interface ParticipationChartProps {
  data: ParticipationData[];
}

export function ParticipationChart({ data }: ParticipationChartProps) {
  return (
    <div className="rounded-2xl bg-gray-900/50 border border-gray-800/50 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Participation Rate</h3>
          <p className="text-sm text-gray-400 mt-1">
            Percentage of token holders voting
          </p>
        </div>
      </div>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="month" stroke="#9ca3af" tick={{ fontSize: 12 }} />
            <YAxis
              stroke="#9ca3af"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl">
                      <p className="text-gray-400 text-sm">{label}</p>
                      <p className="text-white font-medium">
                        {(payload[0].value as number).toFixed(1)}% participation
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar
              dataKey="rate"
              fill="url(#barGradient)"
              radius={[4, 4, 0, 0]}
            />
            <defs>
              <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
