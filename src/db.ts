import pg from "pg";

export const pool = new pg.Pool({connectionString: process.env.DATABASE_URL});

export async function initDb() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS channels
        (
            id         BIGINT PRIMARY KEY,
            username   TEXT,
            title      TEXT NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS messages
        (
            channel_id                   BIGINT      NOT NULL REFERENCES channels (id),
            message_id                   BIGINT      NOT NULL,
            date                         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            edit_date                    TIMESTAMPTZ,
            effect_id                    TEXT,
            is_pinned                    BOOLEAN     NOT NULL DEFAULT FALSE,
            sender_id                    JSONB,
            reply_to                     JSONB,
            content                      JSONB,
            content_text                 JSONB,
            content_photo                JSONB,
            content_video                JSONB,
            content_video_cover          JSONB,
            content_video_storyboards    JSONB,
            content_alternative_videos   JSONB,
            content_animation            JSONB,
            content_link_preview_options JSONB,
            content_link_preview         JSONB,
            content_text_text            TEXT,
            content_text_entities        JSONB,
            raw                          JSONB       NOT NULL,
            created_at                   TIMESTAMPTZ          DEFAULT NOW(),
            PRIMARY KEY (channel_id, message_id)
        );
    `);
}

export async function upsertChannel(id: string, title: string, username?: string) {
    await pool.query(
        `INSERT INTO channels (id, title, username)
         VALUES ($1, $2, $3)
         ON CONFLICT (id) DO UPDATE SET title    = EXCLUDED.title,
                                        username = EXCLUDED.username`,
        [id, title, username ?? null]
    );
}

export async function saveMessage(channelId: string, messageId: number, raw: Record<string, unknown>): Promise<boolean> {
    const {
        // ponytail: id and chat_id are already stored as message_id/channel_id columns
        id: _omitId, chat_id: _omitChatId,
        date, edit_date, effect_id, is_pinned, sender_id, reply_to,
        content: rawContentField,
        ...payload
    } = raw;

    void _omitId;
    void _omitChatId;

    const msgDate = typeof date === "number" ? new Date(date * 1000) : new Date();
    const editDate = typeof edit_date === "number" && edit_date > 0 ? new Date(edit_date * 1000) : null;
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
    } = rawContentText ?? rawContentCaption ?? {};


    void _omitIsSecret;
    void _omitHasSpoiler;
    void _omitShowCaptionAboveMedia;
    void _omitStartTimestamp;

    const result = await pool.query(
        `INSERT INTO messages (channel_id, message_id, date, edit_date, effect_id, is_pinned, sender_id, reply_to,
                               content, content_text, content_photo, content_video, content_animation,
                               content_link_preview_options, content_link_preview, content_video_cover,
                               content_video_storyboards, content_alternative_videos, content_text_text,
                               content_text_entities, raw)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
         ON CONFLICT (channel_id, message_id) DO UPDATE SET edit_date                    = EXCLUDED.edit_date,
                                                            effect_id                    = EXCLUDED.effect_id,
                                                            is_pinned                    = EXCLUDED.is_pinned,
                                                            sender_id                    = EXCLUDED.sender_id,
                                                            reply_to                     = EXCLUDED.reply_to,
                                                            content                      = EXCLUDED.content,
                                                            content_text                 = EXCLUDED.content_text,
                                                            content_photo                = EXCLUDED.content_photo,
                                                            content_video                = EXCLUDED.content_video,
                                                            content_animation            = EXCLUDED.content_animation,
                                                            content_link_preview_options = EXCLUDED.content_link_preview_options,
                                                            content_link_preview         = EXCLUDED.content_link_preview,
                                                            content_video_cover          = EXCLUDED.content_video_cover,
                                                            content_video_storyboards    = EXCLUDED.content_video_storyboards,
                                                            content_alternative_videos   = EXCLUDED.content_alternative_videos,
                                                            content_text_text            = EXCLUDED.content_text_text,
                                                            content_text_entities        = EXCLUDED.content_text_entities,
                                                            raw                          = EXCLUDED.raw`,
        [
            channelId,
            messageId,
            msgDate,
            editDate,
            effectId,
            isPinned,
            sender_id ? JSON.stringify(sender_id) : null,
            reply_to ? JSON.stringify(reply_to) : null,
            JSON.stringify(content),
            contentText ? JSON.stringify(contentText) : null,
            contentPhoto ? JSON.stringify(contentPhoto) : null,
            contentVideo ? JSON.stringify(contentVideo) : null,
            contentAnimation ? JSON.stringify(contentAnimation) : null,
            contentLinkPreviewOptions ? JSON.stringify(contentLinkPreviewOptions) : null,
            contentLinkPreview ? JSON.stringify(contentLinkPreview) : null,
            contentVideoCover ? JSON.stringify(contentVideoCover) : null,
            contentVideoStoryboards ? JSON.stringify(contentVideoStoryboards) : null,
            contentAlternativeVideos ? JSON.stringify(contentAlternativeVideos) : null,
            contentTextText ?? "",
            contentTextEntities ? JSON.stringify(contentTextEntities) : null,
            JSON.stringify(payload)]
    );
    return (result.rowCount ?? 0) > 0;
}
