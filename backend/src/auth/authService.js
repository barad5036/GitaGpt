import crypto from "node:crypto";
import { constantTimeEqual } from "../crypto/envelope.js";

/**
 * Self-Hosted Authentication Service
 * - Short-lived HS256 Access JWTs (10-15 min)
 * - Rotating Refresh Tokens (stored SHA-256 hashed in DB, with family reuse-detection)
 * - Google ID Token Verification (signature, audience, issuer, expiry, email_verified)
 * - Email + 6-digit OTP (constant-time comparison)
 */

function base64UrlEncode(bufOrStr) {
  const buf = Buffer.isBuffer(bufOrStr)
    ? bufOrStr
    : Buffer.from(bufOrStr, "utf8");
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(str) {
  let b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4 !== 0) b64 += "=";
  return Buffer.from(b64, "base64");
}

/**
 * Signs a short-lived Access JWT (default 15 minutes = 900s).
 */
export function signAccessJwt(payload, secretBuf, ttlSec = 900) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const body = {
    ...payload,
    iat: now,
    exp: now + ttlSec,
    iss: "gitagpt-selfhosted"
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedBody = base64UrlEncode(JSON.stringify(body));
  const signingInput = `${encodedHeader}.${encodedBody}`;

  const signature = crypto
    .createHmac("sha256", secretBuf)
    .update(signingInput, "utf8")
    .digest();

  return `${signingInput}.${base64UrlEncode(signature)}`;
}

/**
 * Verifies an Access JWT in constant time and checks expiration & issuer.
 */
export function verifyAccessJwt(token, secretBuf) {
  if (!token || typeof token !== "string") {
    throw new Error("Missing access token");
  }
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw new Error("Malformed JWT");
  }

  const [encodedHeader, encodedBody, encodedSig] = parts;
  const signingInput = `${encodedHeader}.${encodedBody}`;
  const expectedSig = base64UrlEncode(
    crypto.createHmac("sha256", secretBuf).update(signingInput, "utf8").digest()
  );

  if (!constantTimeEqual(encodedSig, expectedSig)) {
    throw new Error("Invalid JWT signature");
  }

  const payload = JSON.parse(base64UrlDecode(encodedBody).toString("utf8"));
  const now = Math.floor(Date.now() / 1000);
  if (!payload.exp || payload.exp <= now) {
    throw new Error("Access JWT expired");
  }
  if (payload.iss !== "gitagpt-selfhosted") {
    throw new Error("Invalid JWT issuer");
  }

  return payload;
}

/**
 * Generates a high-entropy 32-byte Refresh Token and its SHA-256 hash for DB storage.
 * Raw refresh token is sent to client (httpOnly cookie / Android Keystore); ONLY hash is stored in DB.
 */
export function generateRefreshTokenPair(familyId = null) {
  const rawToken = base64UrlEncode(crypto.randomBytes(32));
  const tokenHash = hashRefreshToken(rawToken);
  return {
    rawToken,
    tokenHash,
    familyId: familyId || crypto.randomUUID()
  };
}

export function hashRefreshToken(rawToken) {
  return crypto
    .createHash("sha256")
    .update(String(rawToken), "utf8")
    .digest("hex");
}

/**
 * Verifies a Google ID Token against Google's tokeninfo / certs endpoint,
 * validating issuer, audience (our web/Android client IDs), expiry, and email_verified.
 */
export async function verifyGoogleIdToken(idToken, allowedClientIds = []) {
  if (!idToken || typeof idToken !== "string") {
    throw new Error("Missing Google ID token");
  }

  const res = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(
      idToken
    )}`
  );
  if (!res.ok) {
    throw new Error("Google ID token verification failed");
  }

  const claims = await res.json();
  const validIssuers = ["https://accounts.google.com", "accounts.google.com"];
  if (!validIssuers.includes(claims.iss)) {
    throw new Error("Invalid Google token issuer");
  }

  const now = Math.floor(Date.now() / 1000);
  if (Number(claims.exp) <= now) {
    throw new Error("Google ID token expired");
  }

  if (
    allowedClientIds.length > 0 &&
    !allowedClientIds.includes(claims.aud)
  ) {
    throw new Error("Google ID token audience mismatch");
  }

  if (String(claims.email_verified) !== "true") {
    throw new Error("Google email is not verified");
  }

  return {
    providerUserId: claims.sub,
    email: claims.email.toLowerCase(),
    name: claims.name || claims.email.split("@")[0]
  };
}

/**
 * Generates a cryptographically random 6-digit OTP and its SHA-256 hash.
 */
export function generateEmailOtp() {
  const code = String(crypto.randomInt(100000, 999999));
  const hash = crypto.createHash("sha256").update(code, "utf8").digest("hex");
  return { code, hash, expiresAt: Date.now() + 10 * 60 * 1000 };
}

export function verifyEmailOtp(inputCode, expectedHash, expiresAt) {
  if (Date.now() > expiresAt) return false;
  const inputHash = crypto
    .createHash("sha256")
    .update(String(inputCode).trim(), "utf8")
    .digest("hex");
  return constantTimeEqual(inputHash, expectedHash);
}
