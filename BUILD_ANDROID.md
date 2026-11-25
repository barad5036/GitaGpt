# Building, Signing & Releasing the GitaGPT Android App (`BUILD_ANDROID.md`)

## 1. Prerequisites & Capacitor Native Setup

1. Install **Android Studio** (SDK 35 / Android 15 target, `minSdkVersion = 24`, JDK 17+).
2. Inside `gita-frontend/`, install the Capacitor runtime and native plugins when ready to generate the native Android project:
   ```bash
   cd gita-frontend
   npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/app @capacitor/status-bar @capacitor/splash-screen @capacitor-community/speech-recognition @capacitor-community/text-to-speech capacitor-secure-storage-plugin
   npx cap add android
   ```
3. Copy the hardened manifest and HTTPS-only network security configuration into the generated Android project:
   ```bash
   cp ../android-config/AndroidManifest.xml android/app/src/main/AndroidManifest.xml
   mkdir -p android/app/src/main/res/xml
   cp ../android-config/xml/network_security_config.xml android/app/src/main/res/xml/network_security_config.xml
   ```

---

## 2. Building the Web Bundle for Your Public HTTPS Backend

> **Important:** A physical Android phone cannot reach `localhost` on your PC. Always build the web bundle with your public HTTPS backend URL (`VITE_API_BASE_URL`):

```bash
cd gita-frontend
VITE_API_BASE_URL="https://gitagpt.yourdomain.org" npm run build:web
npm run cap:sync
```

---

## 3. Generating the Release Keystore & SHA-1 / SHA-256 Fingerprints

### 3.1 Generate Your Upload / Release Keystore (NEVER commit `.jks` to Git)
```bash
keytool -genkeypair -v \
  -keystore ~/gitagpt-release-key.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias gitagpt-upload
```
> **Safe Backup:** Store a copy of `gitagpt-release-key.jks` and its passphrase in an offline password manager (e.g., KeePassXC / Bitwarden).

### 3.2 Extract `SHA-1` & `SHA-256` Fingerprints (for Google Cloud Console OAuth)
- **Debug Keystore Fingerprint**:
  ```bash
  keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
  ```
- **Release Keystore Fingerprint**:
  ```bash
  keytool -list -v -keystore ~/gitagpt-release-key.jks -alias gitagpt-upload
  ```
- **Play App Signing Fingerprint**: After uploading your first `.aab` to Google Play Console, copy the **App signing key certificate (`SHA-1` and `SHA-256`)** from **Play Console → Setup → App signing** and register an Android OAuth Client ID (`package: org.gitagpt.app`) in **Google Cloud Console → Credentials**.

---

## 4. Exact Build, Sign, Install & Verify Commands

Configure signing credentials via environment variables (or `~/.gradle/gradle.properties`):
```bash
export GITAGPT_KEYSTORE_PATH="$HOME/gitagpt-release-key.jks"
export GITAGPT_KEYSTORE_PASSWORD="your_keystore_password"
export GITAGPT_KEY_ALIAS="gitagpt-upload"
export GITAGPT_KEY_PASSWORD="your_key_password"
```

### 4.1 Build Debug APK (for local device testing)
```bash
cd gita-frontend/android
./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### 4.2 Build Signed Release APK
```bash
cd gita-frontend/android
./gradlew assembleRelease \
  -Pandroid.injected.signing.store.file="$GITAGPT_KEYSTORE_PATH" \
  -Pandroid.injected.signing.store.password="$GITAGPT_KEYSTORE_PASSWORD" \
  -Pandroid.injected.signing.key.alias="$GITAGPT_KEY_ALIAS" \
  -Pandroid.injected.signing.key.password="$GITAGPT_KEY_PASSWORD"
```

### 4.3 Verify APK Signature (`apksigner`)
```bash
apksigner verify --verbose --print-certs \
  gita-frontend/android/app/build/outputs/apk/release/app-release.apk
```

### 4.4 Build Signed Release AAB (for Google Play Store upload)
```bash
cd gita-frontend/android
./gradlew bundleRelease \
  -Pandroid.injected.signing.store.file="$GITAGPT_KEYSTORE_PATH" \
  -Pandroid.injected.signing.store.password="$GITAGPT_KEYSTORE_PASSWORD" \
  -Pandroid.injected.signing.key.alias="$GITAGPT_KEY_ALIAS" \
  -Pandroid.injected.signing.key.password="$GITAGPT_KEY_PASSWORD"
# Output: android/app/build/outputs/bundle/release/app-release.aab
```

---

## 5. Google Play Console Readiness Guide

### 5.1 Data Safety Questionnaire Answers
| Data Type | Collected? | Shared with Third Parties? | Purpose | Encrypted in Transit & At Rest? | User Can Request Deletion? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Email Address & Name** | Yes (Optional — only if user signs in) | No | Account authentication & session management | Yes (TLS 1.3 + AES-256-GCM at rest) | Yes (In-app **Delete Account** button + web deletion URL) |
| **In-App Messages & Opt-In Memories** | Yes (When synced to account) | No | Generating Bhagavad Gita philosophical responses | Yes (TLS 1.3 + Per-User DEK AES-256-GCM) | Yes (Instant deletion in-app) |
| **Audio / Microphone** | Ephemeral only (Speech-to-Text when Mic button tapped) | No | Converting voice prompt to text | Yes | Voice audio is never stored |

### 5.2 Health / Mental-Health Disclosure
- Select **"Spiritual / Philosophical Companion & Religious Text Reference (Not a medical device or clinical therapy service)"**.
- Note in reviewer instructions that the app includes a built-in safety layer displaying India's national 24×7 helpline (**Tele-MANAS `14416` / `1800-891-4416`**) if crisis keywords are detected.

### 5.3 Play Store Listing Copy (English & Hindi)

#### English Listing
- **Title**: `GitaGPT — Bhagavad Gita Friend`
- **Short Description (80 chars)**: `Talk to Krishna like a caring friend. Hindi & English Bhagavad Gita wisdom.`
- **Full Description**:
  > GitaGPT is your calm, compassionate spiritual friend ("Sakha") rooted in the timeless wisdom of the Shrimad Bhagavad Gita.
  > • **Talk Like a Friend:** Share daily work stress, overthinking, relationships, or life questions in Hindi, Hinglish, or English.
  > • **Verified Scripture:** Every verse card includes authentic Sanskrit, transliteration, Hindi/English meaning, and chapter/verse citation.
  > • **Fluent Voice Companion:** Listen to every answer aloud with natural neural voice packs and live sentence highlighting.
  > • **Privacy First:** Strictly opt-in memory, encrypted account storage, and one-tap data deletion.
  > *Disclaimer: GitaGPT is a spiritual and philosophical companion, not a medical or psychological therapy service.*

#### हिन्दी (Hindi) Listing
- **Title**: `गीता GPT — श्रीमद्भगवद्गीता सखा`
- **Short Description**: `श्रीकृष्ण से एक सच्चे मित्र की तरह बात करें। गीता ज्ञान और मानसिक शांति।`
- **Full Description**:
  > गीता GPT आपका आत्मीय मित्र ("सखा") है जो श्रीमद्भगवद्गीता के शाश्वत ज्ञान से दैनिक जीवन की उलझनों में आपका मार्गदर्शन करता है।
  > • **सखा भाव संवाद:** तनाव, ओवरथिंकिंग, संबंधों या कर्तव्य पर हिन्दी, हिंग्लिश या अंग्रेज़ी में एक सच्चे दोस्त की तरह बात करें।
  > • **प्रमाणित गीता श्लोक:** मूल संस्कृत श्लोक, उच्चारण, सरल भावार्थ और दैनिक जीवन में प्रयोग।
  > • **धाराप्रवाह वॉइस पैक:** प्रत्येक उत्तर को स्पष्ट और शांत आवाज़ में सुनें।
  > • **पूर्ण गोपनीयता:** आपकी सहमति (Opt-in) पर आधारित स्मृति और एक क्लिक में सारा डेटा मिटाने की सुविधा।
