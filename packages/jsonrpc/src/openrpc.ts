import { methods } from './methods.js';

export function buildOpenrpcSpec(port: number) {
    return {
        openrpc: '1.3.2',
        info: {
            title: 'AI TG Channels API',
            version: '0.1.0',
        },
        servers: [{ url: `http://localhost:${port}` }],
        methods: methods.map((m) => ({
            name: m.name,
            summary: m.description,
            params: m.params.map((p) => ({
                name: p.name,
                required: p.required || undefined,
                schema: p.jsonSchema,
            })),
            result: { name: m.name.split('.')[1], schema: m.resultSchema },
        })),
    };
}
