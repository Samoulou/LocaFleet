import OpenAI from "openai";

// ============================================================================
// OpenRouter client configuration
// ============================================================================

const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL ?? "qwen/qwen-2.5-72b-instruct";

if (!process.env.OPENROUTER_API_KEY) {
  console.warn("OPENROUTER_API_KEY is not set. AI copilot will not work.");
}

export const openrouter = new OpenAI({
  baseURL: OPENROUTER_BASE_URL,
  apiKey: process.env.OPENROUTER_API_KEY ?? "sk-placeholder",
  defaultHeaders: {
    "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    "X-Title": "LocaFleet AI Copilot",
  },
});

export { OPENROUTER_MODEL };
