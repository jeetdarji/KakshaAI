import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';

const SuggestionChips = ({ suggestions, onSelect, isDark }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-wrap gap-2"
        >
            {suggestions.map((suggestion, idx) => (
                <motion.button
                    key={suggestion}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2, delay: idx * 0.05 }}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => onSelect(suggestion)}
                    className={`group px-4 py-2 rounded-full border text-sm transition-all duration-200 flex items-center gap-1.5 font-general cursor-pointer ${
                        isDark
                            ? 'bg-white/5 border-white/10 hover:bg-brand/10 hover:border-brand/30 text-white/60 hover:text-white'
                            : 'bg-white border-gray-200 hover:bg-brand/5 hover:border-brand/30 text-gray-500 hover:text-gray-900'
                    }`}
                >
                    <span>{suggestion}</span>
                    <ArrowRight
                        size={12}
                        className="opacity-0 -ml-1 group-hover:opacity-100 group-hover:ml-0 transition-all duration-200"
                    />
                </motion.button>
            ))}
        </motion.div>
    );
};

export default SuggestionChips;
