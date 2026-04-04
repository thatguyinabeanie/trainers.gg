import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeSwitcher } from "../theme-switcher";

const mockSetTheme = jest.fn();
let mockTheme = "system";

jest.mock("next-themes", () => ({
  useTheme: () => ({ theme: mockTheme, setTheme: mockSetTheme }),
}));

// Mock dropdown to render children directly (no popover behavior)
jest.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  DropdownMenuTrigger: ({
    children,
    ...props
  }: {
    children: React.ReactNode;
    className?: string;
    "aria-label"?: string;
  }) => <button aria-label={props["aria-label"]}>{children}</button>,
  DropdownMenuRadioGroup: ({
    children,
  }: {
    children: React.ReactNode;
    value?: string;
    onValueChange?: (v: string) => void;
  }) => <div>{children}</div>,
  DropdownMenuRadioItem: ({
    children,
    value,
  }: {
    children: React.ReactNode;
    value: string;
    className?: string;
  }) => (
    <button data-value={value} onClick={() => mockSetTheme(value)}>
      {children}
    </button>
  ),
}));

jest.mock("lucide-react", () => ({
  Sun: () => <svg data-testid="icon-sun" />,
  Moon: () => <svg data-testid="icon-moon" />,
  Laptop: () => <svg data-testid="icon-laptop" />,
}));

describe("ThemeSwitcher", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTheme = "system";
  });

  it("renders the theme toggle button after mount", () => {
    render(<ThemeSwitcher />);
    expect(
      screen.getByRole("button", { name: "Toggle theme" })
    ).toBeInTheDocument();
  });

  it("renders Light, Dark, System options", () => {
    render(<ThemeSwitcher />);
    expect(screen.getByText("Light")).toBeInTheDocument();
    expect(screen.getByText("Dark")).toBeInTheDocument();
    expect(screen.getByText("System")).toBeInTheDocument();
  });

  it.each([
    ["light", "Light"],
    ["dark", "Dark"],
    ["system", "System"],
  ])(
    "calls setTheme with '%s' when %s is clicked",
    async (themeValue, label) => {
      const user = userEvent.setup();
      render(<ThemeSwitcher />);

      await user.click(screen.getByText(label));
      expect(mockSetTheme).toHaveBeenCalledWith(themeValue);
    }
  );

  it("shows Laptop icon in trigger when theme is system", () => {
    mockTheme = "system";
    render(<ThemeSwitcher />);
    const button = screen.getByRole("button", { name: "Toggle theme" });
    expect(button.querySelector("[data-testid='icon-laptop']")).toBeTruthy();
  });

  it("shows Sun icon in trigger when theme is light", () => {
    mockTheme = "light";
    render(<ThemeSwitcher />);
    const button = screen.getByRole("button", { name: "Toggle theme" });
    expect(button.querySelector("[data-testid='icon-sun']")).toBeTruthy();
  });

  it("shows Moon icon in trigger when theme is dark", () => {
    mockTheme = "dark";
    render(<ThemeSwitcher />);
    const button = screen.getByRole("button", { name: "Toggle theme" });
    expect(button.querySelector("[data-testid='icon-moon']")).toBeTruthy();
  });
});
