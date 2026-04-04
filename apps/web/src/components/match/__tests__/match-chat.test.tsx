"use client";

import { render, screen, waitFor } from "@testing-library/react";

// jsdom lacks scrollIntoView — stub/restore per suite to avoid leaking
const originalScrollIntoView = Element.prototype.scrollIntoView;
beforeAll(() => {
  Element.prototype.scrollIntoView = jest.fn();
});
afterAll(() => {
  Element.prototype.scrollIntoView = originalScrollIntoView;
});
import userEvent from "@testing-library/user-event";
import { MatchChat } from "../match-chat";

// ===========================================================================
// Mock setup
// ===========================================================================

const mockGetMatchMessages = jest.fn();
jest.mock("@trainers/supabase", () => ({
  getMatchMessages: (...args: unknown[]) => mockGetMatchMessages(...args),
}));

const mockUseSupabaseQuery = jest.fn();
jest.mock("@/lib/supabase", () => ({
  useSupabaseQuery: (...args: unknown[]) => mockUseSupabaseQuery(...args),
}));

const mockSendMatchMessageAction = jest.fn();
const mockRequestJudgeAction = jest.fn();
const mockCancelJudgeRequestAction = jest.fn();
const mockClearJudgeRequestAction = jest.fn();

jest.mock("@/actions/matches", () => ({
  sendMatchMessageAction: (...args: unknown[]) =>
    mockSendMatchMessageAction(...args),
  requestJudgeAction: (...args: unknown[]) => mockRequestJudgeAction(...args),
  cancelJudgeRequestAction: (...args: unknown[]) =>
    mockCancelJudgeRequestAction(...args),
  clearJudgeRequestAction: (...args: unknown[]) =>
    mockClearJudgeRequestAction(...args),
}));

const mockToastSuccess = jest.fn();
const mockToastError = jest.fn();
jest.mock("sonner", () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

// Presence components are simple renders — use light mocks
jest.mock("../presence-indicator", () => ({
  ViewerAvatars: ({ viewers }: { viewers: unknown[] }) =>
    viewers.length > 0 ? <div data-testid="viewer-avatars" /> : null,
  TypingIndicator: ({ typingUsers }: { typingUsers: string[] }) =>
    typingUsers.length > 0 ? (
      <div data-testid="typing-indicator">{typingUsers[0]} is typing</div>
    ) : null,
  useMatchPresence: jest.fn(),
}));

// ===========================================================================
// Default props + helpers
// ===========================================================================

const defaultProps = {
  matchId: 1,
  userAltId: 10,
  isStaff: false,
  isParticipant: true,
  matchStatus: "active",
  staffRequested: false,
  tournamentId: 5,
  messagesRefreshKey: 0,
  onStaffRequestChange: jest.fn(),
  viewers: [],
  typingUsers: [],
  currentUsername: "ash",
  onTypingStart: jest.fn(),
  onTypingStop: jest.fn(),
};

function setupNoMessages() {
  const refetchMessages = jest.fn();
  mockUseSupabaseQuery.mockReturnValue({
    data: [],
    isLoading: false,
    refetch: refetchMessages,
  });
  return refetchMessages;
}

function setupMessages(messages: unknown[]) {
  const refetchMessages = jest.fn();
  mockUseSupabaseQuery.mockReturnValue({
    data: messages,
    isLoading: false,
    refetch: refetchMessages,
  });
  return refetchMessages;
}

function setupLoading() {
  mockUseSupabaseQuery.mockReturnValue({
    data: null,
    isLoading: true,
    refetch: jest.fn(),
  });
}

// ===========================================================================
// Tests
// ===========================================================================

describe("MatchChat", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // Loading state
  // =========================================================================

  describe("loading state", () => {
    it("shows a spinner while messages are loading", () => {
      setupLoading();
      render(<MatchChat {...defaultProps} />);
      // Loader2 has aria-hidden but we can check for the animate-spin class
      expect(document.querySelector(".animate-spin")).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Empty state
  // =========================================================================

  describe("empty message list", () => {
    it("shows the 'Send a message' prompt when canChat is true and no messages", () => {
      setupNoMessages();
      render(<MatchChat {...defaultProps} />);
      expect(
        screen.getByText("Send a message to your opponent")
      ).toBeInTheDocument();
    });

    it("shows 'No messages yet' when user cannot chat and no messages exist", () => {
      setupNoMessages();
      // Completed match — canChat is false
      render(
        <MatchChat {...defaultProps} matchStatus="completed" userAltId={null} />
      );
      expect(screen.getByText("No messages yet")).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Message rendering
  // =========================================================================

  describe("message rendering", () => {
    const playerMsg = {
      id: 1,
      content: "Good luck!",
      message_type: "player",
      created_at: "2026-04-03T10:00:00Z",
      alt: {
        id: 10,
        display_name: "Ash Ketchum",
        username: "ash",
        avatar_url: null,
      },
    };

    const opponentMsg = {
      id: 2,
      content: "You too!",
      message_type: "player",
      created_at: "2026-04-03T10:01:00Z",
      alt: {
        id: 20,
        display_name: "Misty",
        username: "misty",
        avatar_url: null,
      },
    };

    const systemMsg = {
      id: 3,
      content: "Match has started.",
      message_type: "system",
      created_at: "2026-04-03T10:00:00Z",
      alt: null,
    };

    const judgeMsg = {
      id: 4,
      content: "Please follow the rules.",
      message_type: "judge",
      created_at: "2026-04-03T10:02:00Z",
      alt: {
        id: 30,
        display_name: null,
        username: "judge_brock",
        avatar_url: null,
      },
    };

    it("renders player message content", () => {
      setupMessages([playerMsg]);
      render(<MatchChat {...defaultProps} />);
      expect(screen.getByText("Good luck!")).toBeInTheDocument();
    });

    it("renders opponent message content", () => {
      setupMessages([opponentMsg]);
      render(<MatchChat {...defaultProps} />);
      expect(screen.getByText("You too!")).toBeInTheDocument();
    });

    it("renders system messages as centered text", () => {
      setupMessages([systemMsg]);
      render(<MatchChat {...defaultProps} />);
      expect(screen.getByText("Match has started.")).toBeInTheDocument();
    });

    it("renders judge badge on judge messages", () => {
      setupMessages([judgeMsg]);
      render(<MatchChat {...defaultProps} />);
      expect(screen.getByText("Judge")).toBeInTheDocument();
    });

    it("renders the username for each message", () => {
      setupMessages([opponentMsg]);
      render(<MatchChat {...defaultProps} />);
      expect(screen.getByText("misty")).toBeInTheDocument();
    });

    it("falls back to 'Unknown' when message has no alt", () => {
      const msgNoAlt = {
        ...playerMsg,
        message_type: "player",
        alt: null,
      };
      setupMessages([msgNoAlt]);
      render(<MatchChat {...defaultProps} />);
      expect(screen.getByText("Unknown")).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Input area visibility
  // =========================================================================

  describe("input area visibility", () => {
    it("shows the message input when user can chat and has altId", () => {
      setupNoMessages();
      render(<MatchChat {...defaultProps} />);
      expect(
        screen.getByPlaceholderText("Type a message...")
      ).toBeInTheDocument();
    });

    it("uses judge placeholder when staff and not participant", () => {
      setupNoMessages();
      render(
        <MatchChat {...defaultProps} isStaff={true} isParticipant={false} />
      );
      expect(
        screen.getByPlaceholderText("Message as judge...")
      ).toBeInTheDocument();
    });

    it("hides input when matchStatus is completed", () => {
      setupNoMessages();
      render(<MatchChat {...defaultProps} matchStatus="completed" />);
      expect(
        screen.queryByPlaceholderText("Type a message...")
      ).not.toBeInTheDocument();
    });

    it("hides input when matchStatus is cancelled", () => {
      setupNoMessages();
      render(<MatchChat {...defaultProps} matchStatus="cancelled" />);
      expect(
        screen.queryByPlaceholderText("Type a message...")
      ).not.toBeInTheDocument();
    });

    it("shows 'no player identity' notice when userAltId is null but canChat is true", () => {
      setupNoMessages();
      render(<MatchChat {...defaultProps} userAltId={null} />);
      expect(screen.getByText(/Unable to send messages/i)).toBeInTheDocument();
    });

    it("does not show identity notice when user cannot chat at all", () => {
      setupNoMessages();
      render(
        <MatchChat
          {...defaultProps}
          userAltId={null}
          matchStatus="completed"
          isParticipant={false}
          isStaff={false}
        />
      );
      expect(
        screen.queryByText(/Unable to send messages/i)
      ).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // Sending messages
  // =========================================================================

  describe("sending messages", () => {
    it("sends a message and clears input on success", async () => {
      const user = userEvent.setup();
      const refetch = setupNoMessages();
      mockSendMatchMessageAction.mockResolvedValue({ success: true });

      render(<MatchChat {...defaultProps} />);

      const input = screen.getByPlaceholderText("Type a message...");
      await user.type(input, "Hello!");
      await user.click(screen.getByRole("button", { name: "Send message" }));

      await waitFor(() => {
        expect(mockSendMatchMessageAction).toHaveBeenCalledWith(
          1,
          10,
          "Hello!",
          "player"
        );
        expect(refetch).toHaveBeenCalled();
      });

      // Input should be cleared
      expect(input).toHaveValue("");
    });

    it("sends message as 'judge' type when staff and not participant", async () => {
      const user = userEvent.setup();
      setupNoMessages();
      mockSendMatchMessageAction.mockResolvedValue({ success: true });

      render(
        <MatchChat {...defaultProps} isStaff={true} isParticipant={false} />
      );

      await user.type(
        screen.getByPlaceholderText("Message as judge..."),
        "Dispute resolved."
      );
      await user.click(screen.getByRole("button", { name: "Send message" }));

      await waitFor(() => {
        expect(mockSendMatchMessageAction).toHaveBeenCalledWith(
          1,
          10,
          "Dispute resolved.",
          "judge"
        );
      });
    });

    it("shows toast error when send fails", async () => {
      const user = userEvent.setup();
      setupNoMessages();
      mockSendMatchMessageAction.mockResolvedValue({
        success: false,
        error: "Send failed",
      });

      render(<MatchChat {...defaultProps} />);

      await user.type(screen.getByPlaceholderText("Type a message..."), "Hi");
      await user.click(screen.getByRole("button", { name: "Send message" }));

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith("Send failed");
      });
    });

    it("does not send when message is whitespace only", async () => {
      const user = userEvent.setup();
      setupNoMessages();

      render(<MatchChat {...defaultProps} />);

      await user.type(screen.getByPlaceholderText("Type a message..."), "   ");
      await user.click(screen.getByRole("button", { name: "Send message" }));

      expect(mockSendMatchMessageAction).not.toHaveBeenCalled();
    });

    it("sends message when Enter is pressed", async () => {
      const user = userEvent.setup();
      setupNoMessages();
      mockSendMatchMessageAction.mockResolvedValue({ success: true });

      render(<MatchChat {...defaultProps} />);

      const input = screen.getByPlaceholderText("Type a message...");
      await user.type(input, "Enter send{Enter}");

      await waitFor(() => {
        expect(mockSendMatchMessageAction).toHaveBeenCalled();
      });
    });

    it("disables send button while sending", async () => {
      const user = userEvent.setup();
      setupNoMessages();
      // Never resolve — keeps pending state
      mockSendMatchMessageAction.mockReturnValue(new Promise(() => {}));

      render(<MatchChat {...defaultProps} />);

      const input = screen.getByPlaceholderText("Type a message...");
      await user.type(input, "Pending");
      await user.click(screen.getByRole("button", { name: "Send message" }));

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Send message" })
        ).toBeDisabled();
      });
    });
  });

  // =========================================================================
  // Judge request controls
  // =========================================================================

  describe("judge request controls", () => {
    it("shows call-judge button for participants in active matches", () => {
      setupNoMessages();
      render(<MatchChat {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: "Call judge" })
      ).toBeInTheDocument();
    });

    it("does not show judge button for non-participants", () => {
      setupNoMessages();
      render(<MatchChat {...defaultProps} isParticipant={false} />);
      expect(
        screen.queryByRole("button", { name: "Call judge" })
      ).not.toBeInTheDocument();
    });

    it("does not show judge button when match is not active", () => {
      setupNoMessages();
      render(<MatchChat {...defaultProps} matchStatus="pending" />);
      expect(
        screen.queryByRole("button", { name: "Call judge" })
      ).not.toBeInTheDocument();
    });

    it("shows 'Cancel judge request' when staffRequested is true", () => {
      setupNoMessages();
      render(<MatchChat {...defaultProps} staffRequested={true} />);
      expect(
        screen.getByRole("button", { name: "Cancel judge request" })
      ).toBeInTheDocument();
    });

    it("calls requestJudgeAction and fires onStaffRequestChange on request", async () => {
      const user = userEvent.setup();
      setupNoMessages();
      mockRequestJudgeAction.mockResolvedValue({ success: true });
      const onStaffRequestChange = jest.fn();

      render(
        <MatchChat
          {...defaultProps}
          onStaffRequestChange={onStaffRequestChange}
        />
      );

      await user.click(screen.getByRole("button", { name: "Call judge" }));

      await waitFor(() => {
        expect(mockRequestJudgeAction).toHaveBeenCalledWith(1, 5);
        expect(onStaffRequestChange).toHaveBeenCalledWith(true);
        expect(mockToastSuccess).toHaveBeenCalledWith(
          "Judge has been requested"
        );
      });
    });

    it("shows toast error when requestJudgeAction fails", async () => {
      const user = userEvent.setup();
      setupNoMessages();
      mockRequestJudgeAction.mockResolvedValue({
        success: false,
        error: "Not allowed",
      });

      render(<MatchChat {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: "Call judge" }));

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith("Not allowed");
      });
    });

    it("calls cancelJudgeRequestAction and fires onStaffRequestChange on cancel", async () => {
      const user = userEvent.setup();
      setupNoMessages();
      mockCancelJudgeRequestAction.mockResolvedValue({ success: true });
      const onStaffRequestChange = jest.fn();

      render(
        <MatchChat
          {...defaultProps}
          staffRequested={true}
          onStaffRequestChange={onStaffRequestChange}
        />
      );

      await user.click(
        screen.getByRole("button", { name: "Cancel judge request" })
      );

      await waitFor(() => {
        expect(mockCancelJudgeRequestAction).toHaveBeenCalledWith(1, 5);
        expect(onStaffRequestChange).toHaveBeenCalledWith(false);
        expect(mockToastSuccess).toHaveBeenCalledWith(
          "Judge request cancelled"
        );
      });
    });
  });

  // =========================================================================
  // Judge requested banner
  // =========================================================================

  describe("judge requested banner", () => {
    it("shows banner when staffRequested is true", () => {
      setupNoMessages();
      render(<MatchChat {...defaultProps} staffRequested={true} />);
      expect(
        screen.getByText("A judge has been requested")
      ).toBeInTheDocument();
    });

    it("does not show banner when staffRequested is false", () => {
      setupNoMessages();
      render(<MatchChat {...defaultProps} staffRequested={false} />);
      expect(
        screen.queryByText("A judge has been requested")
      ).not.toBeInTheDocument();
    });

    it("shows Resolve button for staff when judge is requested", () => {
      setupNoMessages();
      render(
        <MatchChat {...defaultProps} isStaff={true} staffRequested={true} />
      );
      expect(
        screen.getByRole("button", { name: /resolve/i })
      ).toBeInTheDocument();
    });

    it("does not show Resolve button for non-staff", () => {
      setupNoMessages();
      render(
        <MatchChat {...defaultProps} isStaff={false} staffRequested={true} />
      );
      expect(
        screen.queryByRole("button", { name: /resolve/i })
      ).not.toBeInTheDocument();
    });

    it("calls clearJudgeRequestAction and fires onStaffRequestChange on resolve", async () => {
      const user = userEvent.setup();
      setupNoMessages();
      mockClearJudgeRequestAction.mockResolvedValue({ success: true });
      const onStaffRequestChange = jest.fn();

      render(
        <MatchChat
          {...defaultProps}
          isStaff={true}
          staffRequested={true}
          onStaffRequestChange={onStaffRequestChange}
        />
      );

      await user.click(screen.getByRole("button", { name: /resolve/i }));

      await waitFor(() => {
        expect(mockClearJudgeRequestAction).toHaveBeenCalledWith(1, 5);
        expect(onStaffRequestChange).toHaveBeenCalledWith(false);
        expect(mockToastSuccess).toHaveBeenCalledWith("Judge request resolved");
      });
    });

    it("shows toast error when clearJudgeRequestAction fails", async () => {
      const user = userEvent.setup();
      setupNoMessages();
      mockClearJudgeRequestAction.mockResolvedValue({
        success: false,
        error: "Cannot resolve",
      });

      render(
        <MatchChat {...defaultProps} isStaff={true} staffRequested={true} />
      );

      await user.click(screen.getByRole("button", { name: /resolve/i }));

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith("Cannot resolve");
      });
    });
  });

  // =========================================================================
  // Presence UI
  // =========================================================================

  describe("presence UI", () => {
    it("shows viewer avatars when viewers list is non-empty", () => {
      setupNoMessages();
      const viewers = [
        {
          username: "ash",
          displayName: "Ash",
          isStaff: false,
          isParticipant: true,
          isTyping: false,
        },
      ];
      render(<MatchChat {...defaultProps} viewers={viewers} />);
      expect(screen.getByTestId("viewer-avatars")).toBeInTheDocument();
    });

    it("does not render viewer avatars when viewers list is empty", () => {
      setupNoMessages();
      render(<MatchChat {...defaultProps} viewers={[]} />);
      expect(screen.queryByTestId("viewer-avatars")).not.toBeInTheDocument();
    });

    it("shows typing indicator when typingUsers is non-empty", () => {
      setupNoMessages();
      render(<MatchChat {...defaultProps} typingUsers={["Misty"]} />);
      expect(screen.getByTestId("typing-indicator")).toBeInTheDocument();
    });
  });

  // =========================================================================
  // Typing callbacks
  // =========================================================================

  describe("typing callbacks", () => {
    it("calls onTypingStart when user types non-empty text", async () => {
      const user = userEvent.setup({ delay: null });
      setupNoMessages();
      const onTypingStart = jest.fn();

      render(<MatchChat {...defaultProps} onTypingStart={onTypingStart} />);

      await user.type(screen.getByPlaceholderText("Type a message..."), "H");

      expect(onTypingStart).toHaveBeenCalled();
    });

    it("calls onTypingStop when input is cleared", async () => {
      const user = userEvent.setup({ delay: null });
      setupNoMessages();
      const onTypingStop = jest.fn();

      render(<MatchChat {...defaultProps} onTypingStop={onTypingStop} />);

      const input = screen.getByPlaceholderText("Type a message...");
      await user.type(input, "H");
      // Clear the input
      await user.clear(input);

      expect(onTypingStop).toHaveBeenCalled();
    });
  });
});
