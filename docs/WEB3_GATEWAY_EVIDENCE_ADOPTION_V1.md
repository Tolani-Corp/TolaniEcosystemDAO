# Web3 Gateway Evidence Adoption — DAO V1

**Status: candidate / review-only. No production, mint, transfer, treasury, governance execution or public publishing authority.**

TolaniLabs owns the `tolani.web3-gateway-fabric.v1` contract. The DAO receives only approved-public artifact observations for independently reviewed evidence, not IPFS-based legal membership or token entitlement claims.

- Canonical source record remains in DAO application/Convex and its separately governed legal and issuance records.
- A public artifact is provided as bytes plus CID, independently-sourced SHA-256, sourceRef and approvalReceiptRef.
- `scripts/verify-web3-public-evidence-v1.cjs` verifies SHA-256 and receipt shape offline; source and approval assertions still require external authoritative resolution.
- Successful checks are **OBSERVED** only, not verified Z4 authority. No automatic entitlement, NFT, DAO vote, issuance or treasury effect.
- Content-addressed IPFS availability requires a separately approved publisher/pinner; this increment performs no publishing.
- TLS/provider host, rights/privacy, executable DEBO policy, network deployment and legal agreement reconciliation must be completed separately.

Validation from DAO repo root (Node 22+):

```sh
node --test test/web3-public-evidence-v1.test.cjs
node scripts/verify-web3-public-evidence-v1.cjs receipt.json approved-public-artifact.bin
```

The CLI second command is a **sample invocation**, and requires independently generated evidence files; do not commit customer, payroll, worker or protected program evidence. Zero blockchain execution privileges are provided.
