import test from "node:test";
import assert from "node:assert/strict";
import { server } from "../src/server.js";

test("Self-Hosted Auth, Refresh Rotation Reuse Detection, Encrypted Guest Migration, Export & Account Deletion", async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    // 1. Request Email OTP
    const otpReq = await fetch(`${baseUrl}/api/auth/email/request-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "parth@gitagpt.org" })
    });
    assert.equal(otpReq.status, 200);
    const otpData = await otpReq.json();
    assert.ok(otpData.devOtpCode);

    // 2. Verify OTP and receive Access JWT + Refresh Token
    const verifyRes = await fetch(`${baseUrl}/api/auth/email/verify-otp`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Client-Platform": "android"
      },
      body: JSON.stringify({
        email: "parth@gitagpt.org",
        code: otpData.devOtpCode,
        name: "Arjuna Parth"
      })
    });
    assert.equal(verifyRes.status, 200);
    const setCookieHeader = verifyRes.headers.get("set-cookie") || "";
    assert.ok(setCookieHeader.includes("HttpOnly"));
    assert.ok(setCookieHeader.includes("SameSite=Strict"));

    const session1 = await verifyRes.json();
    assert.equal(session1.user.email, "parth@gitagpt.org");
    assert.equal(session1.user.name, "Arjuna Parth");
    assert.ok(session1.accessToken);
    assert.ok(session1.refreshToken);

    // 3. Migrate Guest Chats & Memories into Encrypted Account
    const migrateRes = await fetch(`${baseUrl}/api/auth/migrate-guest`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session1.accessToken}`
      },
      body: JSON.stringify({
        threads: [
          {
            title: "मन की शांति",
            pinned: true,
            messages: [
              { role: "user", text: "मेरा मन शांत नहीं है" },
              { role: "assistant", text: "सुनो मेरे दोस्त, गहरी साँस लो।" }
            ]
          }
        ],
        memories: [{ text: "Preparing for UPSC exam", category: "goal" }]
      })
    });
    assert.equal(migrateRes.status, 200);
    const migrateData = await migrateRes.json();
    assert.equal(migrateData.migratedConversations, 1);
    assert.equal(migrateData.migratedMessages, 2);
    assert.equal(migrateData.migratedMemories, 1);

    // 4. Export My Data (JSON) and verify decrypted contents match
    const exportRes = await fetch(`${baseUrl}/api/privacy/export`, {
      headers: { Authorization: `Bearer ${session1.accessToken}` }
    });
    assert.equal(exportRes.status, 200);
    const exported = await exportRes.json();
    assert.equal(exported.conversations.length, 1);
    assert.equal(exported.conversations[0].title, "मन की शांति");
    assert.equal(exported.conversations[0].messages.length, 2);
    assert.equal(exported.memories[0].text, "Preparing for UPSC exam");

    // 5. Rotate Refresh Token -> get new Refresh Token
    const refresh1 = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Client-Platform": "android"
      },
      body: JSON.stringify({ refreshToken: session1.refreshToken })
    });
    assert.equal(refresh1.status, 200);
    const session2 = await refresh1.json();
    assert.ok(session2.refreshToken);
    assert.notEqual(session2.refreshToken, session1.refreshToken);

    // 6. REUSE DETECTION: Replaying the old refreshToken must fail AND revoke the new one!
    const replayRes = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: session1.refreshToken })
    });
    assert.equal(replayRes.status, 401);

    const afterReplayRes = await fetch(`${baseUrl}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: session2.refreshToken })
    });
    assert.equal(afterReplayRes.status, 401);

    // 7. Delete My Account -> permanently erases all data
    const deleteRes = await fetch(`${baseUrl}/api/privacy/account`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session2.accessToken}` }
    });
    assert.equal(deleteRes.status, 200);

    // Subsequent calls with deleted user's token fail with 401
    const afterDeleteExport = await fetch(`${baseUrl}/api/privacy/export`, {
      headers: { Authorization: `Bearer ${session2.accessToken}` }
    });
    assert.equal(afterDeleteExport.status, 401);
  } finally {
    server.close();
  }
});
