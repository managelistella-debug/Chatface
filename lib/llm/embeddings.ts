import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  // Batch in groups of 100 (API limit is 2048 but keep it manageable)
  const batchSize = 100;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: batch,
    });

    for (const item of response.data) {
      allEmbeddings.push(item.embedding);
    }
  }

  return allEmbeddings;
}

export async function getEmbedding(text: string): Promise<number[]> {
  const [embedding] = await getEmbeddings([text]);
  return embedding;
}
