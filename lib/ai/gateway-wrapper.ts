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
export async function generateTextViaGateway(options: GenerateTextOptions): Promise<never> {
  const { prompt, model = 'gpt-3.5-turbo', maxTokens, temperature, businessId } = options;

  // Check if Gateway is configured
  if (!isGatewayConfigured()) {
    throw new Error('AI Gateway is not configured. Please set up authentication.');
  }

  // Check budget if businessId is provided
  if (businessId) {
    const hasBudget = await checkBudget(businessId);
    if (!hasBudget) {
      throw new Error('AI budget exceeded. Please upgrade your plan or wait for next billing cycle.');
    }
  }

  try {
    // Select provider based on model
    const aiModel = model.startsWith('claude')
      ? getAnthropicModel(model as 'claude-3-sonnet-20240229')
      : getOpenAIModel(model as 'gpt-3.5-turbo' | 'gpt-4');

    const result = await generateText({
      model: aiModel,
      prompt,
      maxTokens,
      temperature,
    });

    return {
      text: result.text,
      usage: result.usage,
      finishReason: result.finishReason,
    };
  } catch (error: any) {
    // If primary provider fails, try fallback (only for non-claude models)
    if (!model.startsWith('claude') && error.status !== 429) {
      try {
        const fallbackModel = getAnthropicModel('claude-3-sonnet-20240229');
        const result = await generateText({
          model: fallbackModel,
          prompt,
          maxTokens,
          temperature,
        });
        return {
          text: result.text,
          usage: result.usage,
          finishReason: result.finishReason,
          fallbackUsed: true,
        };
      } catch (fallbackError) {
        throw new Error(`AI Gateway error: ${error.message}`);
      }
    }
    throw error;
  }
}

/**
 * Stream text using AI Gateway
 */
export async function streamTextViaGateway(options: StreamTextOptions) {
  const { prompt, model = 'gpt-3.5-turbo', maxTokens, temperature, businessId } = options;

  if (!isGatewayConfigured()) {
    throw new Error('AI Gateway is not configured. Please set up authentication.');
  }

  if (businessId) {
    const hasBudget = await checkBudget(businessId);
    if (!hasBudget) {
      throw new Error('AI budget exceeded. Please upgrade your plan or wait for next billing cycle.');
    }
  }

  try {
    const aiModel = model.startsWith('claude')
      ? getAnthropicModel(model as 'claude-3-sonnet-20240229')
      : getOpenAIModel(model as 'gpt-3.5-turbo' | 'gpt-4');

    return streamText({
      model: aiModel,
      prompt,
      maxTokens,
      temperature,
    });
  } catch (error: any) {
    // Fallback to Claude if OpenAI fails
    if (!model.startsWith('claude') && error.status !== 429) {
      try {
        const fallbackModel = getAnthropicModel('claude-3-sonnet-20240229');
        return streamText({
          model: fallbackModel,
          prompt,
          maxTokens,
          temperature,
        });
      } catch (fallbackError) {
        throw new Error(`AI Gateway streaming error: ${error.message}`);
      }
    }
    throw error;
  }
}

/**
 * Generate embeddings using AI Gateway
 */
export async function generateEmbeddingViaGateway(options: GenerateEmbeddingOptions) {
  const { texts, model = 'text-embedding-3-small', businessId } = options;

  if (!isGatewayConfigured()) {
    throw new Error('AI Gateway is not configured. Please set up authentication.');
  }

  if (businessId) {
    const hasBudget = await checkBudget(businessId);
    if (!hasBudget) {
      throw new Error('AI budget exceeded. Please upgrade your plan or wait for next billing cycle.');
    }
  }

  try {
    const openaiModel = getOpenAIModel(model);
    
    // Generate embeddings for all texts
    const embeddings = await Promise.all(
      texts.map(text => 
        embed({
          model: openaiModel,
          value: text,
        })
      )
    );

    return embeddings.map(e => e.embedding);
  } catch (error: any) {
    throw new Error(`AI Gateway embedding error: ${error.message}`);
  }
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
