import React, { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, RotateCcw, Sparkles, Send, Copy, Check, User, GraduationCap, BookOpen, Calculator, Heart, ArrowRight, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { useTheme } from '../contexts/ThemeContext';
import { chatStream, getSuggestions, isAIConfigured } from '../lib/chatbotService';

// ============================================================================
// Premium Splash Loader (same animation)
// ============================================================================
const SplashLoader = ({ isDark, onComplete }) => {
    useEffect(() => {
        const timer = setTimeout(onComplete, 1800);
        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <motion.div
            className={`fixed inset-0 z-50 flex flex-col items-center justify-center ${isDark ? 'bg-dark-bg' : 'bg-gray-50'}`}
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
            <motion.div
                className="absolute w-[500px] h-[500px] rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(20,184,166,0.12) 0%, transparent 70%)' }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.2, 1], opacity: [0, 0.8, 0.4] }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
            />
            <motion.div
                className="absolute w-[300px] h-[300px] rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)' }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.5, 1.1], opacity: [0, 0.6, 0.3] }}
                transition={{ duration: 1.4, ease: 'easeOut', delay: 0.1 }}
            />
            <motion.div
                className="relative z-10"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.1 }}
            >
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand to-emerald-500 flex items-center justify-center shadow-2xl shadow-brand/30">
                    <Sparkles size={36} className="text-white" />
                </div>
            </motion.div>
            <motion.h1
                className={`mt-6 text-2xl font-clash font-semibold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
            >
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-emerald-400">
                    KakshaAI
                </span>
            </motion.h1>
            <motion.p
                className={`mt-2 text-sm font-general ${isDark ? 'text-white/30' : 'text-gray-400'}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.6 }}
            >
                Your AI Study Partner
            </motion.p>
            <motion.div
                className={`mt-8 w-48 h-1 rounded-full overflow-hidden ${isDark ? 'bg-white/[0.06]' : 'bg-gray-200'}`}
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: 1, scaleX: 1 }}
                transition={{ duration: 0.3, delay: 0.7 }}
            >
                <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-brand to-emerald-400"
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 1, delay: 0.8, ease: [0.4, 0, 0.2, 1] }}
                />
            </motion.div>
        </motion.div>
    );
};

// ============================================================================
// Typing Indicator
// ============================================================================
const TypingIndicator = ({ isDark }) => (
    <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-brand/20' : 'bg-brand/10'}`}>
            <span className="text-brand text-sm font-bold">K</span>
        </div>
        <div className={`px-4 py-3 rounded-2xl rounded-tl-sm ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
            <div className="flex items-center gap-1.5">
                {[0, 1, 2].map((i) => (
                    <motion.div
                        key={i}
                        className={`w-2 h-2 rounded-full ${isDark ? 'bg-white/40' : 'bg-gray-400'}`}
                        animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15, ease: 'easeInOut' }}
                    />
                ))}
            </div>
        </div>
    </div>
);

// ============================================================================
// Message Bubble with typewriter cursor
// ============================================================================
const MessageBubble = React.memo(({ message, isDark }) => {
    const [copied, setCopied] = useState(false);
    const isUser = message.role === 'user';

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(message.content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Copy failed:', err);
        }
    };

    if (isUser) {
        return (
            <div className="flex items-start gap-3 justify-end">
                <div className="max-w-[80%] md:max-w-[70%]">
                    <div className="bg-brand text-white px-4 py-3 rounded-2xl rounded-tr-sm shadow-lg shadow-brand/10">
                        <p className="text-sm md:text-[15px] leading-relaxed whitespace-pre-wrap">{message.content}</p>
                    </div>
                    <p className={`text-[10px] mt-1 text-right ${isDark ? 'text-white/25' : 'text-gray-400'}`}>
                        {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-white/10' : 'bg-gray-200'}`}>
                    <User size={14} className={isDark ? 'text-white/70' : 'text-gray-600'} />
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-start gap-3 group">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-brand/20' : 'bg-brand/10'}`}>
                <span className="text-brand text-sm font-bold">K</span>
            </div>
            <div className="max-w-[85%] md:max-w-[75%] min-w-0">
                <div className={`px-4 py-3 rounded-2xl rounded-tl-sm relative ${isDark ? 'bg-white/5 border border-white/5' : 'bg-gray-100 border border-gray-100'}`}>
                    <div className={`text-sm md:text-[15px] leading-relaxed prose prose-sm max-w-none ${isDark ? 'prose-invert' : ''} kaksha-math-content`}>
                        {message.content ? (
                            <ReactMarkdown
                                remarkPlugins={[remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                                components={{
                                    p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                                    strong: ({ children }) => <strong className="font-semibold text-brand">{children}</strong>,
                                    ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                                    ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                                    li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                                    h1: ({ children }) => <h3 className={`text-lg font-bold mt-3 mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{children}</h3>,
                                    h2: ({ children }) => <h4 className={`text-base font-bold mt-2 mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{children}</h4>,
                                    h3: ({ children }) => <h5 className={`text-sm font-bold mt-2 mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>{children}</h5>,
                                    code: ({ inline, children, ...props }) => {
                                        if (inline) {
                                            return (
                                                <code className={`px-1.5 py-0.5 rounded text-xs font-mono ${isDark ? 'bg-white/10 text-emerald-400' : 'bg-gray-200 text-emerald-700'}`} {...props}>
                                                    {children}
                                                </code>
                                            );
                                        }
                                        return (
                                            <pre className={`p-3 rounded-lg my-2 overflow-x-auto text-xs font-mono ${isDark ? 'bg-black/30' : 'bg-gray-200'}`}>
                                                <code {...props}>{children}</code>
                                            </pre>
                                        );
                                    },
                                    blockquote: ({ children }) => (
                                        <blockquote className={`border-l-3 border-brand pl-3 my-2 italic ${isDark ? 'text-white/70' : 'text-gray-600'}`}>
                                            {children}
                                        </blockquote>
                                    ),
                                    a: ({ children, href }) => (
                                        <a href={href} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">{children}</a>
                                    ),
                                    table: ({ children }) => (
                                        <div className="overflow-x-auto my-2">
                                            <table className={`w-full text-xs border-collapse ${isDark ? 'border-white/10' : 'border-gray-200'}`}>{children}</table>
                                        </div>
                                    ),
                                    th: ({ children }) => (
                                        <th className={`px-2 py-1 text-left font-semibold border-b ${isDark ? 'border-white/10 text-white/80' : 'border-gray-200 text-gray-700'}`}>{children}</th>
                                    ),
                                    td: ({ children }) => (
                                        <td className={`px-2 py-1 border-b ${isDark ? 'border-white/5 text-white/70' : 'border-gray-100 text-gray-600'}`}>{children}</td>
                                    ),
                                }}
                            >
                                {message.content}
                            </ReactMarkdown>
                        ) : null}
                        {/* Blinking cursor while streaming */}
                        {message.isStreaming && (
                            <span
                                className="inline-block w-[3px] h-[18px] ml-0.5 align-text-bottom rounded-sm"
                                style={{
                                    backgroundColor: 'rgb(20, 184, 166)',
                                    animation: 'blink-cursor 0.7s step-end infinite',
                                }}
                            />
                        )}
                    </div>

                    {!message.isStreaming && message.content && (
                        <button
                            onClick={handleCopy}
                            className={`absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 ${
                                isDark ? 'hover:bg-white/10 text-white/40 hover:text-white/70' : 'hover:bg-gray-200 text-gray-400 hover:text-gray-600'
                            }`}
                            title={copied ? 'Copied!' : 'Copy response'}
                        >
                            {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                        </button>
                    )}
                </div>

                {!message.isStreaming && (
                    <div className="flex items-center gap-2 mt-1">
                        <p className={`text-[10px] ${isDark ? 'text-white/25' : 'text-gray-400'}`}>
                            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {message.metadata?.usedDatabase && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isDark ? 'bg-brand/10 text-brand/60' : 'bg-brand/5 text-brand/50'}`}>
                                📊 Used real data
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
});

MessageBubble.displayName = 'MessageBubble';

// ============================================================================
// Welcome Screen
// ============================================================================
const WelcomeScreen = ({ onSuggestionSelect, isDark }) => {
    const capabilities = [
        { icon: BookOpen, title: 'Any Subject Doubt', desc: 'Physics, Chemistry, Maths & more', color: 'text-blue-400', bg: isDark ? 'bg-blue-500/10' : 'bg-blue-50' },
        { icon: GraduationCap, title: 'College Admissions', desc: 'Real cutoff data from 367 colleges', color: 'text-brand', bg: isDark ? 'bg-brand/10' : 'bg-brand/5' },
        { icon: Calculator, title: 'Formulas & Solutions', desc: 'Step-by-step problem solving', color: 'text-purple-400', bg: isDark ? 'bg-purple-500/10' : 'bg-purple-50' },
        { icon: Heart, title: 'Study Planning', desc: 'Strategies & motivation', color: 'text-rose-400', bg: isDark ? 'bg-rose-500/10' : 'bg-rose-50' },
    ];

    const quickStarters = [
        "What is thermodynamics?",
        "Explain Newton's laws of motion",
        "Give me all integration formulas",
        "COEP CS cutoff 2025",
        "Create a 30-day study plan",
        "Important formulas for Physics",
    ];

    return (
        <div className="flex-1 flex flex-col items-center justify-center px-4 md:px-8 py-8">
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center mb-8 max-w-2xl"
            >
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                    className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-brand to-emerald-500 flex items-center justify-center mb-6 shadow-lg shadow-brand/20"
                >
                    <Sparkles size={28} className="text-white" />
                </motion.div>
                <h1 className={`text-3xl md:text-4xl font-clash font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Ask me{' '}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand to-emerald-400">anything</span>
                </h1>
                <p className={`text-base md:text-lg font-general ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
                    Your AI study partner — doubts, formulas, cutoffs & more
                </p>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8 max-w-2xl w-full"
            >
                {capabilities.map((cap, idx) => (
                    <motion.div
                        key={cap.title}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: 0.2 + idx * 0.07 }}
                        className={`p-4 rounded-xl border text-center ${
                            isDark
                                ? 'bg-white/[0.03] border-white/[0.06] hover:border-white/10'
                                : 'bg-white border-gray-100 hover:border-gray-200 shadow-sm'
                        } transition-all duration-200`}
                    >
                        <div className={`w-10 h-10 rounded-lg ${cap.bg} flex items-center justify-center mx-auto mb-2`}>
                            <cap.icon size={20} className={cap.color} />
                        </div>
                        <h3 className={`text-xs font-semibold mb-0.5 ${isDark ? 'text-white/80' : 'text-gray-700'}`}>{cap.title}</h3>
                        <p className={`text-[10px] ${isDark ? 'text-white/35' : 'text-gray-400'}`}>{cap.desc}</p>
                    </motion.div>
                ))}
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
                className="flex flex-wrap justify-center gap-2 max-w-2xl"
            >
                {quickStarters.map((q, idx) => (
                    <motion.button
                        key={q}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2, delay: 0.45 + idx * 0.05 }}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => onSuggestionSelect(q)}
                        className={`group px-4 py-2 rounded-full border text-sm transition-all duration-200 flex items-center gap-1.5 font-general cursor-pointer ${
                            isDark
                                ? 'bg-white/5 border-white/10 hover:bg-brand/10 hover:border-brand/30 text-white/60 hover:text-white'
                                : 'bg-white border-gray-200 hover:bg-brand/5 hover:border-brand/30 text-gray-500 hover:text-gray-900'
                        }`}
                    >
                        <span>{q}</span>
                        <ArrowRight size={12} className="opacity-0 -ml-1 group-hover:opacity-100 group-hover:ml-0 transition-all duration-200" />
                    </motion.button>
                ))}
            </motion.div>
        </div>
    );
};

// ============================================================================
// Suggestion Chips
// ============================================================================
const SuggestionChips = ({ suggestions, onSelect, isDark }) => (
    <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion) => (
            <button
                key={suggestion}
                onClick={() => onSelect(suggestion)}
                className={`px-3 py-1.5 rounded-full border text-xs transition-all duration-200 font-general cursor-pointer ${
                    isDark
                        ? 'bg-white/5 border-white/10 hover:bg-brand/10 hover:border-brand/30 text-white/60 hover:text-white'
                        : 'bg-white border-gray-200 hover:bg-brand/5 hover:border-brand/30 text-gray-500 hover:text-gray-900'
                }`}
            >
                {suggestion}
            </button>
        ))}
    </div>
);

// ============================================================================
// Chat Input Bar
// ============================================================================
const ChatInputBar = ({ value, onChange, onSend, isLoading, isDark }) => {
    const textareaRef = useRef(null);

    useEffect(() => {
        const ta = textareaRef.current;
        if (ta) {
            ta.style.height = 'auto';
            ta.style.height = Math.min(ta.scrollHeight, 150) + 'px';
        }
    }, [value]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (value.trim() && !isLoading) onSend();
        }
    };

    const canSend = value.trim().length > 0 && !isLoading;

    return (
        <div className={`border-t px-4 md:px-8 py-4 ${isDark ? 'border-white/[0.06] bg-dark-bg' : 'border-gray-100 bg-gray-50'}`}>
            <div className="max-w-4xl mx-auto">
                <div className={`relative flex items-end gap-2 rounded-2xl border p-2 transition-all duration-200 ${
                    isDark
                        ? 'bg-white/[0.03] border-white/[0.08] focus-within:border-brand/40 focus-within:bg-white/[0.05]'
                        : 'bg-white border-gray-200 focus-within:border-brand/40'
                } focus-within:ring-1 focus-within:ring-brand/20`}>
                    <div className="pl-2 pb-1.5">
                        <Sparkles size={18} className={`${isDark ? 'text-white/20' : 'text-gray-300'}`} />
                    </div>
                    <textarea
                        ref={textareaRef}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask me anything..."
                        rows={1}
                        className={`flex-1 bg-transparent resize-none text-sm md:text-[15px] leading-relaxed focus:outline-none py-1.5 max-h-[150px] font-general ${
                            isDark ? 'text-white placeholder:text-white/25' : 'text-gray-900 placeholder:text-gray-400'
                        }`}
                        disabled={isLoading}
                    />
                    <motion.button
                        whileHover={canSend ? { scale: 1.05 } : {}}
                        whileTap={canSend ? { scale: 0.95 } : {}}
                        onClick={() => canSend && onSend()}
                        disabled={!canSend}
                        className={`p-2.5 rounded-xl transition-all duration-200 flex-shrink-0 ${
                            canSend
                                ? 'bg-gradient-to-r from-brand to-emerald-500 text-white shadow-md shadow-brand/20 cursor-pointer'
                                : isDark ? 'bg-white/5 text-white/20 cursor-not-allowed' : 'bg-gray-100 text-gray-300 cursor-not-allowed'
                        }`}
                        aria-label="Send message"
                    >
                        <Send size={18} />
                    </motion.button>
                </div>
                <p className={`text-[10px] mt-2 text-center font-general ${isDark ? 'text-white/15' : 'text-gray-300'}`}>
                    KakshaAI can make mistakes. Verify important information.
                </p>
            </div>
        </div>
    );
};

// Chat is session-only — history is NOT persisted across page refreshes.

// ============================================================================
// AI Assistant Page — ChatGPT-like scrolling & typewriter
// ============================================================================
const AIAssistant = () => {
    const { isDark } = useTheme();
    const navigate = useNavigate();
    const scrollContainerRef = useRef(null);
    const bottomAnchorRef = useRef(null);
    const [showScrollBtn, setShowScrollBtn] = useState(false);

    const [showSplash, setShowSplash] = useState(true);
    const [messages, setMessages] = useState([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);
    const [lastIntent, setLastIntent] = useState(null);
    const [isSending, setIsSending] = useState(false);

    const showWelcome = messages.length === 0;
    const suggestions = getSuggestions(lastIntent);

    // Scroll to bottom helper
    const scrollToBottom = useCallback((smooth = true) => {
        const el = scrollContainerRef.current;
        if (el) {
            el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'instant' });
        }
    }, []);

    // Auto-scroll on new messages
    useEffect(() => {
        scrollToBottom(true);
    }, [messages, isLoading, scrollToBottom]);

    // Detect when user scrolls away from bottom → show scroll button
    useEffect(() => {
        const el = scrollContainerRef.current;
        if (!el) return;
        const onScroll = () => {
            const gap = el.scrollHeight - el.scrollTop - el.clientHeight;
            setShowScrollBtn(gap > 200);
        };
        el.addEventListener('scroll', onScroll, { passive: true });
        return () => el.removeEventListener('scroll', onScroll);
    }, [showWelcome]);

    const handleSendMessage = useCallback(async (messageText) => {
        const text = (messageText || inputValue).trim();
        if (!text || isSending) return;

        setIsSending(true);
        setTimeout(() => setIsSending(false), 1500);
        setInputValue('');

        const userMsg = {
            id: `user-${Date.now()}`,
            role: 'user',
            content: text,
            timestamp: new Date().toISOString(),
        };

        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);

        const botMsgId = `bot-${Date.now()}`;

        try {
            const history = [...messages, userMsg]
                .slice(-10)
                .map(m => ({ role: m.role, content: m.content }));

            await new Promise(r => setTimeout(r, 400));

            setIsLoading(false);
            setIsStreaming(true);

            setMessages(prev => [...prev, {
                id: botMsgId,
                role: 'assistant',
                content: '',
                timestamp: new Date().toISOString(),
                metadata: {},
                isStreaming: true,
            }]);

            const result = await chatStream(text, history, (accumulatedText) => {
                setMessages(prev => prev.map(msg =>
                    msg.id === botMsgId ? { ...msg, content: accumulatedText } : msg
                ));
                scrollToBottom(false);
            });

            setMessages(prev => prev.map(msg =>
                msg.id === botMsgId
                    ? { ...msg, content: result.response, metadata: result.metadata, intent: result.intent, isStreaming: false }
                    : msg
            ));
            setLastIntent(result.intent);
        } catch (err) {
            console.error('Send message error:', err);
            setMessages(prev => {
                const filtered = prev.filter(m => m.id !== botMsgId);
                return [...filtered, {
                    id: `bot-error-${Date.now()}`,
                    role: 'assistant',
                    content: "❌ Something went wrong. Please check your internet connection and try again.",
                    timestamp: new Date().toISOString(),
                    metadata: { error: true },
                }];
            });
        } finally {
            setIsLoading(false);
            setIsStreaming(false);
        }
    }, [inputValue, isSending, messages, scrollToBottom]);

    const handleNewChat = useCallback(() => {
        setMessages([]);
        setInputValue('');
        setLastIntent(null);
        setIsLoading(false);
        setIsStreaming(false);
        localStorage.removeItem(STORAGE_KEY);
    }, []);

    const handleSuggestionSelect = useCallback((suggestion) => {
        handleSendMessage(suggestion);
    }, [handleSendMessage]);

    return (
        <div
            className={`flex flex-col transition-colors duration-300 ${isDark ? 'bg-dark-bg text-white' : 'bg-gray-50 text-gray-900'}`}
            style={{ height: '100%', minHeight: 0 }}
        >
            {/* Splash */}
            <AnimatePresence>
                {showSplash && <SplashLoader isDark={isDark} onComplete={() => setShowSplash(false)} />}
            </AnimatePresence>

            {/* Background glow */}
            <div className="fixed top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand/[0.03] rounded-full blur-[120px] pointer-events-none" />

            {/* Top bar */}
            <div className="flex-shrink-0 z-30 px-4 py-3 flex items-center justify-between">
                <button
                    onClick={() => navigate(-1)}
                    className={`p-2 rounded-xl transition-all ${
                        isDark ? 'hover:bg-white/10 text-white/70 hover:text-white' : 'hover:bg-gray-200 text-gray-500 hover:text-gray-900'
                    }`}
                >
                    <ArrowLeft size={22} />
                </button>
                {!showWelcome && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleNewChat}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            isDark
                                ? 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/[0.06]'
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-700 border border-gray-200'
                        }`}
                    >
                        <RotateCcw size={12} />
                        New Chat
                    </motion.button>
                )}
            </div>

            {/* ====== Scrollable chat area ====== */}
            {/* data-lenis-prevent stops Lenis from stealing scroll events */}
            <div
                ref={scrollContainerRef}
                data-lenis-prevent
                className="flex-1 overflow-y-auto"
                style={{ minHeight: 0, overscrollBehavior: 'contain' }}
            >
                {showWelcome ? (
                    <WelcomeScreen onSuggestionSelect={handleSuggestionSelect} isDark={isDark} />
                ) : (
                    <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 space-y-5 pb-8">
                        {messages.map((msg) => (
                            <MessageBubble key={msg.id} message={msg} isDark={isDark} />
                        ))}

                        {isLoading && <TypingIndicator isDark={isDark} />}

                        {!isLoading && !isStreaming && messages.length > 0 &&
                         messages[messages.length - 1].role === 'assistant' &&
                         !messages[messages.length - 1].isStreaming && (
                            <div className="pl-11">
                                <p className={`text-xs mb-2 ${isDark ? 'text-white/25' : 'text-gray-400'}`}>You can also ask:</p>
                                <SuggestionChips suggestions={suggestions.slice(0, 4)} onSelect={handleSuggestionSelect} isDark={isDark} />
                            </div>
                        )}

                        <div ref={bottomAnchorRef} className="h-1" />
                    </div>
                )}
            </div>

            {/* Scroll-to-bottom button */}
            <AnimatePresence>
                {showScrollBtn && !showWelcome && (
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 10 }}
                        onClick={() => scrollToBottom(true)}
                        className={`fixed bottom-28 left-1/2 -translate-x-1/2 z-30 p-2 rounded-full shadow-lg transition-colors ${
                            isDark
                                ? 'bg-white/10 hover:bg-white/20 text-white/70 border border-white/10'
                                : 'bg-white hover:bg-gray-50 text-gray-500 border border-gray-200 shadow-md'
                        }`}
                    >
                        <ChevronDown size={20} />
                    </motion.button>
                )}
            </AnimatePresence>

            {/* Input pinned at bottom */}
            <div className="flex-shrink-0 z-20">
                <ChatInputBar
                    value={inputValue}
                    onChange={setInputValue}
                    onSend={() => handleSendMessage()}
                    isLoading={isLoading || isStreaming}
                    isDark={isDark}
                />
            </div>
        </div>
    );
};

export default AIAssistant;
