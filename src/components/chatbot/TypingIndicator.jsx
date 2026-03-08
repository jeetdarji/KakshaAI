import React from 'react';
import { motion } from 'framer-motion';

const TypingIndicator = ({ isDark }) => {
    return (
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
                            animate={{
                                y: [0, -6, 0],
                                opacity: [0.4, 1, 0.4],
                            }}
                            transition={{
                                duration: 0.8,
                                repeat: Infinity,
                                delay: i * 0.15,
                                ease: 'easeInOut',
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default TypingIndicator;
