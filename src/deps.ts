import "server-only";

// MCP Servers connector deps surface.
//
// This connector carries the host's external-MCP server management UI (carved
// from the host's external-mcp-settings-page). It is an ADMIN management surface
// — not an upstream provider — so it registers NO crm/pm provider facade and
// ships no MCP primitives of its own (the registered external servers ARE the
// MCP; this connector only manages their registry rows).
//
// Per the provider-connector contract (https://docs.cinatra.ai/references/platform/extensions/),
// the connector declares the host facilities it consumes HERE as TYPES only;
// the host wires concrete implementations at boot. The connector NEVER imports a
// host-internal `@/…` module — the registry read/list surface + the
// create/delete mutations are delivered through the host capability registry and
// bound into this deps slot by `register(ctx)` (mirrors twenty-connector's
// external-mcp-registry deps slot + plane-connector's lazy per-concern service
// resolution).
//
// What this connector needs from the host:
//   - getServerById / listServers: the external-MCP registry READ surface (the
//     UI lists registered servers).
//   - createServerAction / deleteServerAction: the host server actions the
//     add-form and per-row delete button submit to. They travel as DATA through
//     the capability registry; the connector treats them as opaque
//     FormData->Promise<void> server actions.
//
// DECLARATIVE SETUP DSL (cinatra#658 / PR-4 host binding):
//   This connector now ALSO ships a declarative `cinatra.configSchema`
//   (uiSurface:"schema-config") so the host renders the setup page from DATA
//   with NO rebuild. Its `record-list` + `advisory` fields read host-registered
//   READ/PROBE named actions this connector registers in register(ctx) via
//   `ctx.ui` (`listServers`, `connectionServiceReady`). Its `named-action`
//   ("Add server", actionId `createServer`) and `record-list` per-row delete
//   (actionId `deleteServer`) are WRITE actions whose handlers + per-operation
//   authorization (admin-only-for-global scope; per-row delete authz) are bound
//   HOST-side in PR-4 against this JSON contract (NOT registered by the
//   connector — they must stay host-authorized, never package-evaluated):
//     createServer  input: { label: string; serverUrl: string; apiKey?: string;
//                            scope: "global"|"org"|"team"|"user" }
//                   The host MUST enforce admin-only for non-"user" scope and
//                   apply the SAME validation as `createServerAction(FormData)`.
//     deleteServer  input: { id: string }
//                   The host MUST verify the actor may delete that specific row.
//   The single host action endpoint `/api/extensions/{installId}/actions/
//   {actionId}` resolves + authorizes the actor host-side ("use" tier) before
//   any handler runs; the connector handlers never evaluate the actor.
//   - viewerContext: the resolved viewer (isAdmin + userId) so the UI scopes
//     visibility (admins see every row; a non-admin sees only their own
//     user-scoped rows) and offers only the scopes the viewer may create.
//   - connectionServiceReady: whether the host connection (Nango) service is
//     configured, so the API-key field can advise correctly.
//
// The deps slot is anchored on `globalThis` via a namespaced+versioned Symbol so
// the boot-time registration and the runtime callers — which live in
// SEPARATELY-COMPILED Next.js bundles — resolve the SAME slot. (Same reason as
// the twenty/plane/crm/github/linkedin deps slots.)

/** External-MCP server scope. Mirrors the host `ExternalMcpServerScope` — a
 *  local structural type so the connector compiles against any host SDK it can
 *  meet during skew (no host type import). */
export type ExternalMcpServerScope = "global" | "org" | "team" | "user" | "workspace";

/** Structural external-MCP server registry row (mirror of the host's
 *  `ExternalMcpServerRecord`; registry rows always carry the full document, so
 *  no skew-optional fields). */
export type ExternalMcpServerRecordShape = {
  id: string;
  label: string;
  serverUrl: string;
  nangoConnectionId: string | null;
  scope: ExternalMcpServerScope;
  orgId: string | null;
  userId: string | null;
  enabled: boolean;
  /** Layer A — native MCP allowlist (`null` = no filter). */
  allowedTools: string[] | null;
  /** Layer B — catalog toolName allowlist enforced by the host proxy
   *  (`null` = no filter at the proxy layer). */
  allowedCatalogTools: string[] | null;
  createdAt: string;
  updatedAt: string;
};

/** The resolved viewer the UI scopes against. */
export type ExternalMcpViewerContext = {
  /** Platform admin — sees every row and may create global/org/team rows. */
  isAdmin: boolean;
  /** The viewer's user id (the owner of any user-scoped row they create). */
  userId: string;
};

/** A host server action the setup-page <form> submits to. Opaque to the
 *  connector — the host owns the authorization boundary + the redirect. */
export type ExternalMcpServerAction = (formData: FormData) => Promise<void>;

export interface McpServerConnectorHostDeps {
  /** One registry row by id (null when unknown). */
  getServerById: (id: string) => ExternalMcpServerRecordShape | null;
  /** Every registry row (cached host-side, createdAt ASC). */
  listServers: () => ExternalMcpServerRecordShape[];
  /** The host server action the add-form submits to (create/upsert). */
  createServerAction: ExternalMcpServerAction;
  /** The host server action the per-row delete button submits to. */
  deleteServerAction: ExternalMcpServerAction;
  /** Resolve the current viewer (admin + user id) for visibility scoping. */
  resolveViewerContext: () => Promise<ExternalMcpViewerContext>;
  /** Is the host connection (Nango) service configured for API-key storage? */
  isConnectionServiceReady: () => boolean;
  /** Is the given server URL private/non-public (cannot be injected into LLM
   *  calls)? Mirrors the host `isPrivateUrl` guard. */
  isPrivateUrl: (serverUrl: string) => boolean;
}

const MCP_SERVER_DEPS_KEY = Symbol.for("@cinatra-ai/mcp-server-connector:host-deps/v1");
type DepsHolder = { [k: symbol]: McpServerConnectorHostDeps | null | undefined };
const _holder = globalThis as unknown as DepsHolder;

export function registerMcpServerConnector(deps: McpServerConnectorHostDeps): void {
  _holder[MCP_SERVER_DEPS_KEY] = deps;
}

export function getMcpServerDeps(): McpServerConnectorHostDeps {
  const deps = _holder[MCP_SERVER_DEPS_KEY];
  if (!deps) {
    throw new Error(
      "@cinatra-ai/mcp-server-connector: host runtime deps not registered. " +
        "Call registerMcpServerConnector(deps) at boot.",
    );
  }
  return deps;
}

/** @internal test-only. */
export function _resetMcpServerDepsForTests(): void {
  _holder[MCP_SERVER_DEPS_KEY] = null;
}
