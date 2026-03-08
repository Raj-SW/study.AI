import { GoogleGenerativeAI } from '@google/generative-ai';
import { Embeddings } from '@langchain/core/embeddings';

export interface EmbeddingsProvider {
  getEmbeddings(): Embeddings;
}

/**
 * Calls the @google/generative-ai SDK directly so we can control apiVersion.
 * Uses gemini-embedding-001 (the model available on this API key) via v1beta.
 */
class GeminiV1Embeddings extends Embeddings {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private genModel: any;
  private static readonly BATCH_SIZE = 100;

  constructor(apiKey: string) {
    super({});
    const genAI = new GoogleGenerativeAI(apiKey);
    this.genModel = genAI.getGenerativeModel(
      { model: 'gemini-embedding-001' },
      { apiVersion: 'v1beta' },
    );
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    for (let i = 0; i < texts.length; i += GeminiV1Embeddings.BATCH_SIZE) {
      const batch = texts.slice(i, i + GeminiV1Embeddings.BATCH_SIZE);
      const res = await this.genModel.batchEmbedContents({
        requests: batch.map((text: string) => ({
          content: { role: 'user', parts: [{ text }] },
        })),
      });
      results.push(...res.embeddings.map((e: { values?: number[] }) => e.values ?? []));
    }
    return results;
  }

  async embedQuery(text: string): Promise<number[]> {
    const res = await this.genModel.embedContent({
      content: { role: 'user', parts: [{ text }] },
    });
    return res.embedding.values ?? [];
  }
}

class GeminiEmbeddingsProvider implements EmbeddingsProvider {
  private instance: GeminiV1Embeddings | null = null;

  getEmbeddings(): Embeddings {
    if (!this.instance) {
      const apiKey = process.env.GOOGLE_API_KEY;
      if (!apiKey) throw new Error('GOOGLE_API_KEY is not set');
      this.instance = new GeminiV1Embeddings(apiKey);
    }
    return this.instance;
  }
}

// Select provider based on EMBEDDINGS_PROVIDER env var
function createDefaultProvider(): EmbeddingsProvider {
  return new GeminiEmbeddingsProvider();
}

// Pluggable: swap implementation here without changing consumers
let provider: EmbeddingsProvider = createDefaultProvider();

export function setEmbeddingsProvider(p: EmbeddingsProvider): void {
  provider = p;
}

export function getEmbeddings(): Embeddings {
  return provider.getEmbeddings();
}
