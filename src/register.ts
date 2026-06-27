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

export function register(ctx: ExtensionHostContext): void {
  // Bind the host deps slot. Always-bind: re-activation — incl. a hot-update
  // digest swap — re-binds fresh lazy resolvers, so a stale deps object can
  // never outlive its digest.
  registerMcpServerConnector(buildHostBoundDeps(ctx));
}
