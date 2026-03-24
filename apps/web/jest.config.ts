import type { Config } from "jest";
import { createConfig } from "@trainers/test-utils/jest-config";

const config: Config = createConfig({
  displayName: "web",
  testEnvironment: "jsdom",
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  moduleNameMapper: { "^@/(.*)$": "<rootDir>/src/$1" },
  setupFilesAfterEnv: ["<rootDir>/src/test-setup.ts"],
  testMatch: ["<rootDir>/src/**/__tests__/**/*.test.{ts,tsx}"],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/__tests__/**",
    "!src/**/*.test.{ts,tsx}",
    "!src/**/test-setup.ts",
    "!src/components/ui/**",
    "!src/generated/**",
    // Next.js App Router route files — presentational React components.
    // Business logic is tested via actions/, lib/, and shared packages.
    "!src/app/**/page.tsx",
    "!src/app/**/loading.tsx",
    "!src/app/**/layout.tsx",
    "!src/app/**/error.tsx",
    // Route-colocated UI components — JSX composition with shared primitives.
    // Interactive logic (mutations, validation) is tested in actions/ and packages/.
    "!src/app/**/columns.tsx",
  ],
});

export default config;
