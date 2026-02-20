import { render } from "@testing-library/react";
import { PostHogPageview } from "@/lib/posthog/posthog-pageview";

const mockCapture = jest.fn();
let mockPathname = "/tournaments";
let mockSearchParams = new URLSearchParams();

jest.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useSearchParams: () => mockSearchParams,
}));

let mockPostHog: { capture: jest.Mock } | null = { capture: mockCapture };

jest.mock("posthog-js/react", () => ({
  usePostHog: () => mockPostHog,
}));

describe("PostHogPageview", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPathname = "/tournaments";
    mockSearchParams = new URLSearchParams();
    mockPostHog = { capture: mockCapture };
  });

  it("captures pageview with correct URL on mount", () => {
    render(<PostHogPageview />);

    expect(mockCapture).toHaveBeenCalledWith("$pageview", {
      $current_url: "http://localhost/tournaments",
    });
  });

  it("includes search params in captured URL", () => {
    mockSearchParams = new URLSearchParams("q=vgc&page=2");

    render(<PostHogPageview />);

    expect(mockCapture).toHaveBeenCalledWith("$pageview", {
      $current_url: "http://localhost/tournaments?q=vgc&page=2",
    });
  });

  it("does not capture when pathname is empty", () => {
    mockPathname = "";

    render(<PostHogPageview />);

    expect(mockCapture).not.toHaveBeenCalled();
  });

  it("does not capture when posthog is null", () => {
    mockPostHog = null;

    render(<PostHogPageview />);

    expect(mockCapture).not.toHaveBeenCalled();
  });
});
