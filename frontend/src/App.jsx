import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Send, Bot, User, Sparkles, MessageSquare, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE = "http://localhost:8000";

// Simple Session ID generator
const generateSessionId = () => `session_${Math.random().toString(36).substr(2, 9)}`;

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(() => {
    return localStorage.getItem('gemini_session_id') || generateSessionId();
  });
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // 1. Initial Load: Restore Session & History
  useEffect(() => {
    localStorage.setItem('gemini_session_id', sessionId);
    fetchHistory();
  }, [sessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchHistory = async () => {
    try {
      const response = await axios.get(`${API_BASE}/history/${sessionId}`);
      if (response.data.history) {
        setMessages(response.data.history);
      }
    } catch (error) {
      console.error("Error fetching history:", error);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = { role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      // Send message with session_id
      const response = await axios.post(`${API_BASE}/chat`, {
        message: input,
        session_id: sessionId
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

  const startNewChat = () => {
    const newId = generateSessionId();
    setSessionId(newId);
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
          onClick={startNewChat}
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
            transition: 'all 0.3s',
            width: '100%'
          }}
        >
          <Plus size={18} />
          New Conversation
        </button>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginBottom: '1rem', padding: '0 0.5rem' }}>RECENT CHATS</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ padding: '0.75rem 1rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '0.5rem', borderLeft: '3px solid var(--primary)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <MessageSquare size={16} />
              <span style={{ fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {sessionId.replace('session_', 'ID: ')}
              </span>
            </div>
          </div>
        </div>

        <div style={{ padding: '1rem 0.5rem', borderTop: '1px solid var(--glass-border)', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #ff6b6b, #ff8e8e)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <User size={18} color="white" />
          </div>
          <div>
            <p style={{ fontSize: '0.875rem', fontWeight: 600 }}>Guest User</p>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Persistent DB Connected</p>
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
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Powered by PostgreSQL Persistence</p>
            </div>
          </div>
          <button onClick={startNewChat} style={{ color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer' }} title="Start New Chat">
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
                <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>Session Restored</h2>
                <p style={{ color: 'var(--text-muted)', maxWidth: '400px' }}>Your history is safe in the database. Ask me anything to continue.</p>
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
              placeholder="Message persistent Gemini AI..."
              autoFocus
            />
            <button type="submit" className="send-btn" disabled={!input.trim() || loading}>
              <Send size={20} />
            </button>
          </form>
          <p style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '1rem' }}>
            History is being persisted to the 'langchain-manual' database.
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
