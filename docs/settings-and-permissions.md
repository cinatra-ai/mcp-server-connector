---
slug: mcp-server
title: MCP Servers settings and permissions
description: Configure the MCP Servers connector and understand its trust model.
navOrder: 4
tier: first-party
lifecycle: active
cinatraCompat: ">=1.2 <2"
integrationVersion: "0.1.0"
sourceRepo: https://github.com/cinatra-ai/mcp-server-connector
supportUrl: https://docs.cinatra.ai/resources/support/
marketplaceUrl: https://marketplace.cinatra.ai/extensions/mcp-server
---

# MCP Servers settings and permissions

This page covers the connector's configuration, the permissions it requires, and
its trust model — what it can access, how that access is granted, and how it is
governed. Read it before you enable the integration.

## Configuration

Each registered server takes these values, all entered on the management page:

| Setting | What it is | Example |
|---------|------------|---------|
| Label | A human-readable name | `My Search MCP` |
| Server URL | The public MCP server URL | `https://mcp.example.com/sse` |
| API key | Optional auth, stored securely | `sk-...` |
| Scope | Who the server is visible to | `global` or `user` |

A server URL must be public. A private URL (localhost or a private IP) is
accepted but flagged and never injected, because LLM providers cannot reach it.

## Required permissions

- **In Cinatra:** the connector is `admin` visibility. Registering a global,
  organization, or team server requires platform admin, because such a server is
  injected into every in-scope agent's toolbox with no per-call approval — a
  platform-wide trust mutation. Any authenticated user may register a personal
  server bound to their own user id.
- **Host ports:** the connector requests the `capabilities` host port and runs
  under the standard connector inversion-of-control contract — it cannot reach
  host facilities it has not been granted.

## Trust model

- **The API key is encrypted at rest.** Keys are stored by the host connection
  service and decrypted only in-process at the moment a request is made. They are
  never logged or persisted in clear text by the connector.
- **The connector only manages the registry.** The registry rows, the
  create/delete actions, and the key store all live host-side. The connector
  renders against the injected read surface and submits to the injected actions;
  it never imports host internals and never proxies a tool call.
- **Authorization is enforced host-side.** The host re-checks admin authority on
  every global write and binds a personal server to the actor's own user id, so a
  non-admin cannot overwrite or re-scope a shared row.

## Failure modes

| Symptom | Cause |
|---------|-------|
| Server flagged "Private URL — not injected" | The URL is localhost or a private IP. |
| A server's tools never appear | The server is disabled, private, or out of scope. |
| Cannot create a global server | The actor is not a platform admin. |

For step-by-step recovery, see [troubleshooting](./troubleshooting.md).
