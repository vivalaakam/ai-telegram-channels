import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { Sequelize } from 'sequelize';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { initModels } from '@ai-tg-channels/models';
import { createMigrator } from '@ai-tg-channels/migrations';
import { z } from 'zod';
import { buildOpenrpcSpec } from './openrpc.js';
import { explorerHtml } from './explorer.js';
import * as dispatch from './dispatch.js';
import { methods } from './methods.js';
import { createMcpServer, createMcpTransport } from './mcp.js';

config({ path: resolve(import.meta.dirname, '../../../.env') });

const PORT = parseInt(process.env.JSONRPC_PORT ?? '3002', 10);

const sequelize = new Sequelize(process.env.DATABASE_URL!, {
  dialect: 'postgres',
  logging: false,
});

initModels(sequelize);

// --- MCP setup ---

const mcpServer = createMcpServer();
const mcpTransport = createMcpTransport();
await mcpServer.connect(mcpTransport);

// --- JSON-RPC dispatch (derived from methods.ts) ---

type Params = Record<string, unknown>;

const methodMap = new Map(methods.map((m) => [m.name, m]));
const openrpcSpec = buildOpenrpcSpec(PORT);

async function handleJsonRpc(method: string, params: Params): Promise<unknown> {
  const def = methodMap.get(method);
  if (!def) throw dispatch.rpcError(-32601, 'Method not found');

  // Validate params using Zod schemas from method definition
  const schema = z.object(Object.fromEntries(def.params.map((p) => [p.name, p.zod])));
  const parsed = schema.safeParse(params);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw dispatch.rpcError(-32602, `Invalid params: ${errors}`);
  }

  return def.handler(parsed.data);
}

async function handleRpc(body: unknown): Promise<unknown> {
  if (!body || typeof body !== 'object' || (body as Record<string, unknown>).jsonrpc !== '2.0') {
    return { jsonrpc: '2.0', error: { code: -32600, message: 'Invalid Request' }, id: null };
  }

  const { method, params, id } = body as { method: string; params?: Params; id?: string | number | null };

  try {
    const result = await handleJsonRpc(method, params ?? {});
    return { jsonrpc: '2.0', result, id: id ?? null };
  } catch (err: unknown) {
    const e = err as Record<string, unknown>;
    if (e.code && typeof e.code === 'number') {
      return { jsonrpc: '2.0', error: e, id: id ?? null };
    }
    return {
      jsonrpc: '2.0',
      error: { code: -32603, message: 'Internal error', data: String(e.message ?? e) },
      id: id ?? null,
    };
  }
}

// --- Read request body helper ---

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
    req.on('error', reject);
  });
}

// --- Server ---

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Mcp-Session-Id');
  res.setHeader('Access-Control-Expose-Headers', 'Mcp-Session-Id');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url ?? '/', `http://${req.headers.host}`);

  // MCP Streamable HTTP endpoint
  if (url.pathname === '/mcp') {
    if (req.method === 'DELETE' || req.method === 'GET') {
      await mcpTransport.handleRequest(req as IncomingMessage & { body?: unknown }, res);
      return;
    }
    if (req.method === 'POST') {
      const body = await readBody(req);
      let parsed: unknown;
      try {
        parsed = JSON.parse(body);
      } catch {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' }, id: null }));
        return;
      }
      await mcpTransport.handleRequest(req as IncomingMessage & { body?: unknown }, res, parsed);
      return;
    }
  }

  // OpenRPC spec (dynamic — reflects actual port)
  if (req.method === 'GET' && url.pathname === '/openrpc.json') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(openrpcSpec, null, 2));
    return;
  }

  // Explorer UI
  if (req.method === 'GET' && url.pathname === '/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(explorerHtml);
    return;
  }

  // JSON-RPC endpoint
  if (req.method === 'POST' && url.pathname === '/') {
    const body = await readBody(req);
    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' }, id: null }));
      return;
    }

    const result = await handleRpc(parsed);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(result));
    return;
  }

  res.writeHead(404);
  res.end();
});

async function start() {
  await sequelize.authenticate();
  const migrator = createMigrator(sequelize);
  await migrator.up();
  server.listen(PORT, () => {
    console.log(`JSON-RPC server listening on http://localhost:${PORT}`);
    console.log(`Explorer:  http://localhost:${PORT}/`);
    console.log(`OpenRPC:   http://localhost:${PORT}/openrpc.json`);
    console.log(`MCP:       http://localhost:${PORT}/mcp`);
  });
}

start().catch((err) => {
  console.error('Failed to start:', err);
  process.exit(1);
});
