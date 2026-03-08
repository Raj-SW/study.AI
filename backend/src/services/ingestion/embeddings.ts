import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { Embeddings } from '@langchain/core/embeddings';

export interface EmbeddingsProvider {
  getEmbeddings(): Embeddings;
}

class GeminiEmbeddingsProvider implements EmbeddingsProvider {
  private instance: GoogleGenerativeAIEmbeddings | null = null;

  getEmbeddings(): Embeddings {
    if (!this.instance) {
      this.instance = new GoogleGenerativeAIEmbeddings({
        apiKey: process.env.GOOGLE_API_KEY,
        model: 'text-embedding-004',
      });
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
