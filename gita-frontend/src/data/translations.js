export const LANGUAGES = [
  { code: "en", label: "English", native: "English", speechLang: "en-IN", flag: "🇬🇧" },
  { code: "hi", label: "Hindi", native: "हिन्दी", speechLang: "hi-IN", flag: "🇮🇳" },
  { code: "hinglish", label: "Hinglish", native: "Hinglish", speechLang: "en-IN", flag: "🇮🇳" },
  { code: "sa", label: "Sanskrit", native: "संस्कृतम्", speechLang: "hi-IN", flag: "🕉️" },
  { code: "mr", label: "Marathi", native: "मराठी", speechLang: "mr-IN", flag: "🇮🇳" },
  { code: "gu", label: "Gujarati", native: "ગુજરાતી", speechLang: "gu-IN", flag: "🇮🇳" },
];

export const TRANSLATIONS = {
  en: {
    appName: "GitaGPT",
    subtitle: "Bhagavad Gita Wisdom & Life Guidance",
    newChat: "New conversation",
    searchPlaceholder: "Search conversations…",
    noChats: "No conversations yet",
    noSearchMatch: "No matching conversations",
    today: "Conversations",
    footerQuote: "“You have a right to perform your prescribed duties, but you are not entitled to the fruits of your actions.” — BG 2.47",
    welcomeBadge: "Shrimad Bhagavad Gita · Daily Life Guidance",
    welcomeTitle: "What life question shall we reflect upon, Parth?",
    welcomeSubtitle:
      "Ask about career stress, relationships, inner peace, duty (Dharma), or any verse of the Bhagavad Gita.",
    inputPlaceholder: "Ask about a life dilemma, stress, duty, or Bhagavad Gita verse…",
    disclaimer: "Guided purely by the teachings of Shrimad Bhagavad Gita for day-to-day clarity.",
    thinking: "Contemplating the Gita’s wisdom for your situation…",
    reasoningTitle: "Dharmic Reasoning & Life Contemplation",
    shlokaHeading: "Sacred Verse Reference",
    meaningHeading: "Meaning",
    dailyLifeHeading: "Day-to-Day Life Application",
    autoReadOn: "Auto-Voice ON",
    autoReadOff: "Auto-Voice OFF",
    voicePackBtn: "Voice Pack",
    listenBtn: "Listen",
    stopBtn: "Stop",
    speakingStatus: "Speaking…",
    loadingVoice: "Loading open-source voice pack…",
    voiceModalTitle: "Open-Source Voice Pack & Audio Settings",
    voiceModalDesc: "Choose a fluent voice pack to read every Bhagavad Gita answer aloud automatically.",
    autoReadToggleLabel: "Automatically read every answer aloud",
    voiceEngineLabel: "Voice Pack Engine",
    piperVoiceLabel: "Open-Source Piper Neural Voice Pack (Local WASM)",
    browserVoiceLabel: "Natural Neural Voice Pack (Multilingual Fluent)",
    speechSpeedLabel: "Reading Speed",
    downloadVoiceBtn: "Download Pack",
    downloadedBadge: "Ready",
    testVoiceBtn: "Test Fluent Voice",
    testSampleText: "O Parth, perform your duty with a calm and steady mind, free from anxious attachment to results.",
    suggestions: [
      {
        category: "Career & Stress",
        title: "Overcoming anxiety about results",
        prompt: "I work hard every day, but constant anxiety about my career future and results is exhausting me. How can I apply the Bhagavad Gita in daily life?"
      },
      {
        category: "Mind & Focus",
        title: "Controlling an overthinking mind",
        prompt: "My mind is constantly restless, distracted, and overthinking. What practical daily method does Krishna give in the Bhagavad Gita to master the mind?"
      },
      {
        category: "Relationships",
        title: "Dealing with hurt & expectations",
        prompt: "How should I deal with people who hurt me or break my trust in family and relationships according to the Bhagavad Gita?"
      },
      {
        category: "Decision Making",
        title: "Finding my true duty (Svadharma)",
        prompt: "I feel confused between following societal expectations and my own inner calling. How does the Bhagavad Gita help us choose the right path?"
      }
    ]
  },
  hi: {
    appName: "गीता GPT",
    subtitle: "श्रीमद्भगवद्गीता ज्ञान एवं दैनिक जीवन चिंतन",
    newChat: "नया संवाद",
    searchPlaceholder: "संवाद खोजें…",
    noChats: "अभी कोई संवाद नहीं है",
    noSearchMatch: "कोई संवाद नहीं मिला",
    today: "पूर्व संवाद",
    footerQuote: "“कर्मण्येवाधिकारस्ते मा फलेषु कदाचन” — श्रीमद्भगवद्गीता २.४७",
    welcomeBadge: "श्रीमद्भगवद्गीता · दैनिक जीवन मार्गदर्शन",
    welcomeTitle: "पार्थ, आज जीवन की किस उलझन पर विचार करें?",
    welcomeSubtitle:
      "कार्य का तनाव, संबंध, मानसिक शांति, स्वधर्म या श्रीमद्भगवद्गीता के किसी भी श्लोक पर प्रश्न पूछें।",
    inputPlaceholder: "अपने दैनिक जीवन की समस्या, कर्तव्य या गीता के श्लोक के बारे में पूछें…",
    disclaimer: "दैनिक जीवन में स्पष्टता और धर्म के लिए पूर्णतः श्रीमद्भगवद्गीता के उपदेशों पर आधारित।",
    thinking: "गीता के आलोक में आपकी परिस्थिति पर चिंतन हो रहा है…",
    reasoningTitle: "धार्मिक तार्किक चिंतन (Dharmic Reasoning)",
    shlokaHeading: "पवित्र श्लोक संदर्भ",
    meaningHeading: "भावार्थ",
    dailyLifeHeading: "दैनिक जीवन में प्रयोग",
    autoReadOn: "स्वर पाठ चालू",
    autoReadOff: "स्वर पाठ बंद",
    voicePackBtn: "वॉइस पैक",
    listenBtn: "सुनें",
    stopBtn: "रोकें",
    speakingStatus: "बोल रहा है…",
    loadingVoice: "ओपन-सोर्स वॉइस पैक लोड हो रहा है…",
    voiceModalTitle: "ओपन-सोर्स वॉइस पैक एवं ध्वनि सेटिंग्स",
    voiceModalDesc: "प्रत्येक उत्तर को धाराप्रवाह और स्पष्ट आवाज़ में सुनने के लिए अपना वॉइस पैक चुनें।",
    autoReadToggleLabel: "प्रत्येक उत्तर को स्वतः पढ़कर सुनाएं",
    voiceEngineLabel: "वॉइस पैक इंजन",
    piperVoiceLabel: "ओपन-सोर्स पाइपर न्यूरल वॉइस पैक (Piper VITS WASM)",
    browserVoiceLabel: "प्राकृतिक भारतीय न्यूरल वॉइस पैक (बहुभाषी)",
    speechSpeedLabel: "पढ़ने की गति",
    downloadVoiceBtn: "पैक डाउनलोड करें",
    downloadedBadge: "तैयार है",
    testVoiceBtn: "आवाज़ का परीक्षण करें",
    testSampleText: "हे पार्थ, फल की चिंता छोड़कर समभाव से अपने कर्तव्य का पालन करो, यही सच्चा योग है।",
    suggestions: [
      {
        category: "कर्म एवं तनाव",
        title: "परिणाम की चिंता और तनाव से मुक्ति",
        prompt: "मैं प्रतिदिन कड़ी मेहनत करता हूँ, लेकिन भविष्य और परिणामों की चिंता मुझे मानसिक रूप से थका देती है। भगवद्गीता के अनुसार मैं अपने दैनिक जीवन में शांति कैसे पाऊं?"
      },
      {
        category: "मन और एकाग्रता",
        title: "चंचल और अधिक सोचने वाले मन पर नियंत्रण",
        prompt: "मेरा मन बहुत भटकता है और मैं ओवरथिंकिंग से परेशान हूँ। श्रीकृष्ण ने गीता में मन को शांत और एकाग्र करने का क्या व्यावहारिक उपाय बताया है?"
      },
      {
        category: "संबंध और भावनाएं",
        title: "संबंधों में अपेक्षा और दुःख का समाधान",
        prompt: "परिवार या मित्रों में जब अपने लोग ही दुःख दें या अपेक्षाएं टूटें, तो भगवद्गीता के अनुसार हमें कैसा व्यवहार और मानसिक भाव रखना चाहिए?"
      },
      {
        category: "सही निर्णय",
        title: "अपने सच्चे कर्तव्य (स्वधर्म) की पहचान",
        prompt: "मैं अपने जीवन के सही लक्ष्य और कर्तव्य को लेकर असमंजस में हूँ। गीता हमें सही निर्णय लेना कैसे सिखाती है?"
      }
    ]
  },
  hinglish: {
    appName: "GitaGPT",
    subtitle: "Bhagavad Gita Wisdom & Daily Life Guidance",
    newChat: "Naya Chat",
    searchPlaceholder: "Chats search karein…",
    noChats: "Abhi koi chat nahi hai",
    noSearchMatch: "Koi chat nahi mila",
    today: "Pichhle Samvad",
    footerQuote: "“Karmanye vadhikaraste ma phaleshu kadachana” — BG 2.47",
    welcomeBadge: "Shrimad Bhagavad Gita · Daily Life Guidance",
    welcomeTitle: "Parth, aaj life ki kis uljhan par baat karein?",
    welcomeSubtitle:
      "Career stress, relationships, overthinking, discipline ya Bhagavad Gita ke kisi bhi shloka ke baare mein poochhein.",
    inputPlaceholder: "Apni daily life problem, confusion ya Gita verse yahan likhein…",
    disclaimer: "Bhagavad Gita ke timeless wisdom par aadharit practical life guidance.",
    thinking: "Gita ke gyan se aapki situation par vichar ho raha hai…",
    reasoningTitle: "Dharmic Reasoning & Contemplation",
    shlokaHeading: "Bhagavad Gita Shloka",
    meaningHeading: "Matlab (Meaning)",
    dailyLifeHeading: "Daily Life Mein Kaise Apply Karein",
    autoReadOn: "Auto-Voice ON",
    autoReadOff: "Auto-Voice OFF",
    voicePackBtn: "Voice Pack",
    listenBtn: "Sunein",
    stopBtn: "Rokein",
    speakingStatus: "Bol raha hai…",
    loadingVoice: "Open-source voice pack load ho raha hai…",
    voiceModalTitle: "Open-Source Voice Pack & Audio Settings",
    voiceModalDesc: "Har answer ko fluent aawaz mein sunne ke liye voice pack chunein.",
    autoReadToggleLabel: "Har answer ko automatically padh kar sunayein",
    voiceEngineLabel: "Voice Pack Engine",
    piperVoiceLabel: "Open-Source Piper Neural Voice Pack (Local WASM)",
    browserVoiceLabel: "Natural Neural Voice Pack (Indian Accent)",
    speechSpeedLabel: "Bolne ki Speed",
    downloadVoiceBtn: "Download Pack",
    downloadedBadge: "Ready",
    testVoiceBtn: "Voice Test Karein",
    testSampleText: "Hey Parth, result ki tension chhod kar apne aaj ke karma par pura focus karo.",
    suggestions: [
      {
        category: "Career & Anxiety",
        title: "Future aur result ke dar se kaise niklein?",
        prompt: "Main mehnat toh karta hoon par future aur failure ka dar hamesha rehta hai. Bhagavad Gita ke hisab se main daily life mein fearless kaise banu?"
      },
      {
        category: "Focus & Mind",
        title: "Overthinking aur distraction kaise rokein?",
        prompt: "Mera dimag bahut overthink karta hai aur kaam mein focus nahi lagta. Bhagavad Gita mein mann ko control karne ka practical tarika kya hai?"
      },
      {
        category: "Relationships",
        title: "Expectations aur heartbreak se kaise deal karein?",
        prompt: "Jab close log hurt karte hain ya expectations toot-ti hain, toh Bhagavad Gita ke according humein apni mental peace kaise bachani chahiye?"
      },
      {
        category: "Self Discipline",
        title: "Procrastination aur aalas kaise khatam karein?",
        prompt: "Main roz sochta hoon ki disciplined rahunga par aalas aur procrastination ho jata hai. Krishna iske liye Gita mein kya samjhate hain?"
      }
    ]
  },
  sa: {
    appName: "गीता GPT",
    subtitle: "श्रीमद्भगवद्गीता प्रज्ञा दैनिकजीवनचिन्तनम् च",
    newChat: "नूतनसंवादः",
    searchPlaceholder: "संवादान् अन्विष्यताम्…",
    noChats: "संवादाः न सन्ति",
    noSearchMatch: "न कोऽपि संवादः प्राप्तः",
    today: "संवादाः",
    footerQuote: "“कर्मण्येवाधिकारस्ते मा फलेषु कदाचन” — भ.गी. २.४७",
    welcomeBadge: "श्रीमद्भगवद्गीता · धर्मचिन्तनम्",
    welcomeTitle: "हे पार्थ, अद्य जीवनस्य कस्मिन् विषये चिन्तनं कुर्मः?",
    welcomeSubtitle:
      "कर्तव्यम्, मनसः शान्तिः, धर्मसङ्कटम् अथवा गीतायाः श्लोकानाम् अर्थं पृच्छतु।",
    inputPlaceholder: "स्वप्रश्नं अत्र लिखतु…",
    disclaimer: "श्रीमद्भगवद्गीतायाः उपदेशेषु आधारितं मार्गदर्शनम्।",
    thinking: "गीतायाः प्रज्ञया चिन्तनं प्रचलति…",
    reasoningTitle: "धार्मिकविमर्शः (Dharmic Reasoning)",
    shlokaHeading: "मूलश्लोकः",
    meaningHeading: "भावार्थः",
    dailyLifeHeading: "दैनिकजीवने आचरणम्",
    autoReadOn: "वाचनं सक्रियम्",
    autoReadOff: "वाचनं निष्क्रियम्",
    voicePackBtn: "ध्वनिः",
    listenBtn: "श्रूयताम्",
    stopBtn: "विरम्यताम्",
    speakingStatus: "पठति…",
    loadingVoice: "ध्वनिमॉडलम् आगच्छति…",
    voiceModalTitle: "ध्वनि-विकल्पाः (Open-Source Voice Pack)",
    voiceModalDesc: "प्रत्येकम् उत्तरं स्पष्टस्वरेण श्रोतुं ध्वनिं चिनोतु।",
    autoReadToggleLabel: "प्रत्येकम् उत्तरं स्वतः पठतु",
    voiceEngineLabel: "ध्वनि-प्रणाली",
    piperVoiceLabel: "Open-Source Piper Neural Voice Pack",
    browserVoiceLabel: "Natural Sanskrit/Hindi Voice Pack",
    speechSpeedLabel: "पठनगतिः",
    downloadVoiceBtn: "अवतारयतु",
    downloadedBadge: "सज्जम्",
    testVoiceBtn: "ध्वनिपरीक्षणम्",
    testSampleText: "कर्मण्येवाधिकारस्ते मा फलेषु कदाचन। समत्वं योग उच्यते।",
    suggestions: [
      {
        category: "कर्मयोगः",
        title: "निष्कामकर्मणः दैनिकजीवने प्रयोगः",
        prompt: "दैनिकजीवने फलचिन्तां विना निष्कामभावेन कर्म कथं करणीयम्? श्रीमद्भगवद्गीतायाः आधारेण बोधयतु।"
      },
      {
        category: "मनोनिग्रहः",
        title: "चञ्चलमनसः नियन्त्रणोपायः",
        prompt: "चञ्चलं मनः कथं वशीकर्तुं शक्यते? अभ्यासेन वैराग्येण च मनसः शान्तिः कथं लभ्यते?"
      },
      {
        category: "स्थितप्रज्ञता",
        title: "सुखदुःखयोः समभावः",
        prompt: "जीवने सुखदुःखयोः लाभालाभयोः च समभावः कथं स्थापनीयः?"
      },
      {
        category: "स्वधर्मः",
        title: "कर्तव्यनिर्णये स्पष्टता",
        prompt: "यदा जीवने कर्तव्यविषये मोहः संशयः च भवति तदा गीता किम् उपदिशति?"
      }
    ]
  },
  mr: {
    appName: "गीता GPT",
    subtitle: "श्रीमद्भगवद्गीता ज्ञान आणि दैनंदिन जीवन चिंतन",
    newChat: "नवीन संवाद",
    searchPlaceholder: "संवाद शोधा…",
    noChats: "अद्याप कोणताही संवाद नाही",
    noSearchMatch: "संवाद सापडला नाही",
    today: "मागील संवाद",
    footerQuote: "“कर्मण्येवाधिकारस्ते मा फलेषु कदाचन” — भगवद्गीता २.४७",
    welcomeBadge: "श्रीमद्भगवद्गीता · दैनंदिन जीवन मार्गदर्शन",
    welcomeTitle: "पार्थ, आज जीवनातील कोणत्या प्रश्नावर चिंतन करूया?",
    welcomeSubtitle:
      "कामाचा ताण, नातेसंबंध, मानसिक शांती, स्वधर्म किंवा भगवद्गीतेतील श्लोकांबद्दल विचारा.",
    inputPlaceholder: "तुमच्या दैनंदिन जीवनातील समस्या किंवा गीतेतील श्लोकाबद्दल विचारा…",
    disclaimer: "दैनंदिन जीवनातील स्पष्टतेसाठी पूर्णपणे श्रीमद्भगवद्गीतेच्या शिकवणीवर आधारित.",
    thinking: "गीतेच्या ज्ञानानुसार तुमच्या प्रश्नावर चिंतन सुरू आहे…",
    reasoningTitle: "धार्मिक तार्किक चिंतन (Dharmic Reasoning)",
    shlokaHeading: "पवित्र श्लोक संदर्भ",
    meaningHeading: "अर्थ",
    dailyLifeHeading: "दैनंदिन जीवनात आचरण",
    autoReadOn: "आवाज चालू",
    autoReadOff: "आवाज बंद",
    voicePackBtn: "व्हॉइस पॅक",
    listenBtn: "ऐका",
    stopBtn: "थांबा",
    speakingStatus: "वाचत आहे…",
    loadingVoice: "ओपन-सोर्स व्हॉइस पॅक लोड होत आहे…",
    voiceModalTitle: "ओपन-सोर्स व्हॉइस पॅक आणि ऑडिओ सेटिंग्ज",
    voiceModalDesc: "प्रत्येक उत्तर स्पष्ट आणि अस्खलित आवाजात ऐकण्यासाठी व्हॉइस पॅक निवडा.",
    autoReadToggleLabel: "प्रत्येक उत्तर आपोआप वाचून दाखवा",
    voiceEngineLabel: "व्हॉइस पॅक इंजिन",
    piperVoiceLabel: "Open-Source Piper Neural Voice Pack (Local WASM)",
    browserVoiceLabel: "Natural Neural Voice Pack (मराठी/हिंदी)",
    speechSpeedLabel: "वाचनाचा वेग",
    downloadVoiceBtn: "डाउनलोड करा",
    downloadedBadge: "तयार",
    testVoiceBtn: "आवाज तपासा",
    testSampleText: "हे पार्थ, फळाची चिंता न करता शांत मनाने आपले कर्तव्य करत राहा.",
    suggestions: [
      {
        category: "करिअर आणि तणाव",
        title: "यशापयशाच्या भीतीवर मात कशी करावी?",
        prompt: "मी खूप कष्ट करतो पण भविष्याची आणि निकालाची भीती मनाला अस्वस्थ करते. भगवद्गीतेनुसार दैनंदिन जीवनात ही भीती कशी दूर करावी?"
      },
      {
        category: "मन आणि एकाग्रता",
        title: "अतिविचार (Overthinking) कसा थांबवावा?",
        prompt: "माझे मन खूप चंचल आहे आणि सतत अतिविचार करते. गीतेनुसार मनावर नियंत्रण मिळवण्याचा व्यावहारिक मार्ग कोणता?"
      },
      {
        category: "नातेसंबंध",
        title: "नात्यांमधील दुरावा आणि अपेक्षाभंग",
        prompt: "जेव्हा जवळचे लोक दुखावतात तेव्हा भगवद्गीतेनुसार आपण आपली मानसिक शांती कशी जपावी?"
      },
      {
        category: "स्वधर्म",
        title: "योग्य निर्णय कसा घ्यावा?",
        prompt: "आयुष्यात योग्य मार्ग आणि कर्तव्य निवडताना गोंधळ उडतो. श्रीकृष्ण गीतेत याबद्दल काय मार्गदर्शन करतात?"
      }
    ]
  },
  gu: {
    appName: "ગીતા GPT",
    subtitle: "શ્રીમદ્ ભગવદ્ ગીતા જ્ઞાન અને દૈનિક જીવન ચિંતન",
    newChat: "નવો સંવાદ",
    searchPlaceholder: "સંવાદ શોધો…",
    noChats: "હજુ કોઈ સંવાદ નથી",
    noSearchMatch: "કોઈ સંવાદ મળ્યો નથી",
    today: "અગાઉના સંવાદો",
    footerQuote: "“કર્મણ્યેવાધિકારસ્તે મા ફલેષુ કદાચન” — ભગવદ્ ગીતા ૨.૪૭",
    welcomeBadge: "શ્રીમદ્ ભગવદ્ ગીતા · દૈનિક જીવન માર્ગદર્શન",
    welcomeTitle: "પાર્થ, આજે જીવનના કયા પ્રશ્ન પર ચિંતન કરીએ?",
    welcomeSubtitle:
      "કારકિર્દીનો તણાવ, સંબંધો, માનસિક શાંતિ, સ્વધર્મ કે ભગવદ્ ગીતાના કોઈપણ શ્લોક વિશે પૂછો.",
    inputPlaceholder: "તમારા દૈનિક જીવનની સમસ્યા કે ગીતાના શ્લોક વિશે પૂછો…",
    disclaimer: "દૈનિક જીવનમાં સ્પષ્ટતા માટે સંપૂર્ણપણે શ્રીમદ્ ભગવદ્ ગીતાના ઉપદેશો પર આધારિત.",
    thinking: "ગીતાના જ્ઞાનના આધારે તમારી પરિસ્થિતિ પર ચિંતન થઈ રહ્યું છે…",
    reasoningTitle: "ધાર્મિક તાર્કિક ચિંતન (Dharmic Reasoning)",
    shlokaHeading: "પવિત્ર શ્લોક સંદર્ભ",
    meaningHeading: "ભાવાર્થ",
    dailyLifeHeading: "દૈનિક જીવનમાં આચરણ",
    autoReadOn: "ઓટો-વોઇસ ચાલુ",
    autoReadOff: "ઓટો-વોઇસ બંધ",
    voicePackBtn: "વોઇસ પેक",
    listenBtn: "સાંભળો",
    stopBtn: "રોકો",
    speakingStatus: "બોલી રહ્યું છે…",
    loadingVoice: "ઓપન-સોર્સ વોઇસ મોડેલ લોડ થઈ રહ્યું છે…",
    voiceModalTitle: "ઓપન-સોર્સ વોઇસ પેક અને ઓડિયો સેટિંગ્સ",
    voiceModalDesc: "દરેક જવાબને સ્પષ્ટ અને પ્રવાહી અવાજમાં સાંભળવા માટે વોઇસ પેક પસંદ કરો.",
    autoReadToggleLabel: "દરેક જવાબને આપમેળે વાંચી સંભળાવો",
    voiceEngineLabel: "વોઇસ પેક એન્જિન",
    piperVoiceLabel: "Open-Source Piper Neural Voice Pack (Local WASM)",
    browserVoiceLabel: "Natural Neural Voice Pack (ગુજરાતી/હિન્દી)",
    speechSpeedLabel: "વાંચવાની ઝડપ",
    downloadVoiceBtn: "ડાઉનલોડ કરો",
    downloadedBadge: "તૈયાર",
    testVoiceBtn: "અવાજ ચકાસો",
    testSampleText: "હે પાર્થ, ફળની ચિંતા છોડીને શાંત મને તારા કર્તવ્યનું પાલન કર.",
    suggestions: [
      {
        category: "કારકિર્દી અને તણાવ",
        title: "પરિણામની ચિંતા અને ભયથી મુક્તિ",
        prompt: "હું રોજ મહેનત કરું છું પણ ભવિષ્ય અને પરિણામની ચિંતા મને થકવી દે છે. ભગવદ્ ગીતા અનુસાર રોજિંદા જીવનમાં શાંતિ કેવી રીતે મેળવવી?"
      },
      {
        category: "મન અને એકાગ્રતા",
        title: "ચંચળ મન અને વધુ પડતા વિચારો પર કાબૂ",
        prompt: "મારું મન સતત ભટકે છે અને ઓવરથિંકિંગ કરે છે. ગીતામાં શ્રીકૃષ્ણએ મનને વશ કરવાનો કયો વ્યવહારુ ઉપાય બતાવ્યો છે?"
      },
      {
        category: "સંબંધો",
        title: "સંબંધોમાં અપેક્ષા અને દુઃખનો ઉકેલ",
        prompt: "જ્યારે નજીકના લોકો જ દુઃખ પહોંચાડે ત્યારે ભગવદ્ ગીતા પ્રમાણે આપણે મનની સમતા કેવી રીતે જાળવવી?"
      },
      {
        category: "સ્વધર્મ",
        title: "સાચો નિર્ણય કેવી રીતે લેવો?",
        prompt: "જીવનમાં સાચા કર્તવ્ય અને માર્ગની પસંદગી કરતી વખતે મૂંઝવણ થાય ત્યારે ગીતા આપણને શું શીખવે છે?"
      }
    ]
  }
};
