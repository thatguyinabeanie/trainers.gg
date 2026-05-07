import { render, screen } from "@testing-library/react";

jest.mock("next/link", () => ({
  __esModule: true,
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

jest.mock("@/components/ui/button", () => ({
  Button: ({
    children,
    render,
  }: {
    children: React.ReactNode;
    render?: React.ReactElement;
    nativeButton?: boolean;
    size?: string;
    variant?: string;
  }) => {
    if (render && render.props?.href) {
      return <a href={render.props.href}>{children}</a>;
    }
    return <button>{children}</button>;
  },
}));

import { WelcomeHeader } from "../welcome-header";

describe("WelcomeHeader", () => {
  it("shows username in heading", () => {
    render(
      <WelcomeHeader
        username="ash_ketchum"
        hasAlts={true}
        hasTeamBuilderAccess={false}
      />
    );
    expect(
      screen.getByText("Welcome back, ash_ketchum")
    ).toBeInTheDocument();
  });

  it("shows 'Trainer' for temp_ usernames", () => {
    render(
      <WelcomeHeader
        username="temp_abc123"
        hasAlts={false}
        hasTeamBuilderAccess={false}
      />
    );
    expect(screen.getByText("Welcome back, Trainer")).toBeInTheDocument();
  });

  it("shows 'Trainer' for user_ usernames", () => {
    render(
      <WelcomeHeader
        username="user_xyz"
        hasAlts={false}
        hasTeamBuilderAccess={false}
      />
    );
    expect(screen.getByText("Welcome back, Trainer")).toBeInTheDocument();
  });

  it("always shows Browse Tournaments button", () => {
    render(
      <WelcomeHeader
        username="ash"
        hasAlts={false}
        hasTeamBuilderAccess={false}
      />
    );
    expect(screen.getByText("Browse Tournaments")).toBeInTheDocument();
  });

  it("shows Team Builder when hasTeamBuilderAccess=true", () => {
    render(
      <WelcomeHeader
        username="ash"
        hasAlts={false}
        hasTeamBuilderAccess={true}
      />
    );
    expect(screen.getByText("Team Builder")).toBeInTheDocument();
  });

  it("hides Team Builder when hasTeamBuilderAccess=false", () => {
    render(
      <WelcomeHeader
        username="ash"
        hasAlts={false}
        hasTeamBuilderAccess={false}
      />
    );
    expect(screen.queryByText("Team Builder")).not.toBeInTheDocument();
  });

  it("shows 'New Alt' when hasAlts=true", () => {
    render(
      <WelcomeHeader
        username="ash"
        hasAlts={true}
        hasTeamBuilderAccess={false}
      />
    );
    expect(screen.getByText("New Alt")).toBeInTheDocument();
  });

  it("shows 'Create Alt' when hasAlts=false", () => {
    render(
      <WelcomeHeader
        username="ash"
        hasAlts={false}
        hasTeamBuilderAccess={false}
      />
    );
    expect(screen.getByText("Create Alt")).toBeInTheDocument();
  });
});
