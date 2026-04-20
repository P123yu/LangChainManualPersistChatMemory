import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Send, Bot, User, Sparkles, MessageSquare, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = "http://localhost:8000";

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      // Send message to FastAPI backend
      const response = await axios.post(`${API_BASE}/chat`, {
        message: input,
        history: messages
      });

      const assistantMessage = { role: "assistant", content: response.data.response };
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        content: "Sorry, I'm having trouble connecting to the brain. Is the backend running? 🧠" 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2.5rem', padding: '0 0.5rem' }}>
          <div style={{ background: 'var(--primary)', padding: '0.5rem', borderRadius: '0.75rem' }}>
            <Bot size={24} color="white" />
          </div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>Gemini AI</h2>
        </div>

        <button 
          onClick={clearChat}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid var(--glass-border)',
            borderRadius: '0.75rem',
            color: 'white',
            cursor: 'pointer',
            marginBottom: '1.5rem',
            transition: 'all 0.3s'
          }}
        >
          <Plus size={18} />
          New Conversation
        </button>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem', padding: '0 0.5rem' }}>RECENT CHATS</p>
          {/* Mock history links */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ padding: '0.75rem 1rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '0.5rem', borderLeft: '3px solid var(--primary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <MessageSquare size={16} />
              <span style={{ fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Current Session</span>
            </div>
          </div>
        </div>

        <div style={{ padding: '1rem 0.5rem', borderTop: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #ff6b6b, #ff8e8e)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={18} color="white" />
          </div>
          <div>
            <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>Guest User</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Free Plan</p>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="chat-main">
        <header className="chat-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ color: 'var(--accent)' }}>
              <Sparkles size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Gemini-2.5-Flash</h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Powered by Google AI & LangGraph</p>
            </div>
          </div>
          <button onClick={clearChat} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }} title="Clear Chat">
            <Trash2 size={20} />
          </button>
        </header>

        <div className="messages-container">
          {messages.length === 0 && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', gap: '1.5rem', opacity: 0.7 }}>
              <div style={{ width: '80px', height: '80px', borderRadius: '2rem', background: 'var(--bg-card)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--glass-border)' }}>
                <Bot size={40} color="var(--primary)" />
              </div>
              <div>
                <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>How can I help you today?</h2>
                <p style={{ color: 'var(--text-muted)', maxWidth: '400px' }}>Ask me about the weather, check your balance, or just have a chat. I'm powered by advanced reasoning agents.</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', width: '100%', maxWidth: '500px' }}>
                <div onClick={() => setInput("What is the weather in Mumbai?")} style={{ padding: '1rem', background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: '0.75rem', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }} className="hover-card">
                  <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>🌦️ Check weather</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>"What is the weather in Mumbai?"</p>
                </div>
                <div onClick={() => setInput("What is my account balance? (User 123)")} style={{ padding: '1rem', background: 'var(--bg-card)', border: '1px solid var(--glass-border)', borderRadius: '0.75rem', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }} className="hover-card">
                  <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>💰 Check balance</p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>"What is my balance? User 123"</p>
                </div>
              </div>
            </div>
          )}

          <AnimatePresence>
            {messages.map((msg, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`message ${msg.role}`}
              >
                {msg.content}
              </motion.div>
            ))}
            {loading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="message assistant"
                style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}
              >
                <div className="dot-pulse"></div>
                Thinking...
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>

        <div className="input-container">
          <form onSubmit={handleSend} className="input-wrapper">
            <input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message Gemini AI..."
              autoFocus
            />
            <button type="submit" className="send-btn" disabled={!input.trim() || loading}>
              <Send size={20} />
            </button>
          </form>
          <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
            Gemini AI uses LangGraph and Tools. Be careful with balance queries.
          </p>
        </div>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .hover-card:hover {
          background: rgba(99, 102, 241, 0.1) !important;
          border-color: var(--primary) !important;
          transform: translateY(-2px);
        }
        .dot-pulse {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: var(--text-muted);
          animation: pulse 1.5s infinite ease-in-out;
        }
        @keyframes pulse {
          0%, 100% { transform: scale(0.8); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 1; }
        }
      `}} />
    </div>
  );
}

export default App;
