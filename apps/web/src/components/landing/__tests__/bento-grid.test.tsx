import { render, screen } from "@testing-library/react";
import { BentoGrid } from "../bento-grid";

// cn is not under test — return an empty string to keep assertions simple
jest.mock("@/lib/utils", () => ({
  cn: (..._args: unknown[]) => "",
}));

describe("BentoGrid", () => {
  beforeEach(() => {
    render(<BentoGrid />);
  });

  // -------------------------------------------------------------------------
  // 1. All 6 feature card headlines are present
  // -------------------------------------------------------------------------
  it.each([
    "One account. Unlimited identities.",
    "Your competitive story, one link.",
    "Secret until you play them.",
    "Swiss, brackets, standings.",
    // The 6th "card" is the Under Construction section — no headline h3,
    // but the label text acts as its identifier
  ])('renders headline "%s"', (headline) => {
    expect(screen.getByText(headline)).toBeInTheDocument();
  });

  // The community headline contains an em dash so the DOM splits into text nodes;
  // match by role + accessible name pattern instead.
  it("renders the community headline about competing and hanging out", () => {
    expect(
      screen.getByRole("heading", {
        name: /find who.s competing/i,
      })
    ).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 2. Under Construction section is rendered with its label
  // -------------------------------------------------------------------------
  it("renders the Under Construction section label", () => {
    expect(screen.getByText("Under Construction")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 3. Alts preview: Public / Anonymous legend items
  // -------------------------------------------------------------------------
  // The legend <span> renders as `<span><dot-span/> Public</span>` so the
  // text node includes a leading space. Use getAllByText with exact:false to
  // find by substring, then assert at least one match exists in the legend row.
  it.each(["Public", "Anonymous"])(
    'renders "%s" label in the alts legend',
    (label) => {
      const matches = screen.getAllByText(label, { exact: false });
      expect(matches.length).toBeGreaterThan(0);
    }
  );

  // -------------------------------------------------------------------------
  // 4. Alts preview: all 4 alt names are visible
  // -------------------------------------------------------------------------
  it.each(["thatguyinabeanie", "AdamantBeanie", "CalmBeanie", "ModestBeanie"])(
    'renders alt name "%s"',
    (name) => {
      // The name appears in both the AltsPreview row and the ProfilePreview — getAllByText is safe
      expect(screen.getAllByText(name).length).toBeGreaterThan(0);
    }
  );

  // -------------------------------------------------------------------------
  // 5. Profile preview: recent results and public alts
  // -------------------------------------------------------------------------
  it("renders recent results in the profile preview", () => {
    expect(screen.getByText("Spring Cup 2026")).toBeInTheDocument();
    expect(screen.getByText("1st")).toBeInTheDocument();
  });

  it("renders format badges in the profile preview", () => {
    expect(screen.getByText("VGC Reg H")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 6. Under Construction: all 3 coming-soon feature labels
  // -------------------------------------------------------------------------
  it.each(["Meta Analytics", "Articles", "Coaching"])(
    'renders coming-soon feature "%s"',
    (feature) => {
      expect(screen.getByText(feature)).toBeInTheDocument();
    }
  );

  // -------------------------------------------------------------------------
  // 7. No raw "Pokemon" text appears anywhere in the rendered output
  // -------------------------------------------------------------------------
  it('does not render the word "Pokemon" anywhere', () => {
    expect(screen.queryByText(/Pokemon/i)).not.toBeInTheDocument();
  });
});
