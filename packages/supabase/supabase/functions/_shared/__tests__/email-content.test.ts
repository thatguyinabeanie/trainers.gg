import {
  buildOrgApprovedContent,
  buildOrgRejectedContent,
  buildSignupConfirmContent,
  buildPasswordResetContent,
  buildMagicLinkContent,
  buildEmailChangeContent,
  buildReauthContent,
  formatOtp,
} from "../email-content";

describe("formatOtp", () => {
  it("formats 6-digit code with space in the middle", () => {
    expect(formatOtp("384291")).toBe("384 291");
  });

  it("handles codes with fewer than 6 digits", () => {
    expect(formatOtp("1234")).toBe("12 34");
  });
});

describe("buildOrgApprovedContent", () => {
  const content = buildOrgApprovedContent(
    "Pallet Town League",
    "pallet-town-league"
  );

  it("returns the correct subject", () => {
    expect(content.subject).toBe("Your organization has been approved!");
  });

  it("includes the community name in the body", () => {
    expect(content.body).toContain("Pallet Town League");
  });

  it("includes a CTA linking to the community page", () => {
    expect(content.body).toContain("/organizations/pallet-town-league");
    expect(content.body).toContain("View Your Organization");
  });

  it("includes plain text alternative", () => {
    expect(content.text).toContain("Pallet Town League");
    expect(content.text).toContain("approved");
  });

  it("escapes HTML in community name", () => {
    const xss = buildOrgApprovedContent(
      "<script>alert('xss')</script>",
      "test"
    );
    expect(xss.body).not.toContain("<script>");
    expect(xss.body).toContain("&lt;script&gt;");
  });
});

describe("buildOrgRejectedContent", () => {
  it("returns the correct subject", () => {
    const content = buildOrgRejectedContent("Bad Org", null);
    expect(content.subject).toBe("Organization request update");
  });

  it("includes admin notes when provided", () => {
    const content = buildOrgRejectedContent("Bad Org", "Name conflict");
    expect(content.body).toContain("Name conflict");
    expect(content.body).toContain("Reason");
  });

  it("omits notes section when null", () => {
    const content = buildOrgRejectedContent("Bad Org", null);
    expect(content.body).not.toContain("Reason");
  });

  it("escapes HTML in admin notes", () => {
    const content = buildOrgRejectedContent(
      "Org",
      "<img src=x onerror=alert(1)>"
    );
    expect(content.body).not.toContain("<img");
    expect(content.body).toContain("&lt;img");
  });

  it("includes plain text alternative", () => {
    const content = buildOrgRejectedContent("Bad Org", "Name conflict");
    expect(content.text).toContain("Bad Org");
    expect(content.text).toContain("not approved");
  });
});

describe("buildSignupConfirmContent", () => {
  const content = buildSignupConfirmContent("384291");

  it("returns the correct subject", () => {
    expect(content.subject).toBe("Confirm your email");
  });

  it("includes the formatted OTP code", () => {
    expect(content.body).toContain("384 291");
  });

  it("uses monospace styling for OTP", () => {
    expect(content.body).toContain("email-otp");
  });

  it("includes plain text with code", () => {
    expect(content.text).toContain("384 291");
  });
});

describe("buildPasswordResetContent", () => {
  const content = buildPasswordResetContent(
    "https://trainers.gg/auth/confirm?token_hash=abc&type=recovery"
  );

  it("returns the correct subject", () => {
    expect(content.subject).toBe("Reset your password");
  });

  it("includes a CTA with the reset URL", () => {
    expect(content.body).toContain(
      "https://trainers.gg/auth/confirm?token_hash=abc&amp;type=recovery"
    );
    expect(content.body).toContain("Reset Password");
  });

  it("includes plain text with URL", () => {
    expect(content.text).toContain(
      "https://trainers.gg/auth/confirm?token_hash=abc&type=recovery"
    );
  });
});

describe("buildMagicLinkContent", () => {
  const content = buildMagicLinkContent(
    "https://trainers.gg/auth/confirm?token_hash=xyz&type=magiclink"
  );

  it("returns the correct subject", () => {
    expect(content.subject).toBe("Sign in to trainers.gg");
  });

  it("includes a CTA with the sign-in URL", () => {
    expect(content.body).toContain("Sign In");
  });

  it("includes plain text with URL", () => {
    expect(content.text).toContain(
      "https://trainers.gg/auth/confirm?token_hash=xyz&type=magiclink"
    );
  });
});

describe("buildEmailChangeContent", () => {
  const content = buildEmailChangeContent("741058");

  it("returns the correct subject", () => {
    expect(content.subject).toBe("Confirm your new email");
  });

  it("includes the formatted OTP code", () => {
    expect(content.body).toContain("741 058");
  });
});

describe("buildReauthContent", () => {
  const content = buildReauthContent("562830");

  it("returns the correct subject", () => {
    expect(content.subject).toBe("Verify your identity");
  });

  it("includes the formatted OTP code", () => {
    expect(content.body).toContain("562 830");
  });
});
