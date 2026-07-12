// Contract fixtures for the declarative setup DSL (cinatra.configSchema).
//
// The MCP Servers connector ships a `uiSurface:"schema-config"` declaration so
// the host renders its setup page from DATA with NO rebuild (cinatra#658 / the
// hot-install epic). These tests prove the declared `cinatra.configSchema`
// passes the PUBLIC validation path — the SAME fail-closed `validateConfigSchema`
// the repo's `extension-kind-gate.mjs` runs in CI (and the rules-only port of
// the host's `parseSchemaConfig` in src/lib/extension-schema-config.ts). They
// also pin the DSL field-kind grammar (select / record-list / advisory /
// banner) the host renderer is extended with in PR-4, AND the cinatra-ai/
// mcp-server-connector#18 tab-group reorg (design spec: app-connectors §II —
// an implicit "Setup" base tab plus a reserved "Help" tab always last),
// catching a connector<->host vocabulary skew at author time.

import { describe, expect, it } from "vitest";
// The package.json is the manifest the host materializes; the configSchema under
// `cinatra` is the exact data the renderer parses.
import pkg from "../../package.json" with { type: "json" };
// The repo's standalone, zero-dependency validator (the kind-gate's public path).
import { validateConfigSchema } from "../../extension-kind-gate.mjs";

const configSchema = (pkg as { cinatra?: { configSchema?: unknown } }).cinatra
  ?.configSchema;

type Field = Record<string, unknown>;
type Tab = { id: string; label: string; fields: Field[] };

// The base `fields` render as the host's reserved "Setup" tab (the record-list
// of registered servers + the add-server form); `tabs[]` are the connector's
// declared custom tabs — here, only the reserved Help tab.
const setupFields = (configSchema as { fields: Field[] }).fields;
const tabs = (configSchema as { tabs?: Tab[] }).tabs ?? [];
const helpTab = tabs.find((t) => t.id === "help");

describe("mcp-server-connector cinatra.configSchema", () => {
  it('declares uiSurface:"schema-config" and requests the "ui" host port', () => {
    const cinatra = (pkg as { cinatra: Record<string, unknown> }).cinatra;
    expect(cinatra.uiSurface).toBe("schema-config");
    expect(cinatra.requestedHostPorts).toContain("ui");
    expect(cinatra.requestedHostPorts).toContain("capabilities");
  });

  it("the declared configSchema parses with ZERO validation errors", () => {
    expect(validateConfigSchema(configSchema)).toEqual([]);
  });

  it("covers every required setup element from the issue (the Setup tab)", () => {
    const fields = setupFields;
    const byKind = (k: string) => fields.filter((f) => f.kind === k);

    // record-list of registered servers + per-row delete + badges + empty state.
    const recordList = byKind("record-list")[0];
    expect(recordList).toBeDefined();
    expect(recordList.listActionId).toBe("listServers");
    expect(recordList.deleteActionId).toBe("deleteServer");
    expect(recordList.emptyState).toBeTruthy();
    const badgeKeys = (
      recordList.itemBadges as Array<{ key: string }>
    ).map((b) => b.key);
    expect(badgeKeys).toEqual(
      expect.arrayContaining([
        "scope",
        "privateUrl",
        "disabled",
        "apiKeyConfigured",
      ]),
    );
    // The live `listServers` NAMED-ACTION handler (this connector's
    // register.ts, NOT the host's raw `listExternalMcpServers()` facet) DOES
    // filter per viewer — admins see every row, non-admins see only their own
    // personal servers — so the description must disclose that, not claim an
    // unfiltered list (cinatra-ai/cinatra#1407 comment 4950796614). Regression
    // pin for the mcp-server-connector#18 correction.
    const recordListDescription = (recordList.description as string).toLowerCase();
    expect(recordListDescription).toMatch(
      /non-admins see only|only their own personal servers/,
    );
    expect(recordListDescription).not.toMatch(/regardless of who is viewing/);

    // create form: text label + text serverUrl + secret apiKey + select scope.
    const textKeys = byKind("text").map((f) => f.key);
    expect(textKeys).toEqual(expect.arrayContaining(["label", "serverUrl"]));
    expect(byKind("secret").map((f) => f.key)).toContain("apiKey");

    // scope select: ONLY admin-only global + always-available user. The host
    // write handler fail-closed-rejects any scope outside {global, user}
    // (`external_mcp_servers` has no org/team column and an org row maps to
    // org-WIDE visibility, so neither can be scoped safely today) — so the
    // connector must not OFFER org/team at all (cinatra-ai/cinatra#1407
    // comment 4950796614). Regression pin for the mcp-server-connector#18
    // correction: this replaces the earlier "not yet supported" compromise,
    // which still let an admin pick a scope guaranteed to be rejected.
    const select = byKind("select").find((f) => f.key === "scope");
    expect(select).toBeDefined();
    const options = select!.options as Array<{
      value: string;
      label: string;
      adminOnly?: boolean;
    }>;
    expect(options.map((o) => o.value).sort()).toEqual(["global", "user"]);
    const adminOnly = options
      .filter((o) => o.adminOnly === true)
      .map((o) => o.value);
    expect(adminOnly).toEqual(["global"]);
    const userOpt = options.find((o) => o.value === "user");
    expect(userOpt).toBeDefined();
    expect(userOpt!.adminOnly).not.toBe(true);
    for (const value of ["org", "team"]) {
      expect(
        options.find((o) => o.value === value),
        `"${value}" must not be offered as a scope option`,
      ).toBeUndefined();
    }
    const scopeDescription = ((select as { description?: string }).description ?? "").toLowerCase();
    expect(scopeDescription).not.toMatch(/org|team/);
    expect(scopeDescription).toMatch(/only admins can create a global server/);

    // create named-action, readiness advisory, saved/deleted/error banners.
    expect(byKind("named-action").map((f) => f.actionId)).toContain(
      "createServer",
    );
    const setupAdvisory = byKind("advisory")[0] as {
      probeActionId?: string;
      whenReady?: string;
      whenNotReady?: string;
    };
    expect(setupAdvisory.probeActionId).toBe("connectionServiceReady");
    // Neither branch may claim the API key is persisted/stored — the write
    // handler (host-side) never reads it, so entering one is currently a
    // silent no-op (cinatra-ai/cinatra#1407). Regression pin for the
    // mcp-server-connector#18 correction: keep the Setup tab's advisory
    // truthful and consistent with the Help tab's own copy.
    for (const copy of [setupAdvisory.whenReady, setupAdvisory.whenNotReady]) {
      expect(copy).toBeTruthy();
      expect(copy!.toLowerCase()).not.toMatch(/stored securely|api keys are stored/);
    }
    const banner = byKind("banner")[0];
    expect(banner).toBeDefined();
    const variantNames = (
      banner.variants as Array<{ name: string }>
    ).map((v) => v.name);
    expect(variantNames).toEqual(
      expect.arrayContaining(["saved", "deleted", "error"]),
    );
  });

  describe("tab groups (design spec: app-connectors §II — Setup base tab, reserved Help tab LAST)", () => {
    it("declares exactly one custom tab: the reserved Help tab", () => {
      expect(tabs.map((t) => t.id)).toEqual(["help"]);
      expect(helpTab?.label).toBe("Help");
    });

    it("did not move the record-list / create-form (multi-instance Setup surface) off the Setup tab", () => {
      // This connector's actual connection model is MULTI-INSTANCE (many
      // registered external MCP servers via a record-list), not a single
      // connect/disconnect connection — the Help tab addition must not disturb
      // that surface, which stays entirely on the base (Setup) tab.
      const byKind = (list: Field[], k: string) => list.filter((f) => f.kind === k);
      const byKey = (list: Field[], k: string) =>
        list.find((f) => (f as { key?: string }).key === k);
      expect(byKind(setupFields, "record-list")).toHaveLength(1);
      for (const key of ["label", "serverUrl", "apiKey", "scope"]) {
        expect(byKey(setupFields, key), `${key} must stay on the Setup tab`).toBeDefined();
      }
      expect(
        byKind(setupFields, "named-action").map((f) => (f as { actionId: string }).actionId),
      ).toContain("createServer");
    });

    it('Help tab is READ-ONLY (no form, no Save): exactly one advisory field, no keyed/action-writing field kinds', () => {
      const helpFields = helpTab!.fields;
      expect(helpFields).toHaveLength(1);
      const advisory = helpFields[0] as {
        kind: string;
        tone?: string;
        probeActionId?: string;
        whenReady?: string;
        whenNotReady?: string;
      };
      expect(advisory.kind).toBe("advisory");
      expect(advisory.tone).toBe("info");
      // Reuses the Setup tab's existing connection-service readiness probe — no
      // new action registered — so `whenReady`/`whenNotReady` track the SAME
      // readiness the Setup tab's own advisory already reads.
      expect(advisory.probeActionId).toBe("connectionServiceReady");
      expect(typeof advisory.whenReady).toBe("string");
      expect(typeof advisory.whenNotReady).toBe("string");
      expect((advisory.whenReady ?? "").length).toBeGreaterThan(0);
      expect((advisory.whenNotReady ?? "").length).toBeGreaterThan(0);
      // Neither branch may claim the API key is persisted/stored, or that
      // Organization/Team scope is creatable — the live host does neither of
      // these (cinatra-ai/cinatra#1407). Ground truth: only "Global" scope is
      // called out, and the copy explicitly says the API key does not persist
      // yet. (Unlike the API-key/org-team claims, "the list is filtered to
      // what the viewer may manage" is now TRUE — the connector's own
      // `listServers` handler filters by viewer — so it is no longer a
      // forbidden claim here; this Help tab just doesn't happen to make it.)
      for (const copy of [advisory.whenReady, advisory.whenNotReady]) {
        const lower = (copy ?? "").toLowerCase();
        expect(lower).not.toMatch(/stored securely|api keys are stored/);
        expect(lower).not.toMatch(/organization,? or team|organization or team/);
        expect(lower).toMatch(/does not (currently |yet )?persist an api key/);
      }

      // No field kind that emits an `<input>`/action button (text, secret,
      // select, boolean, number, free-list, named-action, status-probe,
      // nango-connect, repeatable-list, record-list, dynamic-select-options) —
      // "no form, no Save" per the design spec.
      const writeCapableKinds = new Set([
        "text", "secret", "select", "boolean", "number", "free-list",
        "named-action", "status-probe", "nango-connect", "repeatable-list",
        "record-list", "dynamic-select-options",
      ]);
      for (const f of helpFields) {
        expect(writeCapableKinds.has(f.kind as string), `${JSON.stringify(f.kind)} is not read-only`).toBe(false);
      }
    });

    it("every field key stays unique across the Setup tab AND every custom tab (one flat submit namespace)", () => {
      const allKeyed = [...setupFields, ...(helpTab?.fields ?? [])]
        .map((f) => (f as { key?: string }).key)
        .filter((k): k is string => typeof k === "string");
      expect(new Set(allKeyed).size).toBe(allKeyed.length);
    });
  });

  describe("tabs vocabulary — FAIL-CLOSED (mirrors the host parser's tab rules)", () => {
    const baseField = { kind: "secret", key: "apiKey", label: "API key" };
    const wrapTabs = (tabsRaw: unknown) => ({ fields: [baseField], tabs: tabsRaw });

    it("rejects a non-array tabs root", () => {
      expect(validateConfigSchema(wrapTabs({})).length).toBeGreaterThan(0);
    });

    it("rejects an unknown key on a tab (no executable/HTML carrier)", () => {
      expect(
        validateConfigSchema(
          wrapTabs([{ id: "x", label: "X", fields: [{ kind: "text", key: "k", label: "L" }], onClick: "alert(1)" }]),
        ).length,
      ).toBeGreaterThan(0);
    });

    it("rejects a duplicate tab id", () => {
      expect(
        validateConfigSchema(
          wrapTabs([
            { id: "dup", label: "One", fields: [{ kind: "text", key: "k1", label: "L" }] },
            { id: "dup", label: "Two", fields: [{ kind: "text", key: "k2", label: "L" }] },
          ]),
        ).length,
      ).toBeGreaterThan(0);
    });

    it("rejects a field key duplicated across the base fields and a tab", () => {
      expect(
        validateConfigSchema(wrapTabs([{ id: "t", label: "T", fields: [{ kind: "text", key: "apiKey", label: "Dup" }] }])).length,
      ).toBeGreaterThan(0);
    });

    it("rejects an invalid tab id, a missing label, and an empty fields array", () => {
      expect(validateConfigSchema(wrapTabs([{ id: "1bad", label: "X", fields: [{ kind: "text", key: "k", label: "L" }] }])).length).toBeGreaterThan(0);
      expect(validateConfigSchema(wrapTabs([{ id: "t", fields: [{ kind: "text", key: "k", label: "L" }] }])).length).toBeGreaterThan(0);
      expect(validateConfigSchema(wrapTabs([{ id: "t", label: "T", fields: [] }])).length).toBeGreaterThan(0);
    });
  });

  describe("validateConfigSchema is fail-closed on each new kind", () => {
    const wrap = (field: Record<string, unknown>) => ({ fields: [field] });

    it("rejects a select with no options", () => {
      expect(
        validateConfigSchema(
          wrap({ kind: "select", key: "scope", label: "Scope", options: [] }),
        ).length,
      ).toBeGreaterThan(0);
    });

    it("rejects a select defaultValue not among the options", () => {
      expect(
        validateConfigSchema(
          wrap({
            kind: "select",
            key: "scope",
            label: "Scope",
            defaultValue: "nope",
            options: [{ value: "user", label: "Me" }],
          }),
        ).length,
      ).toBeGreaterThan(0);
    });

    it("rejects a record-list with no listActionId", () => {
      expect(
        validateConfigSchema(
          wrap({ kind: "record-list", label: "Servers" }),
        ).length,
      ).toBeGreaterThan(0);
    });

    it("rejects a record-list badge with an unknown variant", () => {
      expect(
        validateConfigSchema(
          wrap({
            kind: "record-list",
            label: "Servers",
            listActionId: "listServers",
            itemBadges: [{ key: "scope", label: "Scope", variant: "neon" }],
          }),
        ).length,
      ).toBeGreaterThan(0);
    });

    it("rejects an advisory with an invalid tone", () => {
      expect(
        validateConfigSchema(
          wrap({ kind: "advisory", label: "Note", tone: "fuchsia" }),
        ).length,
      ).toBeGreaterThan(0);
    });

    it("rejects a banner variant with an invalid tone", () => {
      expect(
        validateConfigSchema(
          wrap({
            kind: "banner",
            label: "Result",
            variants: [{ name: "x", tone: "fuchsia", message: "hi" }],
          }),
        ).length,
      ).toBeGreaterThan(0);
    });

    it("rejects an action id that is not a valid identifier (no code injection vector)", () => {
      expect(
        validateConfigSchema(
          wrap({
            kind: "record-list",
            label: "Servers",
            listActionId: "../../etc/passwd",
          }),
        ).length,
      ).toBeGreaterThan(0);
    });

    it("rejects an UNKNOWN key on a field (no executable/HTML carrier smuggled in)", () => {
      // An otherwise-valid text field with an extra "html"/"onClick" key must
      // FAIL — the grammar is pure data, fail-closed on unexpected keys.
      for (const evil of ["html", "onClick", "render", "component", "script", "dangerouslySetInnerHTML"]) {
        const errs = validateConfigSchema(
          wrap({ kind: "text", key: "label", label: "Label", [evil]: "<script>x</script>" }),
        );
        expect(errs.length, `expected ${evil} to be rejected`).toBeGreaterThan(0);
      }
    });

    it("rejects an UNKNOWN key at the configSchema ROOT (whole grammar is fail-closed)", () => {
      const errs = validateConfigSchema({
        title: "T",
        html: "<script>x</script>",
        fields: [{ kind: "text", key: "label", label: "Label" }],
      });
      expect(errs.length).toBeGreaterThan(0);
    });

    it("rejects an UNKNOWN key on a select option / record-list badge / banner variant", () => {
      expect(
        validateConfigSchema(
          wrap({
            kind: "select",
            key: "scope",
            label: "Scope",
            options: [{ value: "user", label: "Me", onClick: "evil()" }],
          }),
        ).length,
      ).toBeGreaterThan(0);
      expect(
        validateConfigSchema(
          wrap({
            kind: "record-list",
            label: "Servers",
            listActionId: "listServers",
            itemBadges: [{ key: "scope", label: "Scope", html: "<b>x</b>" }],
          }),
        ).length,
      ).toBeGreaterThan(0);
      expect(
        validateConfigSchema(
          wrap({
            kind: "banner",
            label: "Result",
            variants: [{ name: "saved", tone: "success", message: "ok", render: "fn" }],
          }),
        ).length,
      ).toBeGreaterThan(0);
    });
  });
});
