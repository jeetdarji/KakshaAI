import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { useTheme } from '../../contexts/ThemeContext';

const Button = ({ children, variant = 'primary', size = 'md', className, ...props }) => {
    const { isDark } = useTheme();

    const variants = {
        primary: 'bg-brand hover:bg-brand-dark text-white shadow-lg shadow-brand/25',
        secondary: isDark
            ? 'bg-white/10 hover:bg-white/20 text-white backdrop-blur-md border border-white/10'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200',
        outline: 'border border-brand text-brand hover:bg-brand/10',
        ghost: isDark ? 'hover:bg-white/5 text-white' : 'hover:bg-gray-100 text-gray-700',
    };

    const sizes = {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-5 py-2.5 text-base',
        lg: 'px-8 py-3.5 text-lg',
    };

    return (
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={cn(
                'rounded-full font-semibold transition-all duration-200 flex items-center justify-center gap-2',
                variants[variant],
                sizes[size],
                className
            )}
            {...props}
        >
            {children}
        </motion.button>
    );
};

export default Button;
