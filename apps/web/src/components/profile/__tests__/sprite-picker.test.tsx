import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// jsdom doesn't implement scrollTo
Element.prototype.scrollTo = jest.fn();

// Mock server actions
const mockSetAltAvatar = jest.fn();
const mockRemoveAltAvatar = jest.fn();
jest.mock("@/actions/alt-avatar", () => ({
  setAltAvatar: (...args: unknown[]) => mockSetAltAvatar(...args),
  removeAltAvatar: (...args: unknown[]) => mockRemoveAltAvatar(...args),
}));

// Mock sonner toast
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock @tanstack/react-virtual so items render without real DOM measurements
jest.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({
    count,
    estimateSize,
    gap,
  }: {
    count: number;
    estimateSize: () => number;
    gap: number;
  }) => {
    const size = estimateSize();
    // Render all rows (or cap at a reasonable number for test speed)
    const rendered = Math.min(count, 20);
    return {
      getTotalSize: () => count * (size + gap),
      getVirtualItems: () =>
        Array.from({ length: rendered }, (_, i) => ({
          index: i,
          start: i * (size + gap),
          size,
          key: i,
        })),
    };
  },
}));

import { SpritePicker } from "../sprite-picker";
import { getAllSpeciesNames } from "@trainers/pokemon";
import { FEATURED_TRAINERS, getPokemonSprite } from "@trainers/pokemon/sprites";
import { toast } from "sonner";

const allSpecies = getAllSpeciesNames();

describe("SpritePicker", () => {
  const defaultProps = {
    altId: 1,
    currentAvatarUrl: null as string | null,
    onAvatarChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockSetAltAvatar.mockResolvedValue({ success: true, data: {} });
    mockRemoveAltAvatar.mockResolvedValue({ success: true });
  });

  it("renders search input and tab triggers", () => {
    render(<SpritePicker {...defaultProps} />);

    expect(
      screen.getByPlaceholderText("Search Pokemon...")
    ).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Pokemon" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Trainers" })).toBeInTheDocument();
  });

  it("renders Pokemon sprites from the species list", () => {
    render(<SpritePicker {...defaultProps} />);

    // Mock virtualizer renders up to 20 rows × 6 cols = first 120 species
    expect(screen.getByTitle(allSpecies[0]!)).toBeInTheDocument();
    expect(screen.getByTitle(allSpecies[5]!)).toBeInTheDocument();
  });

  it("filters Pokemon by search term", async () => {
    const user = userEvent.setup();
    render(<SpritePicker {...defaultProps} />);

    const input = screen.getByPlaceholderText("Search Pokemon...");
    await user.type(input, "pikachu");

    expect(screen.getByTitle("Pikachu")).toBeInTheDocument();
    // Unmatched species should not appear
    expect(screen.queryByTitle("Bulbasaur")).not.toBeInTheDocument();
  });

  it("shows empty state when search has no results", async () => {
    const user = userEvent.setup();
    render(<SpritePicker {...defaultProps} />);

    await user.type(
      screen.getByPlaceholderText("Search Pokemon..."),
      "xyznonexistent999"
    );

    expect(screen.getByText("No Pokemon found")).toBeInTheDocument();
  });

  it("switches to Trainers tab and shows trainers", async () => {
    const user = userEvent.setup();
    render(<SpritePicker {...defaultProps} />);

    await user.click(screen.getByRole("tab", { name: "Trainers" }));

    expect(screen.getByTitle(FEATURED_TRAINERS[0]!.name)).toBeInTheDocument();
  });

  it("updates search placeholder when switching tabs", async () => {
    const user = userEvent.setup();
    render(<SpritePicker {...defaultProps} />);

    expect(
      screen.getByPlaceholderText("Search Pokemon...")
    ).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Trainers" }));

    expect(
      screen.getByPlaceholderText("Search trainers...")
    ).toBeInTheDocument();
  });

  it("clears search when switching tabs", async () => {
    const user = userEvent.setup();
    render(<SpritePicker {...defaultProps} />);

    const input = screen.getByPlaceholderText("Search Pokemon...");
    await user.type(input, "pikachu");
    expect(input).toHaveValue("pikachu");

    await user.click(screen.getByRole("tab", { name: "Trainers" }));

    expect(screen.getByPlaceholderText("Search trainers...")).toHaveValue("");
  });

  it("filters trainers by search term", async () => {
    const user = userEvent.setup();
    render(<SpritePicker {...defaultProps} />);

    await user.click(screen.getByRole("tab", { name: "Trainers" }));

    const input = screen.getByPlaceholderText("Search trainers...");
    await user.type(input, FEATURED_TRAINERS[0]!.name);

    expect(screen.getByTitle(FEATURED_TRAINERS[0]!.name)).toBeInTheDocument();
  });

  it("shows empty state for trainers when search has no results", async () => {
    const user = userEvent.setup();
    render(<SpritePicker {...defaultProps} />);

    await user.click(screen.getByRole("tab", { name: "Trainers" }));
    await user.type(
      screen.getByPlaceholderText("Search trainers..."),
      "xyznonexistent999"
    );

    expect(screen.getByText("No trainers found")).toBeInTheDocument();
  });

  it("calls setAltAvatar and onAvatarChange on sprite selection", async () => {
    const user = userEvent.setup();
    const onAvatarChange = jest.fn();
    render(<SpritePicker {...defaultProps} onAvatarChange={onAvatarChange} />);

    const firstSpecies = allSpecies[0]!;
    const sprite = getPokemonSprite(firstSpecies);

    await user.click(screen.getByTitle(firstSpecies));

    expect(mockSetAltAvatar).toHaveBeenCalledWith(1, sprite.url);
    expect(onAvatarChange).toHaveBeenCalledWith(sprite.url);
    expect(toast.success).toHaveBeenCalledWith("Avatar updated");
  });

  it("shows error toast when setAltAvatar fails", async () => {
    mockSetAltAvatar.mockResolvedValue({
      success: false,
      error: "Something went wrong",
    });

    const user = userEvent.setup();
    const onAvatarChange = jest.fn();
    render(<SpritePicker {...defaultProps} onAvatarChange={onAvatarChange} />);

    await user.click(screen.getByTitle(allSpecies[0]!));

    expect(onAvatarChange).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Something went wrong");
  });

  it("shows Remove avatar button when currentAvatarUrl is set", () => {
    render(
      <SpritePicker
        {...defaultProps}
        currentAvatarUrl="https://play.pokemonshowdown.com/sprites/gen5/pikachu.png"
      />
    );

    expect(screen.getByText("Remove avatar")).toBeInTheDocument();
  });

  it("does not show Remove avatar button when no avatar set", () => {
    render(<SpritePicker {...defaultProps} currentAvatarUrl={null} />);

    expect(screen.queryByText("Remove avatar")).not.toBeInTheDocument();
  });

  it("calls removeAltAvatar and onAvatarChange(null) on remove", async () => {
    const user = userEvent.setup();
    const onAvatarChange = jest.fn();
    render(
      <SpritePicker
        {...defaultProps}
        currentAvatarUrl="https://play.pokemonshowdown.com/sprites/gen5/pikachu.png"
        onAvatarChange={onAvatarChange}
      />
    );

    await user.click(screen.getByText("Remove avatar"));

    expect(mockRemoveAltAvatar).toHaveBeenCalledWith(1);
    expect(onAvatarChange).toHaveBeenCalledWith(null);
    expect(toast.success).toHaveBeenCalledWith("Avatar removed");
  });

  it("shows error toast when removeAltAvatar fails", async () => {
    mockRemoveAltAvatar.mockResolvedValue({
      success: false,
      error: "Remove failed",
    });

    const user = userEvent.setup();
    render(
      <SpritePicker
        {...defaultProps}
        currentAvatarUrl="https://play.pokemonshowdown.com/sprites/gen5/pikachu.png"
      />
    );

    await user.click(screen.getByText("Remove avatar"));

    expect(toast.error).toHaveBeenCalledWith("Remove failed");
  });

  it("highlights the currently selected sprite", () => {
    const sprite = getPokemonSprite(allSpecies[0]!);
    render(<SpritePicker {...defaultProps} currentAvatarUrl={sprite.url} />);

    const selectedButton = screen.getByTitle(allSpecies[0]!);
    expect(selectedButton.className).toContain("ring-primary");
  });

  it("calls setAltAvatar when selecting a trainer sprite", async () => {
    const user = userEvent.setup();
    const onAvatarChange = jest.fn();
    render(<SpritePicker {...defaultProps} onAvatarChange={onAvatarChange} />);

    await user.click(screen.getByRole("tab", { name: "Trainers" }));

    const trainer = FEATURED_TRAINERS[0]!;
    await user.click(screen.getByTitle(trainer.name));

    expect(mockSetAltAvatar).toHaveBeenCalledWith(
      1,
      expect.stringContaining(trainer.filename)
    );
    expect(onAvatarChange).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith("Avatar updated");
  });
});
