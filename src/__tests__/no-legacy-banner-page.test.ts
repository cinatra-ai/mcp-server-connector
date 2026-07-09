// Regression guard for cinatra-ai/mcp-server-connector#13.
//
// This connector declares `uiSurface: "schema-config"` — its live setup page is
// the host-rendered declarative form (cinatra.configSchema, asserted in
// config-schema.test.ts). The legacy BUNDLED React setup page
// (`src/setup-page.tsx` -> `src/mcp-server-setup-impl.tsx`, plus its
// connector-local `"use server"` form actions in `src/actions.ts`) rendered its
// own raw-`div` flash banners reading `?saved` / `?deleted` / `?error` — it was
// never invoked by the host (schema-config connectors are exempt from needing
// a setup-page loader; see the host's `requiresSetupPageLoader` /
// `assertSetupPagesParityWithCatalog`), so it was dead code. It has been
// deleted outright so the dead in-page notification pattern cannot be
// resurrected by a future surface flip. This test pins both halves of that:
// the files are gone, and the package no longer advertises a setup-page
// export or the UI dependencies (react/react-dom/@cinatra-ai/sdk-ui) that only
// the deleted bundled page needed.
import { describe, expect, it } from "vitest";
import pkg from "../../package.json" with { type: "json" };

describe("legacy bundled setup-page banners are deleted (mcp-server-connector#13)", () => {
  it("the bundled setup-page implementation files no longer exist", async () => {
    // Specifiers held in a `string`-typed variable (not a literal) so neither
    // TypeScript nor Vite statically resolves a module path we EXPECT to be
    // absent — only a runtime dynamic import probes for it.
    const implSpecifier: string = "../mcp-server-setup-impl.tsx";
    const pageSpecifier: string = "../setup-page.tsx";
    const actionsSpecifier: string = "../actions.ts";
    await expect(import(implSpecifier)).rejects.toBeDefined();
    await expect(import(pageSpecifier)).rejects.toBeDefined();
    await expect(import(actionsSpecifier)).rejects.toBeDefined();
  });

  it("the package no longer exports a bundled ./setup-page entry point", () => {
    const exports = (pkg as { exports?: Record<string, unknown> }).exports ?? {};
    expect(Object.keys(exports)).not.toContain("./setup-page");
  });

  it("the package no longer declares the UI-only peer/runtime deps the deleted page needed", () => {
    const peerDeps = Object.keys(
      (pkg as { peerDependencies?: Record<string, unknown> }).peerDependencies ?? {},
    );
    const deps = Object.keys(
      (pkg as { dependencies?: Record<string, unknown> }).dependencies ?? {},
    );
    for (const dead of ["react", "react-dom", "@cinatra-ai/sdk-ui"]) {
      expect(peerDeps).not.toContain(dead);
    }
    for (const dead of ["clsx", "tailwind-merge"]) {
      expect(deps).not.toContain(dead);
    }
  });

  it("the live schema-config surface (banner variants) is unaffected", () => {
    const cinatra = (pkg as { cinatra?: { uiSurface?: string } }).cinatra;
    expect(cinatra?.uiSurface).toBe("schema-config");
  });
});
