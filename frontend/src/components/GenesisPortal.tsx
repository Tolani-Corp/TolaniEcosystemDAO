'use client'

import React, { useState, useEffect } from 'react'
import {
    Zap,
    ShieldCheck,
    TrendingUp,
    Crown,
    Sparkles,
    Activity,
    ArrowRight,
    Gift
} from 'lucide-react'

export default function GenesisPortal() {
    const [pulse, setPulse] = useState(0.8)

    useEffect(() => {
        const interval = setInterval(() => {
            setPulse(prev => (prev === 0.8 ? 1.0 : 0.8))
        }, 2000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="relative overflow-hidden rounded-3xl bg-zinc-950 p-8 border border-zinc-800 shadow-2xl">
            {/* Dynamic Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-transparent pointer-events-none" />

            {/* Content */}
            <div className="relative z-10 space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight text-white mb-2">Echo of the DAO</h2>
                        <p className="text-zinc-400 text-sm max-w-md">
                            The Genesis Portal is the heart of the Tolani Ecosystem.
                            Exclusive access for original supporters and ecosystem partners.
                        </p>
                    </div>
                    <div className="flex -space-x-3">
                        {[1, 2, 3, 4].map((i) => (
                            <div
                                key={i}
                                className="w-10 h-10 rounded-full border-2 border-zinc-950 bg-zinc-800 flex items-center justify-center overflow-hidden"
                            >
                                <div className="w-full h-full bg-gradient-to-tr from-indigo-600 to-purple-600 opacity-80" />
                            </div>
                        ))}
                        <div className="w-10 h-10 rounded-full border-2 border-zinc-950 bg-zinc-900 flex items-center justify-center text-[10px] text-white font-bold">
                            +142
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* TUT Pulse Card */}
                    <div className="group relative rounded-2xl bg-zinc-900/50 p-6 border border-zinc-800 hover:border-indigo-500/50 transition-all duration-500 backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                                <Activity className="w-5 h-5" />
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">Live Pulse</span>
                            </div>
                        </div>
                        <h3 className="text-white font-semibold mb-1">TUT Ecosystem Health</h3>
                        <div className="flex items-end gap-2 mb-4">
                            <span className="text-2xl font-bold text-white leading-none">98.2</span>
                            <span className="text-xs text-green-400 mb-1 flex items-center">
                                <TrendingUp className="w-3 h-3 mr-0.5" /> +2.4%
                            </span>
                        </div>
                        <div className="h-12 flex items-end gap-1 px-1">
                            {[40, 70, 45, 90, 65, 80, 55, 95, 75, 85].map((h, i) => (
                                <div
                                    key={i}
                                    className="flex-1 bg-indigo-500/30 rounded-t-sm transition-all duration-1000"
                                    style={{ height: `${h}%`, opacity: pulse }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* BettorsACE VIP Slot */}
                    <div className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900/40 to-purple-900/40 p-6 border border-zinc-800/50 hover:border-ace-gold/30 transition-all duration-500">
                        <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-100 transition-opacity">
                            <Crown className="w-12 h-12 text-indigo-400" />
                        </div>
                        <div className="flex items-center gap-2 mb-4">
                            <ShieldCheck className="w-5 h-5 text-indigo-400" />
                            <span className="text-[10px] text-indigo-300 font-bold uppercase tracking-widest">Partner Status</span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">BettorsACE VIP</h3>
                        <p className="text-zinc-400 text-xs mb-6">
                            Treasury Contribution: <span className="text-indigo-300 font-mono">15,000,000 TUT</span>
                        </p>
                        <button className="flex items-center justify-between w-full px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-bold rounded-xl transition-colors group">
                            Access Private Vault
                            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>

                    {/* Genesis NFT Reveal */}
                    <div className="group relative rounded-2xl bg-zinc-900/50 p-6 border border-zinc-800 border-dashed hover:border-purple-500/50 transition-all duration-500">
                        <div className="flex flex-col items-center justify-center py-4 text-center">
                            <div className="relative mb-4">
                                <div className="absolute inset-0 bg-purple-500/20 blur-xl rounded-full" />
                                <Gift className="relative w-12 h-12 text-purple-400 animate-bounce" />
                            </div>
                            <h3 className="text-white font-semibold mb-1">Founder's NFT Series</h3>
                            <p className="text-zinc-500 text-[10px] mb-4">Claimable by Genesis members only</p>
                            <div className="flex items-center gap-1 text-[10px] text-purple-400 font-bold uppercase tracking-widest">
                                <Sparkles className="w-3 h-3" /> Incoming Drop
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                            <Zap className="w-4 h-4 text-yellow-500" />
                            <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest">Global Governance Active</span>
                        </div>
                        <div className="w-px h-3 bg-zinc-800" />
                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-400 uppercase tracking-widest cursor-pointer hover:text-indigo-300">
                            View Whitepaper
                        </div>
                    </div>
                    <div className="text-[10px] text-zinc-600 font-mono">
                        BLOCK_H: 1,842,912
                    </div>
                </div>
            </div>
        </div>
    )
}
