import { z } from 'zod';
import * as dispatch from './dispatch.js';
import { configMethods } from './methods-config.js';

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
    resultSchema: Record<string, unknown>;
    handler: (params: Record<string, unknown>) => Promise<unknown>;
}

const channelShape = {
    type: 'object',
    properties: {
        id: { type: 'string' },
        title: { type: 'string' },
        username: { type: ['string', 'null'] },
        createdAt: { type: 'string', format: 'date-time' },
    },
};

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
        resultSchema: { type: 'array', items: channelShape },
        handler: (p) => dispatch.listChannels(p.limit as number | undefined),
    },
    {
        name: 'channels.get',
        description: 'Get channel info by ID',
        params: [
            {
                name: 'id',
                required: true,
                description: 'Channel ID',
                zod: z.string(),
                jsonSchema: { type: 'string', description: 'Channel ID' },
            },
        ],
        resultSchema: channelShape,
        handler: (p) => dispatch.getChannel(p.id as string),
    },
    {
        name: 'channels.getMessages',
        description: 'Get last messages from a channel',
        params: [
            {
                name: 'channelId',
                required: true,
                description: 'Channel ID',
                zod: z.string(),
                jsonSchema: { type: 'string', description: 'Channel ID' },
            },
            {
                name: 'limit',
                required: false,
                description: 'Max messages to return (default 20)',
                zod: z.number().optional(),
                jsonSchema: { type: 'integer', default: 20, description: 'Max messages to return' },
            },
            {
                name: 'offset',
                required: false,
                description: 'Offset for pagination (default 0)',
                zod: z.number().optional(),
                jsonSchema: { type: 'integer', default: 0, description: 'Offset for pagination' },
            },
        ],
        resultSchema: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    channelId: { type: 'string' },
                    messageId: { type: 'integer' },
                    date: { type: 'string', format: 'date-time' },
                    editDate: { type: ['string', 'null'], format: 'date-time' },
                    contentTextText: { type: ['string', 'null'] },
                    isPinned: { type: 'boolean' },
                },
            },
        },
        handler: (p) =>
            dispatch.getMessages(p.channelId as string, p.limit as number | undefined, p.offset as number | undefined),
    },
    ...configMethods,
];
