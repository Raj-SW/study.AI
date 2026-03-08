import { renderHook, act, waitFor } from "@testing-library/react";
import { useChat } from "../hooks/useChat";
import { chatApi } from "../services/chatApi";

jest.mock("../services/chatApi");
jest.mock("sonner", () => ({ toast: { error: jest.fn() } }));

const mockSend = chatApi.send as jest.MockedFunction<typeof chatApi.send>;

describe("useChat", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("starts with no messages", () => {
    const { result } = renderHook(() => useChat("project-1"));
    expect(result.current.messages).toHaveLength(0);
    expect(result.current.isLoading).toBe(false);
  });

  it("appends user message and assistant response on send", async () => {
    mockSend.mockResolvedValue({
      answer: "Paris is the capital.",
      sources: [{ documentId: "doc-1", filename: "geography.pdf" }],
    });

    const { result } = renderHook(() => useChat("project-1"));

    await act(async () => {
      await result.current.sendMessage("What is the capital of France?");
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[0]).toMatchObject({
      role: "user",
      content: "What is the capital of France?",
    });
    expect(result.current.messages[1]).toMatchObject({
      role: "assistant",
      content: "Paris is the capital.",
      sources: [{ documentId: "doc-1", filename: "geography.pdf" }],
    });
  });

  it("shows error message when API fails", async () => {
    mockSend.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useChat("project-1"));

    await act(async () => {
      await result.current.sendMessage("Some question?");
    });

    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1].role).toBe("assistant");
    expect(result.current.messages[1].content).toMatch(/sorry/i);
  });

  it("clears messages when clearMessages is called", async () => {
    mockSend.mockResolvedValue({ answer: "Yes.", sources: [] });

    const { result } = renderHook(() => useChat("project-1"));

    await act(async () => {
      await result.current.sendMessage("Hello?");
    });

    expect(result.current.messages).toHaveLength(2);

    act(() => {
      result.current.clearMessages();
    });

    expect(result.current.messages).toHaveLength(0);
  });

  it("clears messages when projectId changes", async () => {
    mockSend.mockResolvedValue({ answer: "Yes.", sources: [] });

    const { result, rerender } = renderHook(({ id }) => useChat(id), {
      initialProps: { id: "project-1" as string | null },
    });

    await act(async () => {
      await result.current.sendMessage("Question one?");
    });

    expect(result.current.messages).toHaveLength(2);

    act(() => {
      rerender({ id: "project-2" });
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
  });

  it("calls chatApi.send with correct arguments", async () => {
    mockSend.mockResolvedValue({ answer: "42.", sources: [] });

    const { result } = renderHook(() => useChat("my-project"));

    await act(async () => {
      await result.current.sendMessage("  What is the answer?  ");
    });

    expect(mockSend).toHaveBeenCalledWith("my-project", {
      question: "What is the answer?",
    });
  });
});
