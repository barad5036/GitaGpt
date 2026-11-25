import crypto from "node:crypto";

/**
 * Envelope Encryption Engine (AES-256-GCM + HKDF-SHA256 + AAD Context Binding)
 *
 * Format of every encrypted payload (both wrapped DEKs and field ciphertexts):
 *   v{keyVersion}:{iv_b64}:{ciphertext_b64}:{authTag_b64}
 *
 * GCM Rules Enforced:
 * - 256-bit (32-byte) keys only
 * - Fresh 96-bit (12-byte) crypto.randomBytes(12) IV on every encryption
 * - 128-bit (16-byte) authentication tag verified in constant time by GCM
 * - Context-bound AAD: "${userId}:${recordId}:${field}" prevents row/user/field swapping
 */

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 12; // 96-bit IV per NIST SP 800-38D
const KEY_BYTES = 32; // 256-bit key
const TAG_BYTES = 16; // 128-bit auth tag

export const KEY_PURPOSES = Object.freeze({
  MESSAGES: "gitagpt:subkey:messages:v1",
  MEMORIES: "gitagpt:subkey:memories:v1",
  TITLES: "gitagpt:subkey:titles:v1",
  PII: "gitagpt:subkey:pii:v1",
  BLIND_INDEX: "gitagpt:subkey:blind_index:v1"
});

/**
 * Validates and loads the 32-byte Master Key (KEK) from a 64-char hex string.
 * Fails fast if missing or invalid length.
 */
export function parseMasterKey(kekHex, expectedVersion = 1) {
  if (!kekHex || typeof kekHex !== "string") {
    throw new Error("FATAL: Master Key (MASTER_KEK_HEX) is missing.");
  }
  const clean = kekHex.trim();
  if (!/^[0-9a-fA-F]{64}$/.test(clean)) {
    throw new Error(
      "FATAL: Master Key (MASTER_KEK_HEX) must be exactly 32 bytes (64 hex characters)."
    );
  }
  const keyBuffer = Buffer.from(clean, "hex");
  if (keyBuffer.length !== KEY_BYTES) {
    throw new Error("FATAL: Master Key buffer length mismatch.");
  }
  return {
    version: Number(expectedVersion) || 1,
    key: keyBuffer
  };
}

/**
 * Generates a fresh 32-byte random Data Encryption Key (DEK) for a user.
 */
export function generateUserDek() {
  return crypto.randomBytes(KEY_BYTES);
}

/**
 * Wraps (encrypts) a user's 32-byte DEK using the Master Key (KEK) with AES-256-GCM
 * and binds it to the user's ID via AAD.
 */
export function wrapUserDek(dekBuffer, masterKeyObj, userId) {
  if (!Buffer.isBuffer(dekBuffer) || dekBuffer.length !== KEY_BYTES) {
    throw new Error("Invalid DEK buffer: must be 32 bytes.");
  }
  if (!userId) {
    throw new Error("userId is required for DEK AAD binding.");
  }
  const iv = crypto.randomBytes(IV_BYTES);
  const aad = Buffer.from(`dek:${userId}`, "utf8");

  const cipher = crypto.createCipheriv(ALGORITHM, masterKeyObj.key, iv, {
    authTagLength: TAG_BYTES
  });
  cipher.setAAD(aad);

  const encrypted = Buffer.concat([cipher.update(dekBuffer), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `v${masterKeyObj.version}:${iv.toString("base64")}:${encrypted.toString(
    "base64"
  )}:${authTag.toString("base64")}`;
}

/**
 * Unwraps (decrypts) a user's wrapped DEK using the matching KEK version.
 * Supports a keyring map { [version]: Buffer } for seamless KEK rotation.
 */
export function unwrapUserDek(wrappedDekString, kekOrKeyring, userId) {
  if (!wrappedDekString || typeof wrappedDekString !== "string") {
    throw new Error("Invalid wrapped DEK payload.");
  }
  if (!userId) {
    throw new Error("userId is required to unwrap DEK.");
  }

  const parts = wrappedDekString.split(":");
  if (parts.length !== 4 || !parts[0].startsWith("v")) {
    throw new Error("Malformed wrapped DEK format.");
  }

  const version = parseInt(parts[0].slice(1), 10);
  const iv = Buffer.from(parts[1], "base64");
  const ciphertext = Buffer.from(parts[2], "base64");
  const authTag = Buffer.from(parts[3], "base64");

  if (iv.length !== IV_BYTES || authTag.length !== TAG_BYTES) {
    throw new Error("Invalid IV or AuthTag length in wrapped DEK.");
  }

  const kekBuffer = resolveKeyFromRing(kekOrKeyring, version);
  const aad = Buffer.from(`dek:${userId}`, "utf8");

  const decipher = crypto.createDecipheriv(ALGORITHM, kekBuffer, iv, {
    authTagLength: TAG_BYTES
  });
  decipher.setAAD(aad);
  decipher.setAuthTag(authTag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

function resolveKeyFromRing(kekOrKeyring, version) {
  if (Buffer.isBuffer(kekOrKeyring)) return kekOrKeyring;
  if (kekOrKeyring?.key && Buffer.isBuffer(kekOrKeyring.key)) {
    if (kekOrKeyring.version && kekOrKeyring.version !== version) {
      throw new Error(
        `KEK version mismatch: payload requires v${version}, active is v${kekOrKeyring.version}`
      );
    }
    return kekOrKeyring.key;
  }
  if (kekOrKeyring && typeof kekOrKeyring === "object" && kekOrKeyring[version]) {
    return kekOrKeyring[version];
  }
  throw new Error(`No KEK available for key version v${version}`);
}

/**
 * Re-wraps a user's DEK from oldKek to newKek without touching any encrypted user rows!
 */
export function rotateWrappedDek(wrappedDekString, oldKekObj, newKekObj, userId) {
  const rawDek = unwrapUserDek(wrappedDekString, oldKekObj, userId);
  try {
    return wrapUserDek(rawDek, newKekObj, userId);
  } finally {
    rawDek.fill(0); // Zero out sensitive DEK in memory after re-wrapping
  }
}

/**
 * Derives a 32-byte purpose-specific subkey from a user's DEK via HKDF-SHA256.
 */
export function derivePurposeSubkey(dekBuffer, userId, purpose) {
  if (!Buffer.isBuffer(dekBuffer) || dekBuffer.length !== KEY_BYTES) {
    throw new Error("DEK must be a 32-byte Buffer.");
  }
  if (!Object.values(KEY_PURPOSES).includes(purpose)) {
    throw new Error(`Unsupported key purpose: ${purpose}`);
  }
  const salt = Buffer.from(`gitagpt:hkdf:salt:${userId}`, "utf8");
  const info = Buffer.from(purpose, "utf8");
  const derived = crypto.hkdfSync("sha256", dekBuffer, salt, info, KEY_BYTES);
  return Buffer.from(derived);
}

/**
 * Builds canonical Additional Authenticated Data (AAD) binding ciphertext
 * to a specific user, record ID, and column/field name.
 */
export function buildFieldAad({ userId, recordId, field }) {
  if (!userId || !recordId || !field) {
    throw new Error("AAD requires userId, recordId, and field.");
  }
  return Buffer.from(`${userId}|${recordId}|${field}`, "utf8");
}

/**
 * Encrypts a plaintext string field using a derived subkey and AAD binding.
 * Format: v{dekVersion}:{iv_b64}:{ciphertext_b64}:{authTag_b64}
 */
export function encryptField({
  plaintext,
  dekBuffer,
  dekVersion = 1,
  purpose,
  userId,
  recordId,
  field
}) {
  if (typeof plaintext !== "string") {
    throw new Error("Plaintext must be a string.");
  }
  const subkey = derivePurposeSubkey(dekBuffer, userId, purpose);
  const iv = crypto.randomBytes(IV_BYTES);
  const aad = buildFieldAad({ userId, recordId, field });

  try {
    const cipher = crypto.createCipheriv(ALGORITHM, subkey, iv, {
      authTagLength: TAG_BYTES
    });
    cipher.setAAD(aad);

    const encrypted = Buffer.concat([
      cipher.update(Buffer.from(plaintext, "utf8")),
      cipher.final()
    ]);
    const authTag = cipher.getAuthTag();

    return `v${dekVersion}:${iv.toString("base64")}:${encrypted.toString(
      "base64"
    )}:${authTag.toString("base64")}`;
  } finally {
    subkey.fill(0);
  }
}

/**
 * Decrypts a field ciphertext string, verifying AAD and GCM authentication tag.
 */
export function decryptField({
  ciphertextPayload,
  dekOrKeyring,
  purpose,
  userId,
  recordId,
  field
}) {
  if (!ciphertextPayload || typeof ciphertextPayload !== "string") {
    throw new Error("Invalid ciphertext payload.");
  }
  const parts = ciphertextPayload.split(":");
  if (parts.length !== 4 || !parts[0].startsWith("v")) {
    throw new Error("Malformed field ciphertext format.");
  }

  const version = parseInt(parts[0].slice(1), 10);
  const iv = Buffer.from(parts[1], "base64");
  const ciphertext = Buffer.from(parts[2], "base64");
  const authTag = Buffer.from(parts[3], "base64");

  if (iv.length !== IV_BYTES || authTag.length !== TAG_BYTES) {
    throw new Error("Invalid IV or AuthTag length.");
  }

  const dekBuffer = resolveKeyFromRing(dekOrKeyring, version);
  const subkey = derivePurposeSubkey(dekBuffer, userId, purpose);
  const aad = buildFieldAad({ userId, recordId, field });

  try {
    const decipher = crypto.createDecipheriv(ALGORITHM, subkey, iv, {
      authTagLength: TAG_BYTES
    });
    decipher.setAAD(aad);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(ciphertext),
      decipher.final()
    ]);
    return decrypted.toString("utf8");
  } finally {
    subkey.fill(0);
  }
}

/**
 * Computes per-user HMAC-SHA256 blind index tokens for encrypted search
 * without exposing plaintext keywords in SQL.
 */
export function computeSearchBlindIndex(text, dekBuffer, userId) {
  if (!text || typeof text !== "string") return [];
  const subkey = derivePurposeSubkey(
    dekBuffer,
    userId,
    KEY_PURPOSES.BLIND_INDEX
  );
  try {
    const tokens = text
      .toLowerCase()
      .split(/[^\p{L}\p{M}\p{N}]+/u)
      .filter((w) => w.length >= 2)
      .slice(0, 25);

    const unique = [...new Set(tokens)];
    return unique.map((word) =>
      crypto
        .createHmac("sha256", subkey)
        .update(word, "utf8")
        .digest("hex")
        .slice(0, 32)
    );
  } finally {
    subkey.fill(0);
  }
}

/**
 * Constant-time string comparison for OTPs, CSRF tokens, and hashes.
 */
export function constantTimeEqual(a = "", b = "") {
  const bufA = Buffer.from(String(a), "utf8");
  const bufB = Buffer.from(String(b), "utf8");
  if (bufA.length !== bufB.length) {
    // Still run timingSafeEqual against bufA to avoid leaking length timing
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}
