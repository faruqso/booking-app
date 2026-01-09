/**
 * Local AI Setup - Ollama Integration
 * Provides interface for local AI models using Ollama
 * 
 * Setup Instructions:
 * 1. Install Ollama: https://ollama.ai
 * 2. Pull Llama 3 8B: ollama pull llama3:8b
 * 3. Start Ollama service (usually runs on http://localhost:11434)
 * 4. Set OLLAMA_BASE_URL environment variable if needed (defaults to http://localhost:11434)
 */

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

export interface OllamaResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
}

/**
 * Generate service description using local AI
 */
export async function generateServiceDescription(
  serviceName: string,
  category?: string
): Promise<string> {
  try {
    const prompt = `Generate a concise, professional description for a service called "${serviceName}"${category ? ` in the ${category} category` : ""}. 
The description should be 2-3 sentences, highlight key benefits, and be customer-friendly. 
Do not include pricing or duration information.`;

    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama3:8b",
        prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to generate description");
    }

    const data: OllamaResponse = await response.json();
    return data.response.trim();
  } catch (error) {
    console.error("Local AI generation error:", error);
    // Fallback to template-based description
    return `Professional ${serviceName} service. Experience quality and expertise tailored to your needs.`;
  }
}

/**
 * Generate business name suggestions using local AI
 */
export async function generateBusinessNameSuggestions(
  businessType: string,
  count: number = 5
): Promise<string[]> {
  try {
    const prompt = `Generate ${count} creative and professional business name suggestions for a ${businessType} business. 
Return only the names, one per line, without numbers or bullets. 
Make them memorable, professional, and suitable for a booking platform.`;

    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama3:8b",
        prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to generate names");
    }

    const data: OllamaResponse = await response.json();
    // Parse response into array of names
    const names = data.response
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.match(/^\d+[\.\)]/))
      .slice(0, count);

    return names;
  } catch (error) {
    console.error("Local AI generation error:", error);
    // Fallback suggestions
    return [
      `${businessType} Services`,
      `Premium ${businessType}`,
      `Elite ${businessType}`,
      `${businessType} Pro`,
      `${businessType} Express`,
    ];
  }
}

/**
 * Check if Ollama is available
 */
export async function checkOllamaAvailable(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      method: "GET",
      signal: AbortSignal.timeout(2000), // 2 second timeout
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Generate contextual help message using local AI
 */
export async function generateContextualHelp(
  fieldName: string,
  errorType: string,
  context?: Record<string, any>
): Promise<string | null> {
  try {
    const prompt = `A user is filling out a form field called "${fieldName}" and encountered a "${errorType}" error.
${context ? `Additional context: ${JSON.stringify(context)}` : ""}
Generate a helpful, friendly message (1-2 sentences) that explains what went wrong and how to fix it.`;

    const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama3:8b",
        prompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data: OllamaResponse = await response.json();
    return data.response.trim();
  } catch (error) {
    console.error("Local AI generation error:", error);
    return null;
  }
}

