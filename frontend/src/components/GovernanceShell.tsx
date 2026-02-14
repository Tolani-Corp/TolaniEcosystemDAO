"use client"

import { useState } from 'react'
import Link from 'next/link'
import {
    Home as HomeIcon,
    FileText as DocumentTextIcon,
    BarChart3 as ChartBarIcon,
    Users as UserGroupIcon,
    Wallet as WalletIcon,
    Menu as Bars3Icon,
    X as XMarkIcon
} from 'lucide-react'

import clsx from 'clsx'

const navigation = [
    { name: 'Dashboard', href: '/', icon: HomeIcon },
    { name: 'Proposals', href: '/proposals', icon: DocumentTextIcon },
    { name: 'Treasury', href: '/treasury', icon: ChartBarIcon },
    { name: 'Delegates', href: '/delegates', icon: UserGroupIcon },
]

export default function GovernanceShell({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false)

    return (
        <div className="flex min-h-screen">
            {/* Sidebar for Desktop */}
            <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col border-r border-[var(--border-subtle)] bg-[var(--bg-surface)]">
                <div className="flex h-16 shrink-0 items-center px-6 gap-2">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[var(--tut-gold)] to-yellow-600" />
                    <span className="text-xl font-bold tracking-wide text-[var(--text-primary)]">Catalyst<span className="text-[var(--tut-gold)]">DAO</span></span>
                </div>
                <nav className="flex flex-1 flex-col px-6 pb-4">
                    <ul role="list" className="flex flex-1 flex-col gap-y-7 mt-8">
                        <li>
                            <ul role="list" className="-mx-2 space-y-1">
                                {navigation.map((item) => (
                                    <li key={item.name}>
                                        <Link
                                            href={item.href}
                                            className={clsx(
                                                'group flex gap-x-3 rounded-md p-2 text-sm font-semibold leading-6',
                                                'text-[var(--text-secondary)] hover:bg-[var(--bg-surface-hover)] hover:text-[var(--tut-gold)] transition-colors'
                                            )}
                                        >
                                            <item.icon className="h-6 w-6 shrink-0" aria-hidden="true" />
                                            {item.name}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </li>
                        <li className="mt-auto">
                            <div className="rounded-xl bg-gradient-to-br from-[var(--tut-base-teal)] to-black p-4 border border-[var(--border-subtle)]">
                                <p className="text-xs text-[var(--tut-gold)] font-mono mb-2">My Voting Power</p>
                                <p className="text-2xl font-bold text-white">450 TUT</p>
                            </div>
                        </li>
                    </ul>
                </nav>
            </div>

            {/* Mobile Header & Main Content */}
            <div className="lg:pl-72 flex flex-col flex-1 w-full">
                <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-[var(--border-subtle)] bg-[var(--bg-page)]/80 backdrop-blur-md px-4 lg:px-8">
                    <div className="flex items-center gap-4 lg:hidden">
                        <button onClick={() => setSidebarOpen(true)} className="-m-2.5 p-2.5 text-[var(--text-secondary)]">
                            <Bars3Icon className="h-6 w-6" />
                        </button>
                        <span className="font-bold text-[var(--text-primary)]">CatalystDAO</span>
                    </div>

                    <div className="flex flex-1 justify-end gap-4">
                        <button className="flex items-center gap-2 rounded-full bg-[var(--tut-gold)] px-4 py-2 text-sm font-semibold text-black hover:opacity-90 transition-opacity">
                            <WalletIcon className="h-4 w-4" />
                            Connect Wallet
                        </button>
                    </div>
                </header>

                <main className="py-8 px-4 lg:px-8">
                    {children}
                </main>
            </div>

            {/* Mobile Sidebar Overlay */}
            {sidebarOpen && (
                <div className="fixed inset-0 z-50 lg:hidden">
                    <div className="fixed inset-0 bg-black/80" onClick={() => setSidebarOpen(false)} />
                    <div className="fixed inset-y-0 left-0 w-full max-w-xs bg-[var(--bg-surface)] p-6">
                        <div className="flex items-center justify-between mb-8">
                            <span className="text-xl font-bold text-[var(--text-primary)]">CatalystDAO</span>
                            <button onClick={() => setSidebarOpen(false)}>
                                <XMarkIcon className="h-6 w-6 text-[var(--text-secondary)]" />
                            </button>
                        </div>
                        <nav className="flex flex-col gap-4">
                            {navigation.map((item) => (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className="flex items-center gap-3 text-lg font-medium text-[var(--text-secondary)]"
                                    onClick={() => setSidebarOpen(false)}
                                >
                                    <item.icon className="h-6 w-6" />
                                    {item.name}
                                </Link>
                            ))}
                        </nav>
                    </div>
                </div>
            )}
        </div>
    )
}
