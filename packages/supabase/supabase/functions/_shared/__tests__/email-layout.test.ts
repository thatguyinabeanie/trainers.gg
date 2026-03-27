import { buildEmailLayout } from "../email-layout";

describe("buildEmailLayout", () => {
  const result = buildEmailLayout({
    title: "Test Email",
    body: "<h2>Hello</h2><p>World</p>",
  });

  it("returns a complete HTML document", () => {
    expect(result).toContain("<!DOCTYPE html>");
    expect(result).toContain("</html>");
  });

  it("includes the title", () => {
    expect(result).toContain("<title>Test Email</title>");
  });

  it("includes the body content", () => {
    expect(result).toContain("<h2>Hello</h2><p>World</p>");
  });

  it("includes the trainers.gg wordmark", () => {
    expect(result).toContain("trainers.gg");
  });

  it("includes the teal accent divider", () => {
    expect(result).toContain("width: 40px");
    expect(result).toContain("height: 2px");
    expect(result).toContain("#0d9488");
  });

  it("includes dark mode media query", () => {
    expect(result).toContain("prefers-color-scheme: dark");
  });

  it("uses the correct light mode colors", () => {
    expect(result).toContain("#f5f5f5");
    expect(result).toContain("#ffffff");
  });

  it("uses the correct dark mode colors", () => {
    expect(result).toContain("#0a0a0a");
    expect(result).toContain("#171717");
    expect(result).toContain("#2dd4bf");
  });

  it("uses email-safe table layout", () => {
    expect(result).toContain('role="presentation"');
    expect(result).toContain("cellpadding");
  });

  it("includes the default footer", () => {
    expect(result).toContain("© 2026 trainers&zwnj;.gg");
  });

  it("supports custom footer text", () => {
    const custom = buildEmailLayout({
      title: "Test",
      body: "<p>Body</p>",
      footer: "Custom footer",
    });
    expect(custom).toContain("Custom footer");
  });

  it("sets max-width to 480px", () => {
    expect(result).toContain("max-width: 480px");
  });

  it("uses the correct font stack", () => {
    expect(result).toContain("-apple-system");
    expect(result).toContain("Inter");
  });
});
