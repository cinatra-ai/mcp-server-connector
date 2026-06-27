import "server-only";

// mcp-server-connector setup page implementation.
//
// Carved from the host's external-MCP server management page
// (src/lib/external-mcp-settings-page.tsx). The host-internal `@/…` imports —
// the registry read surface, the create/delete server actions, the auth session,
// the connection-service status, and the private-URL guard — are REMOVED: the
// connector receives them through its deps slot (`getMcpServerDeps()`), bound at
// activation by `register(ctx)` from the host capability registry. The
// host-side registry table + the actions themselves stay HOST-side; the
// connector only renders against the injected read surface + submits to the
// injected server actions.
//
// Shadcn primitives ONLY per CLAUDE.md design discipline (vendored into
// ./components/ui so the ui-design-system gate exempts the raw elements):
//   - <Main> + <PageHeader> + <PageContent> shell (@cinatra-ai/sdk-ui)
//   - <Card> chrome
//   - <Button> / <Badge> / <Input> / <Field*> / <SelectField> primitives
//   - semantic tokens only (text-foreground, bg-surface, border-line); no emojis

import { Main, PageHeader, PageContent } from "@cinatra-ai/sdk-ui/marketplace";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "./components/ui/card";
import { Button } from "./components/ui/button";
import { Badge } from "./components/ui/badge";
import { Input, HiddenInput } from "./components/ui/input";
import {
  FieldGroup,
  Field,
  FieldLabel,
  FieldDescription,
} from "./components/ui/field";
import { SelectField, SelectFieldOption } from "./components/ui/select-field";
import {
  getMcpServerDeps,
  type ExternalMcpServerRecordShape,
} from "./deps";

type SearchParams = Record<string, string | string[] | undefined>;

function pickParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export async function McpServerConnectorSetupImpl(props?: {
  searchParams?: Promise<SearchParams>;
}) {
  const deps = getMcpServerDeps();
  const viewer = await deps.resolveViewerContext();
  const isAdmin = viewer.isAdmin;
  const userId = viewer.userId;

  const all = deps.listServers();

  // Visibility: admins see everything; non-admins see only their own
  // user-scoped rows. (Carried verbatim from the host page's authorization
  // boundary.)
  const visible: ExternalMcpServerRecordShape[] = isAdmin
    ? all
    : all.filter((row) => row.scope === "user" && row.userId === userId);

  const resolvedSearchParams = (await props?.searchParams) ?? {};
  const saved = pickParam(resolvedSearchParams.saved);
  const deleted = pickParam(resolvedSearchParams.deleted);
  const errorMessage = pickParam(resolvedSearchParams.error);

  const connectionServiceReady = deps.isConnectionServiceReady();

  return (
    <Main className="min-h-screen">
      <PageHeader
        title="MCP Servers"
        description="Register external Model Context Protocol servers so every Cinatra agent and package can call their tools."
      />
      <PageContent className="flex flex-col gap-6 pb-8">
        <Card className="border-line bg-surface backdrop-blur-none">
          <CardHeader>
            <CardTitle>External MCP servers</CardTitle>
            <CardDescription className="text-muted-foreground">
              Register external Model Context Protocol servers so every Cinatra
              agent and package can call their tools. Admins can register
              globally; regular users can register personal servers visible only
              to them.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {saved ? (
              <div className="rounded-control border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
                External MCP server saved.
              </div>
            ) : null}
            {deleted ? (
              <div className="rounded-control border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning">
                External MCP server removed.
              </div>
            ) : null}
            {errorMessage ? (
              <div className="rounded-control border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {errorMessage}
              </div>
            ) : null}

            <section className="flex flex-col gap-4">
              <h3 className="text-lg font-semibold text-foreground">
                Registered servers
              </h3>
              <div className="grid gap-3">
                {visible.length === 0 ? (
                  <p className="rounded-panel border border-dashed border-line bg-surface-muted px-5 py-5 text-sm text-muted-foreground">
                    No external MCP servers registered yet.
                  </p>
                ) : (
                  visible.map((row) => (
                    <article
                      key={row.id}
                      className="rounded-panel border border-line bg-surface px-5 py-4"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-base font-semibold text-foreground">
                              {row.label}
                            </h4>
                            <Badge variant="outline" className="uppercase">
                              {row.scope}
                            </Badge>
                            {deps.isPrivateUrl(row.serverUrl) ? (
                              <Badge variant="destructive">
                                Private URL — not injected
                              </Badge>
                            ) : null}
                            {!row.enabled ? (
                              <Badge variant="secondary">Disabled</Badge>
                            ) : null}
                          </div>
                          <p className="mt-2 truncate text-sm text-muted-foreground">
                            {row.serverUrl}
                          </p>
                          {row.nangoConnectionId ? (
                            <p className="mt-1 text-xs text-muted-foreground">
                              API key configured
                            </p>
                          ) : null}
                        </div>
                        <form action={deps.deleteServerAction}>
                          <HiddenInput name="id" value={row.id} />
                          <Button type="submit" variant="destructive" size="sm">
                            Delete
                          </Button>
                        </form>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>

            <section className="flex flex-col gap-4">
              <h3 className="text-lg font-semibold text-foreground">
                Add a new server
              </h3>
              <form action={deps.createServerAction} className="grid gap-4">
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="label">Label</FieldLabel>
                    <Input
                      id="label"
                      name="label"
                      placeholder="My MCP Server"
                      required
                      maxLength={120}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="serverUrl">Server URL</FieldLabel>
                    <Input
                      id="serverUrl"
                      name="serverUrl"
                      type="url"
                      placeholder="https://mcp.example.com/sse"
                      required
                    />
                    <FieldDescription>
                      Must be a public URL — LLM providers cannot reach localhost
                      or private IPs.
                    </FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="apiKey">API key (optional)</FieldLabel>
                    <Input
                      id="apiKey"
                      name="apiKey"
                      type="password"
                      placeholder="Leave blank if no authentication required"
                      autoComplete="off"
                    />
                    {connectionServiceReady ? (
                      <FieldDescription>
                        The key is stored securely via the connection service.
                      </FieldDescription>
                    ) : (
                      <FieldDescription>
                        Configure the connection service to enable API key
                        storage.
                      </FieldDescription>
                    )}
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="scope">Scope</FieldLabel>
                    <SelectField
                      id="scope"
                      name="scope"
                      defaultValue={isAdmin ? "global" : "user"}
                    >
                      {isAdmin ? (
                        <SelectFieldOption value="global">
                          Global (all users, all agents)
                        </SelectFieldOption>
                      ) : null}
                      {isAdmin ? (
                        <SelectFieldOption value="org">
                          Organization
                        </SelectFieldOption>
                      ) : null}
                      {isAdmin ? (
                        <SelectFieldOption value="team">Team</SelectFieldOption>
                      ) : null}
                      <SelectFieldOption value="user">
                        Personal (only me)
                      </SelectFieldOption>
                    </SelectField>
                    {!isAdmin ? (
                      <FieldDescription>
                        Only admins can create global, org, or team-scoped
                        servers.
                      </FieldDescription>
                    ) : null}
                  </Field>
                </FieldGroup>
                <div className="flex justify-end">
                  <Button type="submit">Add server</Button>
                </div>
              </form>
            </section>
          </CardContent>
        </Card>
      </PageContent>
    </Main>
  );
}
