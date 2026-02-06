import type { ReactNode } from "react";
import { render, screen } from "@testing-library/react";
import { Providers } from "../providers";

// Mock dependencies
jest.mock("@/components/auth/auth-provider", () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => (
    <div data-testid="auth-provider">{children}</div>
  ),
}));

jest.mock("next-themes", () => ({
  ThemeProvider: ({ children }: { children: ReactNode }) => (
    <div data-testid="theme-provider">{children}</div>
  ),
}));

// Mock QueryClientProvider
jest.mock("@tanstack/react-query", () => ({
  QueryClient: jest.fn().mockImplementation(() => ({
    getQueryCache: jest.fn(),
    getMutationCache: jest.fn(),
    mount: jest.fn(),
    unmount: jest.fn(),
  })),
  QueryClientProvider: ({ children }: { children: ReactNode }) => (
    <div data-testid="query-client-provider">{children}</div>
  ),
}));

describe("Providers", () => {
  it("renders children", () => {
    render(
      <Providers>
        <div>Test Child</div>
      </Providers>
    );

    expect(screen.getByText("Test Child")).toBeInTheDocument();
  });

  it("wraps children with QueryClientProvider", () => {
    render(
      <Providers>
        <div>Test Child</div>
      </Providers>
    );

    expect(screen.getByTestId("query-client-provider")).toBeInTheDocument();
  });

  it("wraps children with AuthProvider", () => {
    render(
      <Providers>
        <div>Test Child</div>
      </Providers>
    );

    expect(screen.getByTestId("auth-provider")).toBeInTheDocument();
  });

  it("wraps children with ThemeProvider", () => {
    render(
      <Providers>
        <div>Test Child</div>
      </Providers>
    );

    expect(screen.getByTestId("theme-provider")).toBeInTheDocument();
  });

  it("nests providers in correct order: Query -> Auth -> Theme", () => {
    render(
      <Providers>
        <div>Test Child</div>
      </Providers>
    );

    const queryProvider = screen.getByTestId("query-client-provider");
    const authProvider = screen.getByTestId("auth-provider");
    const themeProvider = screen.getByTestId("theme-provider");

    // QueryClientProvider should contain AuthProvider
    expect(queryProvider).toContainElement(authProvider);

    // AuthProvider should contain ThemeProvider
    expect(authProvider).toContainElement(themeProvider);

    // ThemeProvider should contain the child
    expect(themeProvider).toContainElement(screen.getByText("Test Child"));
  });

  it("renders multiple children correctly", () => {
    render(
      <Providers>
        <div>First Child</div>
        <div>Second Child</div>
        <div>Third Child</div>
      </Providers>
    );

    expect(screen.getByText("First Child")).toBeInTheDocument();
    expect(screen.getByText("Second Child")).toBeInTheDocument();
    expect(screen.getByText("Third Child")).toBeInTheDocument();
  });

  it("handles complex child components", () => {
    const ComplexChild = () => (
      <div>
        <h1>Complex Child</h1>
        <p>With nested elements</p>
        <button>Click me</button>
      </div>
    );

    render(
      <Providers>
        <ComplexChild />
      </Providers>
    );

    expect(screen.getByText("Complex Child")).toBeInTheDocument();
    expect(screen.getByText("With nested elements")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Click me" })
    ).toBeInTheDocument();
  });

  it("does not render anything extra besides providers and children", () => {
    const { container } = render(
      <Providers>
        <div data-testid="child">Test Child</div>
      </Providers>
    );

    // Should only have provider wrappers and the child
    const providers = container.querySelectorAll("[data-testid]");
    expect(providers).toHaveLength(4); // query-client, auth, theme, child
  });
});

// Test QueryClient configuration in a separate describe block
describe("Providers QueryClient configuration", () => {
  let QueryClientMock: jest.Mock;

  beforeEach(() => {
    // Re-import to get fresh mock
    jest.resetModules();
    QueryClientMock = jest.fn().mockImplementation(() => ({
      getQueryCache: jest.fn(),
      getMutationCache: jest.fn(),
      mount: jest.fn(),
      unmount: jest.fn(),
    }));

    jest.doMock("@tanstack/react-query", () => ({
      QueryClient: QueryClientMock,
      QueryClientProvider: ({ children }: { children: ReactNode }) => (
        <div data-testid="query-client-provider">{children}</div>
      ),
    }));
  });

  it("creates QueryClient with correct default options", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Providers: FreshProviders } = require("../providers");

    render(
      <FreshProviders>
        <div>Test</div>
      </FreshProviders>
    );

    expect(QueryClientMock).toHaveBeenCalledWith({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000, // 1 minute
          refetchOnWindowFocus: false,
        },
      },
    });
  });
});

describe("Providers client behavior", () => {
  it("renders children in client environment", () => {
    render(
      <Providers>
        <div>Client Rendered</div>
      </Providers>
    );

    expect(screen.getByText("Client Rendered")).toBeInTheDocument();
  });

  it("provides query client to children", () => {
    const TestComponent = () => {
      return <div>Test with Query Client</div>;
    };

    render(
      <Providers>
        <TestComponent />
      </Providers>
    );

    expect(screen.getByText("Test with Query Client")).toBeInTheDocument();
    expect(screen.getByTestId("query-client-provider")).toBeInTheDocument();
  });
});
