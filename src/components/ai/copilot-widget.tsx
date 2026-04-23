"use client";

import { useCopilot } from "@/hooks/use-copilot";
import { CopilotButton } from "./copilot-button";
import { CopilotPanel } from "./copilot-panel";

export function CopilotWidget() {
  const copilot = useCopilot();

  return (
    <>
      <CopilotButton copilot={copilot} />
      <CopilotPanel copilot={copilot} />
    </>
  );
}
