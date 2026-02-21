// @ts-check

/**
 * Shared Jest defaults for the trainers.gg monorepo.
 *
 * @param {import("jest").Config} overrides - Package-specific config values
 *   that override or extend the shared defaults. Spread on top of the base
 *   config, so any matching keys replace the defaults.
 * @returns {import("jest").Config}
 */
function createConfig(overrides = {}) {
  const isCI = process.env.CI === "true";
  const displayName = overrides.displayName || "tests";

  return {
    testEnvironment: "node",
    transform: {
      "^.+\\.tsx?$": [
        "ts-jest",
        {
          useESM: true,
          tsconfig: {
            jsx: "react-jsx",
          },
        },
      ],
    },
    extensionsToTreatAsEsm: [".ts", ".tsx"],
    coverageDirectory: "<rootDir>/coverage",
    // In CI: enable coverage and add junit reporter with monorepo-aware config
    ...(isCI && {
      collectCoverage: true,
      reporters: [
        "default",
        [
          "jest-junit",
          {
            outputDirectory: "<rootDir>/../../test-results",
            outputName: `junit-${displayName}.xml`,
          },
        ],
      ],
    }),
    ...overrides,
  };
}

module.exports = { createConfig };
