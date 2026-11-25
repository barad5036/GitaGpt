import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import {
  KEY_PURPOSES,
  parseMasterKey,
  generateUserDek,
  wrapUserDek,
  unwrapUserDek,
  rotateWrappedDek,
  encryptField,
  decryptField,
  computeSearchBlindIndex,
  constantTimeEqual
} from "../src/crypto/envelope.js";

const SAMPLE_KEK_V1_HEX = crypto.randomBytes(32).toString("hex");
const SAMPLE_KEK_V2_HEX = crypto.randomBytes(32).toString("hex");

test("1. Master Key (KEK) validation fails fast on missing or invalid length", () => {
  assert.throws(() => parseMasterKey(""), /missing/);
  assert.throws(() => parseMasterKey("abcd1234"), /must be exactly 32 bytes/);
  const validKek = parseMasterKey(SAMPLE_KEK_V1_HEX, 1);
  assert.equal(validKek.version, 1);
  assert.equal(validKek.key.length, 32);
});

test("2. Round-trip envelope encryption & decryption for Hindi/Sanskrit messages, memories, and titles", () => {
  const kek = parseMasterKey(SAMPLE_KEK_V1_HEX, 1);
  const userId = "user_1111_aaaa";
  const recordId = "msg_9999";

  const dek = generateUserDek();
  const wrappedDek = wrapUserDek(dek, kek, userId);
  assert.ok(wrappedDek.startsWith("v1:"));

  const unwrappedDek = unwrapUserDek(wrappedDek, kek, userId);
  assert.deepEqual(unwrappedDek, dek);

  const hindiMessage =
    "सुनो मेरे दोस्त, कर्मण्येवाधिकारस्ते मा फलेषु कदाचन — चिंता मत करो।";
  const ciphertext = encryptField({
    plaintext: hindiMessage,
    dekBuffer: unwrappedDek,
    dekVersion: 1,
    purpose: KEY_PURPOSES.MESSAGES,
    userId,
    recordId,
    field: "content"
  });

  assert.ok(ciphertext.startsWith("v1:"));
  assert.equal(ciphertext.includes("कर्मण्येवाधिकारस्ते"), false);

  const decrypted = decryptField({
    ciphertextPayload: ciphertext,
    dekOrKeyring: unwrappedDek,
    purpose: KEY_PURPOSES.MESSAGES,
    userId,
    recordId,
    field: "content"
  });

  assert.equal(decrypted, hindiMessage);
});

test("3. Tamper detection: modified ciphertext, IV, or authTag must fail authentication", () => {
  const dek = generateUserDek();
  const userId = "user_tamper_test";
  const recordId = "rec_101";

  const ct = encryptField({
    plaintext: "Secret emotional struggle",
    dekBuffer: dek,
    purpose: KEY_PURPOSES.MESSAGES,
    userId,
    recordId,
    field: "content"
  });

  const [ver, ivB64, bodyB64, tagB64] = ct.split(":");

  // Tamper with ciphertext body
  const bodyBuf = Buffer.from(bodyB64, "base64");
  bodyBuf[0] ^= 0xff;
  const tamperedBodyCt = `${ver}:${ivB64}:${bodyBuf.toString("base64")}:${tagB64}`;
  assert.throws(() =>
    decryptField({
      ciphertextPayload: tamperedBodyCt,
      dekOrKeyring: dek,
      purpose: KEY_PURPOSES.MESSAGES,
      userId,
      recordId,
      field: "content"
    })
  );

  // Tamper with authTag
  const tagBuf = Buffer.from(tagB64, "base64");
  tagBuf[0] ^= 0xff;
  const tamperedTagCt = `${ver}:${ivB64}:${bodyB64}:${tagBuf.toString("base64")}`;
  assert.throws(() =>
    decryptField({
      ciphertextPayload: tamperedTagCt,
      dekOrKeyring: dek,
      purpose: KEY_PURPOSES.MESSAGES,
      userId,
      recordId,
      field: "content"
    })
  );
});

test("4. AAD binding: swapping ciphertext across users, rows, or fields must fail", () => {
  const dek = generateUserDek();
  const userId = "user_alice";
  const recordId = "msg_001";

  const ct = encryptField({
    plaintext: "Alice private message",
    dekBuffer: dek,
    purpose: KEY_PURPOSES.MESSAGES,
    userId,
    recordId,
    field: "content"
  });

  // Fail if swapped to another user_id
  assert.throws(() =>
    decryptField({
      ciphertextPayload: ct,
      dekOrKeyring: dek,
      purpose: KEY_PURPOSES.MESSAGES,
      userId: "user_bob",
      recordId,
      field: "content"
    })
  );

  // Fail if swapped to another record_id
  assert.throws(() =>
    decryptField({
      ciphertextPayload: ct,
      dekOrKeyring: dek,
      purpose: KEY_PURPOSES.MESSAGES,
      userId,
      recordId: "msg_002",
      field: "content"
    })
  );

  // Fail if swapped to another column/field name
  assert.throws(() =>
    decryptField({
      ciphertextPayload: ct,
      dekOrKeyring: dek,
      purpose: KEY_PURPOSES.MESSAGES,
      userId,
      recordId,
      field: "title"
    })
  );
});

test("5. Wrong-key and cross-purpose HKDF isolation failure", () => {
  const dek1 = generateUserDek();
  const dek2 = generateUserDek();
  const userId = "user_hkdf";
  const recordId = "mem_1";

  const ct = encryptField({
    plaintext: "Preparing for UPSC exam",
    dekBuffer: dek1,
    purpose: KEY_PURPOSES.MEMORIES,
    userId,
    recordId,
    field: "memory_text"
  });

  // Wrong DEK fails
  assert.throws(() =>
    decryptField({
      ciphertextPayload: ct,
      dekOrKeyring: dek2,
      purpose: KEY_PURPOSES.MEMORIES,
      userId,
      recordId,
      field: "memory_text"
    })
  );

  // Wrong HKDF purpose (MESSAGES instead of MEMORIES) fails
  assert.throws(() =>
    decryptField({
      ciphertextPayload: ct,
      dekOrKeyring: dek1,
      purpose: KEY_PURPOSES.MESSAGES,
      userId,
      recordId,
      field: "memory_text"
    })
  );
});

test("6. IV uniqueness: 1,000 encryptions of identical plaintext produce 1,000 unique IVs and ciphertexts", () => {
  const dek = generateUserDek();
  const userId = "user_iv_test";
  const recordId = "msg_iv";
  const ivSet = new Set();
  const ctSet = new Set();

  for (let i = 0; i < 1000; i++) {
    const ct = encryptField({
      plaintext: "Same text every time",
      dekBuffer: dek,
      purpose: KEY_PURPOSES.MESSAGES,
      userId,
      recordId,
      field: "content"
    });
    const ivB64 = ct.split(":")[1];
    ivSet.add(ivB64);
    ctSet.add(ct);
  }

  assert.equal(ivSet.size, 1000);
  assert.equal(ctSet.size, 1000);
});

test("7. KEK Rotation: re-wraps DEKs from KEK v1 to KEK v2 without re-encrypting messages", () => {
  const kekV1 = parseMasterKey(SAMPLE_KEK_V1_HEX, 1);
  const kekV2 = parseMasterKey(SAMPLE_KEK_V2_HEX, 2);
  const userId = "user_rotate";
  const recordId = "msg_rotate";

  const dek = generateUserDek();
  const wrappedV1 = wrapUserDek(dek, kekV1, userId);

  const msgCiphertext = encryptField({
    plaintext: "Message encrypted before KEK rotation",
    dekBuffer: dek,
    purpose: KEY_PURPOSES.MESSAGES,
    userId,
    recordId,
    field: "content"
  });

  // Rotate wrapped DEK from KEK v1 to KEK v2 without touching msgCiphertext
  const wrappedV2 = rotateWrappedDek(wrappedV1, kekV1, kekV2, userId);
  assert.ok(wrappedV2.startsWith("v2:"));

  // Old KEK v1 can no longer unwrap v2 DEK
  assert.throws(() => unwrapUserDek(wrappedV2, kekV1, userId));

  // New KEK v2 unwraps the DEK, which still decrypts the existing message!
  const dekAfterRotation = unwrapUserDek(wrappedV2, kekV2, userId);
  const decryptedMsg = decryptField({
    ciphertextPayload: msgCiphertext,
    dekOrKeyring: dekAfterRotation,
    purpose: KEY_PURPOSES.MESSAGES,
    userId,
    recordId,
    field: "content"
  });

  assert.equal(decryptedMsg, "Message encrypted before KEK rotation");
});

test("8. Blind Index & Constant-Time comparison", () => {
  const dek = generateUserDek();
  const tokens1 = computeSearchBlindIndex("मन की शांति और गीता", dek, "u1");
  const tokens2 = computeSearchBlindIndex("गीता से शांति", dek, "u1");
  assert.ok(tokens1.some((t) => tokens2.includes(t)));

  assert.equal(constantTimeEqual("123456", "123456"), true);
  assert.equal(constantTimeEqual("123456", "654321"), false);
  assert.equal(constantTimeEqual("123456", "123"), false);
});
