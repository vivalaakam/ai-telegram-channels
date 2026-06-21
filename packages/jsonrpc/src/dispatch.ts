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

export async function getChannel(id: string) {
  const channel = await Channel.findByPk(id);
  if (!channel) throw rpcError(-32001, 'Channel not found');
  return channel.get({ plain: true });
}

export async function getMessages(channelId: string, limit?: number, offset?: number) {
  const messages = await Message.findAll({
    where: { channelId },
    order: [['date', 'DESC']],
    limit: limit ?? 20,
    offset: offset ?? 0,
    attributes: ['channelId', 'messageId', 'date', 'editDate', 'contentTextText', 'isPinned'],
  });
  return messages.map((m) => m.get({ plain: true }));
}