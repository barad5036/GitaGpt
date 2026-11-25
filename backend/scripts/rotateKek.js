import pg from "pg";
import { parseMasterKey, rotateWrappedDek } from "../src/crypto/envelope.js";

/**
 * Master Key (KEK) Rotation Script
 * Re-wraps all user DEKs from MASTER_KEK_PREV_HEX (old version) to MASTER_KEK_HEX (new version)
 * inside a single atomic transaction without touching or re-encrypting any messages, memories, or titles.
 */
async function runKekRotation() {
  const oldKek = parseMasterKey(
    process.env.MASTER_KEK_PREV_HEX,
    process.env.MASTER_KEK_PREV_VERSION || 1
  );
  const newKek = parseMasterKey(
    process.env.MASTER_KEK_HEX,
    process.env.MASTER_KEK_VERSION || 2
  );

  if (oldKek.version === newKek.version) {
    throw new Error("New KEK version must be greater than previous KEK version.");
  }

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const { rows } = await client.query(
      "SELECT id, wrapped_dek FROM users WHERE wrapped_dek LIKE $1 FOR UPDATE",
      [`v${oldKek.version}:%`]
    );

    let rotatedCount = 0;
    for (const user of rows) {
      const rewrapped = rotateWrappedDek(
        user.wrapped_dek,
        oldKek,
        newKek,
        user.id
      );
      await client.query(
        "UPDATE users SET wrapped_dek = $1, updated_at = NOW() WHERE id = $2",
        [rewrapped, user.id]
      );
      rotatedCount += 1;
    }

    await client.query(
      "INSERT INTO audit_log (action, metadata_json) VALUES ($1, $2)",
      [
        "kek_rotation",
        JSON.stringify({
          fromVersion: oldKek.version,
          toVersion: newKek.version,
          usersRotated: rotatedCount
        })
      ]
    );

    await client.query("COMMIT");
    console.log(
      `Successfully rotated wrapped DEKs for ${rotatedCount} users from v${oldKek.version} to v${newKek.version}.`
    );
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

runKekRotation().catch((err) => {
  console.error("KEK Rotation Error:", err.message);
  process.exit(1);
});
