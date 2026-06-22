import { getEmbedding } from './embeddings.js';
import { checkDuplication } from './llm.js';
import { Feed, Message } from '@ai-tg-channels/models';

const SIMILARITY_THRESHOLD = 0.85;

export async function processMessages(): Promise<void> {
    const messages = await Message.getUnchecked();
    console.log(`[feed] Found ${messages.length} unchecked messages`);

    for (const msg of messages) {
        const text = msg.contentTextText!;

        try {
            const embedding = await getEmbedding(text);
            const similar = await Feed.findSimilar(embedding, SIMILARITY_THRESHOLD);

            if (!similar.length) {
                await Feed.insert({
                    text,
                    firstSeenAt: msg.date,
                    channelId: msg.channelId,
                    embedding,
                });
                console.log(`[feed] Added new item from channel ${msg.channelId} msg ${msg.messageId}`);
                return;
            }

            for (const row of similar) {
                const result = await checkDuplication(row.text, text);

                if (result.sameNews) {
                    if (result.mergedText && result.mergedText !== row.text) {
                        await Feed.updateText(row.id, result.mergedText);
                        console.log(`[feed] Updated existing item ${row.id} with merged text`);
                    } else {
                        console.log(
                            `[feed] Duplicate detected, skipping msg ${msg.messageId} (similarity ${row.similarity.toFixed(3)})`,
                        );
                        await Feed.insert({
                            text,
                            firstSeenAt: msg.date,
                            channelId: msg.channelId,
                            embedding,
                        });
                        console.log(
                            `[feed] Different news despite similarity, added new item from channel ${msg.channelId}`,
                        );
                    }
                }
            }
        } catch (err) {
            console.error(`[feed] Error processing msg ${msg.messageId} from channel ${msg.channelId}:`, err);
        } finally {
            await msg.markChecked();
        }
    }

    console.log(`[feed] Done processing ${messages.length} messages`);
}
