import {
  getUncheckedMessages,
  findSimilarInFeed,
  insertFeedItem,
  updateFeedItemText,
  markMessageChecked,
} from './db.js';
import { getEmbedding } from './embeddings.js';
import { checkDuplication } from './llm.js';

const SIMILARITY_THRESHOLD = 0.85;

export async function processMessages(): Promise<void> {
  const messages = await getUncheckedMessages();
  console.log(`[feed] Found ${messages.length} unchecked messages`);

  for (const msg of messages) {
    const text = msg.contentTextText!;

    try {
      const embedding = await getEmbedding(text);
      const similar = await findSimilarInFeed(embedding, SIMILARITY_THRESHOLD);

      if (!similar) {
        await insertFeedItem({
          text,
          firstSeenAt: msg.date,
          channelId: msg.channelId,
          embedding,
        });
        console.log(`[feed] Added new item from channel ${msg.channelId} msg ${msg.messageId}`);
      } else {
        const result = await checkDuplication(similar.text, text);

        if (result.sameNews) {
          if (result.mergedText && result.mergedText !== similar.text) {
            await updateFeedItemText(similar.id, result.mergedText);
            console.log(`[feed] Updated existing item ${similar.id} with merged text`);
          } else {
            console.log(`[feed] Duplicate detected, skipping msg ${msg.messageId} (similarity ${similar.similarity.toFixed(3)})`);
          }
        } else {
          await insertFeedItem({
            text,
            firstSeenAt: msg.date,
            channelId: msg.channelId,
            embedding,
          });
          console.log(`[feed] Different news despite similarity, added new item from channel ${msg.channelId}`);
        }
      }

      await markMessageChecked(msg.channelId, msg.messageId);
    } catch (err) {
      console.error(`[feed] Error processing msg ${msg.messageId} from channel ${msg.channelId}:`, err);
    }
  }

  console.log(`[feed] Done processing ${messages.length} messages`);
}
