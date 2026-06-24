export async function getEmbedding(text: string): Promise<number[]> {
    const response = await fetch(`${process.env.OPENAI_BASE_URL}/v1/embeddings`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({model: process.env.CHUNK_MODEL, input: text}),
    });

    if (!response.ok) {
        const err = await response.text();
        throw new Error(`Embeddings API error ${response.status}: ${err}`);
    }

    const data = (await response.json()) as { data: Array<{ embedding: number[] }> };
    return data.data[0]!.embedding;
}
