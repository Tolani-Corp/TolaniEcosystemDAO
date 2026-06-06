/**
 * Policy Engine - Risk Tier Enforcement
 * 
 * Enforces the governance policies defined in the formalization document.
 * Every tool call must pass through this policy check.
 */

import { readFileSync } from 'fs';
import { auditLog } from './audit-logger.js';

// Risk tier definitions
export const RiskTier = {
  TIER0_READONLY: 0,
  TIER1_LOWRISK: 1,
  TIER2_OPERATIONAL: 2,
  TIER3_PRODUCTION: 3
};

/**
 * Policy Engine class
 */
export class PolicyEngine {
  constructor(config = {}) {
    this.config = config;
    this.denylist = new Set();
    this.loadPolicyConfig();
  }

  loadPolicyConfig() {
    try {
      const policyPath = this.config.policyPath || './config/policy.json';
      const policyData = JSON.parse(readFileSync(policyPath, 'utf-8'));
      this.capabilities = policyData.capabilities || {};
      this.environments = policyData.environments || {};
      this.denylist = new Set(policyData.denylist || []);
    } catch (error) {
      console.warn('Policy config not found, using defaults');
      this.loadDefaultPolicy();
    }
  }

  loadDefaultPolicy() {
    // Default policy from formalization document
    this.capabilities = {
      'code_search': { tier: 0, enabled: true, scope: ['*'] },
      'repo_analysis': { tier: 0, enabled: true, scope: ['*'] },
      'generate_pr': { tier: 1, enabled: true, scope: ['*'] },
      'run_tests': { tier: 1, enabled: true, scope: ['dev', 'test'] },
      'modify_ci': { tier: 2, enabled: false, scope: ['dev', 'staging'] },
      'deploy_staging': { tier: 2, enabled: false, scope: ['staging'] },
      'deploy_production': { tier: 3, enabled: false, scope: ['production'] },
      'write_infra': { tier: 3, enabled: false, scope: ['*'] }
    };
    
    this.environments = {
      'dev': { tier: 0 },
      'test': { tier: 0 },
      'staging': { tier: 2 },
      'production': { tier: 3 }
    };
  }

  /**
   * Check if an action is allowed
   * 
   * @param {Object} request - Action request
   * @param {string} request.requested_action - Action name
   * @param {number} request.risk_tier - Risk tier level
   * @param {string} request.scope - Target scope (repo/environment/service)
   * @param {string} request.justification - Reason for the action
   * @param {Object} request.approval_artifact - Approval evidence (if required)
   * @returns {Object} Decision with allowed flag and reason
   */
  checkPolicy(request) {
    const {
      requested_action,
      risk_tier,
      scope,
      justification,
      approval_artifact
    } = request;

    // Log the policy check
    auditLog({
      type: 'policy_check',
      action: requested_action,
      tier: risk_tier,
      scope,
      justification,
      timestamp: new Date().toISOString()
    });

    // Check if action is on denylist
    if (this.denylist.has(requested_action)) {
      return {
        allowed: false,
        reason: `Action '${requested_action}' is on the denylist`
      };
    }

    // Get capability configuration
    const capability = this.capabilities[requested_action];
    if (!capability) {
      return {
        allowed: false,
        reason: `Unknown action '${requested_action}'`
      };
    }

    // Check if capability is enabled
    if (!capability.enabled) {
      return {
        allowed: false,
        reason: `Action '${requested_action}' is disabled by policy`
      };
    }

    // Check tier match
    if (capability.tier !== risk_tier) {
      return {
        allowed: false,
        reason: `Action '${requested_action}' tier mismatch (expected ${capability.tier}, got ${risk_tier})`
      };
    }

    // Check scope
    if (!this.isScopeAllowed(capability.scope, scope)) {
      return {
        allowed: false,
        reason: `Action '${requested_action}' not allowed for scope '${scope}'`
      };
    }

    // Check if approval is required and provided
    const approvalRequired = this.getApprovalRequirement(risk_tier);
    if (approvalRequired.count > 0) {
      if (!approval_artifact) {
        return {
          allowed: false,
          reason: `Action requires ${approvalRequired.count} approval(s): ${approvalRequired.roles.join(', ')}`
        };
      }

      // Validate approval artifact
      const approvalValid = this.validateApproval(approval_artifact, approvalRequired);
      if (!approvalValid.valid) {
        return {
          allowed: false,
          reason: approvalValid.reason
        };
      }
    }

    return {
      allowed: true,
      reason: 'Policy check passed'
    };
  }

  /**
   * Check if scope is allowed for capability
   */
  isScopeAllowed(allowedScopes, requestedScope) {
    if (allowedScopes.includes('*')) return true;
    return allowedScopes.includes(requestedScope);
  }

  /**
   * Get approval requirements for risk tier
   */
  getApprovalRequirement(tier) {
    switch (tier) {
      case RiskTier.TIER0_READONLY:
        return { count: 0, roles: [] };
      case RiskTier.TIER1_LOWRISK:
        return { count: 1, roles: ['AI Engineering Steward', 'GitHub Maintainer'] };
      case RiskTier.TIER2_OPERATIONAL:
        return { count: 2, roles: ['AI Engineering Steward', 'Security Council'] };
      case RiskTier.TIER3_PRODUCTION:
        return { count: 3, roles: ['Security Council', 'DAO Safe Transaction', 'Time Delay Satisfied'] };
      default:
        return { count: 0, roles: [] };
    }
  }

  /**
   * Validate approval artifact
   */
  validateApproval(artifact, requirement) {
    // TODO: Implement actual approval validation (signatures, transaction hashes, etc.)
    // For now, just check that the artifact exists and has required fields
    
    if (!artifact.approvals || !Array.isArray(artifact.approvals)) {
      return { valid: false, reason: 'Invalid approval artifact format' };
    }

    if (artifact.approvals.length < requirement.count) {
      return {
        valid: false,
        reason: `Insufficient approvals (got ${artifact.approvals.length}, need ${requirement.count})`
      };
    }

    return { valid: true };
  }
}

// CLI mode
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Policy Engine - Testing policy checks\n');
  
  const engine = new PolicyEngine();
  
  // Test cases
  const testCases = [
    {
      name: 'Tier 0: Code search (should pass)',
      request: {
        requested_action: 'code_search',
        risk_tier: 0,
        scope: 'TolaniEcosystemDAO',
        justification: 'Finding authentication logic',
        approval_artifact: null
      }
    },
    {
      name: 'Tier 1: Generate PR without approval (should fail)',
      request: {
        requested_action: 'generate_pr',
        risk_tier: 1,
        scope: 'TolaniEcosystemDAO',
        justification: 'Fix documentation typo',
        approval_artifact: null
      }
    },
    {
      name: 'Tier 2: Deploy to staging (disabled, should fail)',
      request: {
        requested_action: 'deploy_staging',
        risk_tier: 2,
        scope: 'staging',
        justification: 'Testing new feature',
        approval_artifact: {
          approvals: [
            { role: 'AI Engineering Steward', signature: '0x...' },
            { role: 'Security Council', signature: '0x...' }
          ]
        }
      }
    }
  ];

  testCases.forEach(({ name, request }) => {
    console.log(`\n${name}`);
    console.log('Request:', JSON.stringify(request, null, 2));
    const result = engine.checkPolicy(request);
    console.log('Result:', JSON.stringify(result, null, 2));
  });
}
