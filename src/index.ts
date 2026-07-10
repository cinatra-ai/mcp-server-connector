// Public surface for @cinatra-ai/mcp-server-connector.
//
// This connector carries the host's external-MCP server management UI. It is an
// ADMIN management surface, not an upstream provider, so it exposes no
// crm/pm provider facade and no MCP primitives — the registered external servers
// ARE the MCP. The host wiring binds the connector's deps slot via `./register`.
// This connector declares `uiSurface: "schema-config"` — the host renders its
// setup page from `cinatra.configSchema` data; it ships NO bundled React setup
// page (the legacy bundled page + its flash-banner markup were deleted — see
// cinatra-ai/mcp-server-connector#13).

export {
  registerMcpServerConnector,
  getMcpServerDeps,
  type McpServerConnectorHostDeps,
  type ExternalMcpServerRecordShape,
  type ExternalMcpServerScope,
  type ExternalMcpViewerContext,
  type ExternalMcpServerAction,
} from "./deps";
