import { render } from "@testing-library/react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

describe("Avatar", () => {
  it("includes the overlay border class by default", () => {
    const { container } = render(
      <Avatar>
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>
    );
    const root = container.querySelector("[data-slot='avatar']");
    expect(root?.className).toContain("after:border");
    expect(root?.className).not.toContain("after:hidden");
  });

  it("suppresses the overlay border when noBorder is true", () => {
    const { container } = render(
      <Avatar noBorder>
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>
    );
    const root = container.querySelector("[data-slot='avatar']");
    expect(root?.className).toContain("after:hidden");
  });

  it("passes size data attribute correctly", () => {
    const { container } = render(
      <Avatar size="lg">
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>
    );
    const root = container.querySelector("[data-slot='avatar']");
    expect(root).toHaveAttribute("data-size", "lg");
  });

  it("merges custom className", () => {
    const { container } = render(
      <Avatar className="h-16 w-16 rounded-md">
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>
    );
    const root = container.querySelector("[data-slot='avatar']");
    expect(root?.className).toContain("h-16");
    expect(root?.className).toContain("w-16");
    expect(root?.className).toContain("rounded-md");
  });

  it("renders AvatarFallback with avatar-fallback slot", () => {
    const { container } = render(
      <Avatar>
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>
    );
    expect(
      container.querySelector("[data-slot='avatar-fallback']")
    ).toBeInTheDocument();
  });
});
