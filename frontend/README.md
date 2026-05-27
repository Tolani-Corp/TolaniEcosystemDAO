This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## DAO Evidence Handoff

Tolani Labs sends approved validation packets directly into the DAO Convex `labsEvidence:submit` mutation. The DAO frontend stays static-exportable; it reads and reviews those packets from Convex at `/dao-evidence`.

Configure:

- `NEXT_PUBLIC_CONVEX_URL` for the DAO frontend Convex deployment.
- `DAO_EVIDENCE_HANDOFF_SECRET` in the DAO Convex environment when you want Labs submissions to require a shared secret.
- `TSG_ECOSYSTEM_SYNC_URL` plus `TSG_ECOSYSTEM_SYNC_KEY` in the DAO Convex environment when DAO evidence review/execution state should write back to the TSG `/api/ecosystem/sync` ledger.

Run the local packet-contract smoke check without live Convex:

```bash
npm run smoke:dao-evidence
```

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
