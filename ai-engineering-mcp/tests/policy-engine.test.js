/**
 * Test suite for Policy Engine
 */

import { test } from 'node:test';
import assert from 'node:assert';
import { PolicyEngine, RiskTier } from '../src/policy-engine.js';

test('PolicyEngine - Tier 0 read-only action should pass', () => {
  const engine = new PolicyEngine();
  
  const result = engine.checkPolicy({
    requested_action: 'code_search',
    risk_tier: RiskTier.TIER0_READONLY,
    scope: 'TolaniEcosystemDAO',
    justification: 'Finding authentication logic',
    approval_artifact: null
  });
  
  assert.strictEqual(result.allowed, true);
  assert.strictEqual(result.reason, 'Policy check passed');
});

test('PolicyEngine - Tier 1 without approval should fail', () => {
  const engine = new PolicyEngine();
  
  const result = engine.checkPolicy({
    requested_action: 'generate_pr',
    risk_tier: RiskTier.TIER1_LOWRISK,
    scope: 'TolaniEcosystemDAO',
    justification: 'Fix documentation typo',
    approval_artifact: null
  });
  
  assert.strictEqual(result.allowed, false);
  assert.match(result.reason, /approval/i);
});

test('PolicyEngine - Tier 1 with valid approval should pass', () => {
  const engine = new PolicyEngine();
  
  const result = engine.checkPolicy({
    requested_action: 'generate_pr',
    risk_tier: RiskTier.TIER1_LOWRISK,
    scope: 'TolaniEcosystemDAO',
    justification: 'Fix documentation typo',
    approval_artifact: {
      approvals: [
        { role: 'AI Engineering Steward', signature: '0xabc...' }
      ]
    }
  });
  
  assert.strictEqual(result.allowed, true);
});

test('PolicyEngine - Disabled action should fail', () => {
  const engine = new PolicyEngine();
  
  const result = engine.checkPolicy({
    requested_action: 'deploy_staging',
    risk_tier: RiskTier.TIER2_OPERATIONAL,
    scope: 'staging',
    justification: 'Deploy new feature',
    approval_artifact: {
      approvals: [
        { role: 'AI Engineering Steward', signature: '0xabc...' },
        { role: 'Security Council', signature: '0xdef...' }
      ]
    }
  });
  
  assert.strictEqual(result.allowed, false);
  assert.match(result.reason, /disabled/i);
});

test('PolicyEngine - Unknown action should fail', () => {
  const engine = new PolicyEngine();
  
  const result = engine.checkPolicy({
    requested_action: 'unknown_action',
    risk_tier: 0,
    scope: '*',
    justification: 'Testing',
    approval_artifact: null
  });
  
  assert.strictEqual(result.allowed, false);
  assert.match(result.reason, /unknown/i);
});

test('PolicyEngine - Scope mismatch should fail', () => {
  const engine = new PolicyEngine();
  
  const result = engine.checkPolicy({
    requested_action: 'run_tests',
    risk_tier: RiskTier.TIER1_LOWRISK,
    scope: 'production',
    justification: 'Testing in prod',
    approval_artifact: {
      approvals: [
        { role: 'AI Engineering Steward', signature: '0xabc...' }
      ]
    }
  });
  
  assert.strictEqual(result.allowed, false);
  assert.match(result.reason, /scope/i);
});

console.log('Running Policy Engine tests...');
