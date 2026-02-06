/* global __dirname */
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Support dynamic port allocation for worktrees
if (process.env.EXPO_PORT) {
  config.server = config.server || {};
  config.server.port = parseInt(process.env.EXPO_PORT, 10);
}

module.exports = config;
