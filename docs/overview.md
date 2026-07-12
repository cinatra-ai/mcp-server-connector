---
slug: mcp-server
title: MCP Servers integration overview
description: Register external Model Context Protocol servers for every Cinatra agent.
navOrder: 1
tier: first-party
lifecycle: active
cinatraCompat: ">=1.2 <2"
integrationVersion: "0.1.0"
sourceRepo: https://github.com/cinatra-ai/mcp-server-connector
supportUrl: https://docs.cinatra.ai/resources/support/
marketplaceUrl: https://marketplace.cinatra.ai/extensions/mcp-server
---

# MCP Servers integration overview

The MCP Servers integration lets you register external
[Model Context Protocol](https://modelcontextprotocol.io) servers with Cinatra so
that every agent and package can call their tools. Once a server is registered,
its tools become available to Cinatra's LLM calls without any per-agent wiring.

## Who it is for

Administrators who want to extend what Cinatra agents can do by pointing them at
external MCP servers — a search service, a database bridge, a SaaS connector —
and team members who want a personal MCP server visible only to them.

## What it lets you do

- **Register external MCP servers.** Add a server by label and public URL; its
  tools are injected into Cinatra's MCP toolbox.
- **Scope who sees a server.** Admins register servers globally (every user,
  every agent). Regular users register personal servers visible only to
  themselves.
- **Manage the registry.** See every server you are allowed to see, with badges
  for its scope, whether its URL is private (and therefore not injected), and
  whether it is disabled. Remove a server with one action.

## How it fits together

The connector is an admin management surface. The registry rows, the
create/delete actions, and the encrypted API-key store all live host-side; the
connector renders against them through Cinatra's connector inversion-of-control
contract and never reaches host internals directly.

Ready to set it up? Start with the [quick start](./quick-start.md). For
cross-cutting Cinatra material, see the canonical [Guides](/guides/).
