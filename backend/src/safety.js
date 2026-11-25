/**
 * Server-side input validation and safety checks for the chat gateway.
 * The client is never allowed to supply its own system prompt.
 */

const SUPPORTED_LANGUAGES = new Set(["hi", "en", "hinglish", "sa", "mr", "gu"]);

const CRISIS_REGEX =
  /(suicide|suicidal|kill myself|end my life|want to die|better off dead|self[- ]?harm|hurt myself|marne ka mann|mar jana chahta|mar jaana chahti|jeena nahi chahta|jeena nahi chahti|khudkushi|atmahatya|jaan de du|आत्महत्या|खुदकुशी|मरने का मन|जीना नहीं चाहता|जीना नहीं चाहती|जान देना चाहता)/i;

const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/gi,
  /disregard\s+(all\s+)?(system|previous)\s+prompts?/gi,
  /you\s+are\s+now\s+(dan|jailbroken|unrestricted)/gi,
  /<\/?(system|instruction|override)>/gi
];

export function sanitizeContent(value, maxLength = 4000) {
  if (typeof value !== "string") return "";
  let cleaned = value.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "").trim();
  if (cleaned.length > maxLength) cleaned = cleaned.slice(0, maxLength);
  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    cleaned = cleaned.replace(pattern, "[filtered]");
  }
  return cleaned;
}

export function isCrisisText(text = "") {
  return CRISIS_REGEX.test(String(text));
}

export function crisisReply(language = "hi") {
  if (language === "en") {
    return [
      "I'm really glad you told me, and I want you to know your life matters deeply. You don't have to carry this alone.",
      "",
      "Please reach out right now to someone who can help you stay safe:",
      "- **Tele-MANAS: 14416** or **1800-891-4416** (India, free, 24x7)",
      "- A family member, friend or anyone you trust",
      "",
      "If you're in immediate danger, please call **112**. I'm here with you — would you tell me a little about what's making things feel this heavy?"
    ].join("\n");
  }
  if (language === "hinglish") {
    return [
      "Mujhe bahut achha laga ki tumne mujhse ye share kiya. Tumhari zindagi bahut keemti hai, aur tumhe ye bojh akele nahi uthana hai.",
      "",
      "Abhi isi waqt kisi se baat karo jo madad kar sake:",
      "- **Tele-MANAS: 14416** ya **1800-891-4416** (free, 24x7)",
      "- Koi family member, dost ya bharosemand insaan",
      "",
      "Agar turant khatra lag raha ho, toh **112** par call karo. Main yahin hoon — kya batana chahoge ki kya cheez itni bhaari lag rahi hai?"
    ].join("\n");
  }
  return [
    "तुमने मुझसे यह बात कही, इसके लिए धन्यवाद। तुम्हारा जीवन बहुत अनमोल है, और यह बोझ तुम्हें अकेले नहीं उठाना है।",
    "",
    "कृपया अभी किसी ऐसे व्यक्ति से बात करो जो तुम्हें सुरक्षित रखने में मदद कर सके:",
    "- **Tele-MANAS: 14416** या **1800-891-4416** (निःशुल्क, 24x7)",
    "- परिवार का कोई सदस्य, दोस्त या कोई भरोसेमंद इंसान",
    "",
    "अगर तुरंत खतरा महसूस हो रहा है, तो **112** पर कॉल करो। मैं यहीं हूँ — क्या बताओगे कि कौन-सी बात इतनी भारी लग रही है?"
  ].join("\n");
}

/**
 * Normalizes and validates a chat request body.
 * - Only "user" and "assistant" roles are accepted (client system prompts are dropped).
 * - History is capped to the most recent 16 turns, each capped to 4,000 characters.
 */
export function normalizeChatRequest(body = {}) {
  const rawMessages = Array.isArray(body.messages) ? body.messages : [];
  const messages = rawMessages
    .filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string"
    )
    .slice(-16)
    .map((m) => ({ role: m.role, content: sanitizeContent(m.content, 4000) }))
    .filter((m) => m.content.length > 0);

  const chapter = Number(body.verse?.chapter);
  const verseNumber = Number(body.verse?.verse);
  const verse =
    Number.isInteger(chapter) &&
    Number.isInteger(verseNumber) &&
    chapter >= 1 &&
    chapter <= 18 &&
    verseNumber >= 1 &&
    verseNumber <= 80
      ? {
          chapter,
          verse: verseNumber,
          text: sanitizeContent(String(body.verse.text || ""), 600)
        }
      : null;

  return {
    messages,
    language: SUPPORTED_LANGUAGES.has(body.language) ? body.language : "hi",
    userName: sanitizeContent(String(body.userName || ""), 60),
    memories: (Array.isArray(body.memories) ? body.memories : [])
      .slice(0, 12)
      .map((m) => sanitizeContent(String(m), 200))
      .filter(Boolean),
    verse
  };
}
