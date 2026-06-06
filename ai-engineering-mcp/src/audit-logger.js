/**
 * Audit Logger - Append-only audit log
 * 
 * Records all actions, policy checks, and tool calls for accountability and compliance.
 */

import { appendFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const AUDIT_LOG_PATH = process.env.AUDIT_LOG_PATH || './audit-log';
const LOG_FILE = join(AUDIT_LOG_PATH, 'audit.jsonl');

/**
 * Initialize audit log directory
 */
export function initAuditLog() {
  if (!existsSync(AUDIT_LOG_PATH)) {
    mkdirSync(AUDIT_LOG_PATH, { recursive: true });
  }
}

/**
 * Write an audit log entry
 * 
 * @param {Object} entry - Log entry data
 */
export function auditLog(entry) {
  initAuditLog();
  
  const logEntry = {
    ...entry,
    timestamp: entry.timestamp || new Date().toISOString(),
    version: '1.0'
  };

  try {
    appendFileSync(LOG_FILE, JSON.stringify(logEntry) + '\n', 'utf-8');
  } catch (error) {
    console.error('Failed to write audit log:', error.message);
  }
}

/**
 * Log a tool call
 */
export function logToolCall(toolName, params, result, metadata = {}) {
  auditLog({
    type: 'tool_call',
    tool: toolName,
    params,
    result: {
      success: result.success,
      error: result.error || null
    },
    metadata,
    spend: metadata.spend || 0,
    latency: metadata.latency || 0
  });
}

/**
 * Log a prompt execution
 */
export function logPrompt(prompt, response, metadata = {}) {
  auditLog({
    type: 'prompt',
    prompt_version: metadata.prompt_version || 'unknown',
    prompt_truncated: prompt.substring(0, 500),
    response_truncated: response.substring(0, 500),
    tokens: metadata.tokens || 0,
    spend: metadata.spend || 0,
    latency: metadata.latency || 0,
    model: metadata.model || 'unknown'
  });
}

/**
 * Log a diff produced
 */
export function logDiff(file, diff, metadata = {}) {
  auditLog({
    type: 'diff',
    file,
    diff_size: diff.length,
    additions: metadata.additions || 0,
    deletions: metadata.deletions || 0,
    approved_by: metadata.approved_by || null
  });
}

/**
 * Log budget usage
 */
export function logBudgetUsage(category, amount, remaining) {
  auditLog({
    type: 'budget',
    category,
    amount,
    remaining,
    alert: remaining < 0 ? 'BUDGET_EXCEEDED' : null
  });
}

// CLI mode for testing
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Audit Logger - Testing log writes\n');
  
  initAuditLog();
  
  console.log('Writing test entries...');
  auditLog({
    type: 'test',
    message: 'Test audit log entry'
  });
  
  logToolCall('code_search', { query: 'authentication' }, { success: true }, { spend: 0.01, latency: 150 });
  logPrompt('Find all TODO comments', 'Found 42 TODO comments', { tokens: 100, spend: 0.002, model: 'gpt-4' });
  
  console.log(`\nAudit log written to: ${LOG_FILE}`);
  console.log('Check the file for entries.');
}
