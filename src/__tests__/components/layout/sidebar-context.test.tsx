import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  SidebarProvider,
  useSidebar,
} from "@/components/layout/sidebar-context";

// Test component that exposes sidebar state
function TestConsumer() {
  const { collapsed, toggleCollapsed } = useSidebar();
  return (
    <div>
      <span data-testid="collapsed">{String(collapsed)}</span>
      <button onClick={toggleCollapsed}>toggle</button>
    </div>
  );
}

describe("SidebarContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("default state is collapsed: false", () => {
    render(
      <SidebarProvider>
        <TestConsumer />
      </SidebarProvider>
    );
    expect(screen.getByTestId("collapsed")).toHaveTextContent("false");
  });

  it("toggleCollapsed flips state", async () => {
    const user = userEvent.setup();
    render(
      <SidebarProvider>
        <TestConsumer />
      </SidebarProvider>
    );

    await user.click(screen.getByRole("button", { name: "toggle" }));
    expect(screen.getByTestId("collapsed")).toHaveTextContent("true");

    await user.click(screen.getByRole("button", { name: "toggle" }));
    expect(screen.getByTestId("collapsed")).toHaveTextContent("false");
  });

  it("reads initial state from localStorage", async () => {
    localStorage.setItem("locafleet-sidebar-collapsed", "true");

    render(
      <SidebarProvider>
        <TestConsumer />
      </SidebarProvider>
    );

    // After mount + useEffect, should read localStorage
    await vi.waitFor(() => {
      expect(screen.getByTestId("collapsed")).toHaveTextContent("true");
    });
  });

  it("persists state changes to localStorage", async () => {
    const user = userEvent.setup();
    render(
      <SidebarProvider>
        <TestConsumer />
      </SidebarProvider>
    );

    await user.click(screen.getByRole("button", { name: "toggle" }));
    expect(localStorage.getItem("locafleet-sidebar-collapsed")).toBe("true");

    await user.click(screen.getByRole("button", { name: "toggle" }));
    expect(localStorage.getItem("locafleet-sidebar-collapsed")).toBe("false");
  });
});
