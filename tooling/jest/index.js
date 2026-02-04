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
    ...overrides,
  };
}

module.exports = { createConfig };
