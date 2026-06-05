import { render, screen, cleanup } from "@testing-library/react";
import { describe, expect, it, vi, afterEach } from "vitest";
import { IntegrationsPanel } from "@/components/integrations/integrations-panel";

vi.mock("@/lib/api/integrations", () => ({
  buildZohoAuthorizeUrl: () => "http://localhost:4001/integrations/zoho/authorize",
  disconnectZohoIntegration: vi.fn(),
  fetchIntegrationConnections: vi.fn(),
  formatConnectionStatus: (s: string) =>
    s === "active" ? "Connected" : "Disconnected",
  formatProviderLabel: () => "Zoho Inventory",
  formatSyncStatus: (s: string | null) => {
    if (!s) return "Never synced";
    if (s === "completed") return "Completed";
    return s;
  },
}));

afterEach(() => {
  cleanup();
});

describe("IntegrationsPanel", () => {
  it("renders connect UI when disconnected", () => {
    render(
      <IntegrationsPanel factoryId={1} userId={2} initialConnections={[]} />,
    );
    expect(screen.getByTestId("connect-button").textContent).toContain(
      "Connect Zoho",
    );
    expect(screen.getByTestId("connection-status").textContent).toContain(
      "Disconnected",
    );
    expect(screen.getByTestId("provider-name").textContent).toContain(
      "Zoho Inventory",
    );
  });

  it("renders disconnect UI when connected", () => {
    render(
      <IntegrationsPanel
        factoryId={1}
        userId={2}
        initialConnections={[
          {
            id: 10,
            provider: "zoho_inventory",
            status: "active",
            expires_at: new Date("2030-01-01T00:00:00Z").toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_sync_at: new Date("2026-01-01T12:00:00Z").toISOString(),
            last_sync_status: "completed",
            last_sync_run_id: 123,
            last_successful_sync_at: new Date("2026-01-01T12:00:00Z").toISOString(),
          },
        ]}
      />,
    );
    expect(screen.getByTestId("disconnect-button").textContent).toContain(
      "Disconnect",
    );
    expect(screen.getByTestId("connection-status").textContent).toContain(
      "Connected",
    );
    expect(screen.getByTestId("token-expiry")).toBeTruthy();
    expect(screen.getByTestId("last-sync-at").textContent).toBeTruthy();
    expect(screen.getByTestId("last-sync-status").textContent).toContain(
      "Completed",
    );
    expect(screen.getByTestId("last-successful-sync").textContent).toBeTruthy();
  });

  it("renders OAuth success banner", () => {
    render(
      <IntegrationsPanel
        factoryId={1}
        userId={2}
        oauthStatus="connected"
      />,
    );
    expect(screen.getByTestId("oauth-success-banner")).toBeTruthy();
  });

  it("renders OAuth error banner", () => {
    render(
      <IntegrationsPanel
        factoryId={1}
        userId={2}
        oauthStatus="error"
        oauthReason="token_exchange_failed"
      />,
    );
    expect(screen.getByTestId("oauth-error-banner").textContent).toContain(
      "OAuth failed",
    );
  });
});
