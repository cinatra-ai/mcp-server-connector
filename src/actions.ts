"use server";

// Connector-LOCAL server actions for the MCP Servers setup page (cinatra#1097).
//
// The setup page previously bound the host's boot-published action instances
// (deps.createServerAction / deps.deleteServerAction) DIRECTLY into
// `<form action={…}>` and relied on the host's RSC-layer reflection bridge
// (src/lib/connector-setup-action-references.server.ts) to stamp the
// compiler-minted server-reference metadata onto them. That bridge decorates
// whatever instance the capability registry holds at the bridge's (one-shot)
// module evaluation — but the host re-publishes the service from other bundle
// graphs (e.g. the chat route's registrar import), REPLACING the registry
// instance after the connector captured the boot instance into its deps slot.
// Captured-but-undecorated instances then reach React's serializer unmarked and
// the page 500s ("Functions cannot be passed directly to Client Components…",
// cinatra#1097; the failure the sibling twenty-connector#52 fixed on its live
// surface). On THIS connector the live surface is the declarative schema-config
// setup page (cinatra.configSchema), so the deps-slot binding only sits in the
// dormant bundled-react fallback — but it is the LAST consumer keeping that host
// reflection bridge alive, so the fallback moves to the same pattern here and
// the bridge (and the registry publication of the setup actions) can retire.
//
// This module is the apify/github pattern the bridge header blesses as its
// retirement path: the forms bind THESE exports — genuine `"use server"`
// references minted by the compiler in the SAME route graph that renders the
// page — and each action resolves the host implementation through the deps slot
// AT INVOCATION time, so no reflection and no capture-order dependency remain.
// "use server" actions compile into separately-compiled bundles and CANNOT
// close over the render-time deps, hence the globalThis-anchored slot (same
// reason as the twenty/github-connector actions).
//
// AUTHZ: unchanged. These wrappers add NO behavior — the host action they
// forward to owns the FULL authorization boundary (admin-only-for-global scope,
// URL guard, connection-service import, row write, redirect). A `redirect()`
// thrown inside the host action propagates through the await unchanged.

import { getMcpServerDeps } from "./deps";

/** Add/upsert an external MCP server (add-form POST). */
export async function createServerAction(formData: FormData): Promise<void> {
  await getMcpServerDeps().createServerAction(formData);
}

/** Remove an external MCP server by id (per-row delete POST). */
export async function deleteServerAction(formData: FormData): Promise<void> {
  await getMcpServerDeps().deleteServerAction(formData);
}
