# Tolani DAO AI Engineering MCP System

Implementation of the AI Engineering MCP system as formalized in `docs/tolani_dao_ai_engineer_formalization.md`.

## Overview

This system provides governance-controlled AI engineering capabilities for the Tolani DAO, with:
- **Risk-tiered permissions** (Tier 0-3)
- **Policy enforcement** via policy-as-code
- **Audit logging** for all actions
- **Budget controls** for AI operations
- **Multi-stakeholder approvals** for sensitive operations

## Architecture

```
ai-engineering-mcp/
├── src/
│   ├── index.js                 # Main entry point
│   ├── policy-engine.js         # Risk tier policy enforcement
│   ├── audit-logger.js          # Append-only audit log
│   ├── budget-tracker.js        # Spend tracking and caps
│   ├── approval-system.js       # Multi-stakeholder approvals
│   ├── capabilities/            # Tiered capabilities
│   │   ├── tier0-readonly.js
│   │   ├── tier1-lowrisk.js
│   │   ├── tier2-operational.js
│   │   └── tier3-production.js
│   └── tools/                   # MCP tool implementations
│       ├── github-tools.js
│       └── ci-tools.js
├── config/
│   ├── policy.json              # Policy configuration
│   └── budgets.json             # Budget limits
├── scripts/
│   └── init-audit-log.js        # Initialize audit log
└── tests/
    └── policy-engine.test.js    # Test suite
```

## Quick Start

```bash
# Install dependencies
npm install

# Initialize audit log
npm run init-audit-log

# Run policy check
npm run policy-check

# Start the MCP server
npm start
```

## Risk Tiers

### Tier 0 — Read-only (No approvals)
- Read repos, docs, runbooks, logs, metrics, costs
- RAG Q&A, architecture drafts, threat modeling suggestions
- Retrieval debugging, test design proposals

### Tier 1 — Low-risk write (1 approval)
- Draft PRs, docs updates, tests, refactors behind feature flags
- Non-prod config changes
- **Approval**: GitHub maintainer review OR AI Engineering Steward sign-off

### Tier 2 — Operational changes (2 approvals)
- CI/CD changes, IaC changes, vector index/schema changes
- Staging deployments
- **Approval**: AI Engineering Steward + Security Council

### Tier 3 — Production-critical (DAO path + time delay)
- Prod deploys, IAM writes, database migrations, spending increases
- **Approval**: Security Council + DAO-approved execution path (Safe transaction)

## Configuration

Create a `.env` file with required configuration:

```env
# Audit Log
AUDIT_LOG_PATH=./audit-log

# Budget Limits (USD)
BUDGET_TIER0_SESSION=10
BUDGET_TIER1_TASK=100
BUDGET_TIER2_WINDOW=1000
BUDGET_TIER3_EXPLICIT=0

# GitHub Integration
GITHUB_TOKEN=your_token_here
GITHUB_ORG=Tolani-Corp

# Security
ENABLE_TIER2=false
ENABLE_TIER3=false
```

## Implementation Status

### Phase 1 (Days 0-30) - Minimum Capable Engineer ✅
- [x] Project structure
- [x] Policy engine foundation
- [x] Tier 0 capabilities (read-only)
- [x] Tier 1 capabilities (low-risk write)
- [x] Audit logging
- [x] Budget tracking
- [ ] GitHub MCP integration
- [ ] CI MCP integration
- [ ] Evaluation harness

### Phase 2 (Days 31-60) - Operational Competence
- [ ] Tier 2 capabilities
- [ ] Security Council approval workflows
- [ ] Retrieval diagnostics
- [ ] Regression testing

### Phase 3 (Days 61-90) - Controlled Autonomy
- [ ] Tier 3 capabilities
- [ ] Safe/Snapshot integration
- [ ] Strategy memo generation
- [ ] Complete runbooks

## License

MIT
