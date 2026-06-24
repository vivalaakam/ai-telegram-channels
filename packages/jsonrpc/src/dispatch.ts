import { AppConfig, Channel, Message, Prompt, renderTemplate } from '@ai-tg-channels/models';

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

// --- config ---

export async function listConfig() {
    const rows = await AppConfig.findAll({ order: [['slug', 'ASC']] });
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

export async function listPrompts() {
    const rows = await Prompt.findAll({ where: { isCurrent: true }, order: [['slug', 'ASC']] });
    return rows.map((r) => r.get({ plain: true }));
}

export async function getPrompt(slug: string) {
    const row = await Prompt.getCurrent(slug);
    if (!row) throw rpcError(-32001, 'Prompt not found');
    return row.get({ plain: true });
}

export async function createPrompt(slug: string, content: string) {
    const existing = await Prompt.getCurrent(slug);
    if (existing) throw rpcError(-32002, 'Prompt already exists, use prompts.update');
    const row = await Prompt.insertNew(slug, content);
    return row.get({ plain: true });
}

export async function updatePrompt(slug: string, content: string) {
    const row = await Prompt.nextVersion(slug, content);
    return row.get({ plain: true });
}

export async function getPromptHistory(slug: string) {
    const rows = await Prompt.history(slug);
    return rows.map((r) => r.get({ plain: true }));
}

export async function renderPrompt(slug: string, vars: Record<string, string>) {
    const row = await Prompt.getCurrent(slug);
    if (!row) throw rpcError(-32001, 'Prompt not found');
    return { rendered: renderTemplate(row.content, vars) };
}
