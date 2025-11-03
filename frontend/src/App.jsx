import { useState, useEffect, useRef } from 'react';
import './App.css';
import pennyFullBody from '/logo.png';
import pennyImage from '/penny_pfp.png';
import userImage from '/user_pfp.png';

const API_URL = 'http://localhost:3001';

const TAGLINES = ['happier', 'richer', 'lighter'];

function App() {
  const [currentScreen, setCurrentScreen] = useState('welcome'); // welcome, chat
  const [messages, setMessages] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);
  const [currentTagline, setCurrentTagline] = useState(0);
  const [sessionId] = useState(() => Math.random().toString(36).substring(7));

  const recognitionRef = useRef(null);
  const chatEndRef = useRef(null);
  const audioRef = useRef(null);
  const [transcript, setTranscript] = useState('');
  const [isDealReached, setIsDealReached] = useState(false);

  // Rotate taglines
  useEffect(() => {
    if (currentScreen === 'welcome') {
      const interval = setInterval(() => {
        setCurrentTagline((prev) => (prev + 1) % TAGLINES.length);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [currentScreen]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize Speech Recognition
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      console.error('❌ Speech Recognition not supported in this browser');
      alert('Speech Recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    console.log('✅ Speech Recognition API available');
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true; // Keep listening even with pauses
    recognition.interimResults = true; // Show what's being said in real-time
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let fullTranscript = '';

      // Collect all results (both final and interim)
      for (let i = 0; i < event.results.length; i++) {
        fullTranscript += event.results[i][0].transcript;
      }

      setTranscript(fullTranscript);
      console.log('Transcript:', fullTranscript);
    };

    recognition.onerror = (event) => {
      console.error('❌ Speech recognition error:', event.error);
      // Don't stop on no-speech or aborted errors
      if (event.error === 'no-speech') {
        console.log('No speech detected, continuing to listen...');
      } else if (event.error === 'not-allowed') {
        setIsRecording(false);
        alert('Microphone access denied. Please allow microphone access in your browser settings.');
      } else if (event.error !== 'aborted') {
        setIsRecording(false);
        alert(`Speech recognition error: ${event.error}. Please try again.`);
      }
    };

    recognition.onend = () => {
      console.log('🛑 Recognition ended');
      // Don't automatically restart - let user control it
    };

    recognitionRef.current = recognition;
  }, []);

  const startRecording = () => {
    if (!recognitionRef.current) {
      alert('Speech recognition not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    console.log('🎤 Star clicked');

    // If on welcome screen, just transition to chat (don't start recording yet)
    if (currentScreen === 'welcome') {
      console.log('📱 Transitioning to chat screen...');
      setCurrentScreen('chat');
      return; // Exit - don't start recording
    }

    // Only start recording if already on chat screen
    console.log('🎙️ Starting recording...');
    setTranscript('');
    setIsRecording(true);
    actuallyStartRecognition();
  };

  const actuallyStartRecognition = () => {
    try {
      // Check if already running
      if (recognitionRef.current.state === 'running') {
        console.log('Already running, stopping first...');
        recognitionRef.current.stop();
        // Wait a bit then restart
        setTimeout(() => {
          recognitionRef.current.start();
          console.log('✅ Speech recognition restarted');
        }, 100);
      } else {
        recognitionRef.current.start();
        console.log('✅ Speech recognition started');
      }
    } catch (e) {
      console.error('❌ Error starting recognition:', e);
      setIsRecording(false);
      if (e.message.includes('already started')) {
        // Force stop and retry
        try {
          recognitionRef.current.stop();
          setTimeout(() => {
            recognitionRef.current.start();
          }, 100);
        } catch (retryError) {
          alert('Please click again to start recording.');
        }
      } else {
        alert('Error starting recording: ' + e.message);
      }
    }
  };

  const stopRecording = () => {
    console.log('🛑 Stop recording clicked');
    
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      console.log('✅ Recognition stopped');
      
      // Process the final transcript
      if (transcript && transcript.trim().length > 0) {
        console.log('📤 Sending transcript to Penny:', transcript);
        handleTranscript(transcript.trim());
      } else {
        console.warn('⚠️ No transcript captured');
        alert('No speech detected. Please try again and speak clearly.');
      }
      
      setTranscript('');
    }
  };

  const handleTranscript = async (userText) => {
    if (!userText || userText.trim().length === 0) {
      console.warn('⚠️ Empty transcript, skipping...');
      return;
    }

    console.log('💬 Processing transcript:', userText);
    setIsThinking(true);

    try {

      // Add user message
      setMessages((prev) => [...prev, { role: 'user', content: userText }]);
      console.log('✅ Added user message to chat');

      // Step 1: Get AI response
      console.log('🤖 Calling GPT-4o...');
      const negotiateRes = await fetch(`${API_URL}/api/negotiate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage: userText, sessionId }),
      });
      const { response: aiText } = await negotiateRes.json();
      console.log('✅ Got Penny\'s response:', aiText);

      // Add AI message
      setMessages((prev) => [...prev, { role: 'assistant', content: aiText }]);

      // Extract dollar amount from AI response if present
      const dollarMatch = aiText.match(/\$(\d+)/);
      if (dollarMatch) {
        setTotalAmount(parseInt(dollarMatch[1]));
      }

      // Check if deal was reached
      const dealKeywords = ['deal', 'sold', 'pleasure doing business', 'you got yourself', 'we have a deal'];
      if (dealKeywords.some(keyword => aiText.toLowerCase().includes(keyword))) {
        setIsDealReached(true);
        setTimeout(() => setIsDealReached(false), 3000);
      }

      // Step 2: Generate speech
      console.log('🎙️ Generating voice with ElevenLabs...');
      const speakRes = await fetch(`${API_URL}/api/speak`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: aiText }),
      });
      const responseAudio = await speakRes.blob();
      const audioUrl = URL.createObjectURL(responseAudio);
      console.log('✅ Voice generated, playing...');

      // Play audio
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
      }

      setIsThinking(false);
    } catch (error) {
      console.error('Error processing audio:', error);
      setIsThinking(false);
      alert(`Error: ${error.message || 'Something went wrong. Please try again.'}`);
    }
  };

  return (
    <div className="app">
      <audio ref={audioRef} />
      
      {currentScreen === 'welcome' && (
        <div className="welcome-screen">
          <img src={pennyFullBody} alt="Penny" className="penny-character" />
          <div className="text-box">
            <p className="intro-text">Tell us what you're selling. If it's real.</p>
          </div>
          <h1 className="title">
            penny is paying
            <br />
            <span className="subtitle">pawn shop</span>
          </h1>
          <div className="tagline-container">
            <p className="tagline" key={currentTagline}>
              and you'll leave {TAGLINES[currentTagline]}
            </p>
          </div>
          <div className="star" onClick={startRecording}>
            <span className="star-icon">⭐</span>
            <span className="amount">${totalAmount}</span>
          </div>
        </div>
      )}

      {currentScreen === 'chat' && (
        <div className="chat-screen">
          {isDealReached && (
            <div className="deal-celebration">
              <div className="confetti">🎉</div>
              <div className="confetti">💰</div>
              <div className="confetti">⭐</div>
              <div className="confetti">🎊</div>
              <div className="deal-text">Deal Reached!</div>
            </div>
          )}
          <div className="header">
            <h1 className="chat-title">penny is paying</h1>
          </div>

          <div className="messages-container">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`message ${msg.role === 'assistant' ? 'penny-message' : 'user-message'}`}
              >
                {msg.role === 'assistant' && (
                  <img src={pennyImage} alt="Penny" className="message-avatar" />
                )}
                <div className={`bubble ${isThinking && idx === messages.length - 1 && msg.role === 'assistant' ? 'thinking' : ''}`}>
                  {msg.content}
                </div>
                {msg.role === 'user' && (
                  <img src={userImage} alt="You" className="message-avatar" />
                )}
              </div>
            ))}

            {isThinking && (
              <div className="message penny-message">
                <img src={pennyImage} alt="Penny" className="message-avatar" />
                <div className="bubble thinking">
                  <div className="thinking-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="recording-controls">
            {isRecording && transcript && (
              <div className="transcript-preview">
                <p>{transcript}</p>
              </div>
            )}
            <div
              className={`star recording-star ${isRecording ? 'recording' : ''}`}
              onMouseDown={startRecording}
              onMouseUp={stopRecording}
              onTouchStart={startRecording}
              onTouchEnd={stopRecording}
            >
              <span className="star-icon">⭐</span>
              {isRecording && <span className="recording-indicator">●</span>}
            </div>
            <div className="amount-display">${totalAmount}</div>
            {isRecording && (
              <div className="recording-hint">Release when done speaking</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

