/**
 * Vercel AI Gateway Client Configuration
 * 
 * Supports both authentication methods:
 * - API Key (Development): Set AI_GATEWAY_API_KEY in .env
 * - OIDC Token (Production): Auto-managed by Vercel via vercel env pull
 * 
 * The client automatically detects which authentication method is available.
 */

// AI Gateway SDK imports - commented out until packages are installed
// import { openai } from '@ai-sdk/openai';
// import { anthropic } from '@ai-sdk/anthropic';

// AI Gateway base URL
const GATEWAY_BASE_URL = 'https://gateway.ai.cloud.vercel.com';

/**
 * Get AI Gateway configuration
 * Automatically uses OIDC token in Vercel production, falls back to API key
 */
export function getGatewayConfig() {
  // In Vercel production, OIDC token is automatically available via vercel env pull
  // For development, use API key from environment variable
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  
  if (!apiKey && process.env.VERCEL) {
    // In Vercel, OIDC token should be available automatically
    // If not, this will use the default Vercel authentication
    return {
      baseURL: GATEWAY_BASE_URL,
      // OIDC token is automatically injected by Vercel
    };
  }
  
  if (!apiKey) {
    throw new Error(
      'AI_GATEWAY_API_KEY is required for development. ' +
      'For production on Vercel, run "vercel link" and "vercel env pull" to get OIDC token.'
    );
  }
  
  return {
    baseURL: GATEWAY_BASE_URL,
    apiKey,
  };
}

/**
 * Configure OpenAI provider to use AI Gateway
 * Note: This is a placeholder - AI Gateway integration needs proper SDK setup
 */
export function getOpenAIModel(modelName: string = 'gpt-3.5-turbo') {
  // Placeholder - requires @ai-sdk/openai package
  // TODO: Install @ai-sdk/openai and configure properly
  throw new Error('AI Gateway integration not yet fully implemented. Please use existing AI features.');
}

/**
 * Configure Anthropic provider to use AI Gateway
 * Note: This is a placeholder - AI Gateway integration needs proper SDK setup
 */
export function getAnthropicModel(modelName: string = 'claude-3-sonnet-20240229') {
  // Placeholder - requires @ai-sdk/anthropic package
  // TODO: Install @ai-sdk/anthropic and configure properly
  throw new Error('AI Gateway integration not yet fully implemented. Please use existing AI features.');
}

/**
 * Check if AI Gateway is configured
 */
export function isGatewayConfigured(): boolean {
  try {
    getGatewayConfig();
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the current authentication method being used
 */
export function getAuthMethod(): 'api-key' | 'oidc' | 'none' {
  if (process.env.VERCEL && !process.env.AI_GATEWAY_API_KEY) {
    return 'oidc';
  }
  if (process.env.AI_GATEWAY_API_KEY) {
    return 'api-key';
  }
  return 'none';
}
