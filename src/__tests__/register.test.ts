// register(ctx) binds the mcp-server-connector host deps slot by adapting the
// host `@cinatra-ai/host:external-mcp-registry` capability — mirrors
// twenty-connector + plane-connector register.test.ts. This connector registers
// NO crm/pm provider facade (it is an admin management surface), so register is
// deps-binding-only.
import { afterEach, describe, expect, it, vi } from "vitest";
import { register } from "../register";
import {
  _resetMcpServerDepsForTests,
  getMcpServerDeps,
  type ExternalMcpServerRecordShape,
} from "../deps";

type RegisteredProvider = { packageName: string; impl: unknown };

function makeCtx(services: Record<string, unknown>) {
  const registered: Record<string, RegisteredProvider[]> = {};
  return {
    ctx: {
      capabilities: {
        registerProvider: (capability: string, provider: RegisteredProvider) => {
          (registered[capability] ??= []).push(provider);
        },
        resolveProviders: (capability: string): RegisteredProvider[] => {
          const svc = services[capability];
          return svc ? [{ packageName: "host", impl: svc }] : [];
        },
      },
    } as unknown as Parameters<typeof register>[0],
    registered,
  };
}

const ROW: ExternalMcpServerRecordShape = {
  id: "srv-1",
  label: "Example MCP",
  serverUrl: "https://mcp.example.com/sse",
  nangoConnectionId: null,
  scope: "global",
  orgId: null,
  userId: null,
  enabled: true,
  allowedTools: null,
  allowedCatalogTools: null,
  createdAt: "2026-06-19T00:00:00.000Z",
  updatedAt: "2026-06-19T00:00:00.000Z",
};

afterEach(() => {
  _resetMcpServerDepsForTests();
});

describe("mcp-server-connector register(ctx)", () => {
  it("binds host deps that lazily resolve the external-mcp-registry service", async () => {
    const listServers = vi.fn(() => [ROW]);
    const getServerById = vi.fn(() => ROW);
    const resolveViewerContext = vi.fn(async () => ({ isAdmin: true, userId: "u1" }));
    const isConnectionServiceReady = vi.fn(() => true);
    const isPrivateUrl = vi.fn(() => false);
    const createServerAction = vi.fn(async () => {});
    const deleteServerAction = vi.fn(async () => {});

    const { ctx } = makeCtx({
      "@cinatra-ai/host:external-mcp-registry": {
        listServers,
        getServerById,
        resolveViewerContext,
        isConnectionServiceReady,
        isPrivateUrl,
        createServerAction,
        deleteServerAction,
      },
    });
    register(ctx);
    const deps = getMcpServerDeps();

    // Lazy resolution — building the deps did not call the host service yet.
    expect(listServers).not.toHaveBeenCalled();
    expect(resolveViewerContext).not.toHaveBeenCalled();

    // Calling a member resolves the host service at call time.
    expect(deps.listServers()).toEqual([ROW]);
    expect(listServers).toHaveBeenCalledOnce();
    expect(deps.getServerById("srv-1")).toBe(ROW);
    expect(await deps.resolveViewerContext()).toEqual({ isAdmin: true, userId: "u1" });
    expect(deps.isConnectionServiceReady()).toBe(true);
    expect(deps.isPrivateUrl("http://localhost")).toBe(false);

    // The injected server actions forward FormData through to the host.
    const fd = new FormData();
    await deps.createServerAction(fd);
    expect(createServerAction).toHaveBeenCalledWith(fd);
    await deps.deleteServerAction(fd);
    expect(deleteServerAction).toHaveBeenCalledWith(fd);
  });

  it("a deps member throws a clear error when the host service is missing", () => {
    const { ctx } = makeCtx({}); // no services registered
    register(ctx);
    const deps = getMcpServerDeps();
    expect(() => deps.listServers()).toThrow(
      /host service "@cinatra-ai\/host:external-mcp-registry" is not registered/,
    );
  });
});
