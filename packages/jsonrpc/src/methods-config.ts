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

const promptShape = {
    type: 'object',
    properties: {
        id: { type: 'string', format: 'uuid' },
        slug: { type: 'string' },
        content: { type: 'string' },
        version: { type: 'integer' },
        isCurrent: { type: 'boolean' },
    },
};

export const configMethods: MethodDef[] = [
    {
        name: 'config.list',
        description: 'List all config entries',
        params: [],
        resultSchema: { type: 'array', items: configShape },
        handler: () => dispatch.listConfig(),
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
                description: 'Value to store',
                zod: z.string(),
                jsonSchema: { type: 'string', description: 'Value to store' },
            },
        ],
        resultSchema: configShape,
        handler: (p) => dispatch.setConfig(p.slug as string, p.value as string),
    },
    {
        name: 'prompts.list',
        description: 'List all current prompts',
        params: [],
        resultSchema: { type: 'array', items: promptShape },
        handler: () => dispatch.listPrompts(),
    },
    {
        name: 'prompts.get',
        description: 'Get current prompt by slug',
        params: [
            {
                name: 'slug',
                required: true,
                description: 'Prompt slug',
                zod: z.string(),
                jsonSchema: { type: 'string', description: 'Prompt slug' },
            },
        ],
        resultSchema: promptShape,
        handler: (p) => dispatch.getPrompt(p.slug as string),
    },
    {
        name: 'prompts.create',
        description: 'Create a new prompt (first version)',
        params: [
            {
                name: 'slug',
                required: true,
                description: 'Prompt slug',
                zod: z.string(),
                jsonSchema: { type: 'string', description: 'Prompt slug' },
            },
            {
                name: 'content',
                required: true,
                description: 'Prompt text content (supports {{var}} template syntax)',
                zod: z.string(),
                jsonSchema: { type: 'string', description: 'Prompt text content' },
            },
        ],
        resultSchema: promptShape,
        handler: (p) => dispatch.createPrompt(p.slug as string, p.content as string),
    },
    {
        name: 'prompts.update',
        description: 'Create a new version of a prompt',
        params: [
            {
                name: 'slug',
                required: true,
                description: 'Prompt slug',
                zod: z.string(),
                jsonSchema: { type: 'string', description: 'Prompt slug' },
            },
            {
                name: 'content',
                required: true,
                description: 'New prompt text content (supports {{var}} template syntax)',
                zod: z.string(),
                jsonSchema: { type: 'string', description: 'New prompt text content' },
            },
        ],
        resultSchema: promptShape,
        handler: (p) => dispatch.updatePrompt(p.slug as string, p.content as string),
    },
    {
        name: 'prompts.history',
        description: 'Get all versions of a prompt',
        params: [
            {
                name: 'slug',
                required: true,
                description: 'Prompt slug',
                zod: z.string(),
                jsonSchema: { type: 'string', description: 'Prompt slug' },
            },
        ],
        resultSchema: { type: 'array', items: promptShape },
        handler: (p) => dispatch.getPromptHistory(p.slug as string),
    },
    {
        name: 'prompts.render',
        description: 'Render current prompt with template variables',
        params: [
            {
                name: 'slug',
                required: true,
                description: 'Prompt slug',
                zod: z.string(),
                jsonSchema: { type: 'string', description: 'Prompt slug' },
            },
            {
                name: 'vars',
                required: false,
                description: 'Template variables to substitute ({{key}} → value)',
                zod: z.record(z.string(), z.string()).optional(),
                jsonSchema: {
                    type: 'object',
                    additionalProperties: { type: 'string' },
                    description: 'Template variables',
                },
            },
        ],
        resultSchema: { type: 'object', properties: { rendered: { type: 'string' } } },
        handler: (p) => dispatch.renderPrompt(p.slug as string, (p.vars as Record<string, string>) ?? {}),
    },
];
