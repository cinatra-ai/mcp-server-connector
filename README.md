# MCP Servers

Register external [Model Context Protocol](https://modelcontextprotocol.io) servers so every Cinatra agent and package can call their tools. This admin connector carries the external-MCP server management surface: list registered servers, add new ones by label and URL, and remove them. Admins register servers globally (every user, every agent); regular users register personal servers visible only to them.

**Setup:** Open the connector setup page. Add a server with a public URL (LLM providers cannot reach localhost or private IPs), an optional API key stored securely via the connection service, and a scope. The registry rows, the create/delete actions, and the encrypted key store stay host-side; the connector binds them through its host capability slot and never reaches host internals directly.

**Visibility:** The connector is `admin` visibility. A non-admin sees and manages only their own user-scoped rows; an admin sees every row and may register global, org, or team servers.

**Development:** `pnpm test` runs the Vitest suite; `node extension-kind-gate.mjs` validates the extension manifest and README locally before publishing.

**Documentation:** the full integration hub lives at [docs.cinatra.ai/integrations/mcp-server](https://docs.cinatra.ai/integrations/mcp-server/) — overview, quick start, settings & permissions, and troubleshooting. The source pages are in this repo under `docs/` and republish on each release tag.

## Works with

- Any external MCP server reachable over a public HTTPS URL

## Capabilities

- ✓ Lists registered external MCP servers with scope, private-URL, and disabled badges
- ✓ Adds a server by label and public URL, with an optional connection-service-stored API key
- ✓ Removes a registered server from the per-row delete action
- ✓ Admin-scoped: admins manage global/org/team rows; users manage only their own personal rows
- ✓ Host-bound by inversion of control — the registry, actions, and key store stay host-side
