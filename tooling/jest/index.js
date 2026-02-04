// @ts-check

/**
 * Shared Jest defaults for the trainers.gg monorepo.
 *
 * @param {import("jest").Config} overrides - package-specific config
 * @returns {import("jest").Config}
 */
function createConfig(overrides = {}) {
  return {
    testEnvironment: "node",
    transform: { "^.+\\.tsx?$": ["ts-jest", { useESM: true }] },
    extensionsToTreatAsEsm: [".ts"],
    coverageDirectory: "<rootDir>/coverage",
    coverageReporters: ["text", "lcov", "json-summary", "cobertura"],
    ...overrides,
  };
}

module.exports = { createConfig };
