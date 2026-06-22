import { McpServer } from '@modelcontextprotocol/server';
import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';
import { z } from 'zod';
import { methods } from './methods.js';

export function createMcpServer() {
    const server = new McpServer({
        name: 'ai-tg-channels',
        version: '0.1.0',
    });

    for (const m of methods) {
        const inputSchema = z.object(
            Object.fromEntries(m.params.map((p) => [p.name, p.required ? p.zod : p.zod.optional()])),
        );

        server.registerTool(m.name, { description: m.description, inputSchema }, async (args) => {
            try {
                const result = await m.handler(args as Record<string, unknown>);
                return {
                    content: [{ type: 'text' as const, text: JSON.stringify(result) }],
                };
            } catch (err: unknown) {
                const e = err as { code?: number; message?: string };
                return {
                    content: [
                        {
                            type: 'text' as const,
                            text: JSON.stringify({
                                error: { code: e.code ?? -32603, message: e.message ?? String(err) },
                            }),
                        },
                    ],
                    isError: true,
                };
            }
        });
    }

    return server;
}

export function createMcpTransport() {
    return new NodeStreamableHTTPServerTransport({
        sessionIdGenerator: undefined, // ponytail: stateless, no session management needed
    });
}
