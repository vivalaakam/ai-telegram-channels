import { z } from 'zod';
import * as dispatch from './dispatch.js';
import type { MethodDef } from './methods.js';

const feedShape = {
    type: 'object',
    properties: {
        id: { type: 'string', format: 'uuid' },
        text: { type: 'string' },
        isViewed: { type: 'boolean' },
        postType: { type: ['string', 'null'] },
        firstSeenAt: { type: 'string', format: 'date-time' },
        channelId: { type: 'string' },
        createdAt: { type: 'string', format: 'date-time' },
    },
};

export const feedMethods: MethodDef[] = [
    {
        name: 'feed.list',
        description: 'List feed items (deduplicated news)',
        params: [
            {
                name: 'limit',
                required: false,
                description: 'Max items to return (default 20)',
                zod: z.number().optional(),
                jsonSchema: { type: 'integer', default: 20, description: 'Max items to return' },
            },
            {
                name: 'offset',
                required: false,
                description: 'Pagination offset (default 0)',
                zod: z.number().optional(),
                jsonSchema: { type: 'integer', default: 0, description: 'Pagination offset' },
            },
            {
                name: 'postType',
                required: false,
                description: 'Filter by post type: ad, news, post, meme',
                zod: z.enum(['ad', 'news', 'post', 'meme']).optional(),
                jsonSchema: { type: 'string', enum: ['ad', 'news', 'post', 'meme'], description: 'Post type filter' },
            },
            {
                name: 'isViewed',
                required: false,
                description: 'Filter by viewed status',
                zod: z.boolean().optional(),
                jsonSchema: { type: 'boolean', description: 'Viewed status filter' },
            },
            {
                name: 'after',
                required: false,
                description: 'Return items with firstSeenAt after this ISO 8601 datetime',
                zod: z.string().datetime().optional(),
                jsonSchema: { type: 'string', format: 'date-time', description: 'Filter: firstSeenAt after' },
            },
            {
                name: 'before',
                required: false,
                description: 'Return items with firstSeenAt before this ISO 8601 datetime',
                zod: z.string().datetime().optional(),
                jsonSchema: { type: 'string', format: 'date-time', description: 'Filter: firstSeenAt before' },
            },
        ],
        resultSchema: { type: 'array', items: feedShape },
        handler: (p) =>
            dispatch.listFeed(
                p.limit as number | undefined,
                p.offset as number | undefined,
                p.postType as string | undefined,
                p.isViewed as boolean | undefined,
                p.after ? new Date(p.after as string) : undefined,
                p.before ? new Date(p.before as string) : undefined,
            ),
    },
    {
        name: 'feed.get',
        description: 'Get a single feed item by ID',
        params: [
            {
                name: 'id',
                required: true,
                description: 'Feed item UUID',
                zod: z.string().uuid(),
                jsonSchema: { type: 'string', format: 'uuid', description: 'Feed item UUID' },
            },
        ],
        resultSchema: feedShape,
        handler: (p) => dispatch.getFeed(p.id as string),
    },
    {
        name: 'feed.getMessages',
        description: 'Get all source messages linked to a feed item, with Telegram links',
        params: [
            {
                name: 'id',
                required: true,
                description: 'Feed item UUID',
                zod: z.string().uuid(),
                jsonSchema: { type: 'string', format: 'uuid', description: 'Feed item UUID' },
            },
        ],
        resultSchema: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    channelId: { type: 'string' },
                    messageId: { type: 'integer' },
                    tgLink: { type: 'string', format: 'uri' },
                },
            },
        },
        handler: (p) => dispatch.getFeedMessages(p.id as string),
    },
    {
        name: 'feed.markViewed',
        description: 'Mark a feed item as viewed',
        params: [
            {
                name: 'id',
                required: true,
                description: 'Feed item UUID',
                zod: z.string().uuid(),
                jsonSchema: { type: 'string', format: 'uuid', description: 'Feed item UUID' },
            },
        ],
        resultSchema: { type: 'object', properties: { ok: { type: 'boolean' } } },
        handler: (p) => dispatch.markFeedViewed(p.id as string),
    },
];
