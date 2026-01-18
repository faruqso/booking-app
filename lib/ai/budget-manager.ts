/**
 * Budget Manager for AI Gateway
 * 
 * Manages per-business tier budgets and enforces spending caps.
 * Integrates with Vercel AI Gateway for budget tracking.
 */

import { prisma } from '@/lib/prisma';

export type BusinessTier = 'starter' | 'professional' | 'enterprise';

export interface TierBudget {
  tier: BusinessTier;
  monthlyBudget: number; // in USD
}

/**
 * Budget limits per tier (in USD per month)
 */
const TIER_BUDGETS: Record<BusinessTier, number> = {
  starter: 5,
  professional: 20,
  enterprise: 100,
};

/**
 * Get business tier from database
 * For now, defaults to 'starter' if no tier field exists
 * TODO: Add subscription/tier field to Business model when implementing paid tiers
 */
async function getBusinessTier(businessId: string): Promise<BusinessTier> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { id: true },
  });

  if (!business) {
    throw new Error(`Business not found: ${businessId}`);
  }

  // TODO: When subscription system is implemented, read from business.subscriptionTier
  // For now, default to starter tier
  // This can be extended to check a subscription table or business settings
  return 'starter';
}

/**
 * Get budget configuration for a business tier
 */
export async function getBusinessTierBudget(businessId: string): Promise<TierBudget> {
  const tier = await getBusinessTier(businessId);
  return {
    tier,
    monthlyBudget: TIER_BUDGETS[tier],
  };
}

/**
 * Check if business has budget remaining
 * 
 * Note: Actual budget tracking would be done by Vercel AI Gateway.
 * This function provides a pre-check before making Gateway calls.
 * Gateway will enforce the actual budget limits.
 */
export async function checkBudget(businessId: string): Promise<boolean> {
  try {
    const budget = await getBusinessTierBudget(businessId);
    
    // In a real implementation, this would query:
    // 1. Current month's usage from Vercel AI Gateway API
    // 2. Compare against budget.monthlyBudget
    // 3. Return true if usage < budget
    
    // For now, we rely on Vercel AI Gateway to enforce budgets
    // This is a pre-check that can be extended with local tracking
    return true;
  } catch (error) {
    console.error('Budget check error:', error);
    // Fail open - let Gateway handle enforcement
    return true;
  }
}

/**
 * Get current usage for a business (would integrate with Gateway API)
 */
export async function getCurrentUsage(businessId: string): Promise<{
  currentSpend: number;
  budget: number;
  remaining: number;
  percentageUsed: number;
}> {
  const budget = await getBusinessTierBudget(businessId);
  
  // TODO: Integrate with Vercel AI Gateway API to get actual usage
  // For now, return structure with placeholder values
  return {
    currentSpend: 0, // Would come from Gateway API
    budget: budget.monthlyBudget,
    remaining: budget.monthlyBudget,
    percentageUsed: 0,
  };
}

/**
 * Check if business can afford a specific AI operation
 * Estimates cost based on operation type
 */
export async function canAffordOperation(
  businessId: string,
  operationType: 'text' | 'embedding' | 'stream',
  estimatedCost: number = 0
): Promise<{ allowed: boolean; reason?: string }> {
  const budget = await getBusinessTierBudget(businessId);
  const usage = await getCurrentUsage(businessId);
  
  // If we have an estimated cost, check if it fits
  if (estimatedCost > 0) {
    if (usage.currentSpend + estimatedCost > budget.monthlyBudget) {
      return {
        allowed: false,
        reason: `Operation would exceed monthly budget of $${budget.monthlyBudget}. Current usage: $${usage.currentSpend.toFixed(2)}`,
      };
    }
  }
  
  // Basic check - Gateway will enforce actual limits
  return { allowed: true };
}

/**
 * Get budget information for display to business owners
 */
export async function getBudgetInfo(businessId: string) {
  const budget = await getBusinessTierBudget(businessId);
  const usage = await getCurrentUsage(businessId);
  
  return {
    tier: budget.tier,
    monthlyBudget: budget.monthlyBudget,
    currentSpend: usage.currentSpend,
    remaining: usage.remaining,
    percentageUsed: usage.percentageUsed,
    resetDate: getNextResetDate(), // First of next month
  };
}

/**
 * Get next budget reset date (first of next month)
 */
function getNextResetDate(): Date {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth;
}

/**
 * Check if budget has been reset (new month)
 */
export async function isBudgetReset(businessId: string): Promise<boolean> {
  // TODO: Track last reset date in database
  // For now, always return false - Gateway handles monthly resets
  return false;
}
