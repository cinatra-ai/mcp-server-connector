---
slug: mcp-server
title: MCP Servers troubleshooting
description: Diagnose and fix common MCP Servers integration issues.
navOrder: 5
tier: first-party
lifecycle: active
cinatraCompat: ">=1.2 <2"
integrationVersion: "0.1.0"
sourceRepo: https://github.com/cinatra-ai/mcp-server-connector
supportUrl: https://docs.cinatra.ai/resources/support/
marketplaceUrl: https://marketplace.cinatra.ai/extensions/mcp-server
---

# MCP Servers troubleshooting

Each problem below gives the **symptoms**, the **cause**, the **fix**, the
**diagnostics** to confirm it, and the **escalation** path if the fix does not
work.

## A server is flagged "Private URL — not injected"

- **Symptoms:** A registered server shows a red **Private URL — not injected**
  badge and its tools never reach agents.
- **Cause:** The server URL points at localhost or a private IP, which LLM
  providers cannot reach.
- **Fix:** Re-register the server with a publicly reachable URL, then delete the
  private-URL row.
- **Diagnostics:** Confirm the URL resolves to a public address from outside your
  network; the badge disappears once the URL is public.
- **Escalation:** [Contact support](https://docs.cinatra.ai/resources/support/)
  if a public URL is still flagged as private.

## A registered server's tools never appear

- **Symptoms:** The server is listed but its tools are not available to an agent.
- **Cause:** The server is disabled, its URL is private, or it is out of the
  agent's scope.
- **Fix:** Check the server's badges. Enable it if disabled, make its URL public
  if private, and confirm its scope covers the agent (global, or user-scoped to
  that agent's owner).
- **Diagnostics:** A server with no private-URL and no disabled badge, in the
  right scope, should inject its tools.
- **Escalation:** [Contact support](https://docs.cinatra.ai/resources/support/)
  if an enabled, public, in-scope server still injects no tools.

## Cannot create a global server

- **Symptoms:** The scope selector only offers **Personal**, or a global write is
  rejected.
- **Cause:** Registering a global server requires platform admin; the actor is
  not an admin.
- **Fix:** Ask a platform admin to register the global server, or register a
  personal server instead.
- **Diagnostics:** An admin sees the Global and Personal scope options; a
  non-admin sees only Personal. (Organization and Team scopes are not offered —
  the host does not support them.)
- **Escalation:** [Contact support](https://docs.cinatra.ai/resources/support/)
  if an admin still cannot create a global server.

## A deleted server still appears

- **Symptoms:** A server you removed is still listed after the page reloads.
- **Cause:** The delete action did not complete, or you are viewing a cached page.
- **Fix:** Re-open the management page and delete the row again.
- **Diagnostics:** A successful delete removes the row and shows the removed
  confirmation.
- **Escalation:** [Contact support](https://docs.cinatra.ai/resources/support/)
  if the row reappears after a confirmed delete.

For configuration details and the permission model, see
[settings & permissions](./settings-and-permissions.md).
