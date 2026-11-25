# GitaGPT — श्रीमद्भगवद्गीता सखा (Your Spiritual Friend & Bhagavad Gita Companion)

> A production-grade, Hindi-first ("Sakha / close friend" style) Bhagavad Gita conversational companion with verified canonical scripture RAG, crisis safety intervention, opt-in privacy controls, and fluent open-source neural voice packs.

---

## ✨ Key Features

- **💛 Sakha (Best Friend) Conversational Persona**: Speaks in short, emotionally resonant, line-by-line chat bubbles rather than dense textbook paragraphs.
- **📖 Verified Canonical Verse RAG**: Retrieves authentic Bhagavad Gita verses (Sanskrit Devanagari, IAST Transliteration, Hindi & English Meaning, Daily Life Takeaway, and a **Verified Source Chip** linking to the scripture). Never invents or hallucinates verses.
- **🛡️ Crisis & Self-Harm Safety Layer (P0)**: Detects acute distress or self-harm phrases in **Hindi, Hinglish, and English** and immediately responds with warm empathy and 24×7 **Indian Mental Health Helpline cards** (**Tele-MANAS `14416` / `1800-891-4416`**, **Vandrevala Foundation**, and **iCall**).
- **🔒 Opt-In Friend Memory & Full Privacy Control**: Strictly opt-in memory with inline edit, delete, and a one-click **"Delete All My Data"** button.
- **🔊 Open-Source Neural Voice Pack (Piper VITS WASM)**: Lazy-loaded local browser WASM neural TTS (`@diffusionstudio/vits-web`) + natural multilingual system voices with **live spoken sentence highlighting** and speed controls (`0.9x`–`1.2x`).
- **🗂️ Smart Thread Management**: Auto-generated topic titles, Date Grouping (*📌 Pinned, Today, Yesterday, Previous 7 Days, Earlier*), inline rename, pin/unpin, and delete with **Undo Toast**.
- **🎨 Celestial Peacock & Sacred Ivory Themes**: Dark & Light themes with `Noto Sans Devanagari` typography so Hindi/Sanskrit matras are never clipped, plus installable **PWA manifest** and custom chariot emblem icons.

---

## 🏗️ Architecture

```mermaid
flowchart LR
  subgraph Client["Frontend (Vite + React 19 + PWA)"]
    UI["Modular UI\n(SidebarPane, AssistantMessageItem,\nSafetyAndLegal, ErrorBoundary)"]
    Safety["Safety & Crisis Guard\n(Hindi / Hinglish / English\n+ Tele-MANAS 14416)"]
    RAG["Canonical Verse RAG\n(gitaVerses.js — Verified Corpus)"]
    Voice["Lazy-Loaded Voice Pack\n(@diffusionstudio/vits-web WASM)"]
  end

  subgraph Gateway["API Proxy / FastAPI Backend"]
    Proxy["/api/ai Proxy or FastAPI (/ask, /health)\nRate Limiting + CORS Allow-List"]
  end

  UI --> Safety
  Safety --> RAG
  RAG --> Proxy
  UI -.->|Dynamic import()| Voice
```

---

## 🚀 Quick Start

### 1. Frontend (`gita-frontend/`)
```bash
cd gita-frontend
npm install
npm run dev
```
Open `http://localhost:5173/`.

### 2. Available Scripts (`gita-frontend/package.json`)
| Script | Description |
| :--- | :--- |
| `npm run dev` | Start Vite development server with `/api/ai` proxy |
| `npm run build` | Production build with code-splitting (`dist/`) |
| `npm run lint` | Run ESLint across all modules |
| `npm test` | Run automated unit tests (`node --test`) |
| `npm run preview` | Preview production build locally |

### 3. Optional FastAPI Backend (`gita/scripts/api.py`)
```bash
pip install fastapi uvicorn pydantic
python gita/scripts/api.py
```

#### Backend Environment Variables
| Variable | Default | Description |
| :--- | :--- | :--- |
| `ALLOWED_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated CORS allow-list |
| `RATE_LIMIT_PER_MIN` | `60` | Max requests per minute per client IP |
| `PORT` | `8000` | Backend server port |

---

## 🚢 Deployment

- **Frontend (Vercel / Netlify)**: Deploy `gita-frontend/` with build command `npm run build` and output directory `dist`. [vercel.json](file:///c:/Users/ACER/Downloads/GitaGpt/gita-frontend/vercel.json) is pre-configured with `/api/ai` rewrites and SPA routing.
- **CI/CD**: GitHub Actions workflow in [.github/workflows/ci.yml](file:///c:/Users/ACER/Downloads/GitaGpt/.github/workflows/ci.yml) runs `npm ci`, `npm run lint`, `npm test`, and `npm run build` on every push and PR.

---

## ✅ Production Upgrade Checklist

- [x] **Codebase Audit & Architecture Plan** (`audit_and_plan.md`)
- [x] **P0 Crisis & Self-Harm Detection** (Hindi, Hinglish, English + Tele-MANAS `14416` / `1800-891-4416` Helpline Card)
- [x] **P0 Opt-In Memory Privacy** (Consent toggle, view/edit/delete memories, "Delete All My Data", Privacy & Terms modal)
- [x] **P0 Canonical Verse RAG** (Verified Sanskrit, IAST Transliteration, Hindi meaning, Source Chip, zero hallucinated verses)
- [x] **Streaming + Stop Generating Button** (`AbortController` + progressive line streaming)
- [x] **Smart Conversation Titles + Pin, Rename, Undo Delete & Date Grouping**
- [x] **Copy, Regenerate, Like / Dislike & Markdown Rendering** on every assistant message
- [x] **Custom Emblem Favicon & PWA Icons** (`logo.png`, `favicon.png`, `favicon.ico`, `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`)
- [x] **Lazy-Loaded Open-Source Voice Pack + Live Spoken Sentence Highlighting**
- [x] **WCAG 2.2 AA Accessibility, Devanagari Typography, Unit Tests & CI Workflow**
