import { AppConfig, Prompt, renderTemplate } from '@ai-tg-channels/models';

export interface DeduplicationResult {
    sameNews: boolean;
    mergedText: string | null;
}

export type PostType = 'ad' | 'news' | 'post' | 'meme';

export interface NormalizeResult {
    normalizedText: string;
    postType: PostType;
}

// ponytail: fallbacks used when config/prompt not seeded yet
const FALLBACK_NORMALIZE = `You are a content normalizer for Telegram posts. Given a post text:
1. Rewrite it in a neutral, factual tone — remove excessive emotions, hype, and emoji.
2. Classify it as one of: "ad" (advertisement/promotion), "news" (news/announcement), "post" (opinion/discussion/other), "meme" (humor/meme).

Respond ONLY with valid JSON. No markdown, no explanation.`;

const FALLBACK_DEDUP = `You are a news deduplication assistant. Given two news texts from different Telegram channels, determine:
1. Are they reporting the same event/news?
2. If yes, produce the best merged version (preserve the most complete information, prefer clearer wording).

Respond ONLY with valid JSON. No markdown, no explanation.`;

async function getPromptContent(configSlug: string, fallback: string): Promise<string> {
    const cfg = await AppConfig.findByPk(configSlug);
    if (!cfg?.value) return fallback;
    const p = await Prompt.findByPk(cfg.value);
    return p ? renderTemplate(p.content) : fallback;
}

async function chatCompletion(systemPrompt: string, userMessage: string): Promise<string> {
    const response = await fetch(`${process.env.TEXT_BASE_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: process.env.TEXT_MODEL,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessage },
            ],
            temperature: 0.1,
        }),
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`LLM API error ${response.status}: ${err}`);
    }

    const data = (await response.json()) as { choices: Array<{ message: { content: string } }> };
    return data.choices[0]!.message.content;
}

export async function normalizeAndClassify(text: string): Promise<NormalizeResult> {
    const systemPrompt = await getPromptContent('normalize_system', FALLBACK_NORMALIZE);
    const content = await chatCompletion(
        systemPrompt,
        `Post text:\n${text}\n\nRespond with JSON: {"normalized_text": string, "post_type": "ad"|"news"|"post"|"meme"}`,
    );
    const parsed = JSON.parse(content) as { normalized_text: string; post_type: PostType };
    return { normalizedText: parsed.normalized_text, postType: parsed.post_type };
}

export async function checkDuplication(existingText: string, newText: string): Promise<DeduplicationResult> {
    const systemPrompt = await getPromptContent('dedup_system', FALLBACK_DEDUP);
    const content = await chatCompletion(
        systemPrompt,
        `Text 1 (existing):\n${existingText}\n\nText 2 (new):\n${newText}\n\nRespond with JSON: {"same_news": boolean, "merged_text": string | null}\nIf same_news is true, merged_text must contain the best combined version.\nIf same_news is false, merged_text must be null.`,
    );
    const parsed = JSON.parse(content) as { same_news: boolean; merged_text: string | null };
    return { sameNews: parsed.same_news, mergedText: parsed.merged_text ?? null };
}
