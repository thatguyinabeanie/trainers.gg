import { render, screen } from "@testing-library/react";
import {
  ViewerAvatars,
  TypingIndicator,
  useMatchPresence,
} from "../presence-indicator";
import { useSupabase } from "@/lib/supabase";
import { renderHook, act } from "@testing-library/react";

// ===========================================================================
// Mock setup
// ===========================================================================

jest.mock("@/lib/supabase", () => ({
  useSupabase: jest.fn(),
}));

function buildMockChannel() {
  const channel: Record<string, jest.Mock> = {
    on: jest.fn(),
    subscribe: jest.fn(),
    track: jest.fn(),
    send: jest.fn(),
    presenceState: jest.fn().mockReturnValue({}),
  };
  // Make .on() and .subscribe() chainable
  channel.on.mockReturnValue(channel);
  channel.subscribe.mockReturnValue(channel);
  channel.track.mockResolvedValue(undefined);
  channel.send.mockResolvedValue(undefined);
  return channel;
}

const mockRemoveChannel = jest.fn();

function buildMockSupabase(overrideChannel?: ReturnType<typeof buildMockChannel>) {
  const ch = overrideChannel ?? buildMockChannel();
  return {
    channel: jest.fn().mockReturnValue(ch),
    removeChannel: mockRemoveChannel,
    _channel: ch,
  };
}

// ===========================================================================
// ViewerAvatars
// ===========================================================================

describe("ViewerAvatars", () => {
  const viewers = [
    {
      username: "ash",
      displayName: "Ash Ketchum",
      isStaff: false,
      isParticipant: true,
      isTyping: false,
    },
    {
      username: "misty",
      displayName: "Misty",
      isStaff: false,
      isParticipant: true,
      isTyping: false,
    },
    {
      username: "brock",
      displayName: null,
      isStaff: true,
      isParticipant: false,
      isTyping: false,
    },
  ];

  it("renders nothing when viewers list is empty", () => {
    const { container } = render(
      <ViewerAvatars viewers={[]} currentUsername="ash" />
    );
    expect(container.innerHTML).toBe("");
  });

  it("shows 'Only you' when current user is the only viewer", () => {
    render(
      <ViewerAvatars
        viewers={[viewers[0]!]}
        currentUsername="ash"
      />
    );
    expect(screen.getByText("Only you")).toBeInTheDocument();
  });

  it("shows '<name> + you' when exactly one other viewer is present", () => {
    render(
      <ViewerAvatars
        viewers={[viewers[0]!, viewers[1]!]}
        currentUsername="ash"
      />
    );
    expect(screen.getByText(/Misty \+ you/)).toBeInTheDocument();
  });

  it("shows '<count> others + you' when multiple other viewers are present", () => {
    render(
      <ViewerAvatars
        viewers={viewers}
        currentUsername="ash"
      />
    );
    expect(screen.getByText(/2 others \+ you/)).toBeInTheDocument();
  });

  it("falls back to username when displayName is null for the single other viewer", () => {
    render(
      <ViewerAvatars
        viewers={[viewers[0]!, viewers[2]!]}
        currentUsername="ash"
      />
    );
    // brock has no displayName, should show username
    expect(screen.getByText(/brock \+ you/)).toBeInTheDocument();
  });

  it("renders an avatar for each viewer (up to 5)", () => {
    // 6 viewers — only first 5 should be rendered
    const manyViewers = Array.from({ length: 6 }, (_, i) => ({
      username: `player${i}`,
      displayName: `Player ${i}`,
      isStaff: false,
      isParticipant: true,
      isTyping: false,
    }));

    const { container } = render(
      <ViewerAvatars viewers={manyViewers} currentUsername={null} />
    );

    // Each avatar renders an element with role="img" fallback (AvatarFallback)
    // but the slice(0,5) means only 5 avatars are in the DOM
    // We can count avatar containers by the ring class
    const avatars = container.querySelectorAll(".ring-2");
    expect(avatars.length).toBe(5);
  });
});

// ===========================================================================
// TypingIndicator
// ===========================================================================

describe("TypingIndicator", () => {
  it("renders nothing when typingUsers is empty", () => {
    const { container } = render(<TypingIndicator typingUsers={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("shows '<name> is typing' for a single user", () => {
    render(<TypingIndicator typingUsers={["Ash"]} />);
    expect(screen.getByText(/Ash is typing/)).toBeInTheDocument();
  });

  it("shows '<a> and <b> are typing' for two users", () => {
    render(<TypingIndicator typingUsers={["Ash", "Misty"]} />);
    expect(screen.getByText(/Ash and Misty are typing/)).toBeInTheDocument();
  });

  it("shows only first two names when more than two users are typing", () => {
    render(<TypingIndicator typingUsers={["Ash", "Misty", "Brock"]} />);
    // slice(0,2).join(" and ")
    expect(screen.getByText(/Ash and Misty are typing/)).toBeInTheDocument();
  });

  it("applies className to the container", () => {
    const { container } = render(
      <TypingIndicator typingUsers={["Ash"]} className="test-class" />
    );
    expect(container.firstChild).toHaveClass("test-class");
  });

  it("renders the three animated dots", () => {
    const { container } = render(<TypingIndicator typingUsers={["Ash"]} />);
    const dots = container.querySelectorAll(".animate-bounce");
    expect(dots.length).toBe(3);
  });
});

// ===========================================================================
// useMatchPresence hook
// ===========================================================================

describe("useMatchPresence", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRemoveChannel.mockReset();
  });

  it("does not subscribe when username is null", () => {
    const mockSupabase = buildMockSupabase();
    (useSupabase as jest.Mock).mockReturnValue(mockSupabase);

    renderHook(() =>
      useMatchPresence({
        matchId: 1,
        username: null,
        displayName: null,
        isStaff: false,
        isParticipant: true,
      })
    );

    expect(mockSupabase.channel).not.toHaveBeenCalled();
  });

  it("subscribes to presence channel when username is provided", () => {
    const ch = buildMockChannel();
    const mockSupabase = buildMockSupabase(ch);
    (useSupabase as jest.Mock).mockReturnValue(mockSupabase);

    renderHook(() =>
      useMatchPresence({
        matchId: 42,
        username: "ash",
        displayName: "Ash",
        isStaff: false,
        isParticipant: true,
      })
    );

    expect(mockSupabase.channel).toHaveBeenCalledWith("match-presence-42");
    expect(ch.on).toHaveBeenCalledWith(
      "presence",
      { event: "sync" },
      expect.any(Function)
    );
    expect(ch.subscribe).toHaveBeenCalled();
  });

  it("registers a broadcast listener for judge-request events", () => {
    const ch = buildMockChannel();
    const mockSupabase = buildMockSupabase(ch);
    (useSupabase as jest.Mock).mockReturnValue(mockSupabase);

    renderHook(() =>
      useMatchPresence({
        matchId: 1,
        username: "ash",
        displayName: "Ash",
        isStaff: false,
        isParticipant: true,
      })
    );

    expect(ch.on).toHaveBeenCalledWith(
      "broadcast",
      { event: "judge-request" },
      expect.any(Function)
    );
  });

  it("calls onJudgeRequest when a judge-request broadcast arrives", () => {
    const ch = buildMockChannel();
    const mockSupabase = buildMockSupabase(ch);
    (useSupabase as jest.Mock).mockReturnValue(mockSupabase);

    const onJudgeRequest = jest.fn();

    renderHook(() =>
      useMatchPresence({
        matchId: 1,
        username: "ash",
        displayName: "Ash",
        isStaff: false,
        isParticipant: true,
        onJudgeRequest,
      })
    );

    // Grab the broadcast handler that was registered
    const broadcastCall = (ch.on as jest.Mock).mock.calls.find(
      (call) => call[0] === "broadcast"
    );
    const broadcastHandler = broadcastCall![2] as (arg: { payload: { requested: boolean } }) => void;

    act(() => {
      broadcastHandler({ payload: { requested: true } });
    });

    expect(onJudgeRequest).toHaveBeenCalledWith(true);
  });

  it("does not call onJudgeRequest when payload.requested is not a boolean", () => {
    const ch = buildMockChannel();
    const mockSupabase = buildMockSupabase(ch);
    (useSupabase as jest.Mock).mockReturnValue(mockSupabase);

    const onJudgeRequest = jest.fn();

    renderHook(() =>
      useMatchPresence({
        matchId: 1,
        username: "ash",
        displayName: "Ash",
        isStaff: false,
        isParticipant: true,
        onJudgeRequest,
      })
    );

    const broadcastCall = (ch.on as jest.Mock).mock.calls.find(
      (call) => call[0] === "broadcast"
    );
    const broadcastHandler = broadcastCall![2] as (arg: { payload: unknown }) => void;

    act(() => {
      broadcastHandler({ payload: { requested: "yes" } });
    });

    expect(onJudgeRequest).not.toHaveBeenCalled();
  });

  it("calls removeChannel on unmount", () => {
    const ch = buildMockChannel();
    const mockSupabase = buildMockSupabase(ch);
    (useSupabase as jest.Mock).mockReturnValue(mockSupabase);

    const { unmount } = renderHook(() =>
      useMatchPresence({
        matchId: 1,
        username: "ash",
        displayName: "Ash",
        isStaff: false,
        isParticipant: true,
      })
    );

    unmount();

    expect(mockRemoveChannel).toHaveBeenCalledWith(ch);
  });

  it("returns setTyping and broadcastJudgeRequest functions", () => {
    const ch = buildMockChannel();
    const mockSupabase = buildMockSupabase(ch);
    (useSupabase as jest.Mock).mockReturnValue(mockSupabase);

    const { result } = renderHook(() =>
      useMatchPresence({
        matchId: 1,
        username: "ash",
        displayName: "Ash",
        isStaff: false,
        isParticipant: true,
      })
    );

    expect(typeof result.current.setTyping).toBe("function");
    expect(typeof result.current.broadcastJudgeRequest).toBe("function");
    expect(Array.isArray(result.current.viewers)).toBe(true);
    expect(Array.isArray(result.current.typingUsers)).toBe(true);
  });

  it("updates viewers from presence sync event", () => {
    const ch = buildMockChannel();
    const mockSupabase = buildMockSupabase(ch);
    (useSupabase as jest.Mock).mockReturnValue(mockSupabase);

    const presenceEntry = {
      username: "misty",
      displayName: "Misty",
      isStaff: false,
      isParticipant: true,
      isTyping: false,
    };

    ch.presenceState.mockReturnValue({ key1: [presenceEntry] });

    const { result } = renderHook(() =>
      useMatchPresence({
        matchId: 1,
        username: "ash",
        displayName: "Ash",
        isStaff: false,
        isParticipant: true,
      })
    );

    // Grab the presence sync handler
    const syncCall = (ch.on as jest.Mock).mock.calls.find(
      (call) => call[0] === "presence" && call[1]?.event === "sync"
    );
    const syncHandler = syncCall![2] as () => void;

    act(() => {
      syncHandler();
    });

    expect(result.current.viewers).toEqual([presenceEntry]);
  });

  it("tracks typing users from other participants (not self)", () => {
    const ch = buildMockChannel();
    const mockSupabase = buildMockSupabase(ch);
    (useSupabase as jest.Mock).mockReturnValue(mockSupabase);

    ch.presenceState.mockReturnValue({
      key1: [
        {
          username: "misty",
          displayName: "Misty",
          isStaff: false,
          isParticipant: true,
          isTyping: true, // typing — should appear in typingUsers
        },
      ],
      key2: [
        {
          username: "ash",
          displayName: "Ash",
          isStaff: false,
          isParticipant: true,
          isTyping: true, // self — should NOT appear in typingUsers
        },
      ],
    });

    const { result } = renderHook(() =>
      useMatchPresence({
        matchId: 1,
        username: "ash",
        displayName: "Ash",
        isStaff: false,
        isParticipant: true,
      })
    );

    const syncCall = (ch.on as jest.Mock).mock.calls.find(
      (call) => call[0] === "presence" && call[1]?.event === "sync"
    );
    const syncHandler = syncCall![2] as () => void;

    act(() => {
      syncHandler();
    });

    expect(result.current.typingUsers).toEqual(["Misty"]);
  });
});
