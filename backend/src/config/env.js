import crypto from "node:crypto";
import { parseMasterKey } from "../crypto/envelope.js";

/**
 * Strict Boot-Time Environment Schema Validator.
 * Fails fast if MASTER_KEK_HEX or JWT_ACCESS_SECRET is missing or invalid length.
 */
export function loadAndValidateEnv(rawEnv = process.env) {
  const nodeEnv = rawEnv.NODE_ENV || "development";
  const isProd = nodeEnv === "production";

  // In development/test only, allow fallback ephemeral keys if .env is not yet created,
  // but in production fail fast immediately if missing!
  const kekHex =
    rawEnv.MASTER_KEK_HEX ||
    (!isProd
      ? "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
      : "");

  const masterKey = parseMasterKey(kekHex, rawEnv.MASTER_KEK_VERSION || 1);

  const keyring = {
    [masterKey.version]: masterKey.key
  };

  if (rawEnv.MASTER_KEK_PREV_HEX) {
    const prev = parseMasterKey(
      rawEnv.MASTER_KEK_PREV_HEX,
      rawEnv.MASTER_KEK_PREV_VERSION || 1
    );
    keyring[prev.version] = prev.key;
  }

  const jwtSecret =
    rawEnv.JWT_ACCESS_SECRET ||
    (!isProd
      ? "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210"
      : "");

  if (!jwtSecret || jwtSecret.length < 32) {
    throw new Error(
      "FATAL: JWT_ACCESS_SECRET must be set and at least 32 characters long."
    );
  }

  const allowedOrigins = (
    rawEnv.ALLOWED_ORIGINS ||
    "http://localhost:5173,http://127.0.0.1:5173,https://localhost,capacitor://localhost"
  )
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return Object.freeze({
    nodeEnv,
    isProd,
    port: parseInt(rawEnv.PORT || "8000", 10),
    masterKey,
    keyring,
    jwtSecret: Buffer.from(jwtSecret, "utf8"),
    accessTokenTtlSec: parseInt(rawEnv.ACCESS_TOKEN_TTL_SEC || "900", 10),
    refreshTokenTtlDays: parseInt(rawEnv.REFRESH_TOKEN_TTL_DAYS || "30", 10),
    databaseUrl:
      rawEnv.DATABASE_URL ||
      "postgresql://gitagpt:gitagpt_secret@localhost:5432/gitagpt",
    googleClientIds: [
      rawEnv.GOOGLE_WEB_CLIENT_ID,
      rawEnv.GOOGLE_ANDROID_CLIENT_ID
    ].filter(Boolean),
    allowedOrigins,
    rateLimitPerMin: parseInt(rawEnv.RATE_LIMIT_PER_MIN || "60", 10),
    userDailyQuota: parseInt(rawEnv.USER_DAILY_QUOTA || "200", 10),
    guestDailyQuota: parseInt(rawEnv.GUEST_DAILY_QUOTA || "15", 10),
    llmBaseUrl:
      rawEnv.LLM_BASE_URL || "https://text.pollinations.ai/openai",
    llmModel: rawEnv.LLM_MODEL || "openai",
    llmApiKey: rawEnv.LLM_API_KEY || ""
  });
}
