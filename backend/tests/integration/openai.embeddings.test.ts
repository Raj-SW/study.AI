/**
 * Live connectivity test — verifies that the OpenAI embeddings endpoint is
 * reachable and returns a valid vector for a sample input.
 *
 * Requires OPENAI_API_KEY and EMBEDDINGS_MODEL to be set in .env.
 * This test makes a real HTTP request; do not run in CI without credentials.
 */

import dotenv from 'dotenv';
dotenv.config();

// Corporate TLS proxy bypass — same logic as src/index.ts.
// @langchain/openai uses fetch (undici), which ignores NODE_TLS_REJECT_UNAUTHORIZED.
if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const undici = require('undici') as any;
    undici.setGlobalDispatcher(new undici.Agent({ connect: { rejectUnauthorized: false } }));
  } catch {
    // undici not available
  }
}

import { getEmbeddings, resetEmbeddings } from '../../src/services/openai.provider';

describe('OpenAI Embeddings — live connectivity', () => {
  beforeEach(() => {
    resetEmbeddings(); // ensure a fresh client per test
  });

  afterAll(() => {
    resetEmbeddings();
  });

  it('returns a non-empty float vector for a sample text', async () => {
    const embeddings = getEmbeddings();
    const result = await embeddings.embedQuery('Hello, embeddings!');

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
    expect(typeof result[0]).toBe('number');
  });

  it('returns the same dimensionality for multiple inputs', async () => {
    const embeddings = getEmbeddings();
    const inputs = ['first sentence', 'second sentence', 'third sentence'];
    const results = await embeddings.embedDocuments(inputs);

    expect(results).toHaveLength(inputs.length);
    const dim = results[0].length;
    for (const vec of results) {
      expect(vec).toHaveLength(dim);
    }
  });
});
