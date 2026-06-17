import { useState, useRef, useEffect } from 'react';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useSocket } from '../providers/SocketProvider';
import { Send, Sparkles, Bot, User, Mic, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const AIChat = () => {
  const [input, setInput] = useState('');
  const messages = useWorkspaceStore((state) => state.messages);
  const isGenerating = useWorkspaceStore((state) => state.isGenerating);
  const { sendMessage, cancelMessage, isConnected } = useSocket();
  const bottomRef = useRef<HTMLDivElement>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isListening, setIsListening] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !isConnected) return;
    sendMessage(input);
    setInput('');
  };

  const handleCancel = () => {
    cancelMessage();
  };

  const toggleListen = () => {
    if (isListening) return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return alert('Speech recognition not supported in your browser.');
    
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setInput(transcript);
      sendMessage(transcript);
      setInput('');
      setIsListening(false);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    
    recognition.start();
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 w-full">
      {/* Header */}
      <div className="p-6 border-b border-white/10 flex items-center justify-between bg-zinc-900/50">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-indigo-500/20 rounded-lg">
            <Sparkles className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Sales Co-Pilot</h2>
            <p className="text-xs text-zinc-400">Powered by Gemini Space</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-zinc-500">{isConnected ? 'Online' : 'Offline'}</span>
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-red-500'}`} />
        </div>
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3 }}
              className={`flex items-start space-x-3 ${msg.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}
            >
              <div className={`p-2 rounded-full flex-shrink-0 ${msg.sender === 'user' ? 'bg-zinc-800' : 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'}`}>
                {msg.sender === 'user' ? <User className="w-4 h-4 text-zinc-300" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`px-4 py-3 rounded-2xl max-w-[85%] sm:max-w-[280px] break-words whitespace-pre-wrap text-sm leading-relaxed ${
                  msg.sender === 'user' 
                    ? 'bg-zinc-800 text-zinc-100 rounded-tr-sm' 
                    : 'bg-zinc-900 border border-white/5 text-zinc-300 rounded-tl-sm shadow-xl'
                }`}>
                  {msg.text || (
                    <span className="flex space-x-1 py-1">
                      <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.4 }} className="w-1.5 h-1.5 bg-zinc-400 rounded-full" />
                      <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.4, delay: 0.2 }} className="w-1.5 h-1.5 bg-zinc-400 rounded-full" />
                      <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.4, delay: 0.4 }} className="w-1.5 h-1.5 bg-zinc-400 rounded-full" />
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-zinc-600 mt-1 px-1 min-h-[15px]">
                  {isMounted ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input Field */}
      <div className="p-4 bg-zinc-900/50 border-t border-white/10 backdrop-blur-md">
        <form onSubmit={handleSend} className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isConnected ? "E.g., I need a workstation..." : "Connecting to server..."}
            disabled={!isConnected}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-full pl-5 pr-20 py-3.5 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all disabled:opacity-50"
          />
          <button
            type="button"
            onClick={toggleListen}
            disabled={!isConnected}
            className={`absolute right-12 w-9 h-9 flex items-center justify-center rounded-full transition-colors shrink-0 ${
              isListening ? 'bg-red-500 text-white animate-pulse' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Mic className="w-4 h-4" />
          </button>
          {isGenerating ? (
            <button
              type="button"
              onClick={handleCancel}
              className="absolute right-1.5 w-9 h-9 bg-red-600/20 text-red-500 border border-red-500/50 rounded-full hover:bg-red-600/40 transition-colors flex items-center justify-center group shrink-0"
              title="Cancel Current Generation"
            >
              <XCircle className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim() || !isConnected}
              className="absolute right-1.5 w-9 h-9 flex items-center justify-center bg-indigo-600 text-white rounded-full hover:bg-indigo-500 transition-colors disabled:opacity-50 disabled:hover:bg-indigo-600 shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </form>
      </div>
    </div>
  );
};
