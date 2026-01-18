/**
 * AI Gateway Wrapper Functions
 * 
 * Provides a unified interface for AI operations through Vercel AI Gateway.
 * Abstracts Gateway usage and maintains compatibility with existing code.
 */

import { generateText, streamText, embed } from 'ai';
import { getOpenAIModel, getAnthropicModel, isGatewayConfigured } from './gateway-client';
import { checkBudget, getBusinessTierBudget } from './budget-manager';

export interface GenerateTextOptions {
  prompt: string;
  model?: 'gpt-3.5-turbo' | 'gpt-4' | 'claude-3-sonnet-20240229';
  maxTokens?: number;
  temperature?: number;
  businessId?: string;
}

export interface GenerateEmbeddingOptions {
  texts: string[];
  model?: 'text-embedding-3-small' | 'text-embedding-3-large';
  businessId?: string;
}

export interface StreamTextOptions {
  prompt: string;
  model?: 'gpt-3.5-turbo' | 'gpt-4' | 'claude-3-sonnet-20240229';
  maxTokens?: number;
  temperature?: number;
  businessId?: string;
}

/**
 * Generate text using AI Gateway
 * Automatically checks budget and routes to appropriate provider
 */
export async function generateTextViaGateway(options: GenerateTextOptions): Promise<{
  text: string;
  usage: any;
  finishReason?: string;
  fallbackUsed?: boolean;
}> {
  // AI Gateway integration is not yet fully implemented - throw error for graceful fallback
  throw new Error(
    'AI Gateway integration is not yet fully implemented. ' +
    'Please use existing AI features or wait for full implementation.'
  );
}

/**
 * Stream text using AI Gateway
 */
export async function streamTextViaGateway(options: StreamTextOptions): Promise<never> {
  // AI Gateway integration is not yet fully implemented - throw error for graceful fallback
  throw new Error(
    'AI Gateway streaming integration is not yet fully implemented. ' +
    'Please use existing AI features or wait for full implementation.'
  );
}

/**
 * Generate embeddings using AI Gateway
 */
export async function generateEmbeddingViaGateway(options: GenerateEmbeddingOptions): Promise<number[][]> {
  // AI Gateway integration is not yet fully implemented - throw error for graceful fallback
  throw new Error(
    'AI Gateway embeddings integration is not yet fully implemented. ' +
    'Please use existing features or wait for full implementation.'
  );
}

/**
 * Check if business has budget remaining
 */
export async function checkBudgetRemaining(businessId: string): Promise<boolean> {
  return checkBudget(businessId);
}

/**
 * Get usage statistics for a business
 */
export async function getUsageStats(businessId: string) {
  const budget = await getBusinessTierBudget(businessId);
  // In a real implementation, this would query Vercel AI Gateway API for usage stats
  // For now, return basic structure
  return {
    businessId,
    tier: budget.tier,
    monthlyBudget: budget.monthlyBudget,
    // These would come from Gateway API:
    // currentUsage: 0,
    // remainingBudget: budget.monthlyBudget,
    // requestsThisMonth: 0,
  };
}
