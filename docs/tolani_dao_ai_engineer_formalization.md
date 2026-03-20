# Tolani DAO – AI Engineering MCP Formalization Pack (v0.1)

This document formalizes how the **Tolani DAO** governs, funds, and safely operates an **AI Engineering Bot / MCP system** (“AI Engineer”) that can influence software delivery and business strategy.

## 0. Design Goals

**Primary goals**
- Make the AI Engineer *useful enough* to deliver PRs, architecture proposals, cost models, and RAG systems.
- Make it *safe enough* to trust for high-impact decisions (prod, spend, data access).
- Make it *governable* by the DAO (ETH + Snapshot), while still fast enough to win.

**Non-goals**
- Full autonomy in production without human approval.
- “One model to rule them all” fine-tuning as the first step (not required to reach value).

---

## 1. Governance Architecture (ETH + Snapshot)

### 1.1 Governance layers
- **Snapshot**: fast, low-friction *signaling* governance (policy direction, budgets, elections).
- **Safe (multisig)**: on-chain execution authority (treasury control, high-risk permissioning, production-critical actions).
- **Delegated councils / stewards**: day-to-day approvals so the DAO does not bottleneck operations.

### 1.2 Required roles
1. **AI Engineering Steward(s)**  
   Approves Tier-1 engineering work, owns evaluation harness and prompt registry.
2. **Security Council**  
   Approves Tier-2/Tier-3 actions; controls prod write credentials; owns incident response.
3. **Treasury/Budget Steward**  
   Owns spend caps for inference/embeddings/cloud, approves budget changes.
4. **Data Steward**  
   Controls access to restricted data sources, retention rules, and deletion workflows.
5. **Product/Strategy Council**  
   Reviews strategic memos produced by the AI Engineer and endorses roadmap proposals.

> The DAO elects/ratifies these roles via Snapshot, with term lengths and removal procedures.

---

## 2. Risk Tier Policy (Core Governance Primitive)

### Tier 0 — Read-only (No approvals)
- Read repos, docs, runbooks, logs, metrics, costs
- RAG Q&A, architecture drafts, threat modeling suggestions
- Retrieval debugging, test design proposals

### Tier 1 — Low-risk write (1 approval)
- Draft PRs, docs updates, tests, refactors behind feature flags
- Non-prod config changes
**Approval**: GitHub maintainer review OR AI Engineering Steward sign-off.

### Tier 2 — Operational changes (2 approvals)
- CI/CD changes, IaC changes, vector index/schema changes, secrets *plans* (not execution)
- Staging deployments
**Approval**: AI Engineering Steward + Security Council.

### Tier 3 — Production-critical (DAO path + time delay)
- Prod deploys, IAM writes, database migrations, spending increases, model/provider switches
**Approval**: Security Council + DAO-approved execution path (Safe transaction), with rollback plan and time delay.

---

## 3. Capability Matrix (What the AI Engineer is allowed to do)

| Capability | Tier | Default | Notes |
|---|---:|---|---|
| Code search / repo analysis | 0 | Enabled | Always logged |
| Generate PR (draft) | 1 | Enabled | Requires review to merge |
| Run CI / tests | 1 | Enabled | Budget-capped |
| Modify CI config | 2 | Disabled | Requires 2 approvals |
| Deploy to staging | 2 | Disabled | Requires 2 approvals |
| Deploy to production | 3 | Disabled | Requires DAO/Safe path |
| Read cloud logs/metrics | 0 | Enabled | Read-only credentials |
| Write cloud infra (IaC apply) | 3 | Disabled | Never without Safe-gated creds |
| Create/modify vector indexes | 2 | Disabled | Must pass retrieval evals |
| Access restricted datasets | 2 | Disabled | Data Steward approval |

---

## 4. Budget & Spend Controls (Treasury Discipline)

### 4.1 Budget categories
- **Inference** (LLM calls)
- **Embeddings**
- **Reranking**
- **Vector DB**
- **CI minutes / compute**
- **Cloud ops** (logs, storage, bandwidth)

### 4.2 Spend policy (recommended)
- Tier 0: capped per session
- Tier 1: capped per PR/task
- Tier 2: capped per change window
- Tier 3: requires explicit budget authorization

**Hard rules**
- Automatic shutdown on anomaly (spend spike, tool-call loops)
- Budget changes require Treasury Steward or DAO approval (depending on amount)

---

## 5. Enforcement Architecture (Make governance real)

### 5.1 Policy engine (policy-as-code)
Every tool call must include:
- `requested_action`
- `risk_tier`
- `scope` (repo/environment/service)
- `justification`
- `approval_artifact` (if required)

Policy engine checks:
- Is tool allowed at this tier?
- Is environment allowed?
- Is approval artifact valid?
- Is budget available?
- Is action on denylist?

### 5.2 Approval artifacts (examples)
- Tier 1: GitHub review approval, or steward-signed approval record
- Tier 2: two approvals recorded (steward + security)
- Tier 3: Snapshot proposal + Safe transaction hash + time-delay satisfied

### 5.3 Audit logging
Append-only log of:
- prompts / chain versions
- retrieved docs and citations
- tool calls and parameters
- diffs produced
- tests run and outcomes
- spend and latency

---

## 6. Reference Technical Architecture (AWS + Vector DB)

### 6.1 Recommended default (fast + scalable)
- **Orchestrator**: LangGraph/LangChain running in containerized service (ECS/Fargate or EKS)
- **MCP servers**: separate services for GitHub, CI, Cloud, Data, Vector DB
- **RAG store**: managed vector DB (e.g., Pinecone) OR pgvector on Postgres for early stage
- **Docs storage**: S3 (raw + processed chunks), versioned
- **Metadata store**: Postgres (RDS/Aurora)
- **Eventing**: SQS/EventBridge for async tasks (ingestion, evals)
- **Secrets**: AWS Secrets Manager + KMS
- **Observability**: CloudWatch + centralized audit log sink (S3/OpenSearch optional)

### 6.2 Retrieval pipeline (minimum)
- ingestion → chunking → embedding → indexing
- retrieval (hybrid recommended) → rerank (optional) → context packer
- answer generator with citations and uncertainty reporting

### 6.3 Evaluation harness (required)
- Golden set: RAG questions, coding tasks, cloud ops tasks
- Metrics: correctness, faithfulness/groundedness, retrieval relevance, latency, cost
- Regression gates for prompt/tool/model changes

---

## 7. Strategy Mode (Business-grade outputs)

**Allowed outputs**
- Architecture tradeoffs, build-vs-buy, cost models, vendor comparisons
- Roadmap proposals with risk/ROI
- “Decision memos” with sources and assumptions

**Hard constraints**
- Strategy suggestions must cite sources or internal documents
- High-stakes decisions require council review
- No market manipulation or deceptive tactics

---

## 8. Operational Runbooks (Minimum)

1. **Onboard a new tool/MCP server**
   - propose → security review → sandbox → tiered enablement → audit
2. **Onboard a new dataset**
   - classify → PII scan → retention → access controls → embedding/indexing
3. **Upgrade prompts/models**
   - eval suite → staged rollout → monitor → rollback plan
4. **Incident response**
   - kill switch → revoke creds → postmortem → policy update

---

## 9. 30/60/90-Day Implementation Plan

### Days 0–30 (Minimum Capable Engineer)
- Tier 0 + Tier 1 only
- GitHub MCP + CI MCP (read/run)
- RAG over internal docs + repo
- PR drafting + test-running
- Logging + spend caps

### Days 31–60 (Operational competence)
- Tier 2 in staging only
- Retrieval diagnostics + reranking
- Strong evaluation harness + regressions
- Security Council procedures for approvals

### Days 61–90 (Controlled autonomy)
- Production actions remain Tier 3 only
- Formal Safe/Snapshot execution path for tier upgrades
- Strategy memos integrated into planning cadence

---

## 10. Appendices (Templates)

### A. Snapshot proposal types
- Constitution changes (risk tiers, denylist)
- Budget changes (monthly caps)
- Council elections/removals
- Enable Tier-3 capability (prod deploy, IAM write)

### B. “Decision memo” template (strategy mode)
- Objective
- Context and constraints
- Options considered
- Recommendation with reasoning
- Risks and mitigations
- Cost model
- Implementation plan
- Sources / citations
