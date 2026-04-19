// --- Mock modules before imports ---

jest.mock("@/components/profile/sprite-picker", () => ({
  SpritePicker: () => <div data-testid="sprite-picker" />,
}));

jest.mock("lucide-react", () => ({
  Pencil: () => <svg data-testid="icon-pencil" />,
}));

jest.mock("@/components/ui/avatar", () => ({
  Avatar: ({
    children,
    className,
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <div data-testid="avatar" className={className}>
      {children}
    </div>
  ),
  AvatarImage: ({ src, alt }: { src: string; alt: string }) => (
    <img data-testid="avatar-image" src={src} alt={alt} />
  ),
  AvatarFallback: ({ children }: { children: React.ReactNode }) => (
    <span data-testid="avatar-fallback">{children}</span>
  ),
}));

jest.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="popover">{children}</div>
  ),
  PopoverTrigger: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <button data-testid="popover-trigger" {...props}>
      {children}
    </button>
  ),
  PopoverContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="popover-content">{children}</div>
  ),
}));

jest.mock("@/lib/utils", () => ({
  cn: (...args: unknown[]) =>
    args
      .filter((a) => typeof a === "string")
      .join(" ")
      .trim(),
}));

import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";

import { AltAvatarPicker } from "../alt-avatar-picker";

describe("AltAvatarPicker", () => {
  it("renders avatar fallback with the first character of username", () => {
    render(
      <AltAvatarPicker
        altId={1}
        username="ash"
        avatarUrl={null}
        onAvatarChange={jest.fn()}
        refreshKey={0}
      />
    );
    expect(screen.getByTestId("avatar-fallback")).toHaveTextContent("A");
  });

  it("renders avatar image when avatarUrl is provided", () => {
    render(
      <AltAvatarPicker
        altId={1}
        username="ash"
        avatarUrl="https://example.com/a.png"
        onAvatarChange={jest.fn()}
        refreshKey={0}
      />
    );
    const img = screen.getByTestId("avatar-image");
    expect(img).toHaveAttribute("src", "https://example.com/a.png");
  });

  it("stops click propagation so parent row handlers don't fire", () => {
    const parentClick = jest.fn();
    render(
      <div onClick={parentClick}>
        <AltAvatarPicker
          altId={1}
          username="ash"
          avatarUrl={null}
          onAvatarChange={jest.fn()}
          refreshKey={0}
        />
      </div>
    );

    fireEvent.click(screen.getByTestId("popover-trigger"));
    expect(parentClick).not.toHaveBeenCalled();
  });

  it.each([
    ["Enter", "Enter"],
    ["Space", " "],
  ])("stops %s keydown propagation to parent", (_label, key) => {
    const parentKeyDown = jest.fn();
    render(
      <div onKeyDown={parentKeyDown}>
        <AltAvatarPicker
          altId={1}
          username="ash"
          avatarUrl={null}
          onAvatarChange={jest.fn()}
          refreshKey={0}
        />
      </div>
    );

    fireEvent.keyDown(screen.getByTestId("popover-trigger"), { key });
    expect(parentKeyDown).not.toHaveBeenCalled();
  });

  it("includes the SpritePicker inside the popover content", () => {
    render(
      <AltAvatarPicker
        altId={1}
        username="ash"
        avatarUrl={null}
        onAvatarChange={jest.fn()}
        refreshKey={0}
      />
    );
    expect(screen.getByTestId("sprite-picker")).toBeInTheDocument();
  });
});
