const MEMORY_STORAGE_KEY = "gitagpt:friend_memory:v1";
const MEMORY_OPT_IN_KEY = "gitagpt:memory_opt_in:v1";

export function isMemoryOptedIn() {
  try {
    const raw = localStorage.getItem(MEMORY_OPT_IN_KEY);
    if (raw === null) return false; // Strictly opt-in by default for privacy
    return JSON.parse(raw) === true;
  } catch {
    return false;
  }
}

export function setMemoryOptIn(enabled) {
  try {
    localStorage.setItem(MEMORY_OPT_IN_KEY, JSON.stringify(Boolean(enabled)));
  } catch {
    // ignore storage errors
  }
  return Boolean(enabled);
}

export function loadMemories() {
  try {
    const raw = localStorage.getItem(MEMORY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveMemories(memories) {
  try {
    localStorage.setItem(MEMORY_STORAGE_KEY, JSON.stringify(memories));
  } catch {
    // ignore storage errors
  }
}

export function addMemoryItem(text, category = "personal", force = false) {
  if (!force && !isMemoryOptedIn()) {
    return { memories: loadMemories(), added: null };
  }

  const clean = (text || "").trim();
  if (!clean || clean.length < 3) {
    return { memories: loadMemories(), added: null };
  }

  const current = loadMemories();
  const exists = current.some(
    (m) => m.text.toLowerCase() === clean.toLowerCase()
  );
  if (exists) return { memories: current, added: null };

  const newItem = {
    id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    text: clean,
    category,
    createdAt: Date.now()
  };

  const next = [newItem, ...current].slice(0, 30);
  saveMemories(next);
  return { memories: next, added: newItem };
}

export function updateMemoryItem(id, newText) {
  const clean = (newText || "").trim();
  if (!clean) return removeMemoryItem(id);

  const current = loadMemories();
  const next = current.map((m) =>
    m.id === id ? { ...m, text: clean, updatedAt: Date.now() } : m
  );
  saveMemories(next);
  return next;
}

export function removeMemoryItem(id) {
  const current = loadMemories();
  const next = current.filter((m) => m.id !== id);
  saveMemories(next);
  return next;
}

export function clearAllMemories() {
  saveMemories([]);
  return [];
}

export function deleteAllUserData() {
  try {
    localStorage.removeItem(MEMORY_STORAGE_KEY);
    localStorage.removeItem(MEMORY_OPT_IN_KEY);
    localStorage.removeItem("gitagpt:threads:v2");
    localStorage.removeItem("gitagpt:threads:v1");
    localStorage.removeItem("gitagpt:prefs:v2");
  } catch {
    // ignore
  }
}

/**
 * Extracts personal facts or goals ONLY when the user has opted into Friend Memory.
 */
export function extractMemoryFromUserMessage(messageText) {
  if (!isMemoryOptedIn()) return null;
  if (!messageText || typeof messageText !== "string") return null;
  const text = messageText.trim();

  const patterns = [
    {
      regex: /\b(?:my name is|i am called|call me|mera naam)\s+([^\s.,!?]{2,20})/i,
      format: (m) => `Friend's name is ${m[1].replace(/hai$/i, "").trim()}`,
      category: "name"
    },
    {
      regex: /\b(?:i work as|i am a|i'm a|main ek)\s+([^.,!?]{3,45})/i,
      format: (m) => `Role / background: ${m[1].trim()}`,
      category: "life"
    },
    {
      regex: /\b(?:i am preparing for|preparing for|studying for)\s+([^.,!?]{3,45})/i,
      format: (m) => `Preparing for ${m[1].trim()}`,
      category: "goal"
    },
    {
      regex: /\b(?:i struggle with|my biggest problem is|i am worried about|stressed about)\s+([^.,!?]{3,55})/i,
      format: (m) => `Working through: ${m[1].trim()}`,
      category: "challenge"
    },
    {
      regex: /\b(?:my goal is|i want to achieve|i want to become)\s+([^.,!?]{3,50})/i,
      format: (m) => `Life goal: ${m[1].trim()}`,
      category: "goal"
    }
  ];

  for (const p of patterns) {
    const match = text.match(p.regex);
    if (match) {
      return addMemoryItem(p.format(match), p.category);
    }
  }

  return null;
}

export function detectUserEmotion(messageText = "") {
  const q = messageText.toLowerCase();
  if (
    /(achha nahi|acha nahi|bura lag|sad|cry|lonely|alone|depressed|heartbroken|grief|hurt|lost|broken|udaas|akela|dukh|rona|उदास|रो|अकेला|दुःख|दुखी|टूट|अच्छा नहीं)/i.test(
      q
    )
  ) {
    return {
      id: "comfort",
      emoji: "🫂",
      labelEn: "Here With You (Deep Empathy)",
      labelHi: "सच्ची सहानुभूति और साथ",
      promptHint:
        "The user is feeling low, sad, or heavy-hearted. Do NOT lecture them! Talk like a loving best friend sitting right beside them, comforting them and gently asking what happened."
    };
  }
  if (
    /(bat karna|baat karna|talk to me|suno|listen|stay|mat jao|aur baat|बात करना|सुनो)/i.test(
      q
    )
  ) {
    return {
      id: "listening",
      emoji: "💛",
      labelEn: "Listening Wholeheartedly",
      labelHi: "पूरे दिल से सुन रहा हूँ",
      promptHint:
        "The user wants to keep talking and be heard by a friend. Reassure them warmly that you have all the time in the world for them, and invite them to share whatever is in their heart without any preaching."
    };
  }
  if (
    /(anxious|anxiety|stress|worried|fear|scared|panic|overthink|exam|result|future|tension|pareshan|dar|ghabrahat|तनाव|चिंता|डर|घबराहट|भय)/i.test(
      q
    )
  ) {
    return {
      id: "calm",
      emoji: "🌿",
      labelEn: "Calming Reassurance",
      labelHi: "शांत आश्वासन",
      promptHint:
        "The user is anxious, stressed, or overthinking. Soothe their nerves first like a close friend before sharing one simple comforting thought."
    };
  }
  if (
    /(angry|frustrated|mad|hate|annoyed|betrayed|unfair|gussa|naraz|dhoka|गुस्सा|क्रोध|नाराज)/i.test(
      q
    )
  ) {
    return {
      id: "understanding",
      emoji: "🔥",
      labelEn: "Understanding & Grounded",
      labelHi: "समझ और धैर्य",
      promptHint:
        "The user is feeling frustrated or angry. Acknowledge their frustration without judging them, like a trusted friend helping them vent and cool down."
    };
  }
  if (
    /(lazy|procrastinat|tired|exhausted|burnout|unmotivated|give up|thak|aalas|आलस|थक|हार)/i.test(
      q
    )
  ) {
    return {
      id: "uplift",
      emoji: "⚡",
      labelEn: "Gentle Encouragement",
      labelHi: "मित्रवत उत्साहवर्धन",
      promptHint:
        "The user is feeling drained or tired. Comfort them and remind them gently that resting is okay and they don't have to be perfect today."
    };
  }
  return {
    id: "sakha",
    emoji: "💛",
    labelEn: "Friendly Sakha (Companion)",
    labelHi: "सखा भाव (मित्रवत संवाद)",
    promptHint:
      "Respond with warmth, affection, and natural friendliness like a close companion (Sakha)."
  };
}
