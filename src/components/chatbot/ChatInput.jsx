import React, { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Send, Sparkles } from 'lucide-react';

const ChatInput = ({ value, onChange, onSend, isLoading, isDark }) => {
    const textareaRef = useRef(null);

    // Auto-resize textarea
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
            if (value.trim() && !isLoading) {
                onSend();
            }
        }
    };

    const canSend = value.trim().length > 0 && !isLoading;

    return (
        <div className={`border-t px-4 md:px-8 py-4 ${isDark ? 'border-white/[0.06] bg-dark-bg/80' : 'border-gray-100 bg-white/80'} backdrop-blur-xl`}>
            <div className={`relative flex items-end gap-2 rounded-2xl border p-2 transition-all duration-200 ${
                isDark
                    ? 'bg-white/[0.03] border-white/[0.08] focus-within:border-brand/40 focus-within:bg-white/[0.05]'
                    : 'bg-gray-50 border-gray-200 focus-within:border-brand/40 focus-within:bg-white'
            } focus-within:ring-1 focus-within:ring-brand/20`}>
                <div className="pl-2 pb-1.5">
                    <Sparkles size={18} className={`${isDark ? 'text-white/20' : 'text-gray-300'} transition-colors`} />
                </div>

                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask me anything about MHT-CET..."
                    rows={1}
                    className={`flex-1 bg-transparent resize-none text-sm md:text-[15px] leading-relaxed focus:outline-none py-1.5 max-h-[150px] font-general ${
                        isDark
                            ? 'text-white placeholder:text-white/25'
                            : 'text-gray-900 placeholder:text-gray-400'
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
                            : isDark
                                ? 'bg-white/5 text-white/20 cursor-not-allowed'
                                : 'bg-gray-100 text-gray-300 cursor-not-allowed'
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
    );
};

export default ChatInput;
