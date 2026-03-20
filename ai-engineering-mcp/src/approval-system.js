/**
 * Approval System - Multi-stakeholder approvals
 * 
 * Manages approval workflows for different risk tiers.
 */

import { auditLog } from './audit-logger.js';

/**
 * Approval System class
 */
export class ApprovalSystem {
  constructor(config = {}) {
    this.config = config;
    this.pendingApprovals = new Map();
  }

  /**
   * Request approval for an action
   * 
   * @param {Object} request - Approval request
   * @returns {string} Approval request ID
   */
  requestApproval(request) {
    const requestId = this.generateRequestId();
    const approvalRequest = {
      id: requestId,
      action: request.action,
      tier: request.tier,
      scope: request.scope,
      justification: request.justification,
      requester: request.requester,
      required_approvers: request.required_approvers || [],
      approvals: [],
      status: 'pending',
      created_at: new Date().toISOString()
    };

    this.pendingApprovals.set(requestId, approvalRequest);

    auditLog({
      type: 'approval_requested',
      request_id: requestId,
      action: request.action,
      tier: request.tier,
      required_approvers: approvalRequest.required_approvers
    });

    return requestId;
  }

  /**
   * Add an approval to a request
   */
  addApproval(requestId, approval) {
    const request = this.pendingApprovals.get(requestId);
    if (!request) {
      throw new Error(`Approval request ${requestId} not found`);
    }

    if (request.status !== 'pending') {
      throw new Error(`Approval request ${requestId} is not pending (status: ${request.status})`);
    }

    // Verify the approver is authorized
    if (!this.isAuthorizedApprover(approval.approver, request.required_approvers)) {
      throw new Error(`Approver ${approval.approver} is not authorized for this request`);
    }

    // Add approval
    request.approvals.push({
      approver: approval.approver,
      role: approval.role,
      signature: approval.signature,
      timestamp: new Date().toISOString()
    });

    // Check if we have enough approvals
    if (request.approvals.length >= request.required_approvers.length) {
      request.status = 'approved';
    }

    auditLog({
      type: 'approval_added',
      request_id: requestId,
      approver: approval.approver,
      role: approval.role,
      status: request.status
    });

    return request;
  }

  /**
   * Get approval artifact for policy check
   */
  getApprovalArtifact(requestId) {
    const request = this.pendingApprovals.get(requestId);
    if (!request) {
      return null;
    }

    if (request.status !== 'approved') {
      return null;
    }

    return {
      request_id: requestId,
      approvals: request.approvals,
      status: request.status,
      created_at: request.created_at
    };
  }

  /**
   * Check if approver is authorized
   */
  isAuthorizedApprover(approver, required_approvers) {
    // TODO: Implement actual authorization check (e.g., check Ethereum signatures)
    return required_approvers.includes(approver);
  }

  /**
   * Generate a unique request ID
   */
  generateRequestId() {
    return `AR-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Get approval status
   */
  getStatus(requestId) {
    return this.pendingApprovals.get(requestId) || null;
  }

  /**
   * List all pending approvals
   */
  listPending() {
    const pending = [];
    for (const [id, request] of this.pendingApprovals.entries()) {
      if (request.status === 'pending') {
        pending.push(request);
      }
    }
    return pending;
  }
}

// CLI mode
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Approval System - Testing approval workflow\n');
  
  const approvalSystem = new ApprovalSystem();
  
  // Request approval for a Tier 2 action
  const requestId = approvalSystem.requestApproval({
    action: 'deploy_staging',
    tier: 2,
    scope: 'staging',
    justification: 'Deploy new feature for testing',
    requester: 'AI Engineering Bot',
    required_approvers: ['AI Engineering Steward', 'Security Council']
  });

  console.log(`Created approval request: ${requestId}`);
  console.log(JSON.stringify(approvalSystem.getStatus(requestId), null, 2));

  // Add first approval
  console.log('\nAdding first approval...');
  approvalSystem.addApproval(requestId, {
    approver: 'AI Engineering Steward',
    role: 'AI Engineering Steward',
    signature: '0xabc123...'
  });
  console.log(JSON.stringify(approvalSystem.getStatus(requestId), null, 2));

  // Add second approval
  console.log('\nAdding second approval...');
  approvalSystem.addApproval(requestId, {
    approver: 'Security Council',
    role: 'Security Council',
    signature: '0xdef456...'
  });
  console.log(JSON.stringify(approvalSystem.getStatus(requestId), null, 2));

  // Get approval artifact
  console.log('\nApproval artifact:');
  console.log(JSON.stringify(approvalSystem.getApprovalArtifact(requestId), null, 2));
}
