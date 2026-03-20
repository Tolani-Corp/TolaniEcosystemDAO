/**
 * Initialize audit log
 */

import { mkdirSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';

const AUDIT_LOG_PATH = process.env.AUDIT_LOG_PATH || './audit-log';

console.log('Initializing audit log system...\n');

// Create audit log directory
if (!existsSync(AUDIT_LOG_PATH)) {
  mkdirSync(AUDIT_LOG_PATH, { recursive: true });
  console.log(`✓ Created audit log directory: ${AUDIT_LOG_PATH}`);
} else {
  console.log(`✓ Audit log directory already exists: ${AUDIT_LOG_PATH}`);
}

// Create initial audit log file with header
const logFile = join(AUDIT_LOG_PATH, 'audit.jsonl');
if (!existsSync(logFile)) {
  const header = {
    type: 'audit_log_initialized',
    version: '1.0',
    timestamp: new Date().toISOString(),
    message: 'Audit log system initialized'
  };
  writeFileSync(logFile, JSON.stringify(header) + '\n', 'utf-8');
  console.log(`✓ Created audit log file: ${logFile}`);
} else {
  console.log(`✓ Audit log file already exists: ${logFile}`);
}

// Create README
const readmePath = join(AUDIT_LOG_PATH, 'README.md');
const readmeContent = `# Audit Log

This directory contains append-only audit logs for the AI Engineering MCP system.

## Format

- **File**: audit.jsonl (JSON Lines format)
- **Structure**: One JSON object per line
- **Retention**: Permanent (never delete)

## Log Types

- \`system_start\` - System initialization
- \`policy_check\` - Policy enforcement checks
- \`tool_call\` - Tool executions
- \`prompt\` - Prompt executions
- \`diff\` - Code diffs generated
- \`budget\` - Budget usage
- \`approval_requested\` - Approval requests
- \`approval_added\` - Approvals granted
- \`action_completed\` - Successful actions
- \`action_failed\` - Failed actions
- \`action_denied\` - Policy-denied actions

## Security

This log is append-only and should be:
- Backed up regularly
- Never modified or deleted
- Monitored for anomalies
- Used for compliance audits

## Querying

Use standard JSON tools to query the log:

\`\`\`bash
# Get all policy checks
grep '"type":"policy_check"' audit.jsonl | jq .

# Get all failed actions
grep '"type":"action_failed"' audit.jsonl | jq .

# Get budget usage
grep '"type":"budget"' audit.jsonl | jq .
\`\`\`
`;

writeFileSync(readmePath, readmeContent, 'utf-8');
console.log(`✓ Created README: ${readmePath}`);

console.log('\n✅ Audit log system initialized successfully!');
