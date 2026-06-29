// register(ctx) registers the schema-config READ/PROBE named actions via
// `ctx.ui` so the declarative setup surface (cinatra.configSchema) can read the
// live registered-server rows + the connection-service readiness WITHOUT
// shipping React. The host dispatches these by id through
// `/api/extensions/{installId}/actions/{actionId}`, which resolves + authorizes
// the actor host-side BEFORE the handler runs — so the handlers here NEVER
// evaluate the actor (no resolveViewerContext for authz/visibility). The WRITE
// actions (createServer/deleteServer) are deliberately NOT registered by the
// connector; they are bound host-side in cinatra#658 (PR-4).
import { afterEach, describe, expect, it, vi } from "vitest";
import { register, type McpServerListRow } from "../register";
import {
  _resetMcpServerDepsForTests,
  type ExternalMcpServerRecordShape,
} from "../deps";

type RegisteredProvider = { packageName: string; impl: unknown };
type UiAction = { id: string; handler: (input: unknown) => Promise<unknown> };

function makeCtx(services: Record<string, unknown>) {
  const uiActions: UiAction[] = [];
  return {
    ctx: {
      capabilities: {
        registerProvider: () => {},
        resolveProviders: (capability: string): RegisteredProvider[] => {
          const svc = services[capability];
          return svc ? [{ packageName: "host", impl: svc }] : [];
        },
      },
      ui: {
        registerSetupSurface: () => {},
        registerSettingsSurface: () => {},
        registerAction: (action: UiAction) => {
          uiActions.push(action);
        },
      },
    } as unknown as Parameters<typeof register>[0],
    uiActions,
  };
}

const GLOBAL_ROW: ExternalMcpServerRecordShape = {
  id: "srv-global",
  label: "Global MCP",
  serverUrl: "https://mcp.example.com/sse",
  nangoConnectionId: "nango-1",
  scope: "global",
  orgId: null,
  userId: null,
  enabled: true,
  allowedTools: null,
  allowedCatalogTools: null,
  createdAt: "2026-06-19T00:00:00.000Z",
  updatedAt: "2026-06-19T00:00:00.000Z",
};
const PRIVATE_DISABLED_ROW: ExternalMcpServerRecordShape = {
  ...GLOBAL_ROW,
  id: "srv-private",
  label: "Internal MCP",
  serverUrl: "http://localhost:9000/sse",
  nangoConnectionId: null,
  scope: "user",
  userId: "u1",
  enabled: false,
};

function hostService(over: Record<string, unknown> = {}) {
  return {
    listServers: vi.fn(() => [GLOBAL_ROW, PRIVATE_DISABLED_ROW]),
    getServerById: vi.fn(() => GLOBAL_ROW),
    resolveViewerContext: vi.fn(async () => ({ isAdmin: true, userId: "u1" })),
    isConnectionServiceReady: vi.fn(() => true),
    isPrivateUrl: vi.fn((url: string) => url.includes("localhost")),
    createServerAction: vi.fn(async () => {}),
    deleteServerAction: vi.fn(async () => {}),
    ...over,
  };
}

afterEach(() => {
  _resetMcpServerDepsForTests();
});

describe("mcp-server-connector register(ctx) — schema-config named actions", () => {
  it("registers ONLY the READ/PROBE actions (listServers, connectionServiceReady)", () => {
    const { ctx, uiActions } = makeCtx({
      "@cinatra-ai/host:external-mcp-registry": hostService(),
    });
    register(ctx);
    const ids = uiActions.map((a) => a.id).sort();
    expect(ids).toEqual(["connectionServiceReady", "listServers"]);
    // The WRITE actions stay host-bound (PR-4) — never registered by the connector.
    expect(ids).not.toContain("createServer");
    expect(ids).not.toContain("deleteServer");
  });

  it("listServers projects rows to the JSON-safe record-list shape with derived badges", async () => {
    const svc = hostService();
    const { ctx, uiActions } = makeCtx({
      "@cinatra-ai/host:external-mcp-registry": svc,
    });
    register(ctx);
    const list = uiActions.find((a) => a.id === "listServers")!;
    const out = (await list.handler(undefined)) as { servers: McpServerListRow[] };

    expect(out.servers).toEqual([
      {
        id: "srv-global",
        label: "Global MCP",
        serverUrl: "https://mcp.example.com/sse",
        scope: "global",
        privateUrl: false,
        disabled: false,
        apiKeyConfigured: true,
      },
      {
        id: "srv-private",
        label: "Internal MCP",
        serverUrl: "http://localhost:9000/sse",
        scope: "user",
        privateUrl: true,
        disabled: true,
        apiKeyConfigured: false,
      },
    ]);
    // SECURITY: the handler does host-authorized data projection ONLY — it never
    // evaluates the actor for authorization or visibility gating.
    expect(svc.resolveViewerContext).not.toHaveBeenCalled();
  });

  it("connectionServiceReady returns the readiness probe boolean", async () => {
    const svc = hostService({ isConnectionServiceReady: vi.fn(() => false) });
    const { ctx, uiActions } = makeCtx({
      "@cinatra-ai/host:external-mcp-registry": svc,
    });
    register(ctx);
    const probe = uiActions.find((a) => a.id === "connectionServiceReady")!;
    expect(await probe.handler(undefined)).toEqual({ ready: false });
    expect(svc.resolveViewerContext).not.toHaveBeenCalled();
  });

  it("registering the actions does NOT eagerly call the host service (probe-safe)", () => {
    const svc = hostService();
    const { ctx } = makeCtx({
      "@cinatra-ai/host:external-mcp-registry": svc,
    });
    register(ctx);
    expect(svc.listServers).not.toHaveBeenCalled();
    expect(svc.isConnectionServiceReady).not.toHaveBeenCalled();
  });
});
