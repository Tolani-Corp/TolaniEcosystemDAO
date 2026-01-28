/**
 * Budget Tracker - Spend tracking and caps
 * 
 * Tracks spending across different categories and enforces budget caps.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { logBudgetUsage } from './audit-logger.js';

/**
 * Budget Tracker class
 */
export class BudgetTracker {
  constructor(config = {}) {
    this.config = config;
    this.budgetFile = config.budgetFile || './config/budgets.json';
    this.loadBudgets();
  }

  loadBudgets() {
    try {
      if (existsSync(this.budgetFile)) {
        const data = JSON.parse(readFileSync(this.budgetFile, 'utf-8'));
        this.budgets = data.budgets || this.getDefaultBudgets();
        this.usage = data.usage || {};
      } else {
        this.budgets = this.getDefaultBudgets();
        this.usage = {};
      }
    } catch (error) {
      console.warn('Failed to load budgets, using defaults');
      this.budgets = this.getDefaultBudgets();
      this.usage = {};
    }
  }

  getDefaultBudgets() {
    return {
      'tier0_session': parseFloat(process.env.BUDGET_TIER0_SESSION || '10'),
      'tier1_task': parseFloat(process.env.BUDGET_TIER1_TASK || '100'),
      'tier2_window': parseFloat(process.env.BUDGET_TIER2_WINDOW || '1000'),
      'tier3_explicit': parseFloat(process.env.BUDGET_TIER3_EXPLICIT || '0'),
      'inference': 1000,
      'embeddings': 500,
      'reranking': 100,
      'vector_db': 200,
      'ci_compute': 500,
      'cloud_ops': 300
    };
  }

  saveBudgets() {
    try {
      const data = {
        budgets: this.budgets,
        usage: this.usage,
        last_updated: new Date().toISOString()
      };
      writeFileSync(this.budgetFile, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save budgets:', error.message);
    }
  }

  /**
   * Record spending in a category
   * 
   * @param {string} category - Budget category
   * @param {number} amount - Amount spent (USD)
   * @returns {Object} Result with success flag and remaining budget
   */
  recordSpend(category, amount) {
    if (!this.usage[category]) {
      this.usage[category] = 0;
    }

    this.usage[category] += amount;
    const budget = this.budgets[category] || 0;
    const remaining = budget - this.usage[category];

    // Log budget usage
    logBudgetUsage(category, amount, remaining);

    // Check if budget exceeded
    if (remaining < 0) {
      console.error(`BUDGET EXCEEDED for ${category}: spent ${this.usage[category]}, budget ${budget}`);
      return {
        success: false,
        exceeded: true,
        remaining,
        message: `Budget exceeded for ${category}`
      };
    }

    // Warn if budget low (< 10%)
    if (remaining < budget * 0.1) {
      console.warn(`BUDGET WARNING for ${category}: ${remaining.toFixed(2)} remaining (${((remaining/budget)*100).toFixed(1)}%)`);
    }

    this.saveBudgets();

    return {
      success: true,
      exceeded: false,
      remaining,
      message: `Recorded ${amount} spend in ${category}, ${remaining.toFixed(2)} remaining`
    };
  }

  /**
   * Check if spending is allowed
   */
  canSpend(category, amount) {
    const budget = this.budgets[category] || 0;
    const used = this.usage[category] || 0;
    const remaining = budget - used;
    return remaining >= amount;
  }

  /**
   * Get budget status
   */
  getStatus(category = null) {
    if (category) {
      const budget = this.budgets[category] || 0;
      const used = this.usage[category] || 0;
      return {
        category,
        budget,
        used,
        remaining: budget - used,
        percentage: budget > 0 ? ((used / budget) * 100).toFixed(1) : 0
      };
    }

    // Return all categories
    const status = {};
    for (const cat in this.budgets) {
      status[cat] = this.getStatus(cat);
    }
    return status;
  }

  /**
   * Reset usage for a category or all categories
   */
  resetUsage(category = null) {
    if (category) {
      this.usage[category] = 0;
    } else {
      this.usage = {};
    }
    this.saveBudgets();
  }

  /**
   * Set budget for a category
   */
  setBudget(category, amount) {
    this.budgets[category] = amount;
    this.saveBudgets();
  }
}

// CLI mode
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Budget Tracker - Testing budget tracking\n');
  
  const tracker = new BudgetTracker();
  
  console.log('Initial budgets:');
  console.log(JSON.stringify(tracker.getStatus(), null, 2));
  
  console.log('\nRecording test spending...');
  console.log(tracker.recordSpend('inference', 5.50));
  console.log(tracker.recordSpend('embeddings', 2.25));
  console.log(tracker.recordSpend('tier0_session', 0.10));
  
  console.log('\nUpdated status:');
  console.log(JSON.stringify(tracker.getStatus(), null, 2));
}
