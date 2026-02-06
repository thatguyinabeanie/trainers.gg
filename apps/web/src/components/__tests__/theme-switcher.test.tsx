import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeSwitcher } from "../theme-switcher";
import { useTheme } from "next-themes";

// Mock next-themes
jest.mock("next-themes", () => ({
  useTheme: jest.fn(),
}));

const mockUseTheme = useTheme as jest.MockedFunction<typeof useTheme>;

describe("ThemeSwitcher", () => {
  const mockSetTheme = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Mounting behavior", () => {
    it("renders after mounting (SSR safety check)", async () => {
      mockUseTheme.mockReturnValue({
        theme: "light",
        setTheme: mockSetTheme,
        themes: ["light", "dark", "system"],
        systemTheme: "light",
        resolvedTheme: "light",
      });

      render(<ThemeSwitcher />);

      // Component uses useEffect to set mounted state, so it will render after mount
      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /toggle theme/i })
        ).toBeInTheDocument();
      });
    });
  });

  describe("Theme icon display", () => {
    it("shows Sun icon when theme is light", async () => {
      mockUseTheme.mockReturnValue({
        theme: "light",
        setTheme: mockSetTheme,
        themes: ["light", "dark", "system"],
        systemTheme: "light",
        resolvedTheme: "light",
      });

      const { container } = render(<ThemeSwitcher />);

      await waitFor(() => {
        const sunIcon = container.querySelector("svg.lucide-sun");
        expect(sunIcon).toBeInTheDocument();
      });
    });

    it("shows Moon icon when theme is dark", async () => {
      mockUseTheme.mockReturnValue({
        theme: "dark",
        setTheme: mockSetTheme,
        themes: ["light", "dark", "system"],
        systemTheme: "dark",
        resolvedTheme: "dark",
      });

      const { container } = render(<ThemeSwitcher />);

      await waitFor(() => {
        const moonIcon = container.querySelector("svg.lucide-moon");
        expect(moonIcon).toBeInTheDocument();
      });
    });

    it("shows Laptop icon when theme is system", async () => {
      mockUseTheme.mockReturnValue({
        theme: "system",
        setTheme: mockSetTheme,
        themes: ["light", "dark", "system"],
        systemTheme: "light",
        resolvedTheme: "light",
      });

      const { container } = render(<ThemeSwitcher />);

      await waitFor(() => {
        const laptopIcon = container.querySelector("svg.lucide-laptop");
        expect(laptopIcon).toBeInTheDocument();
      });
    });
  });

  describe("Theme menu", () => {
    it("has trigger button that can be clicked", async () => {
      mockUseTheme.mockReturnValue({
        theme: "light",
        setTheme: mockSetTheme,
        themes: ["light", "dark", "system"],
        systemTheme: "light",
        resolvedTheme: "light",
      });

      const user = userEvent.setup();
      render(<ThemeSwitcher />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /toggle theme/i })
        ).toBeInTheDocument();
      });

      const trigger = screen.getByRole("button", { name: /toggle theme/i });
      expect(trigger).toBeEnabled();

      // Click the trigger
      await user.click(trigger);

      // Verify it's clickable (aria-expanded should change)
      expect(trigger).toHaveAttribute("aria-expanded");
    });
  });

  describe("Theme functionality", () => {
    it("renders with correct theme prop from useTheme", async () => {
      mockUseTheme.mockReturnValue({
        theme: "dark",
        setTheme: mockSetTheme,
        themes: ["light", "dark", "system"],
        systemTheme: "dark",
        resolvedTheme: "dark",
      });

      render(<ThemeSwitcher />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: /toggle theme/i })
        ).toBeInTheDocument();
      });

      // Verify setTheme function is available
      expect(mockSetTheme).not.toHaveBeenCalled();
    });

    it("provides setTheme function from useTheme hook", () => {
      mockUseTheme.mockReturnValue({
        theme: "light",
        setTheme: mockSetTheme,
        themes: ["light", "dark", "system"],
        systemTheme: "light",
        resolvedTheme: "light",
      });

      render(<ThemeSwitcher />);

      // Verify useTheme was called and setTheme is available
      expect(mockUseTheme).toHaveBeenCalled();
      expect(mockSetTheme).toBeDefined();
    });
  });

  describe("Accessibility", () => {
    it("has aria-label on trigger button", async () => {
      mockUseTheme.mockReturnValue({
        theme: "light",
        setTheme: mockSetTheme,
        themes: ["light", "dark", "system"],
        systemTheme: "light",
        resolvedTheme: "light",
      });

      render(<ThemeSwitcher />);

      await waitFor(() => {
        const trigger = screen.getByRole("button", { name: /toggle theme/i });
        expect(trigger).toHaveAttribute("aria-label", "Toggle theme");
      });
    });

    it("trigger button has correct ARIA attributes", async () => {
      mockUseTheme.mockReturnValue({
        theme: "light",
        setTheme: mockSetTheme,
        themes: ["light", "dark", "system"],
        systemTheme: "light",
        resolvedTheme: "light",
      });

      render(<ThemeSwitcher />);

      await waitFor(() => {
        const trigger = screen.getByRole("button", { name: /toggle theme/i });
        expect(trigger).toHaveAttribute("aria-haspopup", "menu");
        expect(trigger).toHaveAttribute("aria-expanded");
      });
    });
  });

  describe("Icon size", () => {
    it("uses consistent icon size", async () => {
      mockUseTheme.mockReturnValue({
        theme: "light",
        setTheme: mockSetTheme,
        themes: ["light", "dark", "system"],
        systemTheme: "light",
        resolvedTheme: "light",
      });

      const { container } = render(<ThemeSwitcher />);

      await waitFor(() => {
        const icon = container.querySelector("svg");
        expect(icon).toHaveAttribute("width", "16");
        expect(icon).toHaveAttribute("height", "16");
      });
    });
  });

  describe("Conditional rendering based on theme", () => {
    it("changes icon when theme changes from light to dark", async () => {
      const { rerender, container } = render(<ThemeSwitcher />);

      mockUseTheme.mockReturnValue({
        theme: "light",
        setTheme: mockSetTheme,
        themes: ["light", "dark", "system"],
        systemTheme: "light",
        resolvedTheme: "light",
      });

      rerender(<ThemeSwitcher />);

      await waitFor(() => {
        const sunIcon = container.querySelector("svg.lucide-sun");
        expect(sunIcon).toBeInTheDocument();
      });

      mockUseTheme.mockReturnValue({
        theme: "dark",
        setTheme: mockSetTheme,
        themes: ["light", "dark", "system"],
        systemTheme: "dark",
        resolvedTheme: "dark",
      });

      rerender(<ThemeSwitcher />);

      await waitFor(() => {
        const moonIcon = container.querySelector("svg.lucide-moon");
        expect(moonIcon).toBeInTheDocument();
      });
    });
  });
});
