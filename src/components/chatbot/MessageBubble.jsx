import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Copy, Check, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

const MessageBubble = ({ message, isDark }) => {
    const [copied, setCopied] = useState(false);
    const isUser = message.role === 'user';

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(message.content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy:', err);
        }
    };

    if (isUser) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 10, x: 20 }}
                animate={{ opacity: 1, y: 0, x: 0 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
                className="flex items-start gap-3 justify-end"
            >
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
            </motion.div>
        );
    }

    // Bot message
    return (
        <motion.div
            initial={{ opacity: 0, y: 10, x: -20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="flex items-start gap-3 group"
        >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isDark ? 'bg-brand/20' : 'bg-brand/10'}`}>
                <span className="text-brand text-sm font-bold">K</span>
            </div>
            <div className="max-w-[85%] md:max-w-[75%]">
                <div className={`px-4 py-3 rounded-2xl rounded-tl-sm relative ${isDark ? 'bg-white/5 border border-white/5' : 'bg-gray-100 border border-gray-100'}`}>
                    {/* Markdown content */}
                    <div className={`text-sm md:text-[15px] leading-relaxed prose prose-sm max-w-none ${isDark ? 'prose-invert' : ''} kaksha-math-content`}>
                        <ReactMarkdown
                            remarkPlugins={[remarkMath]}
                            rehypePlugins={[rehypeKatex]}
                            components={{
                                // Custom renderers for better styling
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
                                            <code
                                                className={`px-1.5 py-0.5 rounded text-xs font-mono ${isDark ? 'bg-white/10 text-emerald-400' : 'bg-gray-200 text-emerald-700'}`}
                                                {...props}
                                            >
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
                                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
                                        {children}
                                    </a>
                                ),
                                table: ({ children }) => (
                                    <div className="overflow-x-auto my-2">
                                        <table className={`w-full text-xs border-collapse ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
                                            {children}
                                        </table>
                                    </div>
                                ),
                                th: ({ children }) => (
                                    <th className={`px-2 py-1 text-left font-semibold border-b ${isDark ? 'border-white/10 text-white/80' : 'border-gray-200 text-gray-700'}`}>
                                        {children}
                                    </th>
                                ),
                                td: ({ children }) => (
                                    <td className={`px-2 py-1 border-b ${isDark ? 'border-white/5 text-white/70' : 'border-gray-100 text-gray-600'}`}>
                                        {children}
                                    </td>
                                ),
                            }}
                        >
                            {message.content}
                        </ReactMarkdown>
                    </div>

                    {/* Copy button */}
                    <button
                        onClick={handleCopy}
                        className={`absolute top-2 right-2 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 ${
                            isDark ? 'hover:bg-white/10 text-white/40 hover:text-white/70' : 'hover:bg-gray-200 text-gray-400 hover:text-gray-600'
                        }`}
                        title={copied ? 'Copied!' : 'Copy response'}
                    >
                        {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                    </button>
                </div>

                {/* Metadata line */}
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
            </div>
        </motion.div>
    );
};

export default MessageBubble;
