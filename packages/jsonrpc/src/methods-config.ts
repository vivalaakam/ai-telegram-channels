import { z } from 'zod';
import * as dispatch from './dispatch.js';
import type { MethodDef } from './methods.js';

const configShape = {
    type: 'object',
    properties: {
        slug: { type: 'string' },
        value: { type: 'string' },
    },
};

export const configMethods: MethodDef[] = [
    {
        name: 'config.list',
        description: 'List all config entries',
        params: [
            {
                name: 'after',
                required: false,
                description: 'Return entries updated after this ISO 8601 datetime',
                zod: z.string().datetime().optional(),
                jsonSchema: { type: 'string', format: 'date-time', description: 'Filter: updatedAt after' },
            },
            {
                name: 'before',
                required: false,
                description: 'Return entries updated before this ISO 8601 datetime',
                zod: z.string().datetime().optional(),
                jsonSchema: { type: 'string', format: 'date-time', description: 'Filter: updatedAt before' },
            },
        ],
        resultSchema: { type: 'array', items: configShape },
        handler: (p) =>
            dispatch.listConfig(
                p.after ? new Date(p.after as string) : undefined,
                p.before ? new Date(p.before as string) : undefined,
            ),
    },
    {
        name: 'config.get',
        description: 'Get config value by slug',
        params: [
            {
                name: 'slug',
                required: true,
                description: 'Config key slug',
                zod: z.string(),
                jsonSchema: { type: 'string', description: 'Config key slug' },
            },
        ],
        resultSchema: configShape,
        handler: (p) => dispatch.getConfig(p.slug as string),
    },
    {
        name: 'config.set',
        description: 'Set (upsert) a config value',
        params: [
            {
                name: 'slug',
                required: true,
                description: 'Config key slug',
                zod: z.string(),
                jsonSchema: { type: 'string', description: 'Config key slug' },
            },
            {
                name: 'value',
                required: true,
                description: 'Value to store (e.g. a prompt UUID)',
                zod: z.string(),
                jsonSchema: { type: 'string', description: 'Value to store' },
            },
        ],
        resultSchema: configShape,
        handler: (p) => dispatch.setConfig(p.slug as string, p.value as string),
    },
];
