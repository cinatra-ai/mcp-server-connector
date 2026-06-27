---
slug: mcp-server
title: MCP Servers advanced and reference
description: Deeper material and canonical reference links for the MCP Servers integration.
navOrder: 6
tier: first-party
lifecycle: active
cinatraCompat: ">=1.2 <2"
integrationVersion: "0.1.0"
sourceRepo: https://github.com/cinatra-ai/mcp-server-connector
supportUrl: https://docs.cinatra.ai/resources/support/
marketplaceUrl: https://marketplace.cinatra.ai/extensions/mcp-server
---

# MCP Servers advanced and reference

This page collects deeper material and links out to the canonical Cinatra
chapters — it does not duplicate them.

## An admin management connector, not a provider

The MCP Servers integration is an admin management surface. Unlike a provider
connector — which adapts one upstream tool behind a provider-neutral contract —
this connector carries the host's external-MCP registry management UI. The
registry rows, the create and delete actions, and the encrypted API-key store
all live host-side; the connector renders against them through the host
capability registry and binds them into its dependency slot at activation.

For the cross-cutting platform reference, see the canonical
[References](/references/) chapter.

## The two-layer tool enforcement model

A registered server carries two optional allowlists the host enforces:

- **Layer A** is the native MCP tool allowlist on the server row; a `null` value
  means no filter.
- **Layer B** is the catalog tool-name allowlist enforced by the host proxy; a
  `null` value means no filter at the proxy layer.

The connector surfaces and manages the registry rows; the host applies both
layers when it injects a server's tools into an LLM call.

## Scope and visibility

- **Global** servers are injected for every user and agent and require platform
  admin to create.
- **Organization** and **team** servers are scoped to that group and also require
  admin.
- **Personal** servers are visible only to the user who registered them and are
  bound to that user's id.

## Source and support

- Source repository: [cinatra-ai/mcp-server-connector](https://github.com/cinatra-ai/mcp-server-connector).
- Get help: the [support](https://docs.cinatra.ai/resources/support/) page.
- Marketplace listing: [MCP Servers on the Cinatra Marketplace](https://marketplace.cinatra.ai/extensions/mcp-server).
