/**
 * @jest-environment jsdom
 */

import { describe, it, expect } from "@jest/globals";
import { render, screen } from "@testing-library/react";

import { LinkedAccountsOverview } from "../linked-accounts-overview";

describe("LinkedAccountsOverview", () => {
  it("renders title and description", () => {
    render(
      <LinkedAccountsOverview
        totalMembers={100}
        linkedCount={25}
        communitySlug="vgc"
      />
    );
    expect(screen.getByText("Account Linking")).toBeInTheDocument();
    expect(screen.getByText(/linked their Discord/)).toBeInTheDocument();
  });

  it("shows linked count and total", () => {
    render(
      <LinkedAccountsOverview
        totalMembers={100}
        linkedCount={25}
        communitySlug="vgc"
      />
    );
    expect(screen.getByText("25 of 100 members linked")).toBeInTheDocument();
  });

  it("shows percentage badge", () => {
    render(
      <LinkedAccountsOverview
        totalMembers={100}
        linkedCount={25}
        communitySlug="vgc"
      />
    );
    expect(screen.getByText("25%")).toBeInTheDocument();
  });

  it("shows '?' when totalMembers is null", () => {
    render(
      <LinkedAccountsOverview
        totalMembers={null}
        linkedCount={5}
        communitySlug="vgc"
      />
    );
    expect(screen.getByText("5 of ? members linked")).toBeInTheDocument();
    expect(screen.queryByText(/%/)).not.toBeInTheDocument();
  });

  it("shows hint when linkedCount is 0", () => {
    render(
      <LinkedAccountsOverview
        totalMembers={50}
        linkedCount={0}
        communitySlug="vgc"
      />
    );
    expect(screen.getByText(/Encourage members/)).toBeInTheDocument();
    expect(screen.getByText("/link")).toBeInTheDocument();
  });
});
