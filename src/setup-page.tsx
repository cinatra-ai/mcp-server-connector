// Thin server-component entry for the mcp-server-connector setup page.
// Host mounts this at `/connectors/cinatra-ai/mcp-server-connector/setup` via
// `src/lib/connector-setup-pages.ts`.

import { McpServerConnectorSetupImpl } from "./mcp-server-setup-impl";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function McpServerConnectorSetupPage(props?: {
  searchParams?: Promise<SearchParams>;
}) {
  return <McpServerConnectorSetupImpl searchParams={props?.searchParams} />;
}
