import { config } from "./ass-paths.js";
export const params = {
  logger: config.logger ?? true,
  displayName: config.browser_set?.name || "NEBRAS",
  browser: config.browser_set?.browser || "Safari",
  scanAttempts: config.scanAttempts || 3,
  reconnectAttempts:"100",
  prefixes: config.prefixes || [".", "!"],
};
