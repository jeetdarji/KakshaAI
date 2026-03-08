import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { useTheme } from '../../contexts/ThemeContext';

const Card = ({ children, className, hoverEffect = true, ...props }) => {
    const { isDark } = useTheme();

    return (
        <motion.div
            whileHover={hoverEffect ? { y: -5 } : {}}
            className={cn(
                // Base State
                'backdrop-blur-md border p-6 rounded-2xl relative overflow-hidden transition-all duration-300 ease-out',
                isDark
                    ? 'bg-white/5 border-white/10 hover:border-brand/50 hover:shadow-[0_0_30px_-10px_rgba(20,184,166,0.3)]'
                    : 'bg-white border-gray-200 hover:border-brand/50 hover:shadow-lg shadow-sm',
                className
            )}
            {...props}
        >
            {/* Optional internal highlight layer */}
            <div className="absolute inset-0 bg-brand/5 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

            <div className="relative z-10">
                {children}
            </div>
        </motion.div>
    );
};

export default Card;
