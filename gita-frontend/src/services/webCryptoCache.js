/**
 * Web Crypto AES-256-GCM Local Cache Encryption & In-Memory Token Store
 * - Never stores access or refresh tokens in localStorage.
 * - Uses a non-extractable Web Crypto AES-GCM 256-bit key stored in IndexedDB
 *   to encrypt cached local/guest conversations on device.
 */

const IDB_NAME = "gitagpt_crypto_keystore";
const IDB_STORE = "keys";
const KEY_ID = "local_cache_aes_gcm_v1";

// Strictly in-memory session state (never written to localStorage!)
let inMemoryAccessToken = null;
let inMemoryUser = null;

export function setSessionInMemory(accessToken, user) {
  inMemoryAccessToken = accessToken || null;
  inMemoryUser = user || null;
}

export function getAccessTokenInMemory() {
  return inMemoryAccessToken;
}

export function getSessionUserInMemory() {
  return inMemoryUser;
}

export function clearSessionInMemory() {
  inMemoryAccessToken = null;
  inMemoryUser = null;
}

function openKeyDatabase() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getOrCreateNonExtractableKey() {
  const db = await openKeyDatabase();
  const existing = await new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const getReq = tx.objectStore(IDB_STORE).get(KEY_ID);
    getReq.onsuccess = () => resolve(getReq.result);
    getReq.onerror = () => reject(getReq.error);
  });

  if (existing) return existing;

  // Generate non-extractable (extractable = false) 256-bit AES-GCM CryptoKey
  const key = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );

  await new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(key, KEY_ID);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  return key;
}

function bufToBase64(buf) {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBuf(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function encryptLocalCacheJson(dataObj) {
  if (typeof window === "undefined" || !window.crypto?.subtle) {
    return JSON.stringify(dataObj);
  }
  const key = await getOrCreateNonExtractableKey();
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(JSON.stringify(dataObj));
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoded
  );
  return `wc1:${bufToBase64(iv)}:${bufToBase64(ciphertext)}`;
}

export async function decryptLocalCacheJson(payloadStr) {
  if (!payloadStr) return null;
  if (!payloadStr.startsWith("wc1:")) {
    return JSON.parse(payloadStr);
  }
  const [, ivB64, ctB64] = payloadStr.split(":");
  const key = await getOrCreateNonExtractableKey();
  const iv = new Uint8Array(base64ToBuf(ivB64));
  const ct = base64ToBuf(ctB64);
  const decrypted = await window.crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ct
  );
  return JSON.parse(new TextDecoder().decode(decrypted));
}
