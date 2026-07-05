import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "../App";

// Mock fetch globally
beforeEach(() => {
  globalThis.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ projects: [] }),
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
}

describe("App", () => {
  it("renders the header with app title", () => {
    renderWithProviders(<App />);
    expect(screen.getByText("Study Copilot")).toBeInTheDocument();
  });

  it("renders the chat empty state", () => {
    renderWithProviders(<App />);
    expect(
      screen.getByText("Select a project to start chatting")
    ).toBeInTheDocument();
  });

  it("shows the Projects heading in the sidebar", () => {
    renderWithProviders(<App />);
    expect(screen.getByText("Projects")).toBeInTheDocument();
  });
});
