import type { MigrationContext } from '../migrator.js';
import { randomUUID } from 'node:crypto';

const PROMPTS = [
    {
        slug: 'normalize_system',
        content: `You are a content normalizer for Telegram posts. Given a post text:
1. Rewrite it in a neutral, factual tone — remove excessive emotions, hype, and emoji.
2. Classify it as one of: "ad" (advertisement/promotion), "news" (news/announcement), "post" (opinion/discussion/other), "meme" (humor/meme).

Respond ONLY with valid JSON. No markdown, no explanation.`,
    },
    {
        slug: 'dedup_system',
        content: `You are a news deduplication assistant. Given two news texts from different Telegram channels, determine:
1. Are they reporting the same event/news?
2. If yes, produce the best merged version (preserve the most complete information, prefer clearer wording).

Respond ONLY with valid JSON. No markdown, no explanation.`,
    },
];

export async function up({ context: queryInterface }: MigrationContext) {
    for (const p of PROMPTS) {
        await queryInterface.bulkInsert('prompts', [
            { id: randomUUID(), slug: p.slug, content: p.content, version: 1, is_current: true, created_at: new Date() },
        ]);
    }
}

export async function down({ context: queryInterface }: MigrationContext) {
    await queryInterface.bulkDelete('prompts', { slug: PROMPTS.map((p) => p.slug) } as never);
}
