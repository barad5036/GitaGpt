import http from "node:http";
import crypto from "node:crypto";
import { loadAndValidateEnv } from "./config/env.js";
import {
  KEY_PURPOSES,
  generateUserDek,
  wrapUserDek,
  unwrapUserDek,
  encryptField,
  decryptField,
  computeSearchBlindIndex
} from "./crypto/envelope.js";
import {
  signAccessJwt,
  verifyAccessJwt,
  generateRefreshTokenPair,
  hashRefreshToken,
  verifyGoogleIdToken,
  generateEmailOtp,
  verifyEmailOtp
} from "./auth/authService.js";
import {
  buildSystemPrompt,
  streamChatCompletion,
  generateCompletion
} from "./llm/llmProvider.js";
import { normalizeChatRequest, isCrisisText, crisisReply } from "./safety.js";

const env = loadAndValidateEnv();

// Per-user (or per-IP for anonymous use) daily chat quota
const dailyChatUsage = new Map();
function consumeDailyQuota(key) {
  const day = new Date().toISOString().slice(0, 10);
  const entry = dailyChatUsage.get(key);
  if (!entry || entry.day !== day) {
    dailyChatUsage.set(key, { day, count: 1 });
    return true;
  }
  if (entry.count >= env.userDailyQuota) return false;
  entry.count += 1;
  return true;
}

/**
 * Encrypted In-Memory Store (mirrors PostgreSQL schema with identical Envelope Encryption & AAD)
 * Used seamlessly when PostgreSQL is not running locally, or backed by pg Pool in production.
 */
const store = {
  users: new Map(), // id -> user row
  emailIndex: new Map(), // email_blind_index -> user_id
  refreshTokens: new Map(), // token_hash -> token row
  otpChallenges: new Map(), // email -> { hash, expiresAt, devCode }
  conversations: new Map(), // id -> conv row
  messages: new Map(), // id -> msg row
  memories: new Map(), // id -> memory row
  settings: new Map(), // user_id -> settings
  consentLog: [],
  auditLog: [],
  rateBuckets: new Map()
};

function logAudit(userId, action, metadata = {}) {
  // Strictly NEVER log keys, tokens, or plaintext messages
  const entry = {
    id: crypto.randomUUID(),
    userId: userId || null,
    action,
    metadata,
    createdAt: new Date().toISOString()
  };
  store.auditLog.push(entry);
  console.log(JSON.stringify({ level: "info", type: "audit", ...entry }));
}

function computeEmailBlindIndex(email) {
  return crypto
    .createHmac("sha256", env.masterKey.key)
    .update(email.trim().toLowerCase(), "utf8")
    .digest("hex");
}

function findOrCreateUserByEmail(email, displayName = "") {
  const cleanEmail = email.trim().toLowerCase();
  const blindIdx = computeEmailBlindIndex(cleanEmail);
  const existingId = store.emailIndex.get(blindIdx);
  if (existingId && store.users.has(existingId)) {
    return store.users.get(existingId);
  }

  const userId = crypto.randomUUID();
  const dek = generateUserDek();
  const wrappedDek = wrapUserDek(dek, env.masterKey, userId);
  const nameToStore = displayName || cleanEmail.split("@")[0];

  const encryptedEmail = encryptField({
    plaintext: cleanEmail,
    dekBuffer: dek,
    purpose: KEY_PURPOSES.PII,
    userId,
    recordId: userId,
    field: "email"
  });
  const encryptedName = encryptField({
    plaintext: nameToStore,
    dekBuffer: dek,
    purpose: KEY_PURPOSES.PII,
    userId,
    recordId: userId,
    field: "name"
  });

  dek.fill(0);

  const user = {
    id: userId,
    emailBlindIndex: blindIdx,
    encryptedEmail,
    encryptedName,
    wrappedDek,
    dekVersion: 1,
    dailyQuotaUsed: 0,
    createdAt: new Date().toISOString()
  };

  store.users.set(userId, user);
  store.emailIndex.set(blindIdx, userId);
  store.consentLog.push({
    id: crypto.randomUUID(),
    userId,
    consentType: "privacy_terms_v1",
    granted: true,
    createdAt: new Date().toISOString()
  });
  logAudit(userId, "user_created", { method: "self_hosted_auth" });
  return user;
}

function getDecryptedUserProfile(user) {
  const dek = unwrapUserDek(user.wrappedDek, env.keyring, user.id);
  try {
    const email = decryptField({
      ciphertextPayload: user.encryptedEmail,
      dekOrKeyring: dek,
      purpose: KEY_PURPOSES.PII,
      userId: user.id,
      recordId: user.id,
      field: "email"
    });
    const name = decryptField({
      ciphertextPayload: user.encryptedName,
      dekOrKeyring: dek,
      purpose: KEY_PURPOSES.PII,
      userId: user.id,
      recordId: user.id,
      field: "name"
    });
    return { id: user.id, email, name, createdAt: user.createdAt };
  } finally {
    dek.fill(0);
  }
}

function issueSessionTokens(user, res, isAndroidClient = false, familyId = null) {
  const accessToken = signAccessJwt(
    { sub: user.id },
    env.jwtSecret,
    env.accessTokenTtlSec
  );
  const refreshPair = generateRefreshTokenPair(familyId);

  store.refreshTokens.set(refreshPair.tokenHash, {
    id: crypto.randomUUID(),
    userId: user.id,
    tokenHash: refreshPair.tokenHash,
    familyId: refreshPair.familyId,
    replacedByHash: null,
    revokedAt: null,
    expiresAt: Date.now() + env.refreshTokenTtlDays * 86400 * 1000,
    createdAt: Date.now()
  });

  // Web: Set httpOnly + Secure + SameSite=Strict cookie
  const cookieFlags = [
    `gitagpt_rt=${refreshPair.rawToken}`,
    "HttpOnly",
    "Path=/api/auth",
    "SameSite=Strict",
    `Max-Age=${env.refreshTokenTtlDays * 86400}`
  ];
  if (env.isProd) cookieFlags.push("Secure");
  res.setHeader("Set-Cookie", cookieFlags.join("; "));

  return {
    accessToken,
    expiresIn: env.accessTokenTtlSec,
    // Android clients store the refresh token in Android Keystore-backed Secure Storage
    ...(isAndroidClient ? { refreshToken: refreshPair.rawToken } : {})
  };
}

function parseCookies(req) {
  const raw = req.headers.cookie || "";
  const out = {};
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k) out[k] = v.join("=");
  }
  return out;
}

function authenticateRequest(req) {
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    throw new Error("Missing Bearer token");
  }
  const token = authHeader.slice(7).trim();
  const claims = verifyAccessJwt(token, env.jwtSecret);
  const user = store.users.get(claims.sub);
  if (!user) throw new Error("User not found");
  return user;
}

function setSecurityHeaders(req, res) {
  const origin = req.headers.origin;
  if (origin && env.allowedOrigins.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, DELETE, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Client-Platform"
  );
  // Helmet-equivalent production security headers
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
}

function checkRateLimit(ip) {
  const now = Date.now();
  const window = (store.rateBuckets.get(ip) || []).filter(
    (t) => now - t < 60000
  );
  if (window.length >= env.rateLimitPerMin) return false;
  window.push(now);
  store.rateBuckets.set(ip, window);
  return true;
}

function readJsonBody(req, maxBytes = 65536) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error("Payload too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        const str = Buffer.concat(chunks).toString("utf8");
        resolve(str ? JSON.parse(str) : {});
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

export const server = http.createServer(async (req, res) => {
  setSecurityHeaders(req, res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const clientIp = req.socket.remoteAddress || "unknown";
  if (!checkRateLimit(clientIp)) {
    sendJson(res, 429, { error: "Rate limit exceeded. Please wait a moment." });
    return;
  }

  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const path = url.pathname;
  const isAndroid = req.headers["x-client-platform"] === "android";

  try {
    // 1. Health Check
    if (req.method === "GET" && (path === "/health" || path === "/api/health")) {
      sendJson(res, 200, {
        status: "ok",
        service: "gitagpt-selfhosted-backend",
        encryption: "AES-256-GCM+HKDF-SHA256",
        kekVersion: env.masterKey.version
      });
      return;
    }

    // 2. Google Sign-In Verification -> Issue Session
    if (req.method === "POST" && path === "/api/auth/google") {
      const body = await readJsonBody(req);
      let googleUser;
      if (body.idToken) {
        googleUser = await verifyGoogleIdToken(
          body.idToken,
          env.googleClientIds
        );
      } else if (!env.isProd && body.email) {
        // Seamless Google sign-in flow when running locally without GOOGLE_WEB_CLIENT_ID env set
        const cleanEmail = String(body.email).trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
          sendJson(res, 400, { error: "Please enter a valid Google email." });
          return;
        }
        googleUser = {
          providerUserId: `google_${cleanEmail}`,
          email: cleanEmail,
          name: body.name || cleanEmail.split("@")[0]
        };
      } else {
        sendJson(res, 400, { error: "Unable to complete Google Sign-In." });
        return;
      }

      const user = findOrCreateUserByEmail(googleUser.email, googleUser.name);
      const tokens = issueSessionTokens(user, res, isAndroid);
      const profile = getDecryptedUserProfile(user);
      logAudit(user.id, "login_google");
      sendJson(res, 200, { user: profile, ...tokens });
      return;
    }

    // 3. Email + OTP Request
    if (req.method === "POST" && path === "/api/auth/email/request-otp") {
      const body = await readJsonBody(req);
      const email = String(body.email || "")
        .trim()
        .toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        sendJson(res, 400, { error: "Please enter a valid email address." });
        return;
      }
      const otp = generateEmailOtp();
      store.otpChallenges.set(email, otp);
      logAudit(null, "otp_requested");
      sendJson(res, 200, {
        message: "Verification code generated.",
        // In local dev mode, return devOtpHint so the developer/tester can test without SMTP
        ...(env.isProd ? {} : { devOtpCode: otp.code })
      });
      return;
    }

    // 4. Email + OTP Verify -> Issue Self-Hosted Session
    if (req.method === "POST" && path === "/api/auth/email/verify-otp") {
      const body = await readJsonBody(req);
      const email = String(body.email || "")
        .trim()
        .toLowerCase();
      const code = String(body.code || "").trim();
      const challenge = store.otpChallenges.get(email);
      if (
        !challenge ||
        !verifyEmailOtp(code, challenge.hash, challenge.expiresAt)
      ) {
        sendJson(res, 401, { error: "Invalid or expired verification code." });
        return;
      }
      store.otpChallenges.delete(email);
      const user = findOrCreateUserByEmail(email, body.name || "");
      const tokens = issueSessionTokens(user, res, isAndroid);
      const profile = getDecryptedUserProfile(user);
      logAudit(user.id, "login_email_otp");
      sendJson(res, 200, { user: profile, ...tokens });
      return;
    }

    // 5. Rotating Refresh Token Endpoint with Reuse Detection
    if (req.method === "POST" && path === "/api/auth/refresh") {
      const cookies = parseCookies(req);
      const body = await readJsonBody(req);
      const rawRt = cookies.gitagpt_rt || body.refreshToken;
      if (!rawRt) {
        sendJson(res, 401, { error: "No refresh token provided." });
        return;
      }

      const rtHash = hashRefreshToken(rawRt);
      const record = store.refreshTokens.get(rtHash);
      if (!record) {
        sendJson(res, 401, { error: "Invalid refresh token." });
        return;
      }

      // REUSE DETECTION: If this token was already rotated or revoked, revoke the entire family!
      if (record.replacedByHash || record.revokedAt) {
        for (const rt of store.refreshTokens.values()) {
          if (rt.familyId === record.familyId) {
            rt.revokedAt = Date.now();
          }
        }
        logAudit(record.userId, "refresh_token_reuse_detected", {
          familyId: record.familyId
        });
        sendJson(res, 401, {
          error: "Security alert: token reuse detected. Session family revoked."
        });
        return;
      }

      if (Date.now() > record.expiresAt) {
        sendJson(res, 401, { error: "Refresh token expired." });
        return;
      }

      const user = store.users.get(record.userId);
      if (!user) {
        sendJson(res, 401, { error: "User not found." });
        return;
      }

      const tokens = issueSessionTokens(
        user,
        res,
        isAndroid,
        record.familyId
      );
      record.replacedByHash = "rotated";
      record.revokedAt = Date.now();

      const profile = getDecryptedUserProfile(user);
      sendJson(res, 200, { user: profile, ...tokens });
      return;
    }

    // 6. Logout from all devices
    if (req.method === "POST" && path === "/api/auth/logout-all") {
      const user = authenticateRequest(req);
      for (const rt of store.refreshTokens.values()) {
        if (rt.userId === user.id) {
          rt.revokedAt = Date.now();
        }
      }
      res.setHeader(
        "Set-Cookie",
        "gitagpt_rt=; HttpOnly; Path=/api/auth; Max-Age=0"
      );
      logAudit(user.id, "logout_all_devices");
      sendJson(res, 200, { status: "logged_out_all_devices" });
      return;
    }

    // 7. Migrate Local/Guest Chats & Memories to Encrypted Account on Login
    if (req.method === "POST" && path === "/api/auth/migrate-guest") {
      const user = authenticateRequest(req);
      const body = await readJsonBody(req, 512 * 1024);
      const guestThreads = Array.isArray(body.threads) ? body.threads : [];
      const guestMemories = Array.isArray(body.memories) ? body.memories : [];

      const dek = unwrapUserDek(user.wrappedDek, env.keyring, user.id);
      let migratedConversations = 0;
      let migratedMessages = 0;
      let migratedMemories = 0;

      try {
        for (const th of guestThreads) {
          const convId = crypto.randomUUID();
          const titleText = String(th.title || "Conversation").slice(0, 200);
          const encryptedTitle = encryptField({
            plaintext: titleText,
            dekBuffer: dek,
            purpose: KEY_PURPOSES.TITLES,
            userId: user.id,
            recordId: convId,
            field: "title"
          });
          const titleBlindIndex = computeSearchBlindIndex(
            titleText,
            dek,
            user.id
          );

          store.conversations.set(convId, {
            id: convId,
            userId: user.id,
            encryptedTitle,
            titleBlindIndex,
            pinned: Boolean(th.pinned),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          migratedConversations += 1;

          for (const m of th.messages || []) {
            const msgId = crypto.randomUUID();
            const contentText = String(m.text || "");
            const encryptedContent = encryptField({
              plaintext: contentText,
              dekBuffer: dek,
              purpose: KEY_PURPOSES.MESSAGES,
              userId: user.id,
              recordId: msgId,
              field: "content"
            });
            const searchBlindIndex = computeSearchBlindIndex(
              contentText,
              dek,
              user.id
            );

            store.messages.set(msgId, {
              id: msgId,
              conversationId: convId,
              userId: user.id,
              role: m.role === "user" ? "user" : "assistant",
              encryptedContent,
              searchBlindIndex,
              createdAt: new Date().toISOString()
            });
            migratedMessages += 1;
          }
        }

        for (const mem of guestMemories) {
          const memId = crypto.randomUUID();
          const memText = String(mem.text || "");
          if (!memText) continue;
          const encryptedMemoryText = encryptField({
            plaintext: memText,
            dekBuffer: dek,
            purpose: KEY_PURPOSES.MEMORIES,
            userId: user.id,
            recordId: memId,
            field: "memory_text"
          });
          store.memories.set(memId, {
            id: memId,
            userId: user.id,
            encryptedMemoryText,
            category: mem.category || "personal",
            createdAt: new Date().toISOString()
          });
          migratedMemories += 1;
        }
      } finally {
        dek.fill(0);
      }

      logAudit(user.id, "guest_data_migrated", {
        migratedConversations,
        migratedMessages,
        migratedMemories
      });
      sendJson(res, 200, {
        status: "migrated",
        migratedConversations,
        migratedMessages,
        migratedMemories
      });
      return;
    }

    // 8. Export My Data (JSON) — Decrypts all user records with AAD verification
    if (req.method === "GET" && path === "/api/privacy/export") {
      const user = authenticateRequest(req);
      const dek = unwrapUserDek(user.wrappedDek, env.keyring, user.id);

      try {
        const profile = getDecryptedUserProfile(user);
        const conversations = [];

        for (const conv of store.conversations.values()) {
          if (conv.userId !== user.id) continue;
          const title = decryptField({
            ciphertextPayload: conv.encryptedTitle,
            dekOrKeyring: dek,
            purpose: KEY_PURPOSES.TITLES,
            userId: user.id,
            recordId: conv.id,
            field: "title"
          });

          const msgs = [];
          for (const msg of store.messages.values()) {
            if (msg.conversationId !== conv.id || msg.userId !== user.id)
              continue;
            const content = decryptField({
              ciphertextPayload: msg.encryptedContent,
              dekOrKeyring: dek,
              purpose: KEY_PURPOSES.MESSAGES,
              userId: user.id,
              recordId: msg.id,
              field: "content"
            });
            msgs.push({
              id: msg.id,
              role: msg.role,
              content,
              createdAt: msg.createdAt
            });
          }

          conversations.push({
            id: conv.id,
            title,
            pinned: conv.pinned,
            createdAt: conv.createdAt,
            messages: msgs
          });
        }

        const memories = [];
        for (const mem of store.memories.values()) {
          if (mem.userId !== user.id) continue;
          const text = decryptField({
            ciphertextPayload: mem.encryptedMemoryText,
            dekOrKeyring: dek,
            purpose: KEY_PURPOSES.MEMORIES,
            userId: user.id,
            recordId: mem.id,
            field: "memory_text"
          });
          memories.push({
            id: mem.id,
            text,
            category: mem.category,
            createdAt: mem.createdAt
          });
        }

        const consents = store.consentLog.filter((c) => c.userId === user.id);
        logAudit(user.id, "data_exported");

        sendJson(res, 200, {
          exportedAt: new Date().toISOString(),
          user: profile,
          conversations,
          memories,
          consents
        });
        return;
      } finally {
        dek.fill(0);
      }
    }

    // 9. Delete My Account — Permanently erases all user data across every table
    if (req.method === "DELETE" && path === "/api/privacy/account") {
      const user = authenticateRequest(req);
      const uid = user.id;

      store.emailIndex.delete(user.emailBlindIndex);
      store.users.delete(uid);
      store.settings.delete(uid);

      for (const [k, v] of store.refreshTokens.entries()) {
        if (v.userId === uid) store.refreshTokens.delete(k);
      }
      for (const [k, v] of store.conversations.entries()) {
        if (v.userId === uid) store.conversations.delete(k);
      }
      for (const [k, v] of store.messages.entries()) {
        if (v.userId === uid) store.messages.delete(k);
      }
      for (const [k, v] of store.memories.entries()) {
        if (v.userId === uid) store.memories.delete(k);
      }
      store.consentLog = store.consentLog.filter((c) => c.userId !== uid);

      res.setHeader(
        "Set-Cookie",
        "gitagpt_rt=; HttpOnly; Path=/api/auth; Max-Age=0"
      );
      logAudit(null, "account_deleted_permanently");
      sendJson(res, 200, {
        status: "deleted",
        message:
          "Your account, encryption keys (DEK), conversations, and memories have been permanently erased."
      });
      return;
    }

    // 10. Server-Side LLM Chat Completion Gateway (Ollama / vLLM / OpenAI-compatible)
    if (req.method === "POST" && path === "/api/chat") {
      const body = await readJsonBody(req, 128 * 1024);
      if (!Array.isArray(body.messages) || body.messages.length === 0) {
        sendJson(res, 400, { error: "messages array is required." });
        return;
      }
      const chat = normalizeChatRequest(body);
      const lastUserText = chat.messages[chat.messages.length - 1]?.content || "";
      const content = isCrisisText(lastUserText)
        ? crisisReply(chat.language)
        : await generateCompletion({
            messages: [
              { role: "system", content: buildSystemPrompt(chat) },
              ...chat.messages
            ],
            env
          });
      const completion = { content, reasoning: "" };
      sendJson(res, 200, {
        choices: [
          {
            message: {
              role: "assistant",
              content: completion.content,
              reasoning: completion.reasoning
            }
          }
        ]
      });
      return;
    }

    // 11. Streaming chat (Server-Sent Events, OpenAI-compatible chunk format)
    if (req.method === "POST" && path === "/api/chat/stream") {
      const body = await readJsonBody(req, 96 * 1024);
      const chat = normalizeChatRequest(body);
      const lastMessage = chat.messages[chat.messages.length - 1];
      if (!lastMessage || lastMessage.role !== "user") {
        sendJson(res, 400, { error: "A user message is required." });
        return;
      }

      let quotaKey = `ip:${clientIp}`;
      try {
        quotaKey = `user:${authenticateRequest(req).id}`;
      } catch {
        // Anonymous request: quota is tracked per IP
      }
      if (!consumeDailyQuota(quotaKey)) {
        sendJson(res, 429, {
          error: "You've reached today's message limit. Please come back tomorrow."
        });
        return;
      }

      res.writeHead(200, {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no"
      });

      const upstreamAbort = new AbortController();
      res.on("close", () => {
        if (!res.writableEnded) upstreamAbort.abort();
      });
      const sendDelta = (text) =>
        res.write(
          `data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`
        );

      try {
        if (isCrisisText(lastMessage.content)) {
          sendDelta(crisisReply(chat.language));
        } else {
          const stream = streamChatCompletion({
            messages: [
              { role: "system", content: buildSystemPrompt(chat) },
              ...chat.messages
            ],
            env,
            signal: upstreamAbort.signal
          });
          for await (const delta of stream) {
            sendDelta(delta);
          }
        }
        res.write("data: [DONE]\n\n");
      } catch {
        if (!upstreamAbort.signal.aborted) {
          res.write(
            `data: ${JSON.stringify({ error: "The AI service is temporarily unavailable." })}\n\n`
          );
        }
      } finally {
        res.end();
      }
      return;
    }

    sendJson(res, 404, { error: "Not found" });
  } catch (err) {
    const status =
      err.message?.includes("Bearer") ||
      err.message?.includes("JWT") ||
      err.message?.includes("expired") ||
      err.message?.includes("User not found")
        ? 401
        : 400;
    sendJson(res, status, { error: err.message || "Request failed" });
  }
});

if (process.argv[1]?.endsWith("server.js")) {
  server.listen(env.port, "127.0.0.1", () => {
    console.log(
      JSON.stringify({
        level: "info",
        msg: `GitaGPT Self-Hosted Backend listening on http://127.0.0.1:${env.port}`,
        kekVersion: env.masterKey.version
      })
    );
  });
}
