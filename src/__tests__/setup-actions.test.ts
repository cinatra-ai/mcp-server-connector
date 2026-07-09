// cinatra#1097 regression — the setup page's form actions are CONNECTOR-LOCAL
// "use server" exports (the apify/github pattern), never the deps-slot
// instances.
//
// THE FAILING STATE THIS PINS AGAINST: the host boot publishes the
// create/delete implementations through the capability registry and the
// connector captured them into its deps slot at activation, then bound those
// captured instances DIRECTLY into `<form action={…}>`. Other host bundle
// graphs (e.g. the chat route) re-evaluate the registrar and RE-PUBLISH,
// REPLACING the registry instances — so any reflection applied to the
// registry's CURRENT instance (the host's setup-action bridge) never reaches a
// stale captured instance, which then crosses to React's serializer UNMARKED
// and 500s the page ("Functions cannot be passed directly to Client
// Components…"). On this connector the live surface is the declarative
// schema-config page, so the deps-slot binding sat only in the dormant
// bundled-react fallback — but it was the last consumer of the host reflection
// bridge. Binding compiler-minted references from a connector-local
// `"use server"` module — part of the SAME route graph that renders the page —
// removes the reflection/capture-order dependency entirely.
//
// A unit runtime has no Next compiler, so the transform itself cannot mint
// `$$id` here; what IS assertable at this level (and is exactly what broke):
//   1. ./actions is a genuine server-action module — its FIRST statement is the
//      `"use server"` directive, so ANY route graph importing it gets
//      compiler-minted reference exports.
//   2. The setup impl binds THOSE exports into `<form action={…}>` — and never
//      binds a deps-slot member into a form action.
//   3. The actions forward to the deps-slot implementations at invocation time
//      (lazy — resolved per call, never captured at module load).

import { describe, expect, it, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import * as path from "node:path";

import { createServerAction, deleteServerAction } from "../actions";
import { registerMcpServerConnector, _resetMcpServerDepsForTests } from "../deps";
import type { McpServerConnectorHostDeps } from "../deps";

const SRC = path.join(__dirname, "..");

beforeEach(() => {
  _resetMcpServerDepsForTests();
});

describe("connector-local setup actions (cinatra#1097)", () => {
  it("./actions is a server-action module: the FIRST statement is the \"use server\" directive", () => {
    const source = readFileSync(path.join(SRC, "actions.ts"), "utf-8");
    expect(source.startsWith(`"use server";`)).toBe(true);
  });

  it("the setup impl binds the connector-local actions into <form action> — never a deps-slot member", () => {
    const source = readFileSync(path.join(SRC, "mcp-server-setup-impl.tsx"), "utf-8");
    // The two forms bind the local "use server" exports…
    expect(source).toContain(`from "./actions"`);
    expect(source).toContain("<form action={createServerAction}");
    expect(source).toContain("<form action={deleteServerAction}");
    // …and no form binds a deps-slot instance (the #1097 unmarked crossing).
    expect(source).not.toContain("action={deps.createServerAction}");
    expect(source).not.toContain("action={deps.deleteServerAction}");
  });

  it("actions forward to the deps-slot host implementations at INVOCATION time (no capture at import)", async () => {
    // The actions module was imported at the top of this file while the slot
    // was empty — a load-time capture would have thrown or bound undefined.
    const create = vi.fn(async () => {});
    const del = vi.fn(async () => {});
    registerMcpServerConnector({
      createServerAction: create,
      deleteServerAction: del,
    } as unknown as McpServerConnectorHostDeps);

    const createFd = new FormData();
    await createServerAction(createFd);
    expect(create).toHaveBeenCalledWith(createFd);

    const deleteFd = new FormData();
    await deleteServerAction(deleteFd);
    expect(del).toHaveBeenCalledWith(deleteFd);
  });

  it("an unbound deps slot fails LOUD at invocation (not silently at render)", async () => {
    await expect(createServerAction(new FormData())).rejects.toThrow(
      /host runtime deps not registered/,
    );
    await expect(deleteServerAction(new FormData())).rejects.toThrow(
      /host runtime deps not registered/,
    );
  });
});
