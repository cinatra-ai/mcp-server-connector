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
// node:fs/node:url — this repo ships no @types/node (it is a source-mirror
// repo whose standalone typecheck is intentionally skipped in CI; see
// .github/workflows/ci.yml's first-party-peer skip branch, the same posture
// that already lets register.ts's @cinatra-ai/sdk-extensions type import go
// unresolved standalone). A dynamic-import-rejects probe is NOT equivalent to
// an existence check — a restored file with an unrelated top-level error would
// also reject and pass a reject-based assertion — so this test uses the real
// filesystem check instead.
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import pkg from "../../package.json" with { type: "json" };

const srcDir = fileURLToPath(new URL("..", import.meta.url));

describe("legacy bundled setup-page banners are deleted (mcp-server-connector#13)", () => {
  it("the bundled setup-page implementation files no longer exist", () => {
    expect(existsSync(`${srcDir}mcp-server-setup-impl.tsx`)).toBe(false);
    expect(existsSync(`${srcDir}setup-page.tsx`)).toBe(false);
    expect(existsSync(`${srcDir}actions.ts`)).toBe(false);
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
