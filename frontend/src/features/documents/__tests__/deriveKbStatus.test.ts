import { deriveKbStatus } from "../hooks/useDocuments";
import type { DocumentItem } from "../types";

function makeDoc(overrides: Partial<DocumentItem> = {}): DocumentItem {
  return {
    id: "1",
    projectId: "p1",
    filename: "test.pdf",
    status: "INDEXED",
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("deriveKbStatus", () => {
  it('returns "empty" when no documents', () => {
    expect(deriveKbStatus([])).toBe("empty");
  });

  it('returns "ready" when all documents are INDEXED', () => {
    expect(
      deriveKbStatus([
        makeDoc({ id: "1", status: "INDEXED" }),
        makeDoc({ id: "2", status: "INDEXED" }),
      ])
    ).toBe("ready");
  });

  it('returns "indexing" when any document is PROCESSING', () => {
    expect(
      deriveKbStatus([
        makeDoc({ id: "1", status: "INDEXED" }),
        makeDoc({ id: "2", status: "PROCESSING" }),
      ])
    ).toBe("indexing");
  });

  it('returns "indexing" when any document is UPLOADED', () => {
    expect(
      deriveKbStatus([
        makeDoc({ id: "1", status: "INDEXED" }),
        makeDoc({ id: "2", status: "UPLOADED" }),
      ])
    ).toBe("indexing");
  });

  it('returns "attention" when any document has FAILED', () => {
    expect(
      deriveKbStatus([
        makeDoc({ id: "1", status: "INDEXED" }),
        makeDoc({ id: "2", status: "FAILED" }),
      ])
    ).toBe("attention");
  });

  it('returns "attention" (FAILED takes priority over PROCESSING)', () => {
    expect(
      deriveKbStatus([
        makeDoc({ id: "1", status: "PROCESSING" }),
        makeDoc({ id: "2", status: "FAILED" }),
      ])
    ).toBe("attention");
  });
});
