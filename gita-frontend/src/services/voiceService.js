import * as vits from "@diffusionstudio/vits-web";

export const OPEN_SOURCE_VOICE_PACKS = [
  {
    id: "en_US-hfc_male-medium",
    name: "Piper Neural · Calm Sage (Male)",
    lang: "en",
    size: "28 MB",
    license: "MIT Open-Source (Piper VITS)",
    description: "Warm, steady male voice ideal for English & Hinglish guidance"
  },
  {
    id: "en_US-lessac-medium",
    name: "Piper Neural · Expressive Narrator",
    lang: "en",
    size: "28 MB",
    license: "MIT Open-Source (Piper VITS)",
    description: "Natural, articulate narrator voice with smooth cadence"
  },
  {
    id: "en_US-hfc_female-medium",
    name: "Piper Neural · Serene Guide (Female)",
    lang: "en",
    size: "28 MB",
    license: "MIT Open-Source (Piper VITS)",
    description: "Clear, soothing female voice for meditative reading"
  },
  {
    id: "en_GB-alan-medium",
    name: "Piper Neural · Philosopher (UK Male)",
    lang: "en",
    size: "26 MB",
    license: "MIT Open-Source (Piper VITS)",
    description: "Measured philosophical cadence for scripture translations"
  },
  {
    id: "ne_NP-google-medium",
    name: "Piper Neural · Devanagari Indic Pack",
    lang: "hi",
    size: "24 MB",
    license: "Apache/MIT Open-Source (VITS)",
    description: "Open-source Devanagari phoneme neural voice pack"
  }
];

let activeAudio = null;
let stopRequested = false;
let currentSessionId = 0;

const LANG_BCP47 = {
  en: ["en-IN", "en-GB", "en-US"],
  hi: ["hi-IN"],
  hinglish: ["en-IN", "hi-IN", "en-US"],
  sa: ["hi-IN", "sa-IN"],
  mr: ["mr-IN", "hi-IN"],
  gu: ["gu-IN", "hi-IN"]
};

export function cleanTextForSpeech(text = "", sources = [], lang = "en") {
  let combined = text;

  if (sources && sources.length > 0) {
    const src = sources[0];
    if (src.meaning) {
      const prefix =
        lang === "hi"
          ? ` श्रीमद्भगवद्गीता अध्याय ${src.chapter}, श्लोक ${src.verse} का भावार्थ: `
          : ` From Bhagavad Gita Chapter ${src.chapter}, Verse ${src.verse}: `;
      combined += `\n${prefix}${src.meaning}`;
    }
  }

  return combined
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[*#_~`>|]/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/[🕉️📖✨🔍🗑️☰✕↑🔊🔇▶️⏹️💡🌿🙏]/gu, "")
    .replace(/•/g, ". ")
    .replace(/\n+/g, ". ")
    .replace(/\s{2,}/g, " ")
    .replace(/\.\s*\./g, ".")
    .trim();
}

export function splitIntoSentences(text) {
  if (!text) return [];
  const rawChunks = text
    .split(/(?<=[.!?।॥])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);

  const merged = [];
  let buffer = "";
  for (const chunk of rawChunks) {
    if ((buffer + " " + chunk).length < 180) {
      buffer = buffer ? `${buffer} ${chunk}` : chunk;
    } else {
      if (buffer) merged.push(buffer);
      buffer = chunk;
    }
  }
  if (buffer) merged.push(buffer);
  return merged.length > 0 ? merged : [text];
}

export async function getStoredPiperVoices() {
  try {
    return (await vits.stored()) || [];
  } catch {
    return [];
  }
}

export async function downloadPiperVoicePack(voiceId, onProgress) {
  await vits.download(voiceId, (prog) => {
    if (onProgress && prog.total > 0) {
      const pct = Math.min(100, Math.round((prog.loaded / prog.total) * 100));
      onProgress(pct);
    }
  });
}

function pickBestSystemVoice(lang = "en") {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  const targetLocales = LANG_BCP47[lang] || ["en-IN", "en-US"];

  for (const loc of targetLocales) {
    const langPrefix = loc.toLowerCase().split("-")[0];
    const exactNatural = voices.find(
      (v) =>
        v.lang.toLowerCase().replace("_", "-").startsWith(loc.toLowerCase()) &&
        (v.name.includes("Natural") ||
          v.name.includes("Online") ||
          v.name.includes("Google") ||
          v.name.includes("Swara") ||
          v.name.includes("Madhur") ||
          v.name.includes("Neerja") ||
          v.name.includes("Prabhat") ||
          v.name.includes("Aria"))
    );
    if (exactNatural) return exactNatural;

    const exactMatch = voices.find((v) =>
      v.lang.toLowerCase().replace("_", "-").startsWith(loc.toLowerCase())
    );
    if (exactMatch) return exactMatch;

    const prefixMatch = voices.find((v) =>
      v.lang.toLowerCase().startsWith(langPrefix)
    );
    if (prefixMatch) return prefixMatch;
  }

  return voices.find((v) => v.default) || voices[0];
}

export function stopSpeaking() {
  stopRequested = true;
  currentSessionId += 1;
  if (activeAudio) {
    try {
      activeAudio.pause();
      activeAudio.src = "";
    } catch {
      // ignore
    }
    activeAudio = null;
  }
  if (typeof window !== "undefined" && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }
}

async function playAudioBlob(blob, rate = 1.0, sessionId) {
  return new Promise((resolve, reject) => {
    if (stopRequested || sessionId !== currentSessionId) {
      resolve();
      return;
    }
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.playbackRate = rate;
    activeAudio = audio;

    audio.onended = () => {
      URL.revokeObjectURL(url);
      if (activeAudio === audio) activeAudio = null;
      resolve();
    };
    audio.onerror = (err) => {
      URL.revokeObjectURL(url);
      if (activeAudio === audio) activeAudio = null;
      reject(err);
    };
    audio.play().catch((err) => {
      URL.revokeObjectURL(url);
      reject(err);
    });
  });
}

async function speakWithPiperOpenSource({
  sentences,
  voiceId,
  rate = 1.0,
  sessionId,
  onProgress,
  onStatusChange
}) {
  onStatusChange?.("loading");
  let nextBlobPromise = vits.predict(
    { text: sentences[0], voiceId },
    (prog) => {
      if (prog.total > 0 && onProgress) {
        onProgress(Math.min(100, Math.round((prog.loaded / prog.total) * 100)));
      }
    }
  );

  for (let i = 0; i < sentences.length; i++) {
    if (stopRequested || sessionId !== currentSessionId) break;
    const currentBlob = await nextBlobPromise;
    if (stopRequested || sessionId !== currentSessionId) break;

    if (i + 1 < sentences.length) {
      nextBlobPromise = vits.predict({ text: sentences[i + 1], voiceId });
    }

    onStatusChange?.("speaking");
    await playAudioBlob(currentBlob, rate, sessionId);
  }
}

async function speakWithSystemNeural({
  sentences,
  lang = "en",
  rate = 1.0,
  sessionId,
  onStatusChange
}) {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return;
  }

  window.speechSynthesis.cancel();
  const voice = pickBestSystemVoice(lang);
  onStatusChange?.("speaking");

  for (const sentence of sentences) {
    if (stopRequested || sessionId !== currentSessionId) break;
    await new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(sentence);
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        utterance.lang = (LANG_BCP47[lang] || ["en-IN"])[0];
      }
      utterance.rate = rate;
      utterance.pitch = 1.0;
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      window.speechSynthesis.speak(utterance);
    });
  }
}

export async function speakAnswerFluently({
  text,
  sources = [],
  lang = "en",
  engine = "piper", // "piper" | "browser"
  piperVoiceId = "en_US-hfc_male-medium",
  rate = 1.0,
  onStatusChange,
  onDownloadProgress
}) {
  stopSpeaking();
  stopRequested = false;
  const sessionId = ++currentSessionId;

  const cleaned = cleanTextForSpeech(text, sources, lang);
  if (!cleaned) {
    onStatusChange?.("idle");
    return;
  }

  const sentences = splitIntoSentences(cleaned);
  const hasDevanagari = /[\u0900-\u097F\u0A80-\u0AFF]/.test(cleaned);

  try {
    if (engine === "piper") {
      const effectiveVoiceId =
        hasDevanagari && piperVoiceId.startsWith("en_")
          ? "ne_NP-google-medium"
          : piperVoiceId;

      try {
        await speakWithPiperOpenSource({
          sentences,
          voiceId: effectiveVoiceId,
          rate,
          sessionId,
          onProgress: onDownloadProgress,
          onStatusChange
        });
        if (sessionId === currentSessionId) onStatusChange?.("idle");
        return;
      } catch (piperErr) {
        console.warn("Piper open-source WASM fallback to neural speech:", piperErr);
      }
    }

    await speakWithSystemNeural({
      sentences,
      lang,
      rate,
      sessionId,
      onStatusChange
    });
  } finally {
    if (sessionId === currentSessionId) {
      onStatusChange?.("idle");
    }
  }
}
