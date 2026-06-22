import { config } from 'dotenv';
import { resolve } from 'node:path';
import { Sequelize } from 'sequelize';
import { initModels, Channel, Message } from '@ai-tg-channels/models';
import { createMigrator } from '@ai-tg-channels/migrations';

config({ path: resolve(import.meta.dirname, '../../../.env') });

export const sequelize = new Sequelize(process.env.DATABASE_URL!, {
  dialect: 'postgres',
  logging: false,
});

initModels(sequelize);

export async function initDb() {
  const migrator = createMigrator(sequelize);
  await migrator.up();
}

export async function upsertChannel(id: string, title: string, username?: string) {
  await Channel.upsert({
    id,
    title,
    username: username ?? null,
  });
}

export async function saveMessage(
  channelId: string,
  messageId: number,
  raw: Record<string, unknown>,
): Promise<boolean> {
  const {
    // id and chat_id are already stored as message_id/channel_id columns
    id: _omitId,
    chat_id: _omitChatId,
    date,
    edit_date,
    effect_id,
    is_pinned,
    sender_id,
    reply_to,
    content: rawContentField,
    ...payload
  } = raw;

  void _omitId;
  void _omitChatId;

  const msgDate = typeof date === 'number' ? new Date(date * 1000) : new Date();
  const editDate =
    typeof edit_date === 'number' && (edit_date as number) > 0 ? new Date((edit_date as number) * 1000) : null;
  const effectId = effect_id != null ? String(effect_id) : null;
  const isPinned = is_pinned === true;

  const rawContent = (rawContentField ?? {}) as Record<string, unknown>;
  const {
    is_secret: _omitIsSecret,
    has_spoiler: _omitHasSpoiler,
    show_caption_above_media: _omitShowCaptionAboveMedia,
    start_timestamp: _omitStartTimestamp,
    text: rawContentText,
    caption: rawContentCaption,
    photo: contentPhoto,
    video: contentVideo,
    cover: contentVideoCover,
    storyboards: contentVideoStoryboards,
    animation: contentAnimation,
    link_preview_options: contentLinkPreviewOptions,
    link_preview: contentLinkPreview,
    alternative_videos: contentAlternativeVideos,
    ...content
  } = rawContent;

  const {
    text: contentTextText,
    entities: contentTextEntities,
    ...contentText
  } = (rawContentText ?? rawContentCaption ?? {}) as Record<string, unknown>;

  void _omitIsSecret;
  void _omitHasSpoiler;
  void _omitShowCaptionAboveMedia;
  void _omitStartTimestamp;

  const [, created] = await Message.upsert({
    channelId,
    messageId,
    date: msgDate,
    editDate,
    effectId,
    isPinned,
    senderId: sender_id ? (sender_id as Record<string, unknown>) : null,
    replyTo: reply_to ? (reply_to as Record<string, unknown>) : null,
    content: Object.keys(content).length > 0 ? content : null,
    contentText: Object.keys(contentText).length > 0 ? contentText : null,
    contentPhoto: contentPhoto ? (contentPhoto as Record<string, unknown>) : null,
    contentVideo: contentVideo ? (contentVideo as Record<string, unknown>) : null,
    contentVideoCover: contentVideoCover ? (contentVideoCover as Record<string, unknown>) : null,
    contentVideoStoryboards: contentVideoStoryboards ? (contentVideoStoryboards as Record<string, unknown>) : null,
    contentAlternativeVideos: contentAlternativeVideos ? (contentAlternativeVideos as Record<string, unknown>) : null,
    contentAnimation: contentAnimation ? (contentAnimation as Record<string, unknown>) : null,
    contentLinkPreviewOptions: contentLinkPreviewOptions
      ? (contentLinkPreviewOptions as Record<string, unknown>)
      : null,
    contentLinkPreview: contentLinkPreview ? (contentLinkPreview as Record<string, unknown>) : null,
    contentTextText: (contentTextText as string) ?? null,
    contentTextEntities: contentTextEntities ? (contentTextEntities as Record<string, unknown>) : null,
    raw: payload,
  });

  return created ?? true;
}
