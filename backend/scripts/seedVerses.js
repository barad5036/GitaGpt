import crypto from "node:crypto";
import pg from "pg";
import { GITA_VERSES } from "../../gita-frontend/src/data/gitaVerses.js";
import { loadAndValidateEnv } from "../src/config/env.js";

/**
 * Generates a normalized 384-dimensional semantic hash embedding vector
 * (compatible with pgvector vector(384) HNSW cosine similarity index).
 * Can also be swapped with local sentence-transformers / ONNX MiniLM-L6-v2.
 */
export function computeDeterministicEmbedding384(text) {
  const vec = new Float32Array(384);
  const words = (text || "")
    .toLowerCase()
    .split(/[^\p{L}\p{M}\p{N}]+/u)
    .filter(Boolean);

  for (const word of words) {
    const hash = crypto.createHash("sha256").update(word, "utf8").digest();
    for (let i = 0; i < 384; i++) {
      const byteVal = hash[i % hash.length];
      vec[i] += (byteVal - 128) / 128;
    }
  }

  let norm = 0;
  for (let i = 0; i < 384; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm) || 1;
  return Array.from(vec, (v) => Number((v / norm).toFixed(6)));
}

async function seed() {
  const env = loadAndValidateEnv();
  const pool = new pg.Pool({ connectionString: env.databaseUrl });

  try {
    for (const v of GITA_VERSES) {
      const res = await pool.query(
        `INSERT INTO verses
          (chapter, verse, shlok, transliteration, meaning_hi, meaning_en, daily_life_hi, daily_life_en, source_url)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (chapter, verse) DO UPDATE SET
          shlok = EXCLUDED.shlok,
          transliteration = EXCLUDED.transliteration,
          meaning_hi = EXCLUDED.meaning_hi,
          meaning_en = EXCLUDED.meaning_en,
          daily_life_hi = EXCLUDED.daily_life_hi,
          daily_life_en = EXCLUDED.daily_life_en,
          source_url = EXCLUDED.source_url
         RETURNING id`,
        [
          v.chapter,
          v.verse,
          v.shlok,
          v.transliteration,
          v.meaning_hi,
          v.meaning_en,
          v.daily_life_hi,
          v.daily_life_en,
          v.sourceUrl
        ]
      );

      const verseId = res.rows[0].id;
      const combinedText = `${v.shlok} ${v.meaning_hi} ${v.meaning_en} ${v.daily_life_hi} ${v.daily_life_en} ${(v.keywords || []).join(" ")}`;
      const emb = computeDeterministicEmbedding384(combinedText);
      const vectorLiteral = `[${emb.join(",")}]`;

      await pool.query(
        `INSERT INTO verse_embeddings (verse_id, embedding, model_name)
         VALUES ($1, $2::vector, $3)
         ON CONFLICT (verse_id) DO UPDATE SET embedding = EXCLUDED.embedding`,
        [verseId, vectorLiteral, "gitagpt-384-v1"]
      );
    }
    console.log(`Seeded ${GITA_VERSES.length} canonical Bhagavad Gita verses & pgvector embeddings.`);
  } finally {
    await pool.end();
  }
}

if (process.argv[1]?.endsWith("seedVerses.js")) {
  seed().catch((err) => {
    console.error("Seed failed:", err.message);
    process.exit(1);
  });
}
