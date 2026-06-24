import type { MigrationContext } from '../migrator.js';
import { randomUUID } from 'node:crypto';

const normalizeId = randomUUID();
const dedupId = randomUUID();

const PROMPTS = [
    {
        id: normalizeId,
        slug: 'normalize_system',
        content: `You are a content normalizer for Telegram posts. Given a post text:
1. Rewrite it in a neutral, factual tone — remove excessive emotions, hype, and emoji.
2. Classify it as one of: "ad" (advertisement/promotion), "news" (news/announcement), "post" (opinion/discussion/other), "meme" (humor/meme).

Respond ONLY with valid JSON. No markdown, no explanation.`,
        tags: ['normalize', 'system'],
    },
    {
        id: dedupId,
        slug: 'dedup_system',
        content: `You are a news deduplication assistant. Given two news texts from different Telegram channels, determine:
1. Are they reporting the same event/news?
2. If yes, produce the best merged version (preserve the most complete information, prefer clearer wording).

Respond ONLY with valid JSON. No markdown, no explanation.`,
        tags: ['dedup', 'system'],
    },
];

export async function up({ context: queryInterface }: MigrationContext) {
    for (const p of PROMPTS) {
        await queryInterface.bulkInsert('prompts', [
            { id: p.id, content: p.content, version: 1, tags: `{${p.tags.join(',')}}`, previous_id: null, created_at: new Date() },
        ]);
        await queryInterface.bulkInsert('app_config', [
            { slug: p.slug, value: p.id, created_at: new Date(), updated_at: new Date() },
        ]);
    }
}

export async function down({ context: queryInterface }: MigrationContext) {
    await queryInterface.bulkDelete('app_config', { slug: PROMPTS.map((p) => p.slug) } as never);
    await queryInterface.bulkDelete('prompts', { id: PROMPTS.map((p) => p.id) } as never);
}
