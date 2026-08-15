# Tolani Protocol Monorepo Migration

Status date: August 3, 2026

## Decision

Create `Tolani-Corp/tolani-protocol` as the sole canonical engineering repository for TUT, DAO governance, rewards, payment rails, credentials, deployment registries, chain reconciliation, SDKs, and protocol security controls.

Repository creation is an organization-administration action. The connected automation used for this migration can create branches, files, issues, and pull requests, but cannot create a new organization repository or configure repository-level branch protection. The repository must therefore be created as an empty internal repository before the retained seed can be pushed.

## Initial repository settings

- Owner: `Tolani-Corp`
- Name: `tolani-protocol`
- Initial visibility: internal
- Default branch: `main`
- Issues: enabled
- Discussions: disabled initially
- Releases: disabled until first audited protocol release
- Packages: disabled until package provenance and signing are configured
- Merge method: squash only
- Force pushes and branch deletion: disabled on `main`
- Required reviews: two, including CODEOWNER
- Required signed commits: enabled where organizational tooling permits
- Required checks: compile, unit, invariant, fork, storage layout, Slither, deployment-registry validation, dependency review, CodeQL

## Proposed monorepo structure

```text
apps/
  protocol-docs/              public technical documentation
  merchant-console/           merchant and terminal administration
  governance-console/         proposal, vote, timelock, and treasury visibility
packages/
  contracts-core/             canonical TUT and shared protocol primitives
  contracts-governance/       Governor, timelock, treasury, policy execution
  contracts-rewards/          uTUTv2, campaign budgets, conversion controls
  contracts-payments/         MerchantRegistryV2, TerminalRegistry, PaymentRouterV2
  contracts-credentials/      non-transferable credentials and registries
  contracts-legacy/           compile-disabled provenance snapshots only
  sdk/                        typed ABIs, addresses, payment intents, chain clients
  deployment-registry/        signed machine-readable network registry
  chain-reconciliation/       RPC-based bytecode, roles, balances, and proxy checks
  device-protocol/            terminal identity, attestation, and payment-intent schemas
  policy/                     governance, compliance, deployment, and release policies
services/
  indexer/                    chain events and reorg-safe reconciliation
  paymaster-policy/           ERC-4337 sponsorship controls
  relayer-legacy/             disabled compatibility evidence; no raw-key production use
hardware/
  pos-reference/              Tolani POS threat model, device profile, provisioning protocol
docs/
  architecture/
  audits/
  deployments/
  migration/
  operations/
```

## Source repositories and immutable import points

| Repository | Commit | Classification |
| --- | --- | --- |
| `Tolani-Corp/TolaniEcosystemDAO` | `210ea674811c1e219f3449384b3e058517859e0c` | Primary source for deployed DAO stack and POS prototypes |
| `Tolani-Corp/TolaniToken` | `61753df8949430b5de13b4b381b86e0febad16d6` | Historical implementation inventory and use-case contracts |
| `TolaniCorp/TolaniUtilityToken` | `0cf04e665108eecd8103e3adfabbcf7df33313d9` | Public documentation and historical provenance only |

Every imported file must retain source repository, source path, source commit, source blob SHA, content SHA-256, compiler version, license, and migration disposition.

## Canonical implementation decisions

### Migrate and harden

- `contracts/token/TUTToken.sol`
- `contracts/TUTTokenSmartV2.sol`
- current Governor, timelock, and treasury contracts tied to deployed addresses
- current training reward and converter contracts only as deployment provenance
- TCAS non-transferable credential contracts
- Base and Ethereum deployment manifests
- chain-reconciliation scripts

### Rewrite before production use

- uTUT as `uTUTv2`, with explicit transfer policy, immutable maximum issuance policy, campaign partitions, expiration/clawback controls, and audited conversion semantics
- payment rails as MerchantRegistryV2, TerminalRegistry, PaymentIntentV2, and PaymentRouterV2
- relayer as an ERC-4337/paymaster architecture using HSM, MPC, or managed KMS controls
- merchant refunds, disputes, settlement reserves, and idempotency
- POS terminal identity and attestation

### Archive as compile-disabled historical provenance

- `TolaniCorp/TolaniUtilityToken/contracts/**`
- `TolaniCorp/TolaniUtilityToken/backend/**`
- `Tolani-Corp/TolaniToken/contracts/04_TUTToken.sol`
- mirrored duplicate files under `Tolani-Corp/TolaniToken/hardhat/contracts/**`
- obsolete mock, faucet, deployment, payment-processor, staking, and liquidity implementations that are not tied to a currently recognized deployment
- timestamped deployment manifests superseded by the signed canonical registry

Archive files must not be included in Solidity source paths, package exports, deployment tasks, or CI compilation. They remain available only for provenance and historical review.

## Migration gates

1. Create the empty organization repository with the required settings.
2. Import the retained seed without deployment credentials or generated artifacts.
3. Generate `provenance.lock.json` from exact source blobs and SHA-256 digests.
4. Reconcile Ethereum and Base bytecode, proxy implementations, roles, balances, supplies, pause state, governance parameters, treasury funding, converter reserves, merchant/payment counts, and staking state.
5. Establish a single signed deployment registry.
6. Compile canonical packages independently.
7. Run unit, invariant, fuzz, fork, storage-layout, and access-control tests.
8. Run Slither, dependency review, CodeQL, and secret scanning.
9. Obtain protocol architecture and smart-contract security review.
10. Mark imported implementations as `canonical`, `rewrite-required`, `deployment-provenance`, or `archived`.
11. Update all applications to consume the generated SDK and deployment registry.
12. Only then remove duplicate executable source from the default branches of legacy repositories.

## Prohibitions

Until the migration passes all gates:

- no new production deployments from the seed repository;
- no POS mainnet activation;
- no uTUT expansion or representation as non-transferable;
- no staking activation or liquidity incentives;
- no removal of historical source before provenance is locked;
- no claim that source verification is an independent audit;
- no repository archive operation that would impair management of currently deployed contracts.
