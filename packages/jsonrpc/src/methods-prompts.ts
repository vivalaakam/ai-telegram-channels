import { z } from 'zod';
import * as dispatch from './dispatch.js';
import type { MethodDef } from './methods.js';

const promptShape = {
    type: 'object',
    properties: {
        id: { type: 'string', format: 'uuid' },
        content: { type: 'string' },
        version: { type: 'integer' },
        tags: { type: 'array', items: { type: 'string' } },
        previousId: { type: ['string', 'null'], format: 'uuid' },
    },
};

export const promptMethods: MethodDef[] = [
    {
        name: 'prompts.list',
        description: 'List prompts, optionally filtered by tags and/or date range',
        params: [
            {
                name: 'tags',
                required: false,
                description: 'Filter prompts that have any of these tags',
                zod: z.array(z.string()).optional(),
                jsonSchema: { type: 'array', items: { type: 'string' }, description: 'Tag filter' },
            },
            {
                name: 'after',
                required: false,
                description: 'Return prompts created after this ISO 8601 datetime',
                zod: z.string().datetime().optional(),
                jsonSchema: { type: 'string', format: 'date-time', description: 'Filter: createdAt after' },
            },
            {
                name: 'before',
                required: false,
                description: 'Return prompts created before this ISO 8601 datetime',
                zod: z.string().datetime().optional(),
                jsonSchema: { type: 'string', format: 'date-time', description: 'Filter: createdAt before' },
            },
        ],
        resultSchema: { type: 'array', items: promptShape },
        handler: (p) =>
            dispatch.listPrompts(
                p.tags as string[] | undefined,
                p.after ? new Date(p.after as string) : undefined,
                p.before ? new Date(p.before as string) : undefined,
            ),
    },
    {
        name: 'prompts.get',
        description: 'Get prompt by UUID',
        params: [
            {
                name: 'id',
                required: true,
                description: 'Prompt UUID',
                zod: z.string().uuid(),
                jsonSchema: { type: 'string', format: 'uuid', description: 'Prompt UUID' },
            },
        ],
        resultSchema: promptShape,
        handler: (p) => dispatch.getPrompt(p.id as string),
    },
    {
        name: 'prompts.create',
        description: 'Create a new prompt (version 1)',
        params: [
            {
                name: 'content',
                required: true,
                description: 'Prompt text content (supports {{var}} template syntax)',
                zod: z.string(),
                jsonSchema: { type: 'string', description: 'Prompt text content' },
            },
            {
                name: 'tags',
                required: false,
                description: 'Tags for searching and grouping',
                zod: z.array(z.string()).optional(),
                jsonSchema: { type: 'array', items: { type: 'string' }, description: 'Tags' },
            },
        ],
        resultSchema: promptShape,
        handler: (p) => dispatch.createPrompt(p.content as string, (p.tags as string[]) ?? []),
    },
    {
        name: 'prompts.update',
        description: 'Create a new version of a prompt (previousId links to old)',
        params: [
            {
                name: 'id',
                required: true,
                description: 'UUID of the prompt to base new version on',
                zod: z.string().uuid(),
                jsonSchema: { type: 'string', format: 'uuid', description: 'Source prompt UUID' },
            },
            {
                name: 'content',
                required: true,
                description: 'New prompt text content',
                zod: z.string(),
                jsonSchema: { type: 'string', description: 'New content' },
            },
            {
                name: 'tags',
                required: false,
                description: 'Tags for the new version',
                zod: z.array(z.string()).optional(),
                jsonSchema: { type: 'array', items: { type: 'string' }, description: 'Tags' },
            },
        ],
        resultSchema: promptShape,
        handler: (p) => dispatch.updatePrompt(p.id as string, p.content as string, (p.tags as string[]) ?? []),
    },
    {
        name: 'prompts.history',
        description: 'Get version chain for a prompt (newest first)',
        params: [
            {
                name: 'id',
                required: true,
                description: 'Any prompt UUID in the chain',
                zod: z.string().uuid(),
                jsonSchema: { type: 'string', format: 'uuid', description: 'Prompt UUID' },
            },
        ],
        resultSchema: { type: 'array', items: promptShape },
        handler: (p) => dispatch.getPromptHistory(p.id as string),
    },
    {
        name: 'prompts.render',
        description: 'Render a prompt with template variables',
        params: [
            {
                name: 'id',
                required: true,
                description: 'Prompt UUID',
                zod: z.string().uuid(),
                jsonSchema: { type: 'string', format: 'uuid', description: 'Prompt UUID' },
            },
            {
                name: 'vars',
                required: false,
                description: 'Template variables ({{key}} → value)',
                zod: z.record(z.string(), z.string()).optional(),
                jsonSchema: {
                    type: 'object',
                    additionalProperties: { type: 'string' },
                    description: 'Template variables',
                },
            },
        ],
        resultSchema: { type: 'object', properties: { rendered: { type: 'string' } } },
        handler: (p) => dispatch.renderPrompt(p.id as string, (p.vars as Record<string, string>) ?? {}),
    },
];
