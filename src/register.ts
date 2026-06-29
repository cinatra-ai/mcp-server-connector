// The mcp-server-connector's `register(ctx)` server entry.
//
// This connector carries the host's external-MCP server management UI. Unlike
// twenty/plane it registers NO crm/pm provider facade — the registered external
// servers ARE the MCP; this connector only manages their registry rows. So
// `register(ctx)` is deps-binding-only: it adapts the per-concern host service
// published in the capability registry
// (`@cinatra-ai/host:external-mcp-registry`) into the connector's deps slot
// (`./deps`). The carved setup-page (`./setup-page` -> `./mcp-server-setup-impl`)
// resolves the bound deps via `getMcpServerDeps()`; the connector NEVER imports a
// host-internal `@/…` module.
//
// Every adapter member resolves its host service LAZILY at call time, so
// activation order against the host's boot imports never matters.
// Registration-only (no I/O) — probe-safe and safe under
// required-extension-activation's prod-boot arming.
//
// SDK imports here are TYPE-ONLY (host-peer value-import gate): the host service
// travels as DATA through `ctx.capabilities`; the capability id is an inlined
// string literal; the service shape is a local structural type so the connector
// compiles against ANY host SDK it can meet during skew. Mirrors
// twenty-connector/src/register.ts + plane-connector/src/register.ts.

import type { ExtensionHostContext } from "@cinatra-ai/sdk-extensions";
import {
  registerMcpServerConnector,
  type McpServerConnectorHostDeps,
} from "./deps";

const PACKAGE_NAME = "@cinatra-ai/mcp-server-connector";

// Local STRUCTURAL shape of the per-concern host service this connector adapts
// into its deps slot — the external-MCP registry read/list surface, the
// create/delete server actions, the viewer-context resolver, and the
// connection-service / private-URL guards. The host publishes ONE service under
// this capability id (`register-host-connector-services`); the connector binds
// only the members it needs (least privilege — the registry's pre-existing
// bearer-mint writers stay unbound here).
type HostExternalMcpRegistryShape = McpServerConnectorHostDeps;

/** Lazy per-concern host-service resolution (fail-loud on a missing service —
 *  the host boot wiring publishes it before any connector call runs). */
function hostService<T>(ctx: ExtensionHostContext, capability: string): T {
  const provider = ctx.capabilities.resolveProviders(capability)[0];
  if (!provider) {
    throw new Error(
      `${PACKAGE_NAME}: host service "${capability}" is not registered — ` +
        `the host boot wiring (register-host-connector-services) must run before connector calls.`,
    );
  }
  return provider.impl as T;
}

/** Build the host-bound deps from the per-concern host service. The read +
 *  guard members resolve the host service LAZILY at call time — so for those,
 *  constructing this object does no I/O and no resolution (probe-safe).
 *
 *  The two WRITE members are the host's REAL server actions, bound DIRECTLY
 *  (not wrapped): the setup page passes them straight to `<form action={…}>`,
 *  which requires a genuine, serializable server-action reference — an adapter
 *  arrow closure (`(fd) => registry().createServerAction(fd)`) is a fresh
 *  client-side function, NOT a server action, and React rejects it at form
 *  render. So we resolve the host service ONCE here and forward its actual
 *  `createServerAction` / `deleteServerAction` references. `register(ctx)` runs
 *  at ACTIVATION (the host boot wiring has already published the service), so
 *  this resolution is safe; if the service is somehow absent, `hostService`
 *  fails loud (the same error the lazy members would surface). */
function buildHostBoundDeps(ctx: ExtensionHostContext): McpServerConnectorHostDeps {
  const registry = () =>
    hostService<HostExternalMcpRegistryShape>(ctx, "@cinatra-ai/host:external-mcp-registry");

  // Resolve the host service eagerly ONLY to forward its REAL server-action
  // references (the write members). Resolution is OPTIONAL here so building
  // deps stays probe-safe when the service is not yet published: a present
  // provider yields the genuine references; an absent one falls back to a lazy
  // wrapper that fails loud at call time via `registry()` (identical posture to
  // the read members). `register(ctx)` runs at ACTIVATION, after the host boot
  // wiring publishes the service, so production always takes the direct-ref
  // branch — and `<form action>` therefore receives a genuine server action.
  const resolvedNow = ctx.capabilities.resolveProviders(
    "@cinatra-ai/host:external-mcp-registry",
  )[0]?.impl as HostExternalMcpRegistryShape | undefined;

  return {
    getServerById: (id) => registry().getServerById(id),
    listServers: () => registry().listServers(),
    // Real server-action references when resolvable (the production path) so
    // `<form action>` gets a genuine server action; lazy fail-loud wrapper
    // otherwise (probe-safe; matches the read members' posture).
    createServerAction:
      resolvedNow?.createServerAction ?? ((formData) => registry().createServerAction(formData)),
    deleteServerAction:
      resolvedNow?.deleteServerAction ?? ((formData) => registry().deleteServerAction(formData)),
    resolveViewerContext: () => registry().resolveViewerContext(),
    isConnectionServiceReady: () => registry().isConnectionServiceReady(),
    isPrivateUrl: (serverUrl) => registry().isPrivateUrl(serverUrl),
  };
}

/** A registry row projected to a JSON-safe shape the declarative `record-list`
 *  renderer consumes (cinatra.configSchema). Mirrors the badges the
 *  bundled-react fallback derived inline (scope / private-URL / disabled /
 *  api-key-configured). PURE PROJECTION — no actor evaluation, no visibility
 *  gating: the host action endpoint already authorized the actor ("use") and the
 *  host listServers facet returns only the rows that actor may see. */
export type McpServerListRow = {
  id: string;
  label: string;
  serverUrl: string;
  scope: string;
  /** Private/non-public URL — flagged "not injected" by the renderer. */
  privateUrl: boolean;
  /** A disabled row (renders the "Disabled" badge). */
  disabled: boolean;
  /** Whether a Nango connection (API key) is configured for this row. */
  apiKeyConfigured: boolean;
};

export function register(ctx: ExtensionHostContext): void {
  // Bind the host deps slot. Always-bind: re-activation — incl. a hot-update
  // digest swap — re-binds fresh lazy resolvers, so a stale deps object can
  // never outlive its digest. The bound deps still back the bundled-react
  // setup-page fallback (`./setup-page` -> `./mcp-server-setup-impl`).
  const deps = buildHostBoundDeps(ctx);
  registerMcpServerConnector(deps);

  // ---- schema-config named actions (READ / PROBE only) ----
  //
  // The declarative setup surface (cinatra.configSchema) renders WITHOUT
  // shipping React. Its `record-list` + `advisory` fields reference host-
  // registered named actions BY ID; the host dispatches them through the single
  // endpoint `/api/extensions/{installId}/actions/{actionId}`, which resolves +
  // AUTHORIZES the actor host-side (`canExtensionAccess(..., "use")`) BEFORE
  // calling the handler. The handler therefore NEVER evaluates the actor and
  // NEVER calls `resolveViewerContext` for authorization or visibility gating —
  // admin-only/scope decisions are host-evaluated (the schema's `adminOnly`
  // option flags + the host write handlers).
  //
  // Only the READ + PROBE actions are registered here. The WRITE actions
  // (`createServer` / `deleteServer`) and their per-operation authorization
  // (e.g. admin-only-for-global scope, per-row delete authorization) are bound
  // HOST-side in cinatra#658 (PR-4) against the JSON contract this connector
  // DECLARES in its configSchema — see ./deps `McpServerConnectorHostDeps` and
  // the actionIds `createServer` / `deleteServer`. PR-3 (this repo) contributes
  // nothing binding until PR-4 bumps the lock pin; deferring the write handlers
  // to the host avoids a divergent JSON->FormData validation path (the
  // canonical create/delete validation stays in the host server actions).
  //
  // Requires the "ui" host port (declared in cinatra.requestedHostPorts).

  // `listServers` — the live registered-server rows for the authorized actor,
  // projected to the JSON-safe `record-list` shape (badges as data).
  ctx.ui.registerAction({
    id: "listServers",
    handler: async (): Promise<{ servers: McpServerListRow[] }> => {
      const rows = deps.listServers();
      const servers: McpServerListRow[] = rows.map((row) => ({
        id: row.id,
        label: row.label,
        serverUrl: row.serverUrl,
        scope: row.scope,
        privateUrl: deps.isPrivateUrl(row.serverUrl),
        disabled: !row.enabled,
        apiKeyConfigured: row.nangoConnectionId != null,
      }));
      return { servers };
    },
  });

  // `connectionServiceReady` — the readiness probe the `advisory` field reads to
  // choose its API-key-storage copy. Boolean data only.
  ctx.ui.registerAction({
    id: "connectionServiceReady",
    handler: async (): Promise<{ ready: boolean }> => ({
      ready: deps.isConnectionServiceReady(),
    }),
  });
}
