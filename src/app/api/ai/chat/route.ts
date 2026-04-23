import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { openrouter, OPENROUTER_MODEL } from "@/lib/ai/openrouter";
import { SCHEMA_CONTEXT } from "@/lib/ai/schema-context";
import { TOOL_DEFINITIONS, type ToolName } from "@/lib/ai/tools";
import {
  searchVehicles,
  getVehicleAvailability,
  searchClients,
  getClientContracts,
  getClientBalance,
  getContracts,
  getMaintenanceRecords,
  getDashboardSummary,
  generateEmail,
} from "@/lib/ai/tool-executors";
import { chatRequestSchema } from "@/lib/validations/ai";
import type OpenAI from "openai";

// ============================================================================
// Tool dispatcher
// ============================================================================

type Executor = (tenantId: string, args: Record<string, unknown>) => Promise<unknown>;

const toolDispatcher: Record<ToolName, Executor> = {
  searchVehicles: searchVehicles as Executor,
  getVehicleAvailability: getVehicleAvailability as Executor,
  searchClients: searchClients as Executor,
  getClientContracts: getClientContracts as Executor,
  getClientBalance: getClientBalance as Executor,
  getContracts: getContracts as Executor,
  getMaintenanceRecords: getMaintenanceRecords as Executor,
  getDashboardSummary: getDashboardSummary as Executor,
  generateEmail: generateEmail as Executor,
};

const MAX_ITERATIONS = 10;

// OpenAI SDK types have a union for tool calls; `function` property only exists
// on the function variant. We narrow with this helper type.
type FunctionToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

// ============================================================================
// POST /api/ai/chat
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: "Non authentifie" },
        { status: 401 }
      );
    }

    // 1. Parse & validate body
    const body = await request.json();
    const parsed = chatRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Requete invalide" },
        { status: 400 }
      );
    }

    const { messages } = parsed.data;

    // Build the running conversation for the LLM
    const conversation: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: SCHEMA_CONTEXT },
      ...messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
      const response = await openrouter.chat.completions.create({
        model: OPENROUTER_MODEL,
        messages: conversation,
        tools: TOOL_DEFINITIONS.map((t) => ({
          type: t.type,
          function: t.function,
        })),
        temperature: 0.2,
        max_tokens: 2048,
      });

      const choice = response.choices[0];
      if (!choice) {
        return NextResponse.json(
          { error: "Reponse IA vide" },
          { status: 502 }
        );
      }

      const msg = choice.message;

      // Handle explicit refusal (model refuses to answer)
      if (msg.refusal) {
        return NextResponse.json({
          message: {
            role: "assistant",
            content: msg.refusal,
          },
        });
      }

      const toolCalls = msg.tool_calls ?? [];
      const functionCalls = toolCalls.filter(
        (tc): tc is FunctionToolCall => tc.type === "function"
      );

      // No tool calls at all, or only non-function calls (which we ignore) — return directly
      if (functionCalls.length === 0) {
        const content = msg.content?.trim() ?? "";
        return NextResponse.json({
          message: {
            role: "assistant",
            content:
              content ||
              "Je suis desole, je n'ai pas pu formuler de reponse. Pouvez-vous reformuler ?",
          },
        });
      }

      console.log(`[AI Copilot] Iteration ${iteration + 1}/${MAX_ITERATIONS} — ${functionCalls.length} tool call(s)`);

      // Execute function calls
      const toolResults: Array<{
        role: "tool";
        tool_call_id: string;
        content: string;
      }> = [];

      for (const toolCall of functionCalls) {
        const toolName = toolCall.function.name as ToolName;
        console.log(`[AI Copilot] Tool: ${toolName} | Args: ${toolCall.function.arguments}`);
        const executor = toolDispatcher[toolName];

        if (!executor) {
          toolResults.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: `Outil inconnu: ${toolName}` }),
          });
          continue;
        }

        let args: Record<string, unknown>;
        try {
          args = JSON.parse(toolCall.function.arguments);
        } catch {
          toolResults.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({ error: "Arguments invalides" }),
          });
          continue;
        }

        try {
          const result = await executor(currentUser.tenantId, args);
          toolResults.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          });
        } catch (err) {
          console.error(
            `Tool ${toolName} error:`,
            err instanceof Error ? err.message : "Unknown"
          );
          toolResults.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify({
              error: err instanceof Error ? err.message : "Erreur serveur",
            }),
          });
        }
      }

      // Append assistant message with tool_calls, then tool results
      // We must include tool_calls in the assistant message so the model knows which results belong to which call
      conversation.push({
        role: "assistant",
        content: msg.content ?? "",
        tool_calls: functionCalls,
      });

      for (const tr of toolResults) {
        conversation.push(tr);
      }

      // Loop again — the model will now receive the tool results and either
      // ask for more tools or produce a final text response
    }

    // Max iterations reached without a text response
    console.log(`[AI Copilot] MAX_ITERATIONS (${MAX_ITERATIONS}) reached without text response`);
    return NextResponse.json({
      message: {
        role: "assistant",
        content:
          "Je suis desole, j'ai atteint la limite de raisonnement. Pouvez-vous simplifier votre question ?",
      },
    });
  } catch (err) {
    console.error(
      "AI chat error:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return NextResponse.json(
      { error: "Erreur serveur IA" },
      { status: 500 }
    );
  }
}
