# Governance Domain Split v1

## Decision

The Tolani governance model is split into two independent authority domains:

1. **Tolani Ecosystem DAO, LLC** — enterprise and corporate-support governance.
2. **Tolani Foundation Community DAO (TFDAO)** — a Foundation-controlled public-benefit community governance domain.

This repository remains the canonical implementation repository for **Tolani Ecosystem DAO, LLC** and TUT enterprise utility/governance infrastructure. It is **not** the legal or technical source of authority for Foundation charitable assets.

## Enterprise DAO mandate

Tolani Ecosystem DAO, LLC may coordinate:

- enterprise protocol governance;
- TUT utility standards and technical interoperability;
- enterprise role and operator registries;
- enterprise treasury governance;
- ecosystem partner and authorized-operator registries;
- shared infrastructure and cross-company proposals.

It must not directly govern:

- Foundation restricted donations;
- Foundation unrestricted assets;
- a Foundation Community DAO treasury;
- Foundation employment or safeguarding;
- Foundation tax, legal or donor-restriction decisions;
- charitable program execution merely because enterprise governance approved a proposal.

## Foundation Community DAO boundary

TFDAO is a separate governance domain under The Tolani Foundation. Its authority must come from Foundation governing documents and an explicit delegation policy.

Eligible community-governance subjects may include LOE priority signaling, community proposals, delegated open-treasury allocations, grant rounds, working groups and public impact review.

Reserved matters remain with the Foundation institution, including donor restrictions, employment, safeguarding, legal/tax obligations, privacy, related-party approvals and emergency controls.

## Cross-domain rule

A decision made in one domain never becomes executable authority in another domain automatically.

Cross-domain requests use a proposal/receipt workflow:

```text
Origin DAO
  -> Cross-domain proposal
  -> Target-domain authority review
  -> Target-domain decision receipt
  -> DEBO route
  -> TaskStaff mission (if authorized)
```

For economic transfers or paid services between an affiliated enterprise entity and the Foundation, the target Foundation workflow must include related-party review and independent approval evidence before execution.

## Treasury rule

The migration does not authorize movement of assets. Treasury domains remain separate:

- Foundation restricted treasury;
- Foundation general/unrestricted treasury;
- Foundation Community DAO treasury;
- Tolani Ecosystem DAO enterprise treasury.

No shared wallet, accounting tag or token balance substitutes for these authority boundaries.

## TUT rule

TUT may remain a shared utility rail. TUT utility does not create shared governance rights across domains. This repository's Governor/Treasury contracts govern only the enterprise DAO unless a future, separately approved deployment explicitly states otherwise.

## Activation posture

This v1 change is **SPECIFICATION / SHADOW ONLY**:

- no production treasury execution;
- no new Safe module authority;
- no production smart-contract migration;
- no Foundation funds moved;
- no Foundation legal wrapper created;
- no automatic cross-domain execution.

Production activation requires independent legal/governance review, exact deployment evidence and separately approved release authority.
