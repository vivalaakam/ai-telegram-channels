---
name: create-json-rpc
description: >
  Create a JSON-RPC 2.0 API server with MCP (Model Context Protocol) compatibility
  and an interactive explorer. Use when the user wants to build a JSON-RPC API,
  add MCP protocol support to an existing API, or scaffold a data-access layer
  that works over both JSON-RPC and MCP. Triggers on phrases like "jsonrpc server",
  "json-rpc api", "mcp server", "mcp protocol", "add mcp support",
  "create rpc endpoint", "rpc over http".
metadata:
  version: 1.0.0
---

# Create JSON-RPC + MCP Server

Scaffold a JSON-RPC 2.0 server that is also MCP-compatible, with an auto-generated
API explorer. The architecture enforces a **single source of truth** for method
definitions so JSON-RPC, MCP, and OpenRPC never drift apart.

## Architecture

```
src/
  methods.ts    ← SINGLE SOURCE OF TRUTH (method name, params, handler, schemas)
  dispatch.ts   ← Database query functions (called by method handlers)
  mcp.ts         ← MCP server (derived from methods.ts via loop)
  openrpc.ts     ← OpenRPC spec (derived from methods.ts via .map())
  explorer.ts    ← HTML explorer (reads /openrpc.json at runtime)
  index.ts       ← HTTP server, routing, JSON-RPC dispatch (derived from methods.ts via Map)
```

**Key rule**: Adding a new API method = adding ONE entry to `methods.ts`. Everything
else (JSON-RPC dispatch, MCP tools, OpenRPC spec) derives automatically.

## Step-by-Step

### 1. Install dependencies

```bash
pnpm add @modelcontextprotocol/server @modelcontextprotocol/node zod sequelize pg dotenv
pnpm add -D tsx typescript @types/node
```

If in a monorepo, add to the correct workspace package.

### 2. Create `methods.ts` — single source of truth

Each method entry has:
- `name` — JSON-RPC method name (dot notation e.g. `channels.list`)
- `description` — human-readable, used in OpenRPC and MCP tool descriptions
- `params` — array of `ParamDef`, each with `name`, `required`, `description`, `zod` (Zod schema for MCP), `jsonSchema` (JSON Schema for OpenRPC)
- `handler` — async function taking `Record<string, unknown>` params, returning data

```typescript
import { z } from 'zod';
import * as dispatch from './dispatch.js';

export interface ParamDef {
  name: string;
  required: boolean;
  description: string;
  zod: z.ZodType;
  jsonSchema: Record<string, unknown>;
}

export interface MethodDef {
  name: string;
  description: string;
  params: ParamDef[];
  handler: (params: Record<string, unknown>) => Promise<unknown>;
}

export const methods: MethodDef[] = [
  {
    name: 'channels.list',
    description: 'Get list of all channels',
    params: [
      {
        name: 'limit',
        required: false,
        description: 'Max channels to return',
        zod: z.number().optional(),
        jsonSchema: { type: 'integer', default: 100, description: 'Max channels to return' },
      },
    ],
    handler: (p) => dispatch.listChannels(p.limit as number | undefined),
  },
  // Add more methods here — one entry per method
];
```

### 3. Create `dispatch.ts` — database query functions

Plain async functions that talk to the database. No protocol logic, no response
wrapping — just data in, data out (or throw rpcError on not-found/validation errors).

```typescript
import { Channel, Message } from '@ai-tg-channels/models';

export function rpcError(code: number, message: string) {
  return { code, message };
}

export async function listChannels(limit?: number) {
  const channels = await Channel.findAll({
    limit: limit ?? 100,
    attributes: ['id', 'title', 'username', 'createdAt'],
  });
  return channels.map((c) => c.get({ plain: true }));
}

// ... more query functions
```

### 4. Create `mcp.ts` — MCP server (derived from methods)

Loop over `methods` to register all tools. One `try/catch` wraps the handler —
errors get `isError: true` in MCP format.

```typescript
import { McpServer } from '@modelcontextprotocol/server';
import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';
import { z } from 'zod';
import { methods } from './methods.js';

export function createMcpServer() {
  const server = new McpServer({ name: 'my-api', version: '0.1.0' });

  for (const m of methods) {
    const inputSchema = z.object(
      Object.fromEntries(m.params.map((p) => [p.name, p.required ? p.zod : p.zod.optional()])),
    );
    server.registerTool(
      m.name,
      { description: m.description, inputSchema },
      async (args) => {
        try {
          const result = await m.handler(args as Record<string, unknown>);
          return { content: [{ type: 'text' as const, text: JSON.stringify(result) }] };
        } catch (err: unknown) {
          const e = err as { code?: number; message?: string };
          return {
            content: [{ type: 'text' as const, text: JSON.stringify({ error: { code: e.code ?? -32603, message: e.message ?? String(err) } }) }],
            isError: true,
          };
        }
      },
    );
  }
  return server;
}

export function createMcpTransport() {
  return new NodeStreamableHTTPServerTransport({ sessionIdGenerator: undefined });
}
```

### 5. Create `openrpc.ts` — spec (derived from methods)

```typescript
import { methods } from './methods.js';

export const openrpcSpec = {
  openrpc: '1.3.2',
  info: { title: 'My API', version: '0.1.0' },
  servers: [{ url: 'http://localhost:3002' }],
  methods: methods.map((m) => ({
    name: m.name,
    summary: m.description,
    params: m.params.map((p) => ({
      name: p.name,
      required: p.required || undefined,
      schema: p.jsonSchema,
    })),
    result: { name: m.name.split('.')[1] },
  })),
};
```

### 6. Create `index.ts` — HTTP server

Key parts:
- **Method dispatch** — `Map<string, MethodDef>` from `methods`, not a `switch`
- **Required param validation** — loop over `def.params`, throw rpcError if missing
- **MCP setup** — `createMcpServer()` + `createMcpTransport()` + `server.connect(transport)`
- **Routing**:
  - `POST /` → JSON-RPC (lookup method in map, call handler)
  - `POST /mcp` → MCP Streamable HTTP (delegate to `mcpTransport.handleRequest`)
  - `GET /mcp` → MCP SSE listener
  - `DELETE /mcp` → MCP session termination
  - `GET /openrpc.json` → OpenRPC spec
  - `GET /` → Explorer HTML

```typescript
import { methods } from './methods.js';
const methodMap = new Map(methods.map((m) => [m.name, m]));

async function handleJsonRpc(method: string, params: Record<string, unknown>) {
  const def = methodMap.get(method);
  if (!def) throw dispatch.rpcError(-32601, 'Method not found');
  for (const p of def.params) {
    if (p.required && params[p.name] == null)
      throw dispatch.rpcError(-32602, `Missing required parameter: ${p.name}`);
  }
  return def.handler(params);
}
```

### 7. Create `explorer.ts` — HTML explorer

Self-contained HTML page that:
1. Fetches `/openrpc.json` on load
2. Renders method list in a sidebar
3. Generates parameter forms from the spec
4. Sends JSON-RPC requests to `POST /` and displays results

The explorer reads the OpenRPC spec dynamically, so new methods appear
automatically — no HTML changes needed.

### 8. Tests

Write a test that verifies the single-source-of-truth contract:

```typescript
import { methods } from '../src/methods.js';

describe('methods', () => {
  it('every method has a handler and description', () => {
    for (const m of methods) {
      assert.ok(m.name && m.name.length > 0);
      assert.ok(m.description && m.description.length > 0);
      assert.ok(typeof m.handler === 'function');
    }
  });

  it('every param has zod and jsonSchema', () => {
    for (const m of methods) {
      for (const p of m.params) {
        assert.ok(p.zod);
        assert.ok(p.jsonSchema);
        assert.ok(typeof p.jsonSchema.type === 'string');
      }
    }
  });
});
```

## Checklist before commit

1. **Typecheck** — `npm run typecheck`
2. **Lint** — `npm run lint`
3. **Tests** — `npm test`; if adding non-trivial logic, write a test in `tests/`
4. **Commit** — only if all three pass

## Common mistakes to avoid

- **Don't add methods in multiple places.** Add to `methods.ts` only. JSON-RPC dispatch, MCP tools, and OpenRPC spec all derive from it automatically.
- **Don't forget the `zod` schema.** Every `ParamDef` needs both `zod` (for MCP validation) and `jsonSchema` (for OpenRPC spec). The test catches this.
- **Don't wrap handler results for MCP manually.** The MCP loop in `mcp.ts` handles `{ content: [...], isError }` wrapping. Handlers return raw data.
- **Don't hardcode the OpenRPC spec.** It's generated from `methods.ts`. If you need to add fields that `methods.ts` doesn't cover (like result schemas), extend `MethodDef` and the mapping in `openrpc.ts`.