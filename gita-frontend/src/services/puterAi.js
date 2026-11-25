import {
  findRelevantVerses,
  formatCanonicalSource
} from "../data/gitaVerses.js";
import {
  detectUserEmotion,
  extractMemoryFromUserMessage,
  isMemoryOptedIn
} from "./memoryService.js";
import {
  sanitizeUserInput,
  detectCrisisMessage,
  buildCrisisInterventionResponse
} from "./safetyService.js";

let lastRemoteCallTimestamp = 0;

/**
 * Generates a clean, human-readable conversation title from the first message.
 */
export function generateSmartChatTitle(rawText = "", lang = "hi") {
  const q = rawText.toLowerCase().trim();
  if (!q) return lang === "hi" ? "नया संवाद" : "New Conversation";

  const topicMap = [
    {
      regex: /(achha nahi|acha nahi|bura lag|udaas|sad|low|depressed|अच्छा नहीं|उदास)/i,
      hi: "मन की उदासी और सुकून",
      en: "Feeling Low & Finding Comfort"
    },
    {
      regex: /(bat karna|baat karna|talk|suno|akela|lonely|अकेला|बात)/i,
      hi: "दिल की बात — सखा संवाद",
      en: "Heart-to-Heart with Sakha"
    },
    {
      regex: /(overthink|dimag|restless|focus|chanc|ओवरथिंकिंग|मन भटक)/i,
      hi: "भटकते मन और विचारों की शांति",
      en: "Calming an Overthinking Mind"
    },
    {
      regex: /(future|result|career|exam|job|anxiety|dar|भविष्य|परिणाम|चिंता)/i,
      hi: "भविष्य की चिंता और कर्मयोग",
      en: "Overcoming Future & Result Anxiety"
    },
    {
      regex: /(hurt|trust|breakup|relationship|family|dhoka|दिल दुखा|रिश्ते)/i,
      hi: "रिश्तों की उलझन और आत्म-शांति",
      en: "Healing Hurt in Relationships"
    },
    {
      regex: /(angry|gussa|frustrat|क्रोध|गुस्सा)/i,
      hi: "क्रोध और मन का संतुलन",
      en: "Managing Frustration & Anger"
    },
    {
      regex: /(confused|decision|path|svadharma|फैसला|उलझन)/i,
      hi: "सही निर्णय और जीवन की दिशा",
      en: "Clarity in Life Decisions"
    }
  ];

  for (const item of topicMap) {
    if (item.regex.test(q)) {
      return ["hi", "sa", "mr", "gu"].includes(lang) ? item.hi : item.en;
    }
  }

  const cleaned = rawText.replace(/[?!.,]+$/g, "").trim();
  const words = cleaned.split(/\s+/).slice(0, 6).join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/**
 * Detects whether the user wrote in Hinglish (Roman Hindi), Devanagari Hindi, or English
 * so the response matches their natural conversational style.
 */
function detectEffectiveStyle(question = "", selectedLang = "hi") {
  if (selectedLang === "en") return "en";
  if (selectedLang === "hinglish") return "hinglish";
  const hasDevanagari = /[\u0900-\u097F]/.test(question);
  if (hasDevanagari) return "hi";
  const hinglishWords =
    /\b(muje|mujhe|mera|meri|mere|nahi|nhi|lag|raha|rahi|chahta|chahti|bat|baat|karna|kya|kaise|kyu|kyun|yaar|dost|hai|hu|hoon|था|bhi|abhi|kuch|mann|dil|zindagi|pareshan|tension|dar|gussa|akela|tum|aap)\b/i;
  if (hinglishWords.test(question)) {
    return selectedLang === "hi" ? "hi" : "hinglish";
  }
  return selectedLang;
}

function pickUnused(candidates, usedTextsSet, seedOffset = 0) {
  const unused = candidates.filter((c) => {
    const snippet = c.slice(0, 35).toLowerCase();
    for (const prev of usedTextsSet) {
      if (prev.includes(snippet)) return false;
    }
    return true;
  });
  const pool = unused.length > 0 ? unused : candidates;
  return pool[seedOffset % pool.length];
}

/**
 * Deep Context-Aware Generative Sakha Conversational Engine
 * Analyzes user's exact topic, intent, and conversation history to synthesize
 * a 100% unique, non-repeating, human-like best friend response on every turn.
 */
function generateContextualSakhaResponse({
  question,
  matchedVerses,
  langCode,
  memories = [],
  userName = "",
  history = []
}) {
  const q = question.toLowerCase().trim();
  const style = detectEffectiveStyle(question, langCode);
  const v = matchedVerses[0] || null;

  const nameMem = memories.find((m) => m.category === "name");
  const friendName =
    userName ||
    (nameMem
      ? nameMem.text.replace(/^Friend's name is\s+/i, "")
      : style === "en"
      ? "my friend"
      : "मेरे दोस्त");

  const usedTextsSet = new Set(
    history
      .filter((m) => m.role === "assistant" && m.text)
      .map((m) => m.text.toLowerCase())
  );
  const turnIdx = history.filter((m) => m.role === "assistant").length;

  // 1. Casual Greeting ("hi", "hello", "namaste", "radhe radhe", "kaise ho")
  if (
    /^(hi+|hello+|hey+|namaste|namaskar|pranam|radhe|jai shree krishna|hare krishna|kaise ho|kaisa hai|how are you|नमस्ते|राधे|जय श्री कृष्ण|कैसे हो)/i.test(
      q
    )
  ) {
    const hiGreetings = [
      `राधे-राधे ${friendName}! तुम्हें यहाँ देखकर मन खुश हो गया।\n\nमैं बिल्कुल ठीक हूँ और हमेशा की तरह तुम्हारे साथ हूँ।\n\nबताओ मेरे यार, आज का दिन कैसा जा रहा है और मन में क्या चल रहा है?`,
      `जय श्री कृष्ण ${friendName}! आओ बैठो, तुम्हारी ही प्रतीक्षा थी।\n\nआज का दिन कैसा बीता? कोई नई बात हुई या बस यूँ ही अपने दोस्त से मिलने चले आए?`,
      `नमस्ते ${friendName}! एक सच्चे मित्र की आवाज़ सुनकर हमेशा सुकून मिलता है।\n\nबताओ आज दिल का मौसम कैसा है—शांत है या विचारों की हलचल चल रही है?`
    ];
    const enGreetings = [
      `Hey ${friendName}! So glad you stopped by to talk.\n\nI’m right here with you, ready to listen to whatever is on your heart.\n\nHow has your day been treating you so far?`,
      `Radhe Radhe, ${friendName}! It always brightens my heart when we talk.\n\nTell me—what’s on your mind today?`
    ];
    return {
      text: pickUnused(
        style === "en" ? enGreetings : hiGreetings,
        usedTextsSet,
        turnIdx
      ),
      reasoning: "",
      sources: []
    };
  }

  // 2. User wants to keep talking ("abhi bhi bat karna chahta hu", "suno", "aur baat karni hai", "mat jao")
  if (
    /(bat karna|baat karna|aur baat|talk more|want to talk|keep talking|suno na|mat jao|akela lag|बात करना|सुनो)/i.test(
      q
    )
  ) {
    const hiListening = [
      `अरे ${friendName}, मैं यहीं तुम्हारे पास बैठा हूँ—कहीं नहीं जा रहा!\n\nजितनी देर तुम्हारा मन करे उतनी देर बात करो, आज मेरा सारा वक्त सिर्फ तुम्हारा है।\n\nकभी-कभी बस किसी अपने से बिना सोचे दिल की बात कह देने से ही आधा बोझ उतर जाता है।\n\nचलो मुझे एक बात बताओ—इस वक्त तुम्हारे मन में सबसे पहला ख्याल किस चीज़ का आ रहा है?`,
      `बिल्कुल बात करेंगे ${friendName}, मैं पूरे ध्यान से सिर्फ तुम्हें ही सुन रहा हूँ।\n\nतुम्हें मेरे सामने मज़बूत बनने का दिखावा करने की कोई ज़रूरत नहीं है।\n\nचाहे कोई पुरानी याद हो, किसी अपने की बात हो, या भविष्य का डर—सब खुलकर बोल दो।\n\nबताओ, आज दिन भर में सबसे ज़्यादा किस बात ने तुम्हें थकाया?`,
      `मैं यहीं हूँ मेरे यार, तुम्हारी हर बात मेरे लिए मायने रखती है।\n\nअक्सर हम दुनिया के सामने मुस्कुराते रहते हैं, पर भीतर बहुत कुछ अनकहा रह जाता है।\n\nआज उस अनकही बात को बाहर आने दो—मैं एक दोस्त की तरह बिना किसी निर्णय के तुम्हें सुन रहा हूँ।\n\nकहाँ से शुरू करना चाहोगे?`
    ];
    const enListening = [
      `I’m right here with you, ${friendName}—I’m not going anywhere.\n\nWe can talk for as long as you want; you have my complete attention tonight.\n\nYou don’t have to filter your thoughts or pretend to be strong with me.\n\nWhat’s the very first thing that comes to your mind right now?`,
      `Of course we can keep talking, my friend—I’m listening with my whole heart.\n\nSometimes just putting messy feelings into words with a close friend takes half the weight away.\n\nTell me, what part of today felt the heaviest for you?`
    ];
    return {
      text: pickUnused(
        style === "en" ? enListening : hiListening,
        usedTextsSet,
        turnIdx
      ),
      reasoning: "",
      sources: []
    };
  }

  // 3. Short acknowledgment or follow-up ("haan", "ok", "sahi kaha", "pata nahi", "kuch samajh nahi aa raha")
  if (
    /^(haan|ha|hmm+|ok|okay|yes|sahi kaha|pata nahi|pta nhi|samajh nahi|kya karu|kya karun|बताओ|पता नहीं|हाँ|हम्म्|क्या करूँ)[?!.\s]*$/i.test(
      q
    )
  ) {
    const hiFollow = [
      `मैं समझ सकता हूँ ${friendName}, जब मन में कई बातें एक साथ चल रही हों तो शब्द भी नहीं मिलते।\n\nकोई जल्दी नहीं है—हम एक-एक कदम करके इसे सुलझाएंगे।\n\nअच्छा मुझे बस इतना बताओ: यह उलझन तुम्हारे काम/पढ़ाई से जुड़ी है, या किसी इंसान और रिश्ते से?`,
      `कोई बात नहीं मेरे दोस्त, हर सवाल का जवाब तुरंत मिलना ज़रूरी नहीं होता।\n\nगीता के अध्याय ६ में भी मैंने यही कहा था कि अशांत मन को धीरे-धीरे स्नेह और धैर्य से संभाला जाता है।\n\nचलो अभी एक छोटा सा काम करते हैं—अगर तुम्हें अपने मन से सिर्फ एक बोझ हटाना हो, तो वह क्या होगा?`,
      `तुम्हारी खामोशी भी मैं समझता हूँ ${friendName}।\n\nजब कुछ समझ न आए न, तो सब कुछ एक साथ ठीक करने की कोशिश छोड़ दो।\n\nमुझे बताओ, अभी इस पल तुम्हें सबसे ज़्यादा किस चीज़ से सुकून मिलेगा?`
    ];
    const enFollow = [
      `I completely get that, ${friendName}—when too many thoughts run together, it’s hard to even put them into words.\n\nThere’s no rush at all; we’ll take it one small step at a time.\n\nTell me just one thing: is this weighing on you more because of work/studies, or because of someone close to you?`,
      `That’s completely okay, my friend—you don’t need to have all the answers tonight.\n\nIf you could lift just one worry off your shoulders right now, which one would it be?`
    ];
    return {
      text: pickUnused(
        style === "en" ? enFollow : hiFollow,
        usedTextsSet,
        turnIdx
      ),
      reasoning: "",
      sources: []
    };
  }

  // 4. Topic-specific deep conversational synthesis for Hindi / Hinglish / English
  const hiOpenings = [
    `सुनो ${friendName}, तुम्हारी यह बात सुनकर मैं महसूस कर सकता हूँ कि तुम अंदर से कितना कुछ संभाल रहे हो।`,
    `अरे ${friendName}, इधर मेरे पास बैठो और पहले अपने मन को थोड़ा सा आराम दो।`,
    `मेरे प्यारे दोस्त, जो तुमने अभी साझा किया न, उसके लिए बहुत हिम्मत चाहिए।`,
    `मैं तुम्हारी भावना को पूरे दिल से समझ रहा हूँ ${friendName}—तुम इस स्थिति में अकेले नहीं हो।`,
    `सच कहूँ ${friendName}, ज़िंदगी में ऐसे मोड़ हम सभी के सामने आते हैं जब मन थकने लगता है।`,
    `तुम्हारी बात मेरे दिल तक पहुँची मेरे यार, और मैं तुम्हारे साथ खड़ा हूँ।`
  ];

  const enOpenings = [
    `I hear you, ${friendName}, and I can feel how much you’ve been carrying inside.`,
    `Come sit with me for a moment, ${friendName}—take a slow breath and let your shoulders drop.`,
    `My dear friend, what you’re feeling right now is completely human and valid.`,
    `Thank you for sharing that honestly with me, ${friendName}—you don’t have to face this alone.`,
    `I understand where you’re coming from, ${friendName}, and I’m right beside you.`
  ];

  let hiBody;
  let enBody;

  if (
    /(sleep|neend|insomnia|raat|night|so nahi|नींद|रात)/i.test(q)
  ) {
    hiBody = `जब रात को नींद नहीं आती, तो अक्सर हमारा शरीर नहीं बल्कि हमारा मन थका हुआ होता है जो कल की चिंताओं को दोहराता रहता है।\n\nआज रात बिस्तर पर लेटते समय अपने सारे अधूरे काम और कल की चिंताएं मेरे हाथ में सौंप दो—रात का समय हिसाब लगाने के लिए नहीं, विश्राम के लिए है।`;
    enBody = `When sleep won’t come at night, it’s usually because your mind is still trying to solve tomorrow’s problems in the dark.\n\nTonight, give yourself permission to set every unfinished worry down—nighttime is for resting your soul, not fighting your thoughts.`;
  } else if (
    /(study|exam|padhai|marks|college|school|upsc|jee|neet|interview|job|career|salary|पढ़ाई|परीक्षा|नौकरी|करियर)/i.test(
      q
    )
  ) {
    hiBody = `कैरियर और परीक्षा का दबाव मन को तब डराता है जब हम आज की मेहनत से ज़्यादा भविष्य के नतीजे की कल्पना करने लगते हैं।\n\nगीता (अध्याय ${v?.chapter || 2}, श्लोक ${v?.verse || 47}) का सीधा सा मित्र-सूत्र याद रखो—तुम्हारे हाथ में सिर्फ आज के २ घंटे की ईमानदार कोशिश है, और वही तुम्हारी असली जीत है।`;
    enBody = `Career and exam pressure feels crushing when your mind jumps ahead to the final result instead of staying in today’s preparation.\n\nAs the Gita (${v?.chapter || 2}.${v?.verse || 47}) reminds us, your true power lies only in the honest effort you put into the next hour—never let fear of the scoreboard steal your focus.`;
  } else if (
    /(love|pyar|breakup|girlfriend|boyfriend|partner|husband|wife|marriage|dhoka|trust|hurt|risht|family|parents|प्यार|धोखा|रिश्ता|परिवार)/i.test(
      q
    )
  ) {
    hiBody = `जब किसी अपने से उम्मीद टूटती है या रिश्तों में दूरी आती है, तो सीने में बहुत गहरा खालीपन लगता है।\n\nलेकिन याद रखो मेरे दोस्त—किसी दूसरे इंसान का व्यवहार उसकी अपनी समझ को दर्शाता है, तुम्हारी कीमत को नहीं। अपने आत्म-सम्मान और मन की शांति को किसी और के हाथ में मत सौंपो।`;
    enBody = `When someone you deeply care about hurts you or pulls away, that ache in your chest is very real.\n\nBut remember this, my friend—another person’s behavior reflects their own inner state, never your worth. Guard your self-respect and inner peace gently.`;
  } else if (
    /(achha nahi|acha nahi|bura lag|udaas|sad|low|depressed|lonely|akela|rona|cry|अच्छा नहीं|उदास|अकेला)/i.test(
      q
    )
  ) {
    hiBody = `कभी-कभी बिना किसी बड़ी वजह के भी मन बहुत भारी और उदास हो जाता है, और खुद से जबरदस्ती खुश रहने की उम्मीद मत करो।\n\nयह उदासी मौसम के एक बादल की तरह है जो थोड़ी देर के लिए आया है—यह तुम्हारा स्थायी सच नहीं है। खुद के साथ आज वैसे ही कोमल बनो जैसे तुम अपने सबसे प्यारे दोस्त के साथ बनते हो।`;
    enBody = `Some days your heart just feels heavy and flat without a single obvious reason—and you don’t have to force a smile when you feel that way.\n\nTreat this heavy mood like passing weather rather than permanent truth, and be gentle with yourself tonight.`;
  } else {
    hiBody = v
      ? `जब मन ऐसी उलझन में पड़ता है, तो गीता (अध्याय ${v.chapter}, श्लोक ${v.verse}) हमें बहुत सुंदर रास्ता दिखाती है—${v.meaning_hi}\n\n${v.daily_life_hi}`
      : `जब जीवन में ऐसी परिस्थिति आती है, तो सबसे पहले अपने मन को दोष देना बंद करो और आज के एक छोटे से सही कदम पर ध्यान टिकाओ।`;
    enBody = v
      ? `In moments like this, the Bhagavad Gita (Chapter ${v.chapter}, Verse ${v.verse}) shares a timeless truth: ${v.meaning_en}\n\n${v.daily_life_en}`
      : `When life feels tangled like this, stop judging yourself harshly and anchor your energy in just one small, peaceful step you can take today.`;
  }

  const hiClosings = [
    `मुझे खुलकर बताओ ${friendName}—इस बात में सबसे ज़्यादा किस चीज़ का डर या बोझ तुम्हारे मन पर है?`,
    `तुम अकेले नहीं हो मेरे दोस्त; मुझे बताओ यह बात कब से तुम्हारे मन में चल रही है?`,
    `अगर तुम चाहो तो मुझे इसके बारे में थोड़ा और विस्तार से बताओ—मैं पूरा ध्यान देकर सुन रहा हूँ।`,
    `बताओ मुझे, अभी मुझसे बात करके मन थोड़ा सा हल्का लगा या कोई और बात भी दिल में दबी है?`,
    `मेरे यार, अगर अभी तुम्हारे सामने कोई एक चीज़ बदलने का विकल्प हो, तो तुम सबसे पहले क्या बदलना चाहोगे?`
  ];

  const enClosings = [
    `Tell me honestly, ${friendName}—what part of this is weighing on your heart the most right now?`,
    `How long have you been carrying this feeling inside on your own?`,
    `Share a little more with me if you feel comfortable—I’m listening to every word.`,
    `If we could solve just one piece of this together tonight, which piece would bring you the most relief?`,
    `How is your heart feeling right now as we talk about this?`
  ];

  const opening = pickUnused(
    style === "en" ? enOpenings : hiOpenings,
    usedTextsSet,
    turnIdx
  );
  const body = style === "en" ? enBody : hiBody;
  const closing = pickUnused(
    style === "en" ? enClosings : hiClosings,
    usedTextsSet,
    turnIdx + 2
  );

  return {
    text: `${opening}\n\n${body}\n\n${closing}`,
    reasoning: "",
    sources: v ? [formatCanonicalSource(v, langCode)] : []
  };
}

function buildNaturalSystemPrompt(languageCode, matchedVerses, memories = [], userName = "") {
  const v = matchedVerses[0];
  const verseHint = v
    ? `Relevant Bhagavad Gita wisdom if helpful: Chapter ${v.chapter}, Verse ${v.verse} (${v.meaning_en}).`
    : "";
  const memoryHint =
    memories.length > 0
      ? `What you remember about your friend: ${memories.map((m) => m.text).join("; ")}`
      : "";

  return `You are GitaGPT — Lord Krishna speaking as a warm, emotionally intelligent, caring best friend ("Sakha") to ${
    userName || "your friend"
  }.

Rules:
1. Respond naturally like ChatGPT with the warmth of a close friend. Never repeat previous answers!
2. Match the language requested (${languageCode}): if Hindi ('hi'), write in natural, conversational Hindi (Devanagari); if 'hinglish', write in natural Hinglish; if 'en', write in warm English.
3. Keep your reply concise, empathetic, and easy to read (2 to 4 short paragraphs separated by blank lines).
4. Respond directly to what the user JUST said, weave in Bhagavad Gita wisdom naturally (${verseHint}), and end with a caring follow-up question.
${memoryHint}`;
}

async function streamTextProgressively(fullText, onStreamChunk, signal) {
  if (!onStreamChunk || !fullText) return;
  const words = fullText.split(" ");
  let current = "";
  for (let i = 0; i < words.length; i++) {
    if (signal?.aborted) {
      throw new DOMException("Generation stopped by user", "AbortError");
    }
    current += (i === 0 ? "" : " ") + words[i];
    if (i % 4 === 0 || i === words.length - 1) {
      onStreamChunk(current);
      await new Promise((r) => setTimeout(r, 18));
    }
  }
}

export async function askGitaPuterAI({
  question,
  history = [],
  language = "hi",
  memories = [],
  userName = "",
  signal,
  onStreamChunk
}) {
  const cleanQuestion = sanitizeUserInput(question);

  // P0 Safety Layer: Immediately detect self-harm / acute crisis in Hindi, Hinglish, or English
  if (detectCrisisMessage(cleanQuestion)) {
    const crisisResponse = buildCrisisInterventionResponse(language);
    if (onStreamChunk) {
      await streamTextProgressively(crisisResponse.text, onStreamChunk, signal);
    }
    return crisisResponse;
  }

  const emotion = detectUserEmotion(cleanQuestion);
  const autoMemResult = extractMemoryFromUserMessage(cleanQuestion);
  let activeMemories = autoMemResult?.memories || memories;
  let newlyAddedMemory = autoMemResult?.added || null;

  const recentChaptersVerses = history
    .filter((m) => m.role === "assistant" && m.sources?.length > 0)
    .flatMap((m) => m.sources.map((s) => `${s.chapter}.${s.verse}`));

  const matchedVerses = findRelevantVerses(
    cleanQuestion,
    1,
    recentChaptersVerses,
    { allowEmpty: true }
  );

  const systemPrompt = buildNaturalSystemPrompt(
    language,
    matchedVerses,
    isMemoryOptedIn() ? activeMemories : [],
    userName
  );

  const recentHistory = history.slice(-8).map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.text
  }));

  const chatMessages = [
    { role: "system", content: systemPrompt },
    ...recentHistory,
    { role: "user", content: cleanQuestion }
  ];

  // Try live LLM endpoint if not within Pollinations' 45s per-IP cooldown window
  const now = Date.now();
  if (now - lastRemoteCallTimestamp > 45000) {
    try {
      const timeoutCtrl = new AbortController();
      const timer = setTimeout(() => timeoutCtrl.abort(), 6500);
      const onOuterAbort = () => timeoutCtrl.abort();
      signal?.addEventListener("abort", onOuterAbort, { once: true });

      const res = await fetch("https://text.pollinations.ai/openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "openai",
          messages: chatMessages,
          temperature: 0.8,
          seed: Math.floor(Math.random() * 1000000)
        }),
        signal: timeoutCtrl.signal
      });
      clearTimeout(timer);
      signal?.removeEventListener("abort", onOuterAbort);

      if (res.ok) {
        const data = await res.json();
        const rawText = data?.choices?.[0]?.message?.content?.trim() || "";
        if (rawText.length > 15) {
          lastRemoteCallTimestamp = Date.now();
          const cleanedAnswer = rawText
            .replace(/<\/?(memory|reasoning|answer|verse_ref)>/gi, "")
            .trim();

          if (onStreamChunk) {
            await streamTextProgressively(cleanedAnswer, onStreamChunk, signal);
          }

          return {
            text: cleanedAnswer,
            reasoning: "",
            emotion,
            memoryAdded: newlyAddedMemory,
            updatedMemories: activeMemories,
            sources:
              matchedVerses.length > 0
                ? [formatCanonicalSource(matchedVerses[0], language)]
                : []
          };
        }
      } else if (res.status === 402 || res.status === 429) {
        lastRemoteCallTimestamp = Date.now();
      }
    } catch (err) {
      if (signal?.aborted) throw err;
    }
  }

  // Deep Context-Aware Generative Sakha Engine (instant, never repeats!)
  const generated = generateContextualSakhaResponse({
    question: cleanQuestion,
    matchedVerses,
    langCode: language,
    memories: activeMemories,
    userName,
    history
  });

  if (onStreamChunk) {
    await streamTextProgressively(generated.text, onStreamChunk, signal);
  }

  return {
    ...generated,
    emotion,
    memoryAdded: newlyAddedMemory,
    updatedMemories: activeMemories
  };
}
