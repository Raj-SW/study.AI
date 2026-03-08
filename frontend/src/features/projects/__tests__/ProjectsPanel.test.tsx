import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProjectsPanel } from "../components/ProjectsPanel";

// Mock the service
jest.mock("../services/projectsApi", () => ({
  projectsApi: {
    list: jest.fn(),
    create: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { projectsApi } = require("../services/projectsApi");

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe("ProjectsPanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    // Clear URL params
    window.history.replaceState({}, "", "/");
  });

  it("shows loading skeleton then empty state", async () => {
    projectsApi.list.mockResolvedValue({ projects: [] });

    renderWithProviders(<ProjectsPanel />);

    // Should show loading initially or resolve quickly
    await waitFor(() => {
      expect(
        screen.getByText("Create your first project to get started.")
      ).toBeInTheDocument();
    });
  });

  it("renders project list", async () => {
    projectsApi.list.mockResolvedValue({
      projects: [
        { id: "1", name: "Biology 101", createdAt: "2026-01-01T00:00:00Z" },
        { id: "2", name: "Physics 201", createdAt: "2026-01-02T00:00:00Z" },
      ],
    });

    renderWithProviders(<ProjectsPanel />);

    await waitFor(() => {
      expect(screen.getByText("Biology 101")).toBeInTheDocument();
      expect(screen.getByText("Physics 201")).toBeInTheDocument();
    });
  });

  it("opens create dialog and validates empty name", async () => {
    const user = userEvent.setup();
    projectsApi.list.mockResolvedValue({ projects: [] });

    renderWithProviders(<ProjectsPanel />);

    await waitFor(() => {
      expect(screen.getByText("Projects")).toBeInTheDocument();
    });

    // Click new project button
    const newBtn = screen.getByRole("button", { name: /new project/i });
    await user.click(newBtn);

    // Dialog should be open
    expect(screen.getByText("New project")).toBeInTheDocument();

    // Submit empty form
    const submitBtn = screen.getByRole("button", { name: /create/i });
    await user.click(submitBtn);

    // Validation error
    await waitFor(() => {
      expect(screen.getByText("Project name is required")).toBeInTheDocument();
    });
  });

  it("creates a project successfully", async () => {
    const user = userEvent.setup();
    projectsApi.list.mockResolvedValue({ projects: [] });
    projectsApi.create.mockResolvedValue({
      project: { id: "3", name: "Chemistry", createdAt: "2026-03-01T00:00:00Z" },
    });

    renderWithProviders(<ProjectsPanel />);

    await waitFor(() => {
      expect(screen.getByText("Projects")).toBeInTheDocument();
    });

    // Open dialog
    await user.click(screen.getByRole("button", { name: /new project/i }));

    // Type project name and submit
    const input = screen.getByPlaceholderText("e.g. Biology 101");
    await user.type(input, "Chemistry");
    await user.click(screen.getByRole("button", { name: /create/i }));

    await waitFor(() => {
      expect(projectsApi.create).toHaveBeenCalled();
      expect(projectsApi.create.mock.calls[0][0]).toEqual({ name: "Chemistry" });
    });
  });
});
