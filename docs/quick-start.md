---
slug: mcp-server
title: MCP Servers quick start
description: Register your first external MCP server in Cinatra.
navOrder: 2
tier: first-party
lifecycle: active
cinatraCompat: ">=1.2 <2"
integrationVersion: "0.1.0"
sourceRepo: https://github.com/cinatra-ai/mcp-server-connector
supportUrl: https://docs.cinatra.ai/resources/support/
marketplaceUrl: https://marketplace.cinatra.ai/extensions/mcp-server
---

# MCP Servers quick start

This page is everything you need to register your first external MCP server with
Cinatra and make its tools available to your agents.

## Before you start

You need:

- The **public URL** of an external MCP server, for example
  `https://mcp.example.com/sse`. LLM providers cannot reach localhost or private
  IPs, so the URL must be publicly reachable.
- An optional **API key** if the server requires authentication.
- Permission in Cinatra to install an integration and configure a connector. To
  register a global, organization, or team server you must be a platform admin;
  any authenticated user can register a personal server.

## Step 1 — Install the integration

1. Open the Cinatra **Marketplace** and find the **MCP Servers** integration.
2. Click **Install**. This adds the connector to your Cinatra instance.

## Step 2 — Open the management page

1. In Cinatra, open the **MCP Servers** connector setup page.
2. You see the list of servers you are allowed to manage, and a form to add a new
   one.

## Step 3 — Add a server

1. Enter a **Label** — a human-readable name for the server.
2. Enter the **Server URL** — the public URL of the MCP server.
3. Optionally paste an **API key**; it is stored securely via the connection
   service.
4. Choose a **Scope**. Admins can pick global, organization, team, or personal;
   non-admins can only create a personal server.
5. Click **Add server**.

## Step 4 — Confirm it is registered

The new server appears in the **Registered servers** list with a badge for its
scope. If its URL is private it is flagged **Private URL — not injected**, which
means its tools will not reach the LLM until the URL is public.

That is the whole setup. The server's tools are now available to Cinatra agents
within its scope.

## Verify it worked

Open the management page again and confirm the server is listed without a
private-URL or disabled badge. If something does not line up, see
[troubleshooting](./troubleshooting.md).
