# 🎤 Penny is Paying - AI Pawn Shop Negotiation

A voice-powered web app where users negotiate with Penny, an AI pawn shop agent. Speak naturally and watch the conversation unfold with Penny's natural voice responses.

---

## 🚀 How to Run Locally

### Prerequisites
- Node.js 18+, Chrome/Edge browser, OpenAI API key, ElevenLabs API key

### Setup

```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Configure backend/.env
OPENAI_API_KEY=your_openai_key_here
ELEVENLABS_API_KEY=your_elevenlabs_key_here
PORT=3001

# Run (option 1: auto-start)
./start.sh

# Run (option 2: manual)
cd backend && npm start          # Terminal 1
cd frontend && npm run dev       # Terminal 2
```

Open `http://localhost:3000` in Chrome or Edge.

### Usage
1. Click star on welcome screen → Enter chat
2. Hold star and speak your offer
3. Release when done → See real-time transcript
4. Listen to Penny's voice response
5. Continue negotiating

---

## 🏗️ Architectural Decisions

### Tech Stack
- **Frontend**: React 18 + Vite
- **Backend**: Node.js + Express  
- **LLM**: OpenAI GPT-4o
- **STT**: Web Speech API
- **TTS**: ElevenLabs

### Key Decisions

**Web Speech API**
- Zero latency
- No file upload overhead
- Free

**ElevenLabs TTS**
- Natural voice quality
- Emotional range and consistency
- $0.30/1000 chars (worth it)

**GPT-4o**
- Best reasoning for natural negotiation
- Consistent personality maintenance
- ~$0.02 per 10-turn conversation

**In-Memory Storage (not Redis/DB)**
- Simple for MVP, fast access
- Trade-off: Lost on restart, single-server
- Production: Would use Redis/PostgreSQL


### Architecture Flow

```
User speaks → Web Speech API → Real-time transcript
                    ↓
         User releases button
                    ↓
         GPT-4o with context → AI response
                    ↓
         ElevenLabs TTS → Audio playback
```

### Context Management
- Conversation history in Map (sessionId → messages[])
- Full history sent to GPT-4o for context
- Limited to last 20 messages (token optimization)
- Session ID generated client-side

### API Endpoints
- `GET /api/health` - Health check
- `POST /api/negotiate` - GPT-4o negotiation
- `POST /api/speak` - ElevenLabs TTS
- `POST /api/reset` - Clear history

---

## 🚀 What I'd Add Next

- Persistent storage (Redis/PostgreSQL for conversation history)
- Multiple AI voice personalities for different negotiation styles
- Real-world pricing database for accurate item valuation
- Photo upload for visual item recognition and analysis
- Mobile native app with better voice handling
- Analytics dashboard to track success rates and patterns
- A/B testing framework for AI personalities
- Accessibility improvements (keyboard nav, screen readers)
- Multi-language support (Spanish, French, etc.)
- WebSocket streaming for faster real-time responses
- Real marketplace integration with actual transactions
- Video chat with animated Penny and lip-sync
- Gamification with story mode and achievements
- Voice cloning for personalized AI voices
- Enterprise features (white-label, API access)

---

