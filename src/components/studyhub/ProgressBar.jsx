import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { useTheme } from '../../contexts/ThemeContext';

const ProgressBar = ({
    percentage = 0,
    color = 'brand',
    animated = true,
    showLabel = true,
    size = 'md',
    className
}) => {
    const { isDark } = useTheme();
    const sizes = {
        sm: 'h-1',
        md: 'h-1.5',
        lg: 'h-2',
    };

    const colors = {
        brand: 'bg-brand',
        emerald: 'bg-emerald-500',
        blue: 'bg-blue-500',
        orange: 'bg-orange-500',
    };

    return (
        <div className={cn('space-y-2', className)}>
            {showLabel && (
                <div className={`flex justify-between text-xs ${isDark ? 'text-white/50' : 'text-gray-500'} font-general`}>
                    <span>Progress</span>
                    <span className="font-mono">{percentage}%</span>
                </div>
            )}
            <div className={cn(isDark ? 'bg-white/10' : 'bg-gray-200', 'rounded-full overflow-hidden', sizes[size])}>
                <motion.div
                    className={cn('h-full rounded-full', colors[color])}
                    initial={animated ? { width: 0 } : { width: `${percentage}%` }}
                    animate={{ width: `${percentage}%` }}
                    transition={{
                        duration: animated ? 1 : 0,
                        ease: [0.25, 0.1, 0.25, 1],
                        delay: animated ? 0.2 : 0
                    }}
                />
            </div>
        </div>
    );
};

export default ProgressBar;
