import { renderHook, act, waitFor } from "@testing-library/react";
import { useChat } from "../hooks/useChat";
import { chatApi } from "../services/chatApi";

jest.mock("../services/chatApi", () => ({
  chatApi: {
    send: jest.fn(),
    getHistory: jest.fn(),
  },
}));
jest.mock("sonner", () => ({ toast: { error: jest.fn() } }));

const mockSend = chatApi.send as jest.MockedFunction<typeof chatApi.send>;
const mockGetHistory = chatApi.getHistory as jest.MockedFunction<typeof chatApi.getHistory>;

const makeServerMsg = (
  id: string,
  role: "USER" | "ASSISTANT",
  content: string
) => ({ id, role, content, sources: null, createdAt: "2026-03-12T10:00:00Z" } as const);

describe("useChat", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetHistory.mockResolvedValue({ messages: [] });
  });

  it("starts with no messages", async () => {
    const { result } = renderHook(() => useChat("project-1"));
    await waitFor(() => expect(mockGetHistory).toHaveBeenCalledWith("project-1"));
    expect(result.current.messages).toHaveLength(0);
    expect(result.current.isLoading).toBe(false);
  });

  it("appends user message and assistant response on send", async () => {
    const userMsg = makeServerMsg("u-1", "USER", "What is the capital of France?");
    const assistantMsg = {
      ...makeServerMsg("a-1", "ASSISTANT", "Paris is the capital."),
      sources: [{ documentId: "doc-1", chunkIndex: 0, score: 0.9, content: "France..." }],
    };
    mockSend.mockResolvedValue({
      answer: "Paris is the capital.",
      sources: assistantMsg.sources,
      userMessage: userMsg,
      assistantMessage: assistantMsg,
    });

    const { result } = renderHook(() => useChat("project-1"));
    await waitFor(() => expect(mockGetHistory).toHaveBeenCalled());

    await act(async () => {
      await result.current.sendMessage("What is the capital of France?");
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0]).toMatchObject({
      role: "USER",
      content: "What is the capital of France?",
    });
    expect(result.current.messages[1]).toMatchObject({
      role: "ASSISTANT",
      content: "Paris is the capital.",
    });
  });

  it("shows error message when API fails", async () => {
    mockSend.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useChat("project-1"));
    await waitFor(() => expect(mockGetHistory).toHaveBeenCalled());

    await act(async () => {
      await result.current.sendMessage("Some question?");
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1].role).toBe("ASSISTANT");
    expect(result.current.messages[1].content).toMatch(/sorry/i);
  });

  it("clears messages when clearMessages is called", async () => {
    const userMsg = makeServerMsg("u-1", "USER", "Hello?");
    const assistantMsg = { ...makeServerMsg("a-1", "ASSISTANT", "Yes."), sources: [] };
    mockSend.mockResolvedValue({
      answer: "Yes.",
      sources: [],
      userMessage: userMsg,
      assistantMessage: assistantMsg,
    });

    const { result } = renderHook(() => useChat("project-1"));
    await waitFor(() => expect(mockGetHistory).toHaveBeenCalled());

    await act(async () => {
      await result.current.sendMessage("Hello?");
    });

    expect(result.current.messages).toHaveLength(2);

    act(() => {
      result.current.clearMessages();
    });

    expect(result.current.messages).toHaveLength(0);
  });

  it("loads server history when projectId changes", async () => {
    const historyMsg = makeServerMsg("h-1", "USER", "Old question");
    mockGetHistory
      .mockResolvedValueOnce({ messages: [] })         // project-1
      .mockResolvedValueOnce({ messages: [historyMsg] }); // project-2

    const { result, rerender } = renderHook(({ id }) => useChat(id), {
      initialProps: { id: "project-1" as string | null },
    });

    await waitFor(() => expect(mockGetHistory).toHaveBeenCalledWith("project-1"));
    expect(result.current.messages).toHaveLength(0);

    act(() => {
      rerender({ id: "project-2" });
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].content).toBe("Old question");
    });
  });

  it("clears messages when projectId is set to null", async () => {
    const userMsg = makeServerMsg("u-1", "USER", "Q");
    const assistantMsg = { ...makeServerMsg("a-1", "ASSISTANT", "A"), sources: [] };
    mockSend.mockResolvedValue({
      answer: "A",
      sources: [],
      userMessage: userMsg,
      assistantMessage: assistantMsg,
    });

    const { result, rerender } = renderHook(({ id }) => useChat(id), {
      initialProps: { id: "project-1" as string | null },
    });
    await waitFor(() => expect(mockGetHistory).toHaveBeenCalled());

    await act(async () => {
      await result.current.sendMessage("Q");
    });
    expect(result.current.messages).toHaveLength(2);

    act(() => {
      rerender({ id: null });
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(0);
    });
  });

  it("does nothing when projectId is null", async () => {
    const { result } = renderHook(() => useChat(null));

    await act(async () => {
      await result.current.sendMessage("Hello?");
    });

    expect(result.current.messages).toHaveLength(0);
    expect(mockSend).not.toHaveBeenCalled();
    expect(mockGetHistory).not.toHaveBeenCalled();
  });

  it("calls chatApi.send with correct arguments", async () => {
    const userMsg = makeServerMsg("u-1", "USER", "What is the answer?");
    const assistantMsg = { ...makeServerMsg("a-1", "ASSISTANT", "42."), sources: [] };
    mockSend.mockResolvedValue({
      answer: "42.",
      sources: [],
      userMessage: userMsg,
      assistantMessage: assistantMsg,
    });

    const { result } = renderHook(() => useChat("my-project"));
    await waitFor(() => expect(mockGetHistory).toHaveBeenCalled());

    await act(async () => {
      await result.current.sendMessage("  What is the answer?  ");
    });

    expect(mockSend).toHaveBeenCalledWith("my-project", {
      question: "What is the answer?",
    });
  });
});
