import { Document } from "@langchain/core/documents";

// Mock the provider + vector store boundaries so the test exercises how
// rag.service wires them together (HyDE -> embed -> search -> answer) without
// any live OpenAI / Qdrant calls.
jest.mock("../../src/openai.provider");
jest.mock("../../src/ingestion/vectorStore");

import { answerQuestion, TOP_K, MIN_SCORE } from "../../src/rag.service";
import { getEmbeddings, createChatLlm } from "../../src/openai.provider";
import { similaritySearch } from "../../src/ingestion/vectorStore";

const mockedGetEmbeddings = getEmbeddings as jest.MockedFunction<typeof getEmbeddings>;
const mockedCreateChatLlm = createChatLlm as jest.MockedFunction<typeof createChatLlm>;
const mockedSimilaritySearch = similaritySearch as jest.MockedFunction<typeof similaritySearch>;

function makeSource(id: string, content: string, score: number): [Document, number] {
  return [
    new Document({
      pageContent: content,
      metadata: { documentId: id, chunkIndex: 0, projectId: "p1", userId: "u1", source: "pdf" },
    }),
    score,
  ];
}

describe("answerQuestion (integration)", () => {
  const embedQuery = jest.fn();
  const invoke = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    embedQuery.mockResolvedValue([0.1, 0.2, 0.3]);
    mockedGetEmbeddings.mockReturnValue({ embedQuery } as any);
    // Both the HyDE call and the final answer call go through createChatLlm().invoke
    invoke.mockResolvedValue({ content: "A generated answer." });
    mockedCreateChatLlm.mockReturnValue({ invoke } as any);
  });

  it("retrieves, filters by score threshold, and returns an answer with sources", async () => {
    mockedSimilaritySearch.mockResolvedValue([
      makeSource("doc-a", "Relevant chunk about cells.", 0.9),
      makeSource("doc-b", "Barely relevant.", MIN_SCORE + 0.05),
      makeSource("doc-c", "Noise below threshold.", MIN_SCORE - 0.15), // < MIN_SCORE -> dropped
    ]);

    const result = await answerQuestion({
      projectId: "p1",
      userId: "u1",
      question: "What is a cell?",
    });

    expect(result.answer).toBe("A generated answer.");
    // 0.1 chunk is filtered out by the MIN_SCORE threshold
    expect(result.sources).toHaveLength(2);
    expect(result.sources.map((s) => s.documentId)).toEqual(["doc-a", "doc-b"]);
    expect(result.sources[0]).toMatchObject({ documentId: "doc-a", chunkIndex: 0, score: 0.9 });

    // Query is embedded, retrieval is scoped to the project, LLM produces the answer.
    expect(embedQuery).toHaveBeenCalledTimes(1);
    expect(mockedSimilaritySearch).toHaveBeenCalledWith(
      [0.1, 0.2, 0.3],
      TOP_K,
      { projectId: "p1" },
    );
    expect(invoke).toHaveBeenCalled();
  });

  it("still answers when retrieval returns nothing", async () => {
    mockedSimilaritySearch.mockResolvedValue([]);

    const result = await answerQuestion({
      projectId: "p1",
      userId: "u1",
      question: "Unknown topic?",
    });

    expect(result.sources).toHaveLength(0);
    expect(result.answer).toBe("A generated answer.");
  });

  it("falls back to the raw question when HyDE expansion fails", async () => {
    // First invoke (HyDE) rejects; second invoke (answer) resolves.
    invoke
      .mockRejectedValueOnce(new Error("HyDE model down"))
      .mockResolvedValueOnce({ content: "Fallback answer." });
    mockedSimilaritySearch.mockResolvedValue([makeSource("doc-a", "chunk", 0.8)]);

    const result = await answerQuestion({
      projectId: "p1",
      userId: "u1",
      question: "Explain osmosis.",
    });

    expect(result.answer).toBe("Fallback answer.");
    // Retrieval still happened using the embedded (raw) query.
    expect(embedQuery).toHaveBeenCalledTimes(1);
  });
});
