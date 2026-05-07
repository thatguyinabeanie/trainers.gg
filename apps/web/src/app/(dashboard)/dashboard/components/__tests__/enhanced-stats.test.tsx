import { render, screen } from "@testing-library/react";
import { EnhancedStats } from "../enhanced-stats";

const defaultProps = {
  winRate: "55.0%",
  winRateSub: "11W - 9L",
  rating: "1250",
  ratingSub: "Peak: 1300",
  record: "11-9",
  recordSub: "20 games played",
  tournaments: "3",
  tournamentsSub: "1 active",
};

describe("EnhancedStats", () => {
  it("renders all 4 stat cards", () => {
    render(<EnhancedStats {...defaultProps} />);
    expect(screen.getByText("Win Rate")).toBeInTheDocument();
    expect(screen.getByText("Rating")).toBeInTheDocument();
    expect(screen.getByText("Record")).toBeInTheDocument();
    expect(screen.getByText("Tournaments")).toBeInTheDocument();
  });

  it("displays passed values", () => {
    render(<EnhancedStats {...defaultProps} />);
    expect(screen.getByText("55.0%")).toBeInTheDocument();
    expect(screen.getByText("1250")).toBeInTheDocument();
    expect(screen.getByText("11-9")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("applies high tier color for win rate >= 60%", () => {
    const { container } = render(
      <EnhancedStats {...defaultProps} winRate="65.0%" />
    );
    // The value element should have emerald color class
    const valueEl = screen.getByText("65.0%");
    expect(valueEl.className).toContain("emerald");
  });

  it("applies good tier color for win rate 50-60%", () => {
    render(<EnhancedStats {...defaultProps} winRate="55.0%" />);
    const valueEl = screen.getByText("55.0%");
    expect(valueEl.className).toContain("teal");
  });

  it("applies low tier color for win rate < 40%", () => {
    render(<EnhancedStats {...defaultProps} winRate="35.0%" />);
    const valueEl = screen.getByText("35.0%");
    expect(valueEl.className).toContain("red");
  });

  it("applies neutral (no special color) for 40-50% win rate", () => {
    render(<EnhancedStats {...defaultProps} winRate="45.0%" />);
    const valueEl = screen.getByText("45.0%");
    expect(valueEl.className).not.toContain("emerald");
    expect(valueEl.className).not.toContain("teal");
    expect(valueEl.className).not.toContain("red");
  });

  it("applies neutral when no games (0.0%)", () => {
    render(<EnhancedStats {...defaultProps} winRate="0.0%" />);
    const valueEl = screen.getByText("0.0%");
    expect(valueEl.className).not.toContain("emerald");
    expect(valueEl.className).not.toContain("red");
  });

  it("shows muted style for rating '—'", () => {
    render(<EnhancedStats {...defaultProps} rating="—" />);
    const valueEl = screen.getByText("—");
    expect(valueEl.className).toContain("muted");
  });

  it("shows muted style for rating '0'", () => {
    render(<EnhancedStats {...defaultProps} rating="0" />);
    const valueEl = screen.getByText("0");
    expect(valueEl.className).toContain("muted");
  });

  it("shows accent color for tournaments sub when tournamentsSubAccent is true", () => {
    render(
      <EnhancedStats
        {...defaultProps}
        tournamentsSub="1 active"
        tournamentsSubAccent={true}
      />
    );
    const subEl = screen.getByText("1 active");
    expect(subEl.className).toContain("emerald");
  });

  it("shows muted color for tournaments sub when tournamentsSubAccent is false", () => {
    render(
      <EnhancedStats
        {...defaultProps}
        tournamentsSub="None active"
        tournamentsSubAccent={false}
      />
    );
    const subEl = screen.getByText("None active");
    expect(subEl.className).toContain("muted");
  });
});
