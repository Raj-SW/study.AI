import { Document } from "@langchain/core/documents";
import { chunkDocuments } from "../../src/ingestion/chunker";

describe("chunkDocuments", () => {
  it("splits a long document into multiple chunks", async () => {
    const longText = "Photosynthesis. ".repeat(500); // ~8000 chars, well over one chunk
    const chunks = await chunkDocuments([
      new Document({ pageContent: longText, metadata: { source: "bio.pdf" } }),
    ]);

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      // Default chunkSize is 1500; splitter may slightly exceed on hard boundaries.
      expect(chunk.pageContent.length).toBeLessThanOrEqual(1600);
    }
  });

  it("keeps a short document as a single chunk and preserves metadata", async () => {
    const chunks = await chunkDocuments([
      new Document({
        pageContent: "The mitochondria is the powerhouse of the cell.",
        metadata: { source: "notes.pdf", page: 3 },
      }),
    ]);

    expect(chunks).toHaveLength(1);
    expect(chunks[0].metadata).toMatchObject({ source: "notes.pdf", page: 3 });
  });

  it("discards whitespace-only chunks (e.g. from scanned PDFs)", async () => {
    const chunks = await chunkDocuments([
      new Document({ pageContent: "   \n\n   \t  \n  ", metadata: {} }),
    ]);

    expect(chunks).toHaveLength(0);
  });

  it("respects a custom chunk size", async () => {
    const text = "word ".repeat(400); // 2000 chars
    const chunks = await chunkDocuments(
      [new Document({ pageContent: text, metadata: {} })],
      { chunkSize: 200, chunkOverlap: 20 },
    );

    expect(chunks.length).toBeGreaterThan(1);
    for (const chunk of chunks) {
      expect(chunk.pageContent.length).toBeLessThanOrEqual(220);
    }
  });
});
