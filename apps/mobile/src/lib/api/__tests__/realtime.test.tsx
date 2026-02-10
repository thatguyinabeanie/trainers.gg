import { renderHook, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  useRealtimeSubscription,
  useTournamentRealtime,
  useMatchRealtime,
  useNotificationsRealtime,
} from "../realtime";
import { getSupabase } from "../../supabase";
import type { RealtimeChannel } from "@supabase/supabase-js";

// Mock Supabase
jest.mock("../../supabase", () => ({
  getSupabase: jest.fn(),
}));

const mockGetSupabase = getSupabase as jest.MockedFunction<typeof getSupabase>;

describe("useRealtimeSubscription", () => {
  let queryClient: QueryClient;
  let mockChannel: jest.Mocked<RealtimeChannel>;
  let mockSupabase: {
    channel: jest.Mock;
    removeChannel: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Create mock channel
    mockChannel = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
    } as unknown as jest.Mocked<RealtimeChannel>;

    // Create mock Supabase client
    mockSupabase = {
      channel: jest.fn().mockReturnValue(mockChannel),
      removeChannel: jest.fn(),
    };

    mockGetSupabase.mockReturnValue(
      mockSupabase as unknown as ReturnType<typeof getSupabase>
    );
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it("should set up subscription on mount", async () => {
    renderHook(
      () =>
        useRealtimeSubscription(
          "test-channel",
          {
            event: "INSERT",
            schema: "public",
            table: "tournaments",
            filter: "status=eq.active",
          },
          () => [["tournaments"]]
        ),
      { wrapper }
    );

    await waitFor(() => {
      expect(mockSupabase.channel).toHaveBeenCalledWith("test-channel");
    });

    expect(mockChannel.on).toHaveBeenCalledWith(
      "postgres_changes",
      expect.objectContaining({
        event: "INSERT",
        schema: "public",
        table: "tournaments",
        filter: "status=eq.active",
      }),
      expect.any(Function)
    );

    expect(mockChannel.subscribe).toHaveBeenCalled();
  });

  it("should invalidate queries on change", async () => {
    let changeCallback: ((payload: unknown) => void) | undefined;

    mockChannel.on.mockImplementation((event, config, callback) => {
      changeCallback = callback;
      return mockChannel;
    });

    const invalidateQueriesSpy = jest.spyOn(queryClient, "invalidateQueries");

    renderHook(
      () =>
        useRealtimeSubscription(
          "test-channel",
          {
            event: "INSERT",
            schema: "public",
            table: "tournaments",
          },
          (payload) => [
            ["tournaments"],
            ["tournament", (payload.new as { id?: string })?.id ?? ""],
          ]
        ),
      { wrapper }
    );

    await waitFor(() => {
      expect(mockChannel.on).toHaveBeenCalled();
    });

    // Simulate INSERT event
    const newRecord = { id: "1", name: "New Tournament" };
    changeCallback?.({
      eventType: "INSERT",
      new: newRecord,
      old: null,
    });

    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ["tournaments"],
    });
    expect(invalidateQueriesSpy).toHaveBeenCalledWith({
      queryKey: ["tournament", "1"],
    });
  });

  it("should remove channel on unmount", async () => {
    const { unmount } = renderHook(
      () =>
        useRealtimeSubscription(
          "test-channel",
          {
            event: "INSERT",
            schema: "public",
            table: "tournaments",
          },
          () => [["tournaments"]]
        ),
      { wrapper }
    );

    await waitFor(() => {
      expect(mockChannel.subscribe).toHaveBeenCalled();
    });

    unmount();

    expect(mockSupabase.removeChannel).toHaveBeenCalledWith(mockChannel);
  });
});

describe("useTournamentRealtime", () => {
  let queryClient: QueryClient;
  let mockChannel: jest.Mocked<RealtimeChannel>;
  let mockSupabase: {
    channel: jest.Mock;
    removeChannel: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    queryClient = new QueryClient();
    mockChannel = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
    } as unknown as jest.Mocked<RealtimeChannel>;

    mockSupabase = {
      channel: jest.fn().mockReturnValue(mockChannel),
      removeChannel: jest.fn(),
    };

    mockGetSupabase.mockReturnValue(
      mockSupabase as unknown as ReturnType<typeof getSupabase>
    );
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it("should subscribe to tournament rounds", async () => {
    const tournamentId = "tournament-123";

    renderHook(() => useTournamentRealtime(tournamentId), { wrapper });

    await waitFor(() => {
      expect(mockSupabase.channel).toHaveBeenCalledWith(
        `tournament:${tournamentId}`
      );
    });

    expect(mockChannel.on).toHaveBeenCalledWith(
      "postgres_changes",
      expect.objectContaining({
        event: "*",
        schema: "public",
        table: "tournament_rounds",
        filter: `tournament_id=eq.${tournamentId}`,
      }),
      expect.any(Function)
    );
  });
});

describe("useMatchRealtime", () => {
  let queryClient: QueryClient;
  let mockChannel: jest.Mocked<RealtimeChannel>;
  let mockSupabase: {
    channel: jest.Mock;
    removeChannel: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    queryClient = new QueryClient();
    mockChannel = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
    } as unknown as jest.Mocked<RealtimeChannel>;

    mockSupabase = {
      channel: jest.fn().mockReturnValue(mockChannel),
      removeChannel: jest.fn(),
    };

    mockGetSupabase.mockReturnValue(
      mockSupabase as unknown as ReturnType<typeof getSupabase>
    );
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it("should subscribe to match games and updates", async () => {
    const matchId = "match-123";

    renderHook(() => useMatchRealtime(matchId), { wrapper });

    await waitFor(() => {
      expect(mockSupabase.channel).toHaveBeenCalled();
    });

    // Should create two subscriptions (games + match updates)
    expect(mockSupabase.channel).toHaveBeenCalledWith(`match:${matchId}`);
    expect(mockSupabase.channel).toHaveBeenCalledWith(
      `match:${matchId}:updates`
    );
  });
});

describe("useNotificationsRealtime", () => {
  let queryClient: QueryClient;
  let mockChannel: jest.Mocked<RealtimeChannel>;
  let mockSupabase: {
    channel: jest.Mock;
    removeChannel: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    queryClient = new QueryClient();
    mockChannel = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
    } as unknown as jest.Mocked<RealtimeChannel>;

    mockSupabase = {
      channel: jest.fn().mockReturnValue(mockChannel),
      removeChannel: jest.fn(),
    };

    mockGetSupabase.mockReturnValue(
      mockSupabase as unknown as ReturnType<typeof getSupabase>
    );
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it("should subscribe to notifications", async () => {
    renderHook(() => useNotificationsRealtime(), { wrapper });

    await waitFor(() => {
      expect(mockSupabase.channel).toHaveBeenCalledWith("notifications");
    });

    expect(mockChannel.on).toHaveBeenCalledWith(
      "postgres_changes",
      expect.objectContaining({
        event: "*",
        schema: "public",
        table: "notifications",
      }),
      expect.any(Function)
    );
  });
});
