/**
 * Convex Auth Configuration for Clerk Integration
 *
 * This configures Convex to accept JWT tokens from Clerk.
 * The JWT tokens are validated using the JWKS stored in environment variables.
 */

const authConfig = {
  providers: [
    {
      domain: "https://witty-urchin-56.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
};

export default authConfig;
