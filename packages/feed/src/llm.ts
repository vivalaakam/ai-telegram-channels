export interface DeduplicationResult {
    sameNews: boolean;
    mergedText: string | null;
}

export type PostType = 'ad' | 'news' | 'post' | 'meme';

export interface NormalizeResult {
    normalizedText: string;
    postType: PostType;
}

const NORMALIZE_SYSTEM_PROMPT = `You are a content normalizer for Telegram posts. Given a post text:
1. Rewrite it in a neutral, factual tone — remove excessive emotions, hype, and emoji.
2. Classify it as one of: "ad" (advertisement/promotion), "news" (news/announcement), "post" (opinion/discussion/other), "meme" (humor/meme).

Respond ONLY with valid JSON. No markdown, no explanation.`;

export async function normalizeAndClassify(text: string): Promise<NormalizeResult> {
    const response = await fetch(`${process.env.OPENAI_BASE_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: process.env.TEXT_MODEL,
            messages: [
                { role: 'system', content: NORMALIZE_SYSTEM_PROMPT },
                {
                    role: 'user',
                    content: `Post text:\n${text}\n\nRespond with JSON: {"normalized_text": string, "post_type": "ad"|"news"|"post"|"meme"}`,
                },
            ],
            temperature: 0.1,
        }),
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`LLM API error ${response.status}: ${err}`);
    }

    const data = (await response.json()) as {
        choices: Array<{ message: { content: string } }>;
    };

    const content = data.choices[0]!.message.content;
    const parsed = JSON.parse(content) as { normalized_text: string; post_type: PostType };

    return {
        normalizedText: parsed.normalized_text,
        postType: parsed.post_type,
    };
}

const SYSTEM_PROMPT = `You are a news deduplication assistant. Given two news texts from different Telegram channels, determine:
1. Are they reporting the same event/news?
2. If yes, produce the best merged version (preserve the most complete information, prefer clearer wording).

Respond ONLY with valid JSON. No markdown, no explanation.`;

export async function checkDuplication(existingText: string, newText: string): Promise<DeduplicationResult> {
    const userMessage = `Text 1 (existing):
${existingText}

Text 2 (new):
${newText}

Respond with JSON: {"same_news": boolean, "merged_text": string | null}
If same_news is true, merged_text must contain the best combined version.
If same_news is false, merged_text must be null.`;

    const response = await fetch(`${process.env.OPENAI_BASE_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: process.env.TEXT_MODEL,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: userMessage },
            ],
            temperature: 0.1,
            // response_format: { type: 'json_object' },
        }),
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`LLM API error ${response.status}: ${err}`);
    }

    const data = (await response.json()) as {
        choices: Array<{ message: { content: string } }>;
    };

    const content = data.choices[0]!.message.content;
    const parsed = JSON.parse(content) as { same_news: boolean; merged_text: string | null };

    return {
        sameNews: parsed.same_news,
        mergedText: parsed.merged_text ?? null,
    };
}
