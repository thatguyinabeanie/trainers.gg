/**
 * Tests for SupabaseHashErrorHandler component
 * Verifies hash fragment detection, toast display, and URL cleanup
 */

import React from "react";
import { render } from "@testing-library/react";
import { toast } from "sonner";

import { SupabaseHashErrorHandler } from "../supabase-hash-error-handler";

jest.mock("sonner", () => ({
  toast: {
    error: jest.fn(),
  },
}));

describe("SupabaseHashErrorHandler", () => {
  const originalLocation = window.location;
  const replaceStateSpy = jest.spyOn(history, "replaceState");

  beforeEach(() => {
    jest.clearAllMocks();
    replaceStateSpy.mockImplementation(() => {});
  });

  afterEach(() => {
    // Reset hash
    Object.defineProperty(window, "location", {
      value: originalLocation,
      writable: true,
    });
  });

  afterAll(() => {
    replaceStateSpy.mockRestore();
  });

  function setHash(hash: string) {
    Object.defineProperty(window, "location", {
      value: {
        ...originalLocation,
        hash,
        pathname: "/dashboard",
        search: "",
      },
      writable: true,
    });
  }

  it("shows toast with friendly message for identity_already_exists error", () => {
    setHash(
      "#error=server_error&error_code=identity_already_exists&error_description=Identity+is+already+linked+to+another+user"
    );

    render(<SupabaseHashErrorHandler />);

    expect(toast.error).toHaveBeenCalledWith(
      "That account is already linked to another user. Disconnect it from that account first, or use a different one."
    );
  });

  it("shows toast with friendly message for update_failed error", () => {
    setHash(
      "#error=link_failed&error_code=update_failed&error_description=Failed+to+link+Bluesky+account"
    );

    render(<SupabaseHashErrorHandler />);

    expect(toast.error).toHaveBeenCalledWith(
      "Something went wrong while linking your account. Please try again."
    );
  });

  it("falls back to error_description for unknown error codes", () => {
    setHash(
      "#error=server_error&error_code=some_unknown_code&error_description=Something+unexpected+happened"
    );

    render(<SupabaseHashErrorHandler />);

    expect(toast.error).toHaveBeenCalledWith("Something unexpected happened");
  });

  it("shows generic fallback when no error_description provided", () => {
    setHash("#error=server_error&error_code=&error_description=");

    render(<SupabaseHashErrorHandler />);

    expect(toast.error).toHaveBeenCalledWith(
      "Something went wrong linking your account."
    );
  });

  it("cleans the hash from the URL via history.replaceState", () => {
    setHash(
      "#error=server_error&error_code=identity_already_exists&error_description=test"
    );

    render(<SupabaseHashErrorHandler />);

    expect(replaceStateSpy).toHaveBeenCalledWith(null, "", "/dashboard");
  });

  it("does nothing when there is no hash fragment", () => {
    setHash("");

    render(<SupabaseHashErrorHandler />);

    expect(toast.error).not.toHaveBeenCalled();
    expect(replaceStateSpy).not.toHaveBeenCalled();
  });

  it("does nothing when hash does not contain error=", () => {
    setHash("#section=linked-accounts");

    render(<SupabaseHashErrorHandler />);

    expect(toast.error).not.toHaveBeenCalled();
    expect(replaceStateSpy).not.toHaveBeenCalled();
  });
});
