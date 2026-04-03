import type React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockRefetch = jest.fn();

type MockQueryReturn = {
  data: unknown;
  isLoading: boolean;
  error: unknown;
  refetch: jest.Mock;
};

let mockStatsReturn: MockQueryReturn = {
  data: null,
  isLoading: false,
  error: null,
  refetch: mockRefetch,
};

let mockLogReturn: MockQueryReturn = {
  data: null,
  isLoading: false,
  error: null,
  refetch: mockRefetch,
};

// useSupabaseQuery is called twice: first for stats, second for log
let queryCallCount = 0;
jest.mock("@/lib/supabase", () => ({
  useSupabaseQuery: jest.fn(() => {
    queryCallCount += 1;
    return queryCallCount % 2 === 1 ? mockStatsReturn : mockLogReturn;
  }),
}));

jest.mock("@trainers/supabase", () => ({
  getAuditLog: jest.fn(),
  getAuditLogStats: jest.fn(),
}));

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

function setupQuery(
  statsData: unknown,
  logData: { data: unknown[]; count: number } | null,
  options: {
    statsLoading?: boolean;
    logLoading?: boolean;
    statsError?: unknown;
    logError?: unknown;
  } = {}
) {
  queryCallCount = 0;
  mockStatsReturn = {
    data: statsData,
    isLoading: options.statsLoading ?? false,
    error: options.statsError ?? null,
    refetch: mockRefetch,
  };
  mockLogReturn = {
    data: logData,
    isLoading: options.logLoading ?? false,
    error: options.logError ?? null,
    refetch: mockRefetch,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("ActivityTab", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupQuery(
      { total24h: 10, total7d: 70, total30d: 300 },
      { data: [], count: 0 }
    );
  });

  describe("stat cards", () => {
    it("renders 3 stat cards", () => {
      render(<ActivityTab />);
      expect(screen.getAllByTestId("card")).toHaveLength(3);
    });

    it("shows stat card titles", () => {
      render(<ActivityTab />);
      expect(screen.getByText("Last 24 Hours")).toBeInTheDocument();
      expect(screen.getByText("Last 7 Days")).toBeInTheDocument();
      expect(screen.getByText("Last 30 Days")).toBeInTheDocument();
    });

    it("shows stat values from query data", () => {
      render(<ActivityTab />);
      expect(screen.getByText("10")).toBeInTheDocument();
      expect(screen.getByText("70")).toBeInTheDocument();
      expect(screen.getByText("300")).toBeInTheDocument();
    });

    it("shows '0' when stats data is null", () => {
      setupQuery(null, { data: [], count: 0 });
      render(<ActivityTab />);
      // Three stat cards each show 0 when values are undefined
      const zeros = screen.getAllByText("0");
      expect(zeros.length).toBeGreaterThanOrEqual(3);
    });

    it("shows skeleton placeholders while stats are loading", () => {
      setupQuery(null, { data: [], count: 0 }, { statsLoading: true });
      render(<ActivityTab />);
      expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
    });
  });

  describe("error banner", () => {
    it("shows error banner when stats query errors", () => {
      setupQuery(null, { data: [], count: 0 }, { statsError: new Error("fail") });
      render(<ActivityTab />);
      expect(
        screen.getByText(/failed to load audit log data/i)
      ).toBeInTheDocument();
    });

    it("shows error banner when log query errors", () => {
      setupQuery(
        { total24h: 0, total7d: 0, total30d: 0 },
        null,
        { logError: new Error("fail") }
      );
      render(<ActivityTab />);
      expect(
        screen.getByText(/failed to load audit log data/i)
      ).toBeInTheDocument();
    });

    it("does not show error banner when queries succeed", () => {
      render(<ActivityTab />);
      expect(
        screen.queryByText(/failed to load audit log data/i)
      ).not.toBeInTheDocument();
    });
  });

  describe("table loading state", () => {
    it("shows skeleton rows while log is loading", () => {
      setupQuery(
        { total24h: 0, total7d: 0, total30d: 0 },
        null,
        { logLoading: true }
      );
      render(<ActivityTab />);
      // 8 skeleton rows are shown
      expect(screen.getAllByTestId("skeleton").length).toBeGreaterThan(0);
    });
  });

  describe("empty state", () => {
    it("shows 'No activity found' when there are no entries", () => {
      render(<ActivityTab />);
      expect(screen.getByText("No activity found")).toBeInTheDocument();
    });

    it("shows filter hint when filters are active", async () => {
      const user = userEvent.setup();
      render(<ActivityTab />);

      // Change the action filter from "all" to "match"
      const selects = screen.getAllByRole("combobox");
      await user.selectOptions(selects[0]!, "match");

      expect(
        screen.getByText(/try adjusting the filters/i)
      ).toBeInTheDocument();
    });

    it("does not show filter hint when no filters are active", () => {
      render(<ActivityTab />);
      expect(
        screen.queryByText(/try adjusting the filters/i)
      ).not.toBeInTheDocument();
    });
  });

  describe("table with entries", () => {
    it("renders log entries in the table", () => {
      setupQuery(
        { total24h: 5, total7d: 30, total30d: 100 },
        {
          data: [buildLogEntry({ action: "match.score_submitted" })],
          count: 1,
        }
      );
      render(<ActivityTab />);
      expect(screen.getByText("match.score_submitted")).toBeInTheDocument();
    });

    it("renders multiple log entries", () => {
      setupQuery(
        { total24h: 2, total7d: 5, total30d: 10 },
        {
          data: [
            buildLogEntry({ id: 1, action: "tournament.started" }),
            buildLogEntry({ id: 2, action: "admin.sudo_activated" }),
          ],
          count: 2,
        }
      );
      render(<ActivityTab />);
      expect(screen.getByText("tournament.started")).toBeInTheDocument();
      expect(screen.getByText("admin.sudo_activated")).toBeInTheDocument();
    });
  });

  describe("pagination", () => {
    it("does not show pagination when total pages is 1", () => {
      setupQuery(
        { total24h: 0, total7d: 0, total30d: 0 },
        { data: [], count: 0 }
      );
      render(<ActivityTab />);
      expect(
        screen.queryByRole("button", { name: /previous/i })
      ).not.toBeInTheDocument();
    });

    it("shows pagination when there are multiple pages", () => {
      setupQuery(
        { total24h: 0, total7d: 0, total30d: 0 },
        { data: [], count: 200 } // 200 entries with PAGE_SIZE=50 => 4 pages
      );
      render(<ActivityTab />);
      expect(
        screen.getByRole("button", { name: /previous/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole("button", { name: /next/i })
      ).toBeInTheDocument();
    });

    it("disables Previous button on first page", () => {
      setupQuery(
        { total24h: 0, total7d: 0, total30d: 0 },
        { data: [], count: 200 }
      );
      render(<ActivityTab />);
      expect(
        screen.getByRole("button", { name: /previous/i })
      ).toBeDisabled();
    });

    it("shows page info", () => {
      setupQuery(
        { total24h: 0, total7d: 0, total30d: 0 },
        { data: [], count: 200 }
      );
      render(<ActivityTab />);
      expect(screen.getByText(/page 1 of 4/i)).toBeInTheDocument();
    });

    it("advances page when Next is clicked", async () => {
      const user = userEvent.setup();
      setupQuery(
        { total24h: 0, total7d: 0, total30d: 0 },
        { data: [], count: 200 }
      );
      render(<ActivityTab />);

      await user.click(screen.getByRole("button", { name: /next/i }));
      expect(screen.getByText(/page 2 of 4/i)).toBeInTheDocument();
    });
  });

  describe("refresh button", () => {
    it("calls refetch when Refresh is clicked", async () => {
      const user = userEvent.setup();
      render(<ActivityTab />);

      await user.click(screen.getByRole("button", { name: /refresh/i }));
      expect(mockRefetch).toHaveBeenCalled();
    });
  });

  describe("filter controls", () => {
    it("resets page to 0 when action filter changes", async () => {
      const user = userEvent.setup();
      setupQuery(
        { total24h: 0, total7d: 0, total30d: 0 },
        { data: [], count: 200 }
      );
      render(<ActivityTab />);

      // Go to page 2
      await user.click(screen.getByRole("button", { name: /next/i }));
      expect(screen.getByText(/page 2 of 4/i)).toBeInTheDocument();

      // Change action filter — should reset to page 1
      const selects = screen.getAllByRole("combobox");
      await user.selectOptions(selects[0]!, "match");
      expect(screen.getByText(/page 1/i)).toBeInTheDocument();
    });

    it("resets page to 0 when entity filter changes", async () => {
      const user = userEvent.setup();
      setupQuery(
        { total24h: 0, total7d: 0, total30d: 0 },
        { data: [], count: 200 }
      );
      render(<ActivityTab />);

      await user.click(screen.getByRole("button", { name: /next/i }));
      expect(screen.getByText(/page 2 of 4/i)).toBeInTheDocument();

      const selects = screen.getAllByRole("combobox");
      await user.selectOptions(selects[1]!, "tournament");
      expect(screen.getByText(/page 1/i)).toBeInTheDocument();
    });
  });
});
