import { render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DocumentsPanel } from "../components/DocumentsPanel";

jest.mock("../services/documentsApi", () => ({
  documentsApi: {
    list: jest.fn(),
    upload: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { documentsApi } = require("../services/documentsApi");

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe("DocumentsPanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("shows prompt when no project selected", () => {
    renderWithProviders(<DocumentsPanel projectId={null} />);
    expect(
      screen.getByText("Select or create a project to manage documents.")
    ).toBeInTheDocument();
  });

  it("renders empty document list", async () => {
    documentsApi.list.mockResolvedValue({ documents: [] });

    renderWithProviders(<DocumentsPanel projectId="proj-1" />);

    await waitFor(() => {
      expect(
        screen.getByText("No documents yet. Upload a PDF to get started.")
      ).toBeInTheDocument();
    });
  });

  it("renders documents with status badges", async () => {
    documentsApi.list.mockResolvedValue({
      documents: [
        {
          id: "d1",
          projectId: "proj-1",
          filename: "chapter1.pdf",
          status: "INDEXED",
          createdAt: "2026-01-01T00:00:00Z",
        },
        {
          id: "d2",
          projectId: "proj-1",
          filename: "chapter2.pdf",
          status: "PROCESSING",
          createdAt: "2026-01-02T00:00:00Z",
        },
        {
          id: "d3",
          projectId: "proj-1",
          filename: "chapter3.pdf",
          status: "FAILED",
          createdAt: "2026-01-03T00:00:00Z",
          error: "Parse error",
        },
      ],
    });

    renderWithProviders(<DocumentsPanel projectId="proj-1" />);

    await waitFor(() => {
      expect(screen.getByText("chapter1.pdf")).toBeInTheDocument();
      expect(screen.getByText("chapter2.pdf")).toBeInTheDocument();
      expect(screen.getByText("chapter3.pdf")).toBeInTheDocument();
    });

    // Status badges
    expect(screen.getByText("INDEXED")).toBeInTheDocument();
    expect(screen.getByText("PROCESSING")).toBeInTheDocument();
    expect(screen.getByText("FAILED")).toBeInTheDocument();
  });

  it("upload button is enabled when project is selected", async () => {
    documentsApi.list.mockResolvedValue({ documents: [] });

    renderWithProviders(<DocumentsPanel projectId="proj-1" />);

    await waitFor(() => {
      const uploadBtn = screen.getByRole("button", { name: /upload pdf/i });
      expect(uploadBtn).not.toBeDisabled();
    });
  });
});
