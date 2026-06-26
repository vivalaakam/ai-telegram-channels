import { Op } from 'sequelize';
import { AppConfig, Channel, Feed, FeedMessage, Message, Prompt, renderTemplate } from '@ai-tg-channels/models';

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

// --- feed ---

export async function listFeed(
    limit?: number,
    offset?: number,
    postType?: string,
    isViewed?: boolean,
    after?: Date,
    before?: Date,
) {
    const where: Record<string, unknown> = {};
    if (postType !== undefined) where.postType = postType;
    if (isViewed !== undefined) where.isViewed = isViewed;
    if (after || before) {
        where.firstSeenAt = {
            ...(after ? { [Op.gte]: after } : {}),
            ...(before ? { [Op.lte]: before } : {}),
        };
    }
    const rows = await Feed.findAll({
        where,
        order: [['firstSeenAt', 'DESC']],
        limit: limit ?? 20,
        offset: offset ?? 0,
        attributes: ['id', 'text', 'isViewed', 'postType', 'firstSeenAt', 'channelId', 'createdAt'],
    });
    return rows.map((r) => r.get({ plain: true }));
}

export async function getFeed(id: string) {
    const row = await Feed.findByPk(id, {
        attributes: ['id', 'text', 'isViewed', 'postType', 'firstSeenAt', 'channelId', 'createdAt'],
    });
    if (!row) throw rpcError(-32001, 'Feed item not found');
    return row.get({ plain: true });
}

export async function getFeedMessages(feedId: string) {
    await getFeed(feedId); // ensure exists
    const rows = await FeedMessage.findAll({
        where: { feedId },
        include: [{ model: Channel, as: 'channel', attributes: ['username'] }],
    });
    return rows.map((r) => {
        const plain = r.get({ plain: true }) as typeof r & { channel?: { username: string | null } };
        const username = plain.channel?.username;
        // ponytail: TDLib encodes channel message IDs as (url_id << 20); shift back to get the URL id
        const urlMsgId = Number(BigInt(r.messageId) >> 20n);
        const tgLink = username
            ? `https://t.me/${username}/${urlMsgId}`
            : `https://t.me/c/${String(r.channelId).replace(/^-100/, '')}/${urlMsgId}`;
        return { channelId: r.channelId, messageId: r.messageId, tgLink };
    });
}

export async function markFeedViewed(id: string) {
    const row = await Feed.findByPk(id);
    if (!row) throw rpcError(-32001, 'Feed item not found');
    await row.update({ isViewed: true });
    return { ok: true };
}

// --- config ---

export async function listConfig(after?: Date, before?: Date) {
    const where: Record<string, unknown> = {};
    if (after || before) {
        where.updatedAt = {
            ...(after ? { [Op.gte]: after } : {}),
            ...(before ? { [Op.lte]: before } : {}),
        };
    }
    const rows = await AppConfig.findAll({ where, order: [['slug', 'ASC']] });
    return rows.map((r) => r.get({ plain: true }));
}

export async function getConfig(slug: string) {
    const row = await AppConfig.findByPk(slug);
    if (!row) throw rpcError(-32001, 'Config key not found');
    return row.get({ plain: true });
}

export async function setConfig(slug: string, value: string) {
    const [row] = await AppConfig.upsert({ slug, value });
    return row.get({ plain: true });
}

// --- prompts ---

export async function listPrompts(tags?: string[], after?: Date, before?: Date) {
    const where: Record<string, unknown> = {};
    if (tags?.length) where.tags = { [Op.overlap]: tags };
    if (after || before) {
        where.createdAt = {
            ...(after ? { [Op.gte]: after } : {}),
            ...(before ? { [Op.lte]: before } : {}),
        };
    }
    const rows = await Prompt.findAll({ where, order: [['createdAt', 'DESC']] });
    return rows.map((r) => r.get({ plain: true }));
}

export async function getPrompt(id: string) {
    const row = await Prompt.findByPk(id);
    if (!row) throw rpcError(-32001, 'Prompt not found');
    return row.get({ plain: true });
}

export async function createPrompt(content: string, tags: string[]) {
    const row = await Prompt.insertNew(content, tags);
    return row.get({ plain: true });
}

export async function updatePrompt(id: string, content: string, tags: string[]) {
    const row = await Prompt.createVersion(id, content, tags);
    return row.get({ plain: true });
}

export async function getPromptHistory(id: string) {
    await getPrompt(id); // ensure exists
    const rows = await Prompt.getHistory(id);
    return rows.map((r) => r.get({ plain: true }));
}

export async function renderPrompt(id: string, vars: Record<string, string>) {
    const row = await Prompt.findByPk(id);
    if (!row) throw rpcError(-32001, 'Prompt not found');
    return { rendered: renderTemplate(row.content, vars) };
}
