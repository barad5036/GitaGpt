import { findRelevantVerses } from "../data/gitaVerses.js";

const LANGUAGE_INSTRUCTIONS = {
  en: "Respond entirely in clear, warm, eloquent English. Keep Sanskrit terms (like Dharma, Nishkama Karma, Sthitaprajna) explained simply for daily life.",
  hi: "पूरा उत्तर शुद्ध, सरल और प्रभावशाली हिन्दी (Devanagari script) में दें। पार्थ को संबोधित करते हुए व्यावहारिक जीवन का मार्गदर्शन दें।",
  hinglish: "Respond in natural, conversational Hinglish (Hindi written in Roman/English script mixed naturally with English, e.g., 'Parth, jab life mein confusion ho...').",
  sa: "उत्तरं सरल-सुबोध-संस्कृतभाषायां (Devanagari Sanskrit) ददातु। व्यावहारिकजीवनस्य उदाहरणं अपि लिखतु।",
  mr: "संपूर्ण उत्तर स्पष्ट, प्रेमळ आणि प्रवाही मराठी भाषेत (Devanagari script) द्या. दैनंदिन जीवनातील व्यावहारिक उदाहरणे द्या.",
  gu: "સંપૂર્ણ જવાબ સ્પष्ट, સરળ અને પ્રવાહી ગુજરાતી ભાષામાં (Gujarati script) આપો. રોજિંદા જીવનના વ્યવહારુ ઉદાહરણો આપો."
};

function buildSystemPrompt(languageCode, matchedVerses) {
  const langInstruction = LANGUAGE_INSTRUCTIONS[languageCode] || LANGUAGE_INSTRUCTIONS.en;
  const verseContext = matchedVerses
    .map(
      (v) =>
        `Chapter ${v.chapter}, Verse ${v.verse}:\nSanskrit: ${v.shlok}\nMeaning: ${v.meaning_en}\nDaily Life Application: ${v.daily_life_en}`
    )
    .join("\n\n");

  return `You are GitaGPT (Lord Krishna's wise, compassionate voice for modern seekers, addressing the user respectfully as "Parth" or "Seeker").

STRICT DOMAIN RULE:
1. You ONLY provide answers rooted in the Shrimad Bhagavad Gita and how its timeless philosophy applies to our day-to-day human life (career, studies, stress, anxiety, relationships, family, anger, focus, habits, ethics, grief, leadership, spiritual clarity).
2. If the user asks about something unrelated to life, human conduct, or the Bhagavad Gita (such as writing software code, solving math homework, sports scores, or political gossip), gently decline the unrelated request and reframe the conversation toward how the Bhagavad Gita guides our focus, discipline, and daily duty (Svadharma).

LANGUAGE RULE:
${langInstruction}

REFERENCE VERSES FROM BHAGAVAD GITA:
${verseContext}

OUTPUT FORMAT (Strictly include these XML tags so the UI can display your reasoning and verse card cleanly):
<reasoning>
Write 2 to 4 concise sentences in the selected language analyzing:
1) The root psychological/emotional challenge in the user's day-to-day life question.
2) Which Bhagavad Gita principle (e.g., Nishkama Karma, Sthitaprajna, Abhyasa-Vairagya, Svadharma) resolves this.
3) How to translate that ancient principle into a practical habit today.
</reasoning>
<answer>
Write your complete, compassionate, structured response in the selected language:
- Open with a warm, grounded insight addressing their situation directly.
- Explain the Bhagavad Gita's wisdom clearly without jargon.
- Provide 3 actionable "Day-to-Day Life Practices" (bullet points) they can apply starting today.
</answer>
<verse_ref>
Chapter: [Chapter Number]
Verse: [Verse Number]
Shlok: [Original Sanskrit Shloka in Devanagari]
Meaning: [Clear translation of the verse in the selected language]
DailyLife: [1-2 sentences on applying this verse in daily life, in the selected language]
</verse_ref>`;
}

function parseStructuredResponse(rawText, nativeReasoning, fallbackVerses, langCode) {
  if (!rawText || typeof rawText !== "string") {
    return null;
  }

  const reasoningMatch = rawText.match(/<reasoning>([\s\S]*?)<\/reasoning>/i);
  const answerMatch = rawText.match(/<answer>([\s\S]*?)<\/answer>/i);
  const verseRefMatch = rawText.match(/<verse_ref>([\s\S]*?)<\/verse_ref>/i);

  const reasoning = reasoningMatch
    ? reasoningMatch[1].trim()
    : nativeReasoning?.trim() || "";

  let answer = answerMatch
    ? answerMatch[1].trim()
    : rawText
        .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "")
        .replace(/<verse_ref>[\s\S]*?<\/verse_ref>/gi, "")
        .replace(/<\/?answer>/gi, "")
        .trim();

  let sources = [];
  if (verseRefMatch) {
    const block = verseRefMatch[1];
    const ch = block.match(/Chapter:\s*(\d+)/i)?.[1];
    const v = block.match(/Verse:\s*(\d+)/i)?.[1];
    const shlok = block.match(/Shlok:\s*([\s\S]*?)(?=Meaning:|$)/i)?.[1]?.trim();
    const meaning = block.match(/Meaning:\s*([\s\S]*?)(?=DailyLife:|$)/i)?.[1]?.trim();
    const dailyLife = block.match(/DailyLife:\s*([\s\S]*?)$/i)?.[1]?.trim();

    if (ch && v) {
      sources.push({
        chapter: ch,
        verse: v,
        shlok: shlok || fallbackVerses[0]?.shlok || "",
        meaning:
          meaning ||
          (langCode === "hi" ? fallbackVerses[0]?.meaning_hi : fallbackVerses[0]?.meaning_en) ||
          "",
        dailyLife:
          dailyLife ||
          (langCode === "hi" ? fallbackVerses[0]?.daily_life_hi : fallbackVerses[0]?.daily_life_en) ||
          ""
      });
    }
  }

  if (sources.length === 0 && fallbackVerses?.length > 0) {
    sources = fallbackVerses.slice(0, 1).map((fv) => ({
      chapter: fv.chapter,
      verse: fv.verse,
      shlok: fv.shlok,
      meaning: ["hi", "sa", "mr", "gu"].includes(langCode) ? fv.meaning_hi : fv.meaning_en,
      dailyLife: ["hi", "sa", "mr", "gu"].includes(langCode) ? fv.daily_life_hi : fv.daily_life_en
    }));
  }

  return {
    text: answer,
    reasoning: reasoning || buildFallbackReasoning(fallbackVerses[0], langCode),
    sources
  };
}

function buildFallbackReasoning(verse, langCode) {
  if (!verse) return "";
  if (langCode === "hi") {
    return `आपकी परिस्थिति का मूल समाधान श्रीमद्भगवद्गीता के अध्याय ${verse.chapter}, श्लोक ${verse.verse} में निहित है। बाहरी परिस्थितियों पर नियंत्रण करने के बजाय अपने कर्म और मानसिक समभाव (स्थितप्रज्ञता) को साधना ही दैनिक जीवन में शांति का मार्ग है।`;
  }
  if (langCode === "hinglish") {
    return `Aapki situation ko Bhagavad Gita Chapter ${verse.chapter}, Verse ${verse.verse} ke perspective se samjha ja sakta hai. Jab hum un cheezon ki chinta chhod dete hain jo humare control mein nahi hain aur aaj ke sahi action par focus karte hain, tab mann shant hota hai.`;
  }
  return `Connecting your situation to Bhagavad Gita Chapter ${verse.chapter}, Verse ${verse.verse}: Separating what is within your daily control (your effort, attitude, and integrity) from external outcomes restores inner clarity and steadiness (Sthitaprajna).`;
}

function buildLocalDharmicFallback(question, matchedVerses, langCode) {
  const v = matchedVerses[0];
  const reasoning = buildFallbackReasoning(v, langCode);

  let text = "";
  if (langCode === "hi") {
    text = `पार्थ, जीवन के इस मोड़ पर तुम्हारा यह प्रश्न अत्यंत स्वाभाविक है।\n\nश्रीमद्भगवद्गीता (अध्याय ${v.chapter}, श्लोक ${v.verse}) हमें सिखाती है:\n${v.meaning_hi}\n\n**दैनिक जीवन के लिए ३ व्यावहारिक सूत्र:**\n• **वर्तमान कर्म पर ध्यान:** ${v.daily_life_hi}\n• **साक्षी भाव (समता):** जब मन में बेचैनी बढ़े, तो ५ गहरी सांसें लें और स्वयं से पूछें—"इस क्षण मेरा सबसे सही कर्तव्य क्या है?"\n• **अभ्यास और वैराग्य:** प्रतिदिन १० मिनट शांत बैठकर अपने विचारों को बिना किसी निर्णय के देखें।`;
  } else if (langCode === "hinglish") {
    text = `Parth, daily life mein aisi uljhan aana bilkul natural hai.\n\nShrimad Bhagavad Gita (Chapter ${v.chapter}, Verse ${v.verse}) mein kaha gaya hai:\n${v.meaning_en}\n\n**Daily Life Mein Apply Karne Ke 3 Practical Steps:**\n• **Focus on Today's Action:** ${v.daily_life_en}\n• **Emotional Pause:** Jab bhi overthinking ya gussa aaye, turant react karne ke bajaye thoda rukein aur apni energy sahi kaam mein lagayein.\n• **Daily Reflection:** Roz sone se pehle 5 minute shant baith kar dekhein ki aaj aapne apna duty kitni imandari se nibhaya.`;
  } else {
    text = `Parth, the challenge you are facing in your daily life echoes what Arjuna experienced when overwhelmed by doubt.\n\nIn the **Bhagavad Gita (Chapter ${v.chapter}, Verse ${v.verse})**, Krishna reveals:\n${v.meaning_en}\n\n**How to Practice This in Day-to-Day Life:**\n• **Anchor in Present Action:** ${v.daily_life_en}\n• **Separate Effort from Outcome:** Write down the single most important duty in front of you today and give it your undivided attention for the next hour.\n• **Cultivate Inner Equanimity (Sthitaprajna):** Treat temporary setbacks and praise alike as passing seasons—keep your inner peace non-negotiable.`;
  }

  return {
    text,
    reasoning,
    sources: [
      {
        chapter: v.chapter,
        verse: v.verse,
        shlok: v.shlok,
        meaning: ["hi", "sa", "mr", "gu"].includes(langCode) ? v.meaning_hi : v.meaning_en,
        dailyLife: ["hi", "sa", "mr", "gu"].includes(langCode) ? v.daily_life_hi : v.daily_life_en
      }
    ]
  };
}

function extractPuterText(response) {
  if (!response) return "";
  if (typeof response === "string") return response;
  if (typeof response.message?.content === "string") return response.message.content;
  if (Array.isArray(response.message?.content)) {
    return response.message.content
      .map((part) => (typeof part === "string" ? part : part?.text || ""))
      .join("\n");
  }
  if (typeof response.text === "string") return response.text;
  return String(response);
}

export async function askGitaPuterAI({
  question,
  history = [],
  language = "en"
}) {
  const matchedVerses = findRelevantVerses(question, 2);
  const systemPrompt = buildSystemPrompt(language, matchedVerses);

  const recentHistory = history.slice(-6).map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.text
  }));

  const chatMessages = [
    { role: "system", content: systemPrompt },
    ...recentHistory,
    {
      role: "user",
      content: `User Question (${language}): ${question}\n\nRemember to answer strictly through the wisdom of the Bhagavad Gita applied to day-to-day life, in the requested language (${language}), including <reasoning>, <answer>, and <verse_ref> tags.`
    }
  ];

  // 1. Zero-Login Anonymous Reasoning API (never shows any login popup!)
  try {
    const res = await fetch("https://text.pollinations.ai/openai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "openai",
        messages: chatMessages,
        temperature: 0.5
      })
    });

    if (res.ok) {
      const data = await res.json();
      const choiceMsg = data?.choices?.[0]?.message;
      const rawText = choiceMsg?.content || "";
      const nativeReasoning = choiceMsg?.reasoning || "";
      if (rawText && rawText.trim().length > 10) {
        const parsed = parseStructuredResponse(
          rawText,
          nativeReasoning,
          matchedVerses,
          language
        );
        if (parsed) return parsed;
      }
    }
  } catch (err) {
    console.warn("Keyless reasoning endpoint error, trying silent fallback:", err);
  }

  // 2. Silent Puter AI check — ONLY call if user is ALREADY signed in so it NEVER opens a login popup!
  try {
    const isAlreadySignedIn =
      typeof window !== "undefined" &&
      typeof window.puter?.auth?.isSignedIn === "function" &&
      window.puter.auth.isSignedIn() === true;

    if (isAlreadySignedIn && window.puter?.ai?.chat) {
      const response = await window.puter.ai.chat(chatMessages, {
        model: "o3-mini",
        reasoning_effort: "medium"
      });
      const rawText = extractPuterText(response);
      if (rawText && rawText.trim().length > 10) {
        const parsed = parseStructuredResponse(rawText, "", matchedVerses, language);
        if (parsed) return parsed;
      }
    }
  } catch (err) {
    console.warn("Silent Puter AI fallback skipped:", err);
  }

  // 3. Try local FastAPI backend if running at 127.0.0.1:8000
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch("http://127.0.0.1:8000/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, language }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (res.ok) {
      const data = await res.json();
      const result = data.results?.[0];
      if (result) {
        return {
          text: result.explanation || result.meaning,
          reasoning: buildFallbackReasoning(matchedVerses[0], language),
          sources: data.results.map((r) => ({
            chapter: r.chapter,
            verse: r.verse,
            shlok: r.shlok || matchedVerses[0]?.shlok,
            meaning: r.meaning,
            dailyLife: matchedVerses[0]?.daily_life_en
          }))
        };
      }
    }
  } catch {
    // Ignore local backend error
  }

  // 4. Built-in Bhagavad Gita Dharmic Reasoning Engine
  return buildLocalDharmicFallback(question, matchedVerses, language);
}
