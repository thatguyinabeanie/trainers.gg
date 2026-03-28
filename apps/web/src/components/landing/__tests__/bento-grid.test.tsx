import { render, screen } from "@testing-library/react";
import { BentoGrid, UnderConstruction } from "../bento-grid";

jest.mock("@/lib/utils", () => ({
  cn: (..._args: unknown[]) => "",
}));

describe("BentoGrid", () => {
  beforeEach(() => {
    render(<BentoGrid />);
  });

  it.each([
    "One account. Unlimited identities.",
    "Your competitive story, one link.",
    "Secret until you play them.",
    "Swiss, brackets, standings.",
  ])('renders headline "%s"', (headline) => {
    expect(screen.getByText(headline)).toBeInTheDocument();
  });

  it("renders the community headline", () => {
    expect(
      screen.getByRole("heading", { name: /find who.s competing/i })
    ).toBeInTheDocument();
  });

  it.each(["Public", "Anonymous"])(
    'renders "%s" label in the alts legend',
    (label) => {
      const matches = screen.getAllByText(label, { exact: false });
      expect(matches.length).toBeGreaterThan(0);
    }
  );

  it.each(["thatguyinabeanie", "AdamantBeanie", "CalmBeanie", "ModestBeanie"])(
    'renders alt name "%s"',
    (name) => {
      expect(screen.getAllByText(name).length).toBeGreaterThan(0);
    }
  );

  it("renders recent results in the profile preview", () => {
    expect(screen.getByText("Spring Cup 2026")).toBeInTheDocument();
    expect(screen.getByText("1st")).toBeInTheDocument();
  });

  it("renders format badges in the profile preview", () => {
    expect(screen.getByText("VGC Reg H")).toBeInTheDocument();
  });

  it('does not render the word "Pokemon" anywhere', () => {
    expect(screen.queryByText(/Pokemon/i)).not.toBeInTheDocument();
  });
});

describe("UnderConstruction", () => {
  beforeEach(() => {
    render(<UnderConstruction />);
  });

  it("renders the section heading", () => {
    expect(
      screen.getByRole("heading", { name: /what we.re building next/i })
    ).toBeInTheDocument();
  });

  it.each(["Meta Analytics", "Builder", "Articles", "Coaching"])(
    'renders coming-soon feature "%s"',
    (feature) => {
      expect(screen.getByText(feature)).toBeInTheDocument();
    }
  );

  it("mentions meta analytics in Builder description", () => {
    expect(
      screen.getByText(/current meta analytics/i)
    ).toBeInTheDocument();
  });
});
