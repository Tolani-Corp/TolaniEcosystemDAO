/**
 * AI Engineering MCP - Main Entry Point
 * 
 * Orchestrates the AI Engineering MCP system with governance controls.
 */

import { config } from 'dotenv';
import { PolicyEngine, RiskTier } from './policy-engine.js';
import { BudgetTracker } from './budget-tracker.js';
import { ApprovalSystem } from './approval-system.js';
import { initAuditLog, auditLog } from './audit-logger.js';

// Tier 0 capabilities
import { readRepository, searchCode, readDocumentation, getMetrics } from './capabilities/tier0-readonly.js';

// Tier 1 capabilities
import { generatePullRequest, updateDocumentation, runTests, updateFeatureFlag } from './capabilities/tier1-lowrisk.js';

// Load environment variables
config();

/**
 * AI Engineering MCP System
 */
class AIEngineeringMCP {
  constructor() {
    this.policyEngine = new PolicyEngine({ policyPath: './config/policy.json' });
    this.budgetTracker = new BudgetTracker({ budgetFile: './config/budgets.json' });
    this.approvalSystem = new ApprovalSystem();
    
    initAuditLog();
    
    auditLog({
      type: 'system_start',
      version: '0.1.0',
      config: {
        tier2_enabled: process.env.ENABLE_TIER2 === 'true',
        tier3_enabled: process.env.ENABLE_TIER3 === 'true'
      }
    });
  }

  /**
   * Execute an action with policy and budget checks
   */
  async executeAction(action, params, approvalArtifact = null) {
    // Get action metadata
    const actionMeta = this.getActionMetadata(action);
    
    if (!actionMeta) {
      throw new Error(`Unknown action: ${action}`);
    }

    // Check policy
    const policyCheck = this.policyEngine.checkPolicy({
      requested_action: action,
      risk_tier: actionMeta.tier,
      scope: params.scope || '*',
      justification: params.justification || 'No justification provided',
      approval_artifact: approvalArtifact
    });

    if (!policyCheck.allowed) {
      auditLog({
        type: 'action_denied',
        action,
        reason: policyCheck.reason
      });
      throw new Error(`Action denied: ${policyCheck.reason}`);
    }

    // Check budget
    const budgetCategory = this.getBudgetCategory(actionMeta.tier);
    const estimatedCost = actionMeta.estimatedCost || 0.01;
    
    if (!this.budgetTracker.canSpend(budgetCategory, estimatedCost)) {
      auditLog({
        type: 'action_denied',
        action,
        reason: 'Budget exceeded'
      });
      throw new Error(`Budget exceeded for category: ${budgetCategory}`);
    }

    // Execute the action
    let result;
    try {
      result = await actionMeta.handler(params);
      
      // Record actual spend
      this.budgetTracker.recordSpend(budgetCategory, estimatedCost);
      
      auditLog({
        type: 'action_completed',
        action,
        tier: actionMeta.tier,
        success: true
      });
    } catch (error) {
      auditLog({
        type: 'action_failed',
        action,
        tier: actionMeta.tier,
        error: error.message
      });
      throw error;
    }

    return result;
  }

  /**
   * Get action metadata
   */
  getActionMetadata(action) {
    const actions = {
      // Tier 0
      'repo_analysis': { tier: 0, handler: (p) => readRepository(p.repo, p.path), estimatedCost: 0 },
      'code_search': { tier: 0, handler: (p) => searchCode(p.query, p.scope), estimatedCost: 0.01 },
      'read_docs': { tier: 0, handler: (p) => readDocumentation(p.path), estimatedCost: 0 },
      'get_metrics': { tier: 0, handler: (p) => getMetrics(p.service, p.timeRange), estimatedCost: 0 },
      
      // Tier 1
      'generate_pr': { tier: 1, handler: (p) => generatePullRequest(p.repo, p.branch, p.changes, p.description), estimatedCost: 0.05 },
      'update_docs': { tier: 1, handler: (p) => updateDocumentation(p.path, p.content, p.reason), estimatedCost: 0.01 },
      'run_tests': { tier: 1, handler: (p) => runTests(p.repo, p.testSuite, p.environment), estimatedCost: 0.20 },
      'update_feature_flag': { tier: 1, handler: (p) => updateFeatureFlag(p.flagName, p.enabled, p.environment), estimatedCost: 0 }
    };

    return actions[action] || null;
  }

  /**
   * Get budget category for tier
   */
  getBudgetCategory(tier) {
    const categories = {
      0: 'tier0_session',
      1: 'tier1_task',
      2: 'tier2_window',
      3: 'tier3_explicit'
    };
    return categories[tier] || 'tier0_session';
  }

  /**
   * Get system status
   */
  getStatus() {
    return {
      budgets: this.budgetTracker.getStatus(),
      pending_approvals: this.approvalSystem.listPending().length,
      config: {
        tier2_enabled: process.env.ENABLE_TIER2 === 'true',
        tier3_enabled: process.env.ENABLE_TIER3 === 'true'
      }
    };
  }
}

// CLI mode
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('AI Engineering MCP - Starting system\n');
  
  const system = new AIEngineeringMCP();
  
  console.log('System initialized successfully!');
  console.log('\nSystem Status:');
  console.log(JSON.stringify(system.getStatus(), null, 2));
  
  console.log('\n--- Testing Tier 0 Action ---');
  try {
    const result = await system.executeAction('code_search', {
      query: 'function transfer',
      scope: 'TolaniEcosystemDAO',
      justification: 'Finding transfer function implementation'
    });
    console.log('Success:', result.message);
  } catch (error) {
    console.error('Error:', error.message);
  }
  
  console.log('\n--- Testing Tier 1 Action (no approval) ---');
  try {
    await system.executeAction('generate_pr', {
      repo: 'Tolani-Corp/TolaniEcosystemDAO',
      branch: 'fix/typo',
      changes: [{ file: 'README.md', diff: '+Fixed typo', additions: 1, deletions: 0 }],
      description: 'Fix typo in README',
      justification: 'Correcting documentation error'
    });
    console.log('Success: PR generated (requires approval to merge)');
  } catch (error) {
    console.error('Expected error:', error.message);
  }
  
  console.log('\nFinal Status:');
  console.log(JSON.stringify(system.getStatus(), null, 2));
}

export default AIEngineeringMCP;
