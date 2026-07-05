import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProjectsPanel } from "@/features/projects/components/ProjectsPanel";

// Integration: exercises the full projects read path together —
// ProjectsPanel -> useProjects -> projectsApi -> httpClient -> fetch.
// Only the network boundary (fetch) is stubbed; every layer above it runs for real.

const PROJECTS = [
  { id: "p1", name: "Biology 101", createdAt: "2026-01-01T00:00:00.000Z" },
  { id: "p2", name: "Organic Chemistry", createdAt: "2026-01-02T00:00:00.000Z" },
];

let fetchMock: jest.Mock;

beforeEach(() => {
  fetchMock = jest.fn((input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/projects")) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ projects: PROJECTS }),
      });
    }
    // Any incidental call (e.g. documents once a project auto-selects)
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ documents: [] }),
    });
  });
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  localStorage.clear();
});

afterEach(() => {
  jest.restoreAllMocks();
});

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe("Projects read path (integration)", () => {
  it("fetches projects from the API and renders them in the list", async () => {
    renderWithProviders(<ProjectsPanel />);

    // Both projects returned by the API make it all the way to the rendered list.
    expect(await screen.findByText("Biology 101")).toBeInTheDocument();
    expect(screen.getByText("Organic Chemistry")).toBeInTheDocument();

    // The request went to the projects endpoint with the auth header injected by httpClient.
    const [, init] = fetchMock.mock.calls.find(([u]) =>
      String(u).includes("/projects"),
    )!;
    expect(String(fetchMock.mock.calls[0][0])).toContain("/projects");
    expect((init as RequestInit).headers).toMatchObject({ "x-user-id": expect.any(String) });
  });

  it("shows the empty state when the API returns no projects", async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ projects: [] }),
      }),
    );

    renderWithProviders(<ProjectsPanel />);

    expect(
      await screen.findByText("Create your first project to get started."),
    ).toBeInTheDocument();
  });

  it("renders the error state when the projects request fails", async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        statusText: "Internal Server Error",
        json: () => Promise.resolve({ message: "boom" }),
      }),
    );

    renderWithProviders(<ProjectsPanel />);

    // useProjects retries twice with backoff before surfacing the error,
    // so allow more time than findByText's 1s default.
    expect(
      await screen.findByText("Failed to load projects", {}, { timeout: 6000 }),
    ).toBeInTheDocument();
  }, 10000); // jest per-test timeout must exceed the findByText wait above
});
