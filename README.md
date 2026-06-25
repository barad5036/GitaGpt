# GitaGPT 🕉️

> AI-powered chat companion rooted in the wisdom of the Bhagavad Gita

GitaGPT is an intelligent conversational AI that provides guidance, life advice, and philosophical insights based on the teachings of the Bhagavad Gita. Built with modern web technologies and featuring speech recognition, multilingual support, and personalized responses.

## ✨ Features

- **🤖 Krishna AI Personality** - Responds as Lord Krishna guiding "Parth" (the user)
- **🎤 Speech-to-Text** - Voice input with real-time transcription
- **🌍 Multilingual** - Supports Hindi, English, and Hinglish naturally
- **🧠 Emotion Detection** - Adapts responses based on user's emotional state
- **📚 RAG System** - Retrieves relevant verses using sentence embeddings
- **🔐 JWT Authentication** - Secure user sessions with token-based auth
- **💾 Chat History** - Persistent conversation storage with local caching
- **📱 Responsive Design** - Modern UI with dark theme and smooth animations
- **🔍 Chat Search** - Find previous conversations easily

## 🏗️ Architecture

### Backend (`gita/scripts/api.py`)
- **FastAPI** - High-performance Python web framework
- **Groq LLaMA 3.3** - Advanced language model for natural responses
- **SentenceTransformers** - Vector embeddings for semantic search
- **Scikit-learn** - Cosine similarity for verse retrieval
- **JWT Auth** - Secure token-based authentication

### Frontend (`updatedFrontend/dharmic-guidance/`)
- **React 19** - Modern component-based UI
- **TanStack Router** - File-based routing with TypeScript
- **TailwindCSS** - Utility-first styling with custom saffron theme
- **Web Speech API** - Browser-native voice recognition
- **LocalStorage** - Client-side chat persistence

## 🚀 Quick Start

### Prerequisites
- Python 3.9+
- Node.js 18+
- Groq API key

### Backend Setup

1. **Install dependencies**
   ```bash
   cd gita/scripts
   pip install fastapi uvicorn groq sentence-transformers scikit-learn python-dotenv
   ```

2. **Configure environment**
   ```bash
   echo "GROQ_API_KEY=your_groq_api_key_here" > .env
   ```

3. **Run the server**
   ```bash
   python api.py
   ```
   Server starts at `http://127.0.0.1:8000`

### Frontend Setup

1. **Install dependencies**
   ```bash
   cd updatedFrontend/dharmic-guidance
   bun install  # or npm install
   ```

2. **Start development server**
   ```bash
   bun run dev  # or npm run dev
   ```
   Frontend runs at `http://localhost:8080`

## 📖 Usage

1. **Open** `http://localhost:8080` in your browser
2. **Click** microphone button for voice input (Chrome/Edge recommended)
3. **Type or speak** your question about life, philosophy, or guidance
4. **Receive** personalized responses with relevant Gita verses
5. **Browse** chat history in the sidebar

## 🎯 Example Interactions

```
User: "I'm feeling lost in life, what should I do?"

Krishna: "पार्थ, जब मन भटक जाता है, तो स्वधर्म का स्मरण करो। 
तुम्हारा कर्तव्य क्या है? बिना फल की चिंता किए, कर्म करते रहो। 
क्या तुम अपने जीवन के उद्देश्य को जानते हो?"

📖 Chapter 18, Verse 47
"Better is one's own dharma, though imperfectly performed, than the dharma of another well performed..."
```

## 🔧 Configuration

### Environment Variables
- `GROQ_API_KEY` - Your Groq API key for LLaMA access
- `AUTH_SECRET` - JWT signing secret (default: "gita-secret-key")

### Customization
- **Personality**: Modify system prompts in `build_prompt()` function
- **UI Theme**: Adjust colors in `src/styles.css` saffron variables
- **Voice Settings**: Configure language/dialect in `use-speech.ts`

## 📊 Data Sources

- **Bhagavad Gita Text**: 700 verses with translations and meanings
- **Embeddings**: Pre-computed sentence vectors for fast similarity search
- **Commentary**: Contextual explanations and philosophical insights

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Bhagavad Gita** - The timeless source of wisdom
- **Groq** - Lightning-fast AI inference
- **TanStack** - Modern React tooling
- **Lovable** - UI component inspiration

## 📞 Support

For questions, issues, or suggestions:
- Open an [Issue](https://github.com/barad5036/GitaGpt/issues)
- Connect on [LinkedIn](https://linkedin.com/in/barad5036)

---

**Made with ❤️ and ancient wisdom**

*"कर्मण्येवाधिकारस्ते मा फलेषु कदाचन"* - You have the right to act, but never to the fruits of action.