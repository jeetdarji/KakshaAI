import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Bot, RotateCcw, Sparkles } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { useTheme } from '../../contexts/ThemeContext';
import { chat, getSuggestions, isAIConfigured } from '../../lib/chatbotService';

const WELCOME_MSG = {
    id: 'welcome',
    text: "Hi! I'm KakshaAI Assistant 👋\n\nAsk me about **college cutoffs**, **study tips**, or any **MHT-CET doubt**!",
    sender: 'bot',
    timestamp: new Date().toISOString(),
};

const Chatbot = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([WELCOME_MSG]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const { isDark } = useTheme();
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            const timerId = setTimeout(() => inputRef.current?.focus(), 300);
            return () => clearTimeout(timerId);
        }
    }, [isOpen]);

    const handleSend = async () => {
        const text = input.trim();
        if (!text || isSending || isLoading) return;

        setIsSending(true);
        setTimeout(() => setIsSending(false), 1500);
        setInput('');

        const userMsg = { id: `u-${Date.now()}`, text, sender: 'user', timestamp: new Date().toISOString() };
        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);

        try {
            // Build history (last 8 msgs, excluding welcome)
            const history = messages
                .filter(m => m.id !== 'welcome')
                .slice(-8)
                .map(m => ({ role: m.sender === 'user' ? 'user' : 'assistant', content: m.text }));

            history.push({ role: 'user', content: text });

            const result = await chat(text, history);

            setMessages(prev => [...prev, {
                id: `b-${Date.now()}`,
                text: result.response,
                sender: 'bot',
                timestamp: new Date().toISOString(),
                metadata: result.metadata,
            }]);
        } catch (err) {
            setMessages(prev => [...prev, {
                id: `err-${Date.now()}`,
                text: '❌ Error occurred. Please try again.',
                sender: 'bot',
                timestamp: new Date().toISOString(),
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClear = () => {
        setMessages([WELCOME_MSG]);
        setInput('');
        setIsLoading(false);
    };

    const quickActions = ["College cutoff help", "Create study plan", "Explain a concept"];

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className={`fixed bottom-24 right-6 w-[380px] h-[520px] ${isDark ? 'bg-dark-bg/95 border-white/10' : 'bg-white/95 border-gray-200'} backdrop-blur-xl border rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden`}
                    >
                        {/* Header */}
                        <div className="bg-gradient-to-r from-brand to-emerald-500 px-4 py-3 flex items-center justify-between flex-shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white">
                                    <Sparkles size={16} />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-white text-sm">KakshaAI</h3>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                        <span className="text-white/70 text-[10px]">
                                            {isAIConfigured() ? 'AI Powered' : 'Offline Mode'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={handleClear}
                                    className="text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                                    title="Clear chat"
                                >
                                    <RotateCcw size={14} />
                                </button>
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                                >
                                    <X size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-grow overflow-y-auto p-4 space-y-3">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] px-3.5 py-2.5 text-[13px] leading-relaxed ${
                                        msg.sender === 'user'
                                            ? 'bg-brand text-white rounded-2xl rounded-tr-sm'
                                            : isDark
                                                ? 'bg-white/[0.06] text-white/90 rounded-2xl rounded-tl-sm border border-white/[0.04]'
                                                : 'bg-gray-100 text-gray-800 rounded-2xl rounded-tl-sm'
                                    }`}>
                                        {msg.sender === 'bot' ? (
                                            <div className="prose prose-sm max-w-none prose-invert">
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkMath]}
                                                    rehypePlugins={[rehypeKatex]}
                                                    components={{
                                                        p: ({ children }) => <p className="mb-1.5 last:mb-0 text-[13px]">{children}</p>,
                                                        strong: ({ children }) => <strong className="font-semibold text-brand">{children}</strong>,
                                                        ul: ({ children }) => <ul className="list-disc list-inside mb-1.5 text-[13px]">{children}</ul>,
                                                        ol: ({ children }) => <ol className="list-decimal list-inside mb-1.5 text-[13px]">{children}</ol>,
                                                        code: ({ inline, children }) =>
                                                            inline
                                                                ? <code className={`px-1 py-0.5 rounded text-[11px] ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}>{children}</code>
                                                                : <pre className={`p-2 rounded text-[11px] overflow-x-auto my-1 ${isDark ? 'bg-black/30' : 'bg-gray-200'}`}><code>{children}</code></pre>,
                                                    }}
                                                >
                                                    {msg.text}
                                                </ReactMarkdown>
                                            </div>
                                        ) : (
                                            <span>{msg.text}</span>
                                        )}
                                    </div>
                                </div>
                            ))}

                            {/* Typing indicator */}
                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className={`px-4 py-3 rounded-2xl rounded-tl-sm ${isDark ? 'bg-white/[0.06]' : 'bg-gray-100'}`}>
                                        <div className="flex gap-1.5">
                                            {[0, 1, 2].map((i) => (
                                                <motion.div
                                                    key={i}
                                                    className={`w-1.5 h-1.5 rounded-full ${isDark ? 'bg-white/30' : 'bg-gray-400'}`}
                                                    animate={{ y: [0, -4, 0], opacity: [0.3, 1, 0.3] }}
                                                    transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Quick actions (show only if <=1 non-welcome msg) */}
                            {messages.length <= 1 && !isLoading && (
                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {quickActions.map((action) => (
                                        <button
                                            key={action}
                                            onClick={() => { setInput(action); }}
                                            className={`text-[11px] px-3 py-1.5 rounded-full border transition-all ${
                                                isDark
                                                    ? 'bg-white/5 border-white/10 hover:bg-brand/10 hover:border-brand/30 text-white/50 hover:text-white'
                                                    : 'bg-gray-50 border-gray-200 hover:bg-brand/5 hover:border-brand/30 text-gray-500 hover:text-gray-700'
                                            }`}
                                        >
                                            {action}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input */}
                        <div className={`p-3 border-t flex-shrink-0 ${isDark ? 'border-white/[0.06] bg-white/[0.02]' : 'border-gray-100 bg-gray-50/50'}`}>
                            <div className={`flex items-center gap-2 rounded-xl border px-3 py-1.5 transition-all ${
                                isDark
                                    ? 'bg-white/[0.03] border-white/[0.06] focus-within:border-brand/30'
                                    : 'bg-white border-gray-200 focus-within:border-brand/30'
                            }`}>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                                    placeholder="Ask anything..."
                                    disabled={isLoading}
                                    className={`flex-grow bg-transparent border-none focus:outline-none text-sm py-1.5 ${isDark ? 'text-white placeholder:text-white/25' : 'text-gray-900 placeholder:text-gray-400'}`}
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!input.trim() || isLoading}
                                    className={`p-1.5 rounded-lg transition-all ${
                                        input.trim() && !isLoading
                                            ? 'text-brand hover:bg-brand/10'
                                            : isDark ? 'text-white/15' : 'text-gray-300'
                                    }`}
                                >
                                    <Send size={16} />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating Button */}
            <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsOpen(!isOpen)}
                className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-brand to-emerald-500 rounded-full shadow-lg shadow-brand/30 flex items-center justify-center text-white z-50"
            >
                <AnimatePresence mode="wait">
                    {isOpen ? (
                        <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                            <X size={24} />
                        </motion.div>
                    ) : (
                        <motion.div key="open" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
                            <MessageSquare size={24} />
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.button>
        </>
    );
};

export default Chatbot;
