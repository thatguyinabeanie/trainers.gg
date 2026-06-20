import type React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ── Mocks ──────────────────────────────────────────────────────────────────

// ActivityTab now fetches via HTTP routes (/api/v1/admin/audit-log[/stats])
// rather than calling @trainers/supabase functions directly in the browser.
// Mock global.fetch so tests control both response shapes without a network.

/** Builds a minimal Response-like object for fetch mocks. */
function makeResponse(body: unknown, ok = true): Response {
  return {
    ok,
    status: ok ? 200 : 500,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

// Separate response factories — tests override these to customise per-scenario.
const mockGetAuditLogStats = jest.fn<Promise<Response>, []>();
const mockGetAuditLog = jest.fn<Promise<Response>, [RequestInfo | URL]>();

// Route fetch() calls to the right mock based on URL.
global.fetch = jest.fn((input: RequestInfo | URL): Promise<Response> => {
  const url = typeof input === "string" ? input : input.toString();
  if (url.includes("/stats")) {
    return mockGetAuditLogStats();
  }
  return mockGetAuditLog(input);
}) as unknown as typeof global.fetch;

jest.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card">{children}</div>
  ),
  CardContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardHeader: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  CardTitle: ({ children }: { children: React.ReactNode }) => (
    <h3>{children}</h3>
  ),
}));

jest.mock("@/components/ui/skeleton", () => ({
  Skeleton: ({ className }: { className?: string }) => (
    <div data-testid="skeleton" className={className} />
  ),
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    disabled,
    onClick,
    ...props
  }: React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: string;
    size?: string;
  }) => (
    <button disabled={disabled} onClick={onClick} {...props}>
      {children}
    </button>
  ),
}));

jest.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    onValueChange,
    value,
  }: {
    children: React.ReactNode;
    value?: string;
    onValueChange?: (v: string | null) => void;
  }) => (
    <div>
      <select
        value={value}
        onChange={(e) => onValueChange?.(e.target.value)}
        data-testid={`select-${value}`}
      >
        {children}
      </select>
    </div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  SelectItem: ({
    value,
    children,
  }: {
    value: string;
    children: React.ReactNode;
  }) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <option value="">{placeholder}</option>
  ),
}));

jest.mock("@/components/ui/table", () => ({
  Table: ({ children }: { children: React.ReactNode }) => (
    <table>{children}</table>
  ),
  TableHeader: ({ children }: { children: React.ReactNode }) => (
    <thead>{children}</thead>
  ),
  TableBody: ({ children }: { children: React.ReactNode }) => (
    <tbody>{children}</tbody>
  ),
  TableRow: ({ children }: { children: React.ReactNode }) => (
    <tr>{children}</tr>
  ),
  TableHead: ({ children }: { children: React.ReactNode }) => (
    <th>{children}</th>
  ),
  TableCell: ({
    children,
    colSpan,
  }: {
    children: React.ReactNode;
    colSpan?: number;
    className?: string;
  }) => <td colSpan={colSpan}>{children}</td>,
}));

jest.mock("@/components/ui/badge", () => ({
  Badge: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
    variant?: string;
  }) => <span className={className}>{children}</span>,
}));

// Mock the activity/columns module — columns are complex JSX, stub them out
jest.mock("../activity/columns", () => ({
  columns: [
    {
      accessorKey: "created_at",
      header: "Time",
      cell: ({ row }: { row: { original: { created_at: string } } }) =>
        row.original.created_at,
    },
    {
      accessorKey: "action",
      header: "Action",
      cell: ({ row }: { row: { original: { action: string } } }) =>
        row.original.action,
    },
    {
      accessorKey: "actor_user",
      header: "Actor",
      cell: () => "actor",
    },
    {
      id: "details",
      header: "Details",
      cell: () => "-",
    },
    {
      id: "entity",
      header: "Entity",
      cell: () => "-",
    },
  ],
}));

import { ActivityTab } from "../activity-tab";

// ── Helpers ────────────────────────────────────────────────────────────────

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  }
  return Wrapper;
}

function buildLogEntry(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    action: "match.score_submitted",
    actor_user_id: "user-1",
    actor_alt_id: null,
    tournament_id: null,
    match_id: 42,
    game_id: null,
    community_id: null,
    metadata: null,
    created_at: "2026-04-01T10:00:00Z",
    actor_user: {
      id: "user-1",
      username: "ash_ketchum",
      first_name: "Ash",
      last_name: null,
      image: null,
    },
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("ActivityTab", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Default: stats resolved with known values, log resolved empty.
    // mockGetAuditLogStats / mockGetAuditLog return Response objects so that
    // the component's `fetch().then(r => r.json())` chain resolves correctly.
    mockGetAuditLogStats.mockResolvedValue(
      makeResponse({ total24h: 10, total7d: 70, total30d: 300 })
    );
    mockGetAuditLog.mockResolvedValue(makeResponse({ data: [], count: 0 }));
  });

  describe("stat cards", () => {
    it("renders 3 stat cards", async () => {
      render(<ActivityTab />, { wrapper: createWrapper() });
      expect(await screen.findAllByTestId("card")).toHaveLength(3);
    });

    it("shows stat card titles", async () => {
      render(<ActivityTab />, { wrapper: createWrapper() });
      expect(await screen.findByText("Last 24 Hours")).toBeInTheDocument();
      expect(screen.getByText("Last 7 Days")).toBeInTheDocument();
      expect(screen.getByText("Last 30 Days")).toBeInTheDocument();
    });

    it("shows stat values from query data", async () => {
      render(<ActivityTab />, { wrapper: createWrapper() });
      expect(await screen.findByText("10")).toBeInTheDocument();
      expect(screen.getByText("70")).toBeInTheDocument();
      expect(screen.getByText("300")).toBeInTheDocument();
    });

    it("shows '0' when stats data resolves to null-ish fields", async () => {
      mockGetAuditLogStats.mockResolvedValue(
        makeResponse({ total24h: 0, total7d: 0, total30d: 0 })
      );
      render(<ActivityTab />, { wrapper: createWrapper() });
      const zeros = await screen.findAllByText("0");
      expect(zeros.length).toBeGreaterThanOrEqual(3);
    });

    it("shows skeleton placeholders while queries are loading", () => {
      // Never resolving — stays in loading state
      mockGetAuditLogStats.mockReturnValue(new Promise(() => {}));
      mockGetAuditLog.mockReturnValue(new Promise(() => {}));
      render(<ActivityTab />, { wrapper: createWrapper() });
      expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
    });
  });

  describe("error banner", () => {
    it("shows error banner when stats query rejects", async () => {
      // fetchAuditLogStats throws when fetch() rejects (network error) or !res.ok
      mockGetAuditLogStats.mockResolvedValue(makeResponse(null, false));
      render(<ActivityTab />, { wrapper: createWrapper() });
      expect(
        await screen.findByText(/failed to load audit log data/i)
      ).toBeInTheDocument();
    });

    it("shows error banner when log query rejects", async () => {
      mockGetAuditLog.mockResolvedValue(makeResponse(null, false));
      render(<ActivityTab />, { wrapper: createWrapper() });
      expect(
        await screen.findByText(/failed to load audit log data/i)
      ).toBeInTheDocument();
    });

    it("does not show error banner when queries succeed", async () => {
      render(<ActivityTab />, { wrapper: createWrapper() });
      // Wait for data to load
      await screen.findByText("10");
      expect(
        screen.queryByText(/failed to load audit log data/i)
      ).not.toBeInTheDocument();
    });
  });

  describe("empty state", () => {
    it("shows 'No activity found' when there are no entries", async () => {
      render(<ActivityTab />, { wrapper: createWrapper() });
      expect(await screen.findByText("No activity found")).toBeInTheDocument();
    });

    it("shows filter hint when filters are active", async () => {
      const user = userEvent.setup();
      render(<ActivityTab />, { wrapper: createWrapper() });

      // Wait for component to settle
      await screen.findByText("No activity found");

      // Change the action filter from "all" to "match"
      const selects = screen.getAllByRole("combobox");
      await user.selectOptions(selects[0]!, "match");

      expect(
        screen.getByText(/try adjusting the filters/i)
      ).toBeInTheDocument();
    });

    it("does not show filter hint when no filters are active", async () => {
      render(<ActivityTab />, { wrapper: createWrapper() });
      await screen.findByText("No activity found");
      expect(
        screen.queryByText(/try adjusting the filters/i)
      ).not.toBeInTheDocument();
    });
  });

  describe("table with entries", () => {
    it("renders log entries in the table", async () => {
      mockGetAuditLog.mockResolvedValue(
        makeResponse({
          data: [buildLogEntry({ action: "match.score_submitted" })],
          count: 1,
        })
      );
      render(<ActivityTab />, { wrapper: createWrapper() });
      expect(
        await screen.findByText("match.score_submitted")
      ).toBeInTheDocument();
    });

    it("renders multiple log entries", async () => {
      mockGetAuditLog.mockResolvedValue(
        makeResponse({
          data: [
            buildLogEntry({ id: 1, action: "tournament.started" }),
            buildLogEntry({ id: 2, action: "admin.sudo_activated" }),
          ],
          count: 2,
        })
      );
      render(<ActivityTab />, { wrapper: createWrapper() });
      expect(await screen.findByText("tournament.started")).toBeInTheDocument();
      expect(screen.getByText("admin.sudo_activated")).toBeInTheDocument();
    });
  });

  describe("pagination", () => {
    it("does not show pagination when total pages is 1", async () => {
      render(<ActivityTab />, { wrapper: createWrapper() });
      await screen.findByText("No activity found");
      expect(
        screen.queryByRole("button", { name: /previous/i })
      ).not.toBeInTheDocument();
    });

    it("shows pagination when there are multiple pages", async () => {
      mockGetAuditLog.mockResolvedValue(makeResponse({ data: [], count: 200 })); // 4 pages
      render(<ActivityTab />, { wrapper: createWrapper() });
      expect(
        await screen.findByRole("button", { name: /previous/i })
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
    });

    it("disables Previous button on first page", async () => {
      mockGetAuditLog.mockResolvedValue(makeResponse({ data: [], count: 200 }));
      render(<ActivityTab />, { wrapper: createWrapper() });
      expect(
        await screen.findByRole("button", { name: /previous/i })
      ).toBeDisabled();
    });

    it("shows page info", async () => {
      mockGetAuditLog.mockResolvedValue(makeResponse({ data: [], count: 200 }));
      render(<ActivityTab />, { wrapper: createWrapper() });
      expect(await screen.findByText(/page 1 of 4/i)).toBeInTheDocument();
    });

    it("advances page when Next is clicked", async () => {
      mockGetAuditLog.mockResolvedValue(makeResponse({ data: [], count: 200 }));
      const user = userEvent.setup();
      render(<ActivityTab />, { wrapper: createWrapper() });

      await screen.findByRole("button", { name: /next/i });
      await user.click(screen.getByRole("button", { name: /next/i }));
      expect(await screen.findByText(/page 2 of 4/i)).toBeInTheDocument();
    });
  });

  describe("refresh button", () => {
    it("calls query fns again when Refresh is clicked", async () => {
      const user = userEvent.setup();
      render(<ActivityTab />, { wrapper: createWrapper() });

      await screen.findByText("10");
      // Count how many times the stats endpoint was fetched before refresh
      const callsBefore = mockGetAuditLogStats.mock.calls.length;

      await user.click(screen.getByRole("button", { name: /refresh/i }));

      // Refresh bumps the query key (refreshKey) which forces a new fetch
      expect(mockGetAuditLogStats.mock.calls.length).toBeGreaterThan(
        callsBefore
      );
    });
  });

  describe("filter controls", () => {
    it("resets page to 0 when action filter changes", async () => {
      mockGetAuditLog.mockResolvedValue(makeResponse({ data: [], count: 200 }));
      const user = userEvent.setup();
      render(<ActivityTab />, { wrapper: createWrapper() });

      await screen.findByRole("button", { name: /next/i });
      await user.click(screen.getByRole("button", { name: /next/i }));
      expect(await screen.findByText(/page 2 of 4/i)).toBeInTheDocument();

      // Change action filter — should reset to page 1
      const selects = screen.getAllByRole("combobox");
      await user.selectOptions(selects[0]!, "match");
      expect(screen.getByText(/page 1/i)).toBeInTheDocument();
    });

    it("resets page to 0 when entity filter changes", async () => {
      mockGetAuditLog.mockResolvedValue(makeResponse({ data: [], count: 200 }));
      const user = userEvent.setup();
      render(<ActivityTab />, { wrapper: createWrapper() });

      await screen.findByRole("button", { name: /next/i });
      await user.click(screen.getByRole("button", { name: /next/i }));
      expect(await screen.findByText(/page 2 of 4/i)).toBeInTheDocument();

      const selects = screen.getAllByRole("combobox");
      await user.selectOptions(selects[1]!, "tournament");
      expect(screen.getByText(/page 1/i)).toBeInTheDocument();
    });
  });
});
