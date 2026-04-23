"use client";

import { useRef, useEffect, useState } from "react";
import { X, Send, Loader2, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CopilotMessageItem } from "./copilot-message";
import type { useCopilot } from "@/hooks/use-copilot";

interface CopilotPanelProps {
  copilot: ReturnType<typeof useCopilot>;
}

export function CopilotPanel({ copilot }: CopilotPanelProps) {
  const { messages, isLoading, isOpen, sendMessage, cancel, close } = copilot;
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Focus textarea when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (!input.trim()) return;
    sendMessage(input);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "fixed bottom-20 right-6 z-50 flex h-[520px] w-[380px] flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl",
        "transition-all duration-200 ease-out"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sm">LocaFleet Copilot</span>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={close}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-3 px-4 py-4"
      >
        {messages.map((msg, i) => (
          <CopilotMessageItem key={i} message={msg} />
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm bg-muted px-4 py-2.5 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Reflexion en cours...
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t bg-background p-3">
        <div className="flex items-end gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Posez une question..."
            className="min-h-[44px] max-h-[120px] resize-none text-sm"
            rows={1}
          />
          <Button
            size="icon"
            className="h-9 w-9 shrink-0"
            onClick={handleSubmit}
            disabled={isLoading || !input.trim()}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        {isLoading && (
          <button
            onClick={cancel}
            className="mt-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Annuler la requete
          </button>
        )}
      </div>
    </div>
  );
}
