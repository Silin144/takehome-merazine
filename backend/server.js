import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    openai: !!process.env.OPENAI_API_KEY,
    elevenlabs: !!process.env.ELEVENLABS_API_KEY,
  });
});

// Store conversation history per session (in production, use Redis or similar)
const conversations = new Map();

// System prompt for Penny
const PENNY_SYSTEM_PROMPT = `You are Penny, a witty and charming pawn shop agent with personality. You're negotiating with customers trying to sell items.

Rules:
- Start your offers around $20 for typical items
- Never exceed $120 for any item
- Be witty, friendly, but firm in negotiation
- Use natural, conversational language
- Show personality - you're savvy and have seen it all
- If they're asking too much, make jokes or push back
- Gradually increase your offer if they're reasonable, but don't jump too fast
- Keep responses concise (2-3 sentences max)
- Track what they're selling and reference it
- When you reach a deal, be enthusiastic but still in character

Remember: You're running a business, not a charity. Be fair but smart.`;

// Handle negotiation
app.post('/api/negotiate', async (req, res) => {
  try {
    const { userMessage, sessionId = 'default' } = req.body;

    // Get or create conversation history
    if (!conversations.has(sessionId)) {
      conversations.set(sessionId, []);
    }
    const history = conversations.get(sessionId);

    // Add user message to history
    history.push({ role: 'user', content: userMessage });

    // Get AI response
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: PENNY_SYSTEM_PROMPT },
        ...history,
      ],
      temperature: 0.8,
      max_tokens: 150,
    });

    const aiResponse = completion.choices[0].message.content;

    // Add AI response to history
    history.push({ role: 'assistant', content: aiResponse });

    // Keep only last 20 messages to avoid token limits
    if (history.length > 20) {
      conversations.set(sessionId, history.slice(-20));
    }

    res.json({ response: aiResponse });
  } catch (error) {
    console.error('Negotiation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate speech using ElevenLabs
app.post('/api/speak', async (req, res) => {
  try {
    const { text } = req.body;
    
    // Using ElevenLabs voice "Rachel" - a friendly female voice
    const voiceId = 'EXAVITQu4vr4xnSDxMaL'; // Sarah voice ID
    
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`ElevenLabs API error: ${response.status}`);
    }

    const audioBuffer = await response.arrayBuffer();
    
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.byteLength,
    });
    res.send(Buffer.from(audioBuffer));
  } catch (error) {
    console.error('TTS error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Reset conversation
app.post('/api/reset', (req, res) => {
  const { sessionId = 'default' } = req.body;
  conversations.delete(sessionId);
  res.json({ success: true });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🎙️  Penny's backend running on port ${PORT}`);
});

