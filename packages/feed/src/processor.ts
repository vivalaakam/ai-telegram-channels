import { Feed, Message } from '@ai-tg-channels/models';
import { getEmbedding } from './embeddings.js';
import { checkDuplication, normalizeAndClassify } from './llm.js';

const SIMILARITY_THRESHOLD = 0.85;

export async function processMessages(): Promise<void> {
    let processed = 0;

    let msg = await Message.getUnchecked();

    while (msg) {
        const text = msg.contentTextText!;

        if (!text.trim()) {
            console.log(`[feed] msg ${msg.messageId} from channel ${msg.channelId} empty`);
            await msg.markChecked();
            msg = await Message.getUnchecked();
            continue;
        }

        console.log(`[feed] Processing msg ${msg.messageId} from channel ${msg.channelId}...`);

        try {
            const embedding = await getEmbedding(text);
            const similar = await Feed.findSimilar(embedding, SIMILARITY_THRESHOLD);

            if (!similar.length) {
                const { normalizedText, postType } = await normalizeAndClassify(text);
                const embedding = await getEmbedding(normalizedText);

                await Feed.insert({
                    text: normalizedText,
                    postType,
                    firstSeenAt: msg.date,
                    channelId: msg.channelId,
                    messageId: msg.messageId,
                    embedding,
                });
                console.log(`[feed] New item added from channel ${msg.channelId} msg ${msg.messageId} (${postType})`);
            } else {
                for (const row of similar) {
                    const result = await checkDuplication(row.text, text);

                    if (result.sameNews) {
                        if (result.mergedText && result.mergedText !== row.text) {
                            const mergedEmbedding = await getEmbedding(result.mergedText);
                            await Feed.updateText(row.id, result.mergedText, mergedEmbedding);
                            console.log(`[feed] Updated item ${row.id} with merged text`);
                        } else {
                            console.log(
                                `[feed] Duplicate of ${row.id} (similarity ${row.similarity.toFixed(3)}), linking message`,
                            );
                        }
                        await Feed.addMessage(row.id, msg.channelId, msg.messageId);
                    } else {
                        const { normalizedText, postType } = await normalizeAndClassify(text);
                        const normalizedEmbedding = await getEmbedding(normalizedText);
                        await Feed.insert({
                            text: normalizedText,
                            postType,
                            firstSeenAt: msg.date,
                            channelId: msg.channelId,
                            messageId: msg.messageId,
                            embedding: normalizedEmbedding,
                        });
                        console.log(`[feed] Different news despite vector similarity, added new item (${postType})`);
                    }
                }
            }
        } catch (err) {
            console.error(`[feed] Error processing msg ${msg.messageId} from channel ${msg.channelId}:`, err);
        }

        await msg.markChecked();
        processed += 1;
        msg = await Message.getUnchecked();
    }

    console.log(`[feed] Done processing ${processed} messages`);
}
