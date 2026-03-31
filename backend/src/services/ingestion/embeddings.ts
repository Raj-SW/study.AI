import { Embeddings } from '@langchain/core/embeddings';
import { OpenAIEmbeddings } from '@langchain/openai';

let instance: OpenAIEmbeddings | null = null;

export function getEmbeddings(): Embeddings {
  if (!instance) {
    const isAida = Boolean(process.env.AIDA_BASE_URL);
    instance = new OpenAIEmbeddings({
      apiKey: isAida ? 'aida' : process.env.OPENAI_API_KEY,
      model: 'text-embedding-3-large',
      configuration: isAida ? {
        baseURL: process.env.AIDA_BASE_URL,
        defaultHeaders: {
          'Aida-Team-Name': process.env.AIDA_TEAM_NAME ?? 'testTeam',
          'Aida-User-Name': process.env.AIDA_USER_NAME ?? 'testUser',
          'Aida-Tool': process.env.AIDA_TOOL ?? 'studyAI',
        },
      } : undefined,
    });
  }
  return instance;
}

export function resetEmbeddings(): void {
  instance = null;
}
