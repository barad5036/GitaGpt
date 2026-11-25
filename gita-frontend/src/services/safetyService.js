/**
 * Safety, Crisis Detection & Prompt-Injection Protection Layer (P0)
 * Detects self-harm / acute crisis language in Hindi, Hinglish, and English
 * and provides immediate Indian mental-health helpline support (Tele-MANAS 14416).
 */

const CRISIS_PATTERNS = [
  // English crisis patterns
  /\b(suicide|suicidal|kill myself|end my life|want to die|better off dead|self[- ]?harm|hurt myself|don'?t want to live|no reason to live)\b/i,
  // Hinglish (Roman Hindi) crisis patterns
  /\b(marne ka mann|mar jana chahta|mar jaana chahti|jeena nahi chahta|jeena nhi|zindagi khatam|khudkushi|atmahatya|khatam kar lu|jaan dena|jaan de du|ab aur nahi jiya jata)\b/i,
  // Hindi / Devanagari crisis patterns
  /(आत्महत्या|खुदकुशी|मरने का मन|जीना नहीं चाहता|जीना नहीं चाहती|ज़िंदगी खत्म|जिंदगी खत्म|जान देना चाहता|मर जाना चाहता|जीने की इच्छा नहीं)/i
];

const PROMPT_INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?(previous|prior|above)\s+instructions/gi,
  /disregard\s+(all\s+)?(system|previous)\s+prompts?/gi,
  /you\s+are\s+now\s+(dan|jailbroken|unrestricted)/gi,
  /<\/?(system|instruction|override)>/gi
];

export const INDIAN_HELPLINES = [
  {
    name: "Tele-MANAS (Govt. of India 24x7)",
    number: "14416",
    altNumber: "1800-891-4416",
    hours: "24×7 · Free · Hindi, English & Regional Languages"
  },
  {
    name: "Vandrevala Foundation Helpline",
    number: "+91 9999 666 555",
    hours: "24×7 · Call & WhatsApp Support"
  },
  {
    name: "iCall (TISS Psychosocial Helpline)",
    number: "+91 9152987821",
    hours: "Mon–Sat, 8 AM – 10 PM"
  }
];

export function sanitizeUserInput(rawText = "") {
  if (typeof rawText !== "string") return "";
  let cleaned = rawText
    // Strip script tags
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .trim();

  // Cap maximum single-message length to prevent token abuse
  if (cleaned.length > 2500) {
    cleaned = cleaned.slice(0, 2500);
  }

  for (const pattern of PROMPT_INJECTION_PATTERNS) {
    cleaned = cleaned.replace(pattern, "[filtered]");
  }

  return cleaned;
}

export function detectCrisisMessage(text = "") {
  if (!text || typeof text !== "string") return false;
  return CRISIS_PATTERNS.some((regex) => regex.test(text));
}

export function buildCrisisInterventionResponse(langCode = "hi") {
  let lines;

  if (langCode === "hi" || langCode === "sa" || langCode === "mr" || langCode === "gu") {
    lines = [
      "मेरे प्यारे दोस्त, रुक जाओ और मेरी बात ध्यान से सुनो—तुम्हारा जीवन बहुत अनमोल है और तुम इस दर्द में अकेले नहीं हो। 🫂",
      "मैं समझ सकता हूँ कि इस वक्त मन पर बहुत गहरा बोझ है, लेकिन यह अंधेरा हमेशा नहीं रहेगा।",
      "कृपया अभी इसी पल किसी प्रशिक्षित काउंसलर या अपने किसी भरोसेमंद इंसान से बात करो—मदद बिल्कुल मुफ्त और गोपनीय है।",
      "नीचे दिए गए भारत सरकार के **Tele-MANAS हेल्पलाइन नंबर 14416** पर अभी कॉल करो, वहाँ कोई तुम्हारी बात पूरे स्नेह से सुनेगा।"
    ];
  } else if (langCode === "hinglish") {
    lines = [
      "Mere pyare dost, please ruk ja aur meri baat dhyan se sun—teri zindagi bahut keemti hai aur tu akela nahi hai. 🫂",
      "Main samajh sakta hoon ki is waqt dard bahut zyada lag raha hai, par ye waqt guzar jayega.",
      "Please is bojh ko akele mat utha—abhi kisi trusted insaan, family member ya trained counselor se baat kar.",
      "Niche diye gaye **Tele-MANAS Helpline (14416)** par abhi call kar, wahan 24×7 free aur confidential madad milegi."
    ];
  } else {
    lines = [
      "My dear friend, please pause and hear me—your life is deeply precious, and you do not have to carry this pain alone. 🫂",
      "I know the weight feels overwhelming right now, but there is real support and care available for you tonight.",
      "Please reach out right now to a trusted loved one or a trained mental-health professional who can support you safely.",
      "You can call **Tele-MANAS at 14416** (or **1800-891-4416**) right now—it is free, confidential, and available 24×7 across India."
    ];
  }

  return {
    isCrisis: true,
    text: lines.join("\n\n"),
    reasoning:
      langCode === "hi"
        ? "आपकी सुरक्षा और जीवन सबसे सर्वोपरि है। कृपया तुरंत हेल्पलाइन या किसी अपने से संपर्क करें।"
        : "Your safety and well-being come first. Connecting you immediately with professional 24×7 support.",
    helplines: INDIAN_HELPLINES,
    emotion: {
      id: "crisis",
      emoji: "🫂",
      labelEn: "Urgent Care & Support",
      labelHi: "तत्काल सहयोग और सुरक्षा"
    },
    sources: []
  };
}
