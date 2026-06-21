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
    handler: (p) => dispatch.getMessages(p.channelId as string, p.limit as number | undefined, p.offset as number | undefined),
  },
];