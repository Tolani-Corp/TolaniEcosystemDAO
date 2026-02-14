import { CheckCircle2, XCircle } from 'lucide-react'

const proposals = [
    {
        id: 1,
        title: 'TIP-5: Fund Q2 Marketing Campaign',
        status: 'Active',
        votesFor: '1.2M',
        votesAgainst: '50K',
        endsIn: '2 days',
        author: '0x123...abc',
    },
    {
        id: 2,
        title: 'TIP-4: Update Staking Rewards',
        status: 'Passed',
        votesFor: '3.5M',
        votesAgainst: '100K',
        endsIn: 'Ended',
        author: '0x456...def',
    },
    {
        id: 3,
        title: 'TIP-3: Add New Asset to Treasury',
        status: 'Rejected',
        votesFor: '500K',
        votesAgainst: '2.1M',
        endsIn: 'Ended',
        author: '0x789...ghi',
    },
]

export default function ProposalList() {
    return (
        <div className="overflow-hidden bg-white shadow sm:rounded-md dark:bg-zinc-900 dark:ring-1 dark:ring-zinc-800">
            <ul role="list" className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {proposals.map((proposal) => (
                    <li key={proposal.id}>
                        <a href={`/proposal/${proposal.id}`} className="block hover:bg-zinc-50 dark:hover:bg-zinc-800/50">
                            <div className="px-4 py-4 sm:px-6">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <p className="truncate text-sm font-medium text-indigo-600 dark:text-indigo-400">{proposal.title}</p>
                                        <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${proposal.status === 'Active' ? 'bg-green-50 text-green-700 ring-green-600/20 dark:bg-green-400/10 dark:text-green-400 dark:ring-green-400/20' :
                                            proposal.status === 'Passed' ? 'bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-400/10 dark:text-blue-400 dark:ring-blue-400/20' :
                                                'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-400/10 dark:text-red-400 dark:ring-red-400/20'
                                            }`}>
                                            {proposal.status}
                                        </span>
                                    </div>
                                    <div className="ml-2 flex flex-shrink-0">
                                        <p className="inline-flex rounded-full bg-zinc-100 px-2 text-xs font-semibold leading-5 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
                                            {proposal.endsIn}
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-2 sm:flex sm:justify-between">
                                    <div className="sm:flex">
                                        <p className="flex items-center text-sm text-zinc-500 dark:text-zinc-400">
                                            <CheckCircle2 className="mr-1.5 h-5 w-5 flex-shrink-0 text-green-400" aria-hidden="true" />
                                            {proposal.votesFor} For
                                        </p>
                                        <p className="mt-2 flex items-center text-sm text-zinc-500 sm:mt-0 sm:ml-6 dark:text-zinc-400">
                                            <XCircle className="mr-1.5 h-5 w-5 flex-shrink-0 text-red-400" aria-hidden="true" />
                                            {proposal.votesAgainst} Against
                                        </p>
                                    </div>
                                    <div className="mt-2 flex items-center text-sm text-zinc-500 sm:mt-0 dark:text-zinc-400">
                                        <p>
                                            Author: <span className="font-mono text-zinc-900 dark:text-zinc-200">{proposal.author}</span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </a>
                    </li>
                ))}
            </ul>
        </div>
    )
}
