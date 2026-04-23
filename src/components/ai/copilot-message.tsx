"use client";

import { cn } from "@/lib/utils";
import type { CopilotMessage } from "@/hooks/use-copilot";

interface CopilotMessageProps {
  message: CopilotMessage;
}

export function CopilotMessageItem({ message }: CopilotMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex w-full",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
          isUser
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : "bg-muted text-foreground rounded-bl-sm"
        )}
      >
        {message.content}
      </div>
    </div>
  );
}
