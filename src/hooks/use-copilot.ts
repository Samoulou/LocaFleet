"use client";

import { useState, useCallback, useRef } from "react";
import type { ChatMessage } from "@/lib/validations/ai";

export type CopilotMessage = ChatMessage;

/**
 * Sanitize message history before sending to the API.
 * Remove any assistant messages with empty content and no tool_calls metadata.
 * The API rejects assistant messages with empty content unless they have tool_calls.
 */
function sanitizeMessages(msgs: CopilotMessage[]): CopilotMessage[] {
  return msgs.filter((m) => {
    if (m.role !== "assistant") return true;
    const hasContent = m.content.trim().length > 0;
    return hasContent;
  });
}

export function useCopilot() {
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      role: "assistant",
      content:
        "Bonjour ! Je suis votre copilote LocaFleet. Posez-moi des questions sur votre flotte, vos clients, vos contrats, ou demandez-moi de rediger un email.",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return;

      const userMessage: CopilotMessage = { role: "user", content };
      const newMessages = [...messages, userMessage];
      setMessages(newMessages);
      setIsLoading(true);

      try {
        abortRef.current = new AbortController();

        const sanitized = sanitizeMessages(newMessages);

        const res = await fetch("/api/ai/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: sanitized }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? "Erreur serveur");
        }

        const data = await res.json();
        const assistantMessage: CopilotMessage = data.message;

        // Defensive: never append an empty assistant message to UI state
        if (
          assistantMessage.role === "assistant" &&
          !assistantMessage.content.trim()
        ) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content:
                "Je suis desole, je n'ai pas pu formuler de reponse. Pouvez-vous reformuler ?",
            },
          ]);
        } else {
          setMessages((prev) => [...prev, assistantMessage]);
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;

        const errorMessage =
          err instanceof Error ? err.message : "Une erreur est survenue";
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: `Desole, je n'ai pas pu traiter votre demande. ${errorMessage}`,
          },
        ]);
      } finally {
        setIsLoading(false);
        abortRef.current = null;
      }
    },
    [messages, isLoading]
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setIsLoading(false);
  }, []);

  const toggle = useCallback(() => setIsOpen((v) => !v), []);
  const close = useCallback(() => setIsOpen(false), []);
  const open = useCallback(() => setIsOpen(true), []);

  return {
    messages,
    isLoading,
    isOpen,
    sendMessage,
    cancel,
    toggle,
    close,
    open,
  };
}
