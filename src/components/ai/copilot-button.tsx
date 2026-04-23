"use client";

import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { useCopilot } from "@/hooks/use-copilot";

interface CopilotButtonProps {
  copilot: ReturnType<typeof useCopilot>;
}

export function CopilotButton({ copilot }: CopilotButtonProps) {
  const { isOpen, toggle } = copilot;

  return (
    <Button
      onClick={toggle}
      className={cn(
        "fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-xl transition-all duration-200 hover:scale-105",
        isOpen && "rotate-90 scale-90 opacity-0 pointer-events-none"
      )}
      size="icon"
    >
      <Bot className="h-6 w-6" />
    </Button>
  );
}
