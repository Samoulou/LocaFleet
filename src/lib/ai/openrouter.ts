import OpenAI from "openai";

// ============================================================================
// OpenRouter client configuration
// ============================================================================

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL ?? "qwen/qwen3-235b-a22b-2507";

let client: OpenAI | null = null;

export function isOpenRouterConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY);
}

/**
 * Lazily creates the OpenRouter client. Throws if OPENROUTER_API_KEY is not
 * set, so a missing key fails loudly at the call site instead of producing a
 * confusing auth error from OpenRouter at request time.
 */
export function getOpenRouterClient(): OpenAI {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error(
      "OPENROUTER_API_KEY environment variable is not set — AI copilot is disabled"
    );
  }

  if (!client) {
    client = new OpenAI({
      baseURL: OPENROUTER_BASE_URL,
      apiKey,
      defaultHeaders: {
        "HTTP-Referer":
          process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
        "X-Title": "LocaFleet AI Copilot",
      },
    });
  }

  return client;
}

export { OPENROUTER_MODEL };
