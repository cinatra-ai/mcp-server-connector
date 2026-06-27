---
slug: mcp-server
title: Use the MCP Servers integration
description: What the MCP Servers registry does day to day, and what it does not.
navOrder: 3
tier: first-party
lifecycle: active
cinatraCompat: ">=1.2 <2"
integrationVersion: "0.1.0"
sourceRepo: https://github.com/cinatra-ai/mcp-server-connector
supportUrl: https://docs.cinatra.ai/resources/support/
marketplaceUrl: https://marketplace.cinatra.ai/extensions/mcp-server
---

# Use the MCP Servers integration

Once you have registered one or more external MCP servers, the integration runs
quietly: Cinatra agents within a server's scope can call its tools. This page
explains what that means day to day — and what it does not.

## What a registered server does

- **Its tools become callable.** A registered, enabled, public-URL server has its
  tools injected into Cinatra's MCP toolbox, so agents within its scope can call
  them.
- **Scope decides who sees it.** A global server is visible to every user and
  agent; an organization or team server is scoped to that group; a personal
  server is visible only to the user who registered it.

## Managing the registry

- **List.** The management page lists every server you are allowed to see, each
  with badges for its scope, a private-URL warning, and a disabled marker.
- **Add.** The add form registers a new server by label and public URL, with an
  optional API key and a scope.
- **Remove.** The per-row delete action removes a server from the registry.

## What is not done here

- **The connector does not proxy tool calls.** It manages the registry only. The
  host injects and enforces tool access at call time.
- **Private URLs are not injected.** A server whose URL is private (localhost or a
  private IP) is flagged and its tools are never sent to the LLM, because LLM
  providers cannot reach it.
- **Non-admins cannot manage shared servers.** A non-admin sees and removes only
  their own personal rows.

## How access stays safe

- **The API key is stored securely.** Keys are held by the host connection
  service, never in clear text in the registry.
- **Inversion of control.** The connector reaches the registry, the actions, and
  the key store only through the host capabilities it was granted — it cannot
  touch anything else.

For configuration and the permission model, see
[settings & permissions](./settings-and-permissions.md).
