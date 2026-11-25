import { TextToSpeech } from "@capacitor-community/text-to-speech";

let stopRequested = false;
let currentSessionId = 0;

const LANG_BCP47 = {
  en: ["en-IN", "en-GB", "en-US"],
  hi: ["hi-IN"],
  hinglish: ["hi-IN", "en-IN", "en-US"],
  sa: ["hi-IN", "sa-IN"],
  mr: ["mr-IN", "hi-IN"],
  gu: ["gu-IN", "hi-IN"]
};

export function cleanTextForSpeech(text = "") {
  const combined = text || "";

  return combined
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[*#_~`>|]/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(
      /(?:🕉️|🦚|📖|✨|🔍|🗑️|☰|✕|↑|🔊|🔇|▶️|⏹️|💡|🌿|🙏|💛|🫂|🔥|⚡|🧭|💭|💔)/gu,
      ""
    )
    .replace(/•/g, ". ")
    .replace(/\n+/g, ". ")
    .replace(/\s{2,}/g, " ")
    .replace(/\.\s*\./g, ".")
    .trim();
}

function pickBestSystemVoice(lang = "hi") {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  const targetLocales = LANG_BCP47[lang] || ["hi-IN", "en-IN"];

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

  if (typeof window !== "undefined" && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore
    }
  }

  const isNative =
    typeof window !== "undefined" &&
    Boolean(window.Capacitor?.isNativePlatform?.());
  if (isNative) {
    TextToSpeech.stop().catch(() => {});
  }
}

export async function speakAnswerFluently({
  text,
  lang = "hi",
  rate = 1.0,
  pitch = 1.0,
  onStatusChange,
  onSentenceChange
}) {
  stopSpeaking();
  stopRequested = false;
  const sessionId = ++currentSessionId;

  const lines = (text || "")
    .split(/\n+/)
    .map((l) => cleanTextForSpeech(l))
    .filter((l) => l.length > 1);

  if (lines.length === 0) {
    onStatusChange?.("idle");
    onSentenceChange?.(null);
    return;
  }

  const isNative =
    typeof window !== "undefined" &&
    Boolean(window.Capacitor?.isNativePlatform?.());

  try {
    onStatusChange?.("speaking");
    const targetLocale = (LANG_BCP47[lang] || ["hi-IN"])[0];

    // 1. Native Android TextToSpeech Engine (Google Speech Services on device)
    if (isNative) {
      for (let i = 0; i < lines.length; i++) {
        if (stopRequested || sessionId !== currentSessionId) break;
        onSentenceChange?.(i);
        await TextToSpeech.speak({
          text: lines[i],
          lang: targetLocale,
          rate,
          pitch,
          volume: 1.0,
          category: "ambient"
        });
      }
      return;
    }

    // 2. Web Browser SpeechSynthesis Engine
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const voice = pickBestSystemVoice(lang);

      for (let i = 0; i < lines.length; i++) {
        const sentence = lines[i];
        if (stopRequested || sessionId !== currentSessionId) break;
        onSentenceChange?.(i);
        await new Promise((resolve) => {
          const utterance = new SpeechSynthesisUtterance(sentence);
          if (voice) {
            utterance.voice = voice;
            utterance.lang = voice.lang;
          } else {
            utterance.lang = targetLocale;
          }
          utterance.rate = rate;
          utterance.pitch = pitch;
          utterance.onend = () => resolve();
          utterance.onerror = () => resolve();
          window.speechSynthesis.speak(utterance);
        });
      }
    }
  } finally {
    if (sessionId === currentSessionId) {
      onStatusChange?.("idle");
      onSentenceChange?.(null);
    }
  }
}
