import React, { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import SuggestionChips from './SuggestionChips';

const ChatInterface = ({ messages, isLoading, suggestions, onSuggestionSelect, isDark }) => {
    const messagesEndRef = useRef(null);
    const containerRef = useRef(null);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, isLoading]);

    return (
        <div ref={containerRef} className="flex-1 px-4 md:px-8 py-6 space-y-5 overscroll-contain">
            <AnimatePresence mode="popLayout">
                {messages.map((msg) => (
                    <MessageBubble key={msg.id} message={msg} isDark={isDark} />
                ))}
            </AnimatePresence>

            {/* Typing indicator */}
            {isLoading && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                >
                    <TypingIndicator isDark={isDark} />
                </motion.div>
            )}

            {/* Contextual suggestions after bot response */}
            {!isLoading && messages.length > 0 && messages[messages.length - 1].role === 'assistant' && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="pl-11"
                >
                    <p className={`text-xs mb-2 ${isDark ? 'text-white/25' : 'text-gray-400'}`}>
                        You can also ask:
                    </p>
                    <SuggestionChips
                        suggestions={suggestions.slice(0, 4)}
                        onSelect={onSuggestionSelect}
                        isDark={isDark}
                    />
                </motion.div>
            )}

            <div ref={messagesEndRef} />
        </div>
    );
};

export default ChatInterface;
