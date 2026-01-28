# AI Engineering MCP - Implementation Guide

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Initialize audit log**
   ```bash
   npm run init-audit-log
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run tests**
   ```bash
   npm test
   ```

5. **Test the system**
   ```bash
   npm start
   ```

## Usage Examples

### Tier 0: Read-only operations (No approvals required)

```javascript
import AIEngineeringMCP from './src/index.js';

const system = new AIEngineeringMCP();

// Search code
await system.executeAction('code_search', {
  query: 'function transfer',
  scope: 'TolaniEcosystemDAO',
  justification: 'Finding transfer function implementation'
});

// Read documentation
await system.executeAction('read_docs', {
  path: 'docs/README.md',
  justification: 'Understanding architecture'
});
```

### Tier 1: Low-risk writes (Requires 1 approval)

```javascript
// Generate a PR (draft)
await system.executeAction('generate_pr', {
  repo: 'Tolani-Corp/TolaniEcosystemDAO',
  branch: 'fix/typo',
  changes: [
    { file: 'README.md', diff: '+Fixed typo', additions: 1, deletions: 0 }
  ],
  description: 'Fix typo in README',
  justification: 'Correcting documentation error'
}, approvalArtifact); // Must provide approval

// Run tests
await system.executeAction('run_tests', {
  repo: 'TolaniEcosystemDAO',
  testSuite: 'unit-tests',
  environment: 'test',
  justification: 'Validating code changes'
}, approvalArtifact);
```

### Requesting Approval

```javascript
import { ApprovalSystem } from './src/approval-system.js';

const approvalSystem = new ApprovalSystem();

// Request approval
const requestId = approvalSystem.requestApproval({
  action: 'generate_pr',
  tier: 1,
  scope: 'TolaniEcosystemDAO',
  justification: 'Fix critical bug',
  requester: 'AI Engineering Bot',
  required_approvers: ['AI Engineering Steward']
});

// Steward adds approval
approvalSystem.addApproval(requestId, {
  approver: 'AI Engineering Steward',
  role: 'AI Engineering Steward',
  signature: '0xabc123...'
});

// Get approval artifact for execution
const approvalArtifact = approvalSystem.getApprovalArtifact(requestId);

// Execute action with approval
await system.executeAction('generate_pr', params, approvalArtifact);
```

## Testing Individual Components

### Policy Engine
```bash
node src/policy-engine.js
```

### Budget Tracker
```bash
node src/budget-tracker.js
```

### Audit Logger
```bash
node src/audit-logger.js
```

### Approval System
```bash
node src/approval-system.js
```

### Tier 0 Capabilities
```bash
node src/capabilities/tier0-readonly.js
```

### Tier 1 Capabilities
```bash
node src/capabilities/tier1-lowrisk.js
```

## Monitoring

### Check Budget Status
```javascript
const status = system.getStatus();
console.log(status.budgets);
```

### View Audit Logs
```bash
cat audit-log/audit.jsonl | jq .
```

### Filter Audit Logs
```bash
# View all policy checks
grep '"type":"policy_check"' audit-log/audit.jsonl | jq .

# View all tool calls
grep '"type":"tool_call"' audit-log/audit.jsonl | jq .

# View budget usage
grep '"type":"budget"' audit-log/audit.jsonl | jq .
```

## Security Considerations

1. **Audit logs** are append-only and should never be deleted
2. **Budget files** contain sensitive usage data
3. **Tier 2 and 3** are disabled by default
4. **Approvals** require cryptographic signatures (to be implemented)
5. **All actions** are logged with full context

## Next Steps

- [ ] Integrate with actual GitHub API
- [ ] Implement CI/CD integration
- [ ] Add cryptographic signature verification
- [ ] Connect to Safe multisig for Tier 3 approvals
- [ ] Build evaluation harness
- [ ] Add RAG system for documentation
- [ ] Implement strategy memo generation

## Support

For issues or questions, contact the Tolani DAO community or open an issue on GitHub.
