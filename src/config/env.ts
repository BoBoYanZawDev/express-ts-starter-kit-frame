import "dotenv/config";

function integer(name: string, fallback: number, min = 1, max = Number.MAX_SAFE_INTEGER) {
  const raw = process.env[name];
  if (!raw?.trim()) return fallback;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}`);
  }
  return value;
}
const nodeEnv = process.env.NODE_ENV?.trim() || "development";
if (!["development", "test", "production"].includes(nodeEnv)) {
  throw new Error("NODE_ENV must be development, test, or production");
}
const logLevel = process.env.LOG_LEVEL?.trim() || "info";
if (!["error", "warn", "info", "http", "verbose", "debug", "silly"].includes(logLevel)) {
  throw new Error("LOG_LEVEL is invalid");
}
export const env = {
  nodeEnv,
  port: integer("PORT", 3000, 1, 65535),
  corsOrigins: (process.env.CORS_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean),
  trustProxyHops: integer("TRUST_PROXY_HOPS", 0, 0),
  rateLimitWindowMs: integer("RATE_LIMIT_WINDOW_MS", 120_000, 1, 2_147_483_647),
  rateLimitMax: integer("RATE_LIMIT_MAX", 200),
  logLevel,
  logToFile: process.env.LOG_TO_FILE === "true",
};
