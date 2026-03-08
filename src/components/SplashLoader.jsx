import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TrueFocus from './ui/TrueFocus';

// ─── Easing presets ───
const EASE_OUT_EXPO = [0.16, 1, 0.3, 1];
const EASE_OUT_QUART = [0.25, 1, 0.5, 1];

// ─── Orbital Ring Component ───
const OrbitalRing = ({ size, duration, delay, opacity, dotSize = 6, reverse = false }) => (
    <motion.div
        className="absolute rounded-full border border-brand"
        style={{
            width: size,
            height: size,
            opacity,
            willChange: 'transform',
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity, rotate: reverse ? -360 : 360 }}
        transition={{
            scale: { duration: 1.5, delay, ease: EASE_OUT_EXPO },
            opacity: { duration: 1, delay },
            rotate: { duration, repeat: Infinity, ease: 'linear' },
        }}
    >
        {/* Orbiting dot */}
        <motion.div
            className="absolute rounded-full bg-brand"
            style={{
                width: dotSize,
                height: dotSize,
                top: -(dotSize / 2),
                left: '50%',
                marginLeft: -(dotSize / 2),
                boxShadow: '0 0 12px rgba(20, 184, 166, 0.8), 0 0 24px rgba(20, 184, 166, 0.4)',
            }}
        />
    </motion.div>
);

// ─── Floating Particle Component ───
const FloatingParticle = ({ x, y, size, duration, delay }) => (
    <motion.div
        className="absolute rounded-full bg-brand/30"
        style={{
            width: size,
            height: size,
            left: `${x}%`,
            top: `${y}%`,
            willChange: 'transform, opacity',
        }}
        initial={{ opacity: 0 }}
        animate={{
            opacity: [0, 0.7, 0],
            y: [0, -40, 0],
            x: [0, Math.sin(x) * 15, 0],
        }}
        transition={{
            duration,
            delay,
            repeat: Infinity,
            ease: 'easeInOut',
        }}
    />
);

// ─── DNA Helix Dots (science aesthetic) ───
const HelixDot = ({ index, total }) => {
    const angle = (index / total) * Math.PI * 4;
    const xOffset = Math.sin(angle) * 120;
    const yPos = (index / total) * 100 - 50;

    return (
        <motion.div
            className="absolute rounded-full"
            style={{
                width: 3,
                height: 3,
                background: `rgba(20, 184, 166, ${0.15 + (index / total) * 0.3})`,
                left: `calc(50% + ${xOffset}px)`,
                top: `calc(50% + ${yPos}px)`,
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 + index * 0.03, duration: 0.4 }}
        />
    );
};

// ─── Main SplashLoader Component ───
const SplashLoader = ({ onComplete }) => {
    const [showSplash, setShowSplash] = useState(true);
    const [progress, setProgress] = useState(0);

    // Generate stable particles
    const particles = useMemo(() =>
        Array.from({ length: 25 }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            y: Math.random() * 100,
            size: Math.random() * 3 + 1,
            duration: Math.random() * 4 + 5,
            delay: Math.random() * 2,
        })), []
    );

    useEffect(() => {
        // Smooth eased progress bar
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    return 100;
                }
                const remaining = 100 - prev;
                const increment = Math.max(0.5, remaining * 0.06);
                return Math.min(100, prev + increment);
            });
        }, 40);

        // Begin exit transition
        const exitTimer = setTimeout(() => setShowSplash(false), 3800);
        // Signal parent after exit animation finishes
        const completeTimer = setTimeout(() => onComplete(), 4500);

        return () => {
            clearInterval(interval);
            clearTimeout(exitTimer);
            clearTimeout(completeTimer);
        };
    }, [onComplete]);

    const tagline = 'Your MHT-CET Command Center';
    const subjects = ['Physics', 'Chemistry', 'Mathematics'];

    return (
        <AnimatePresence mode="wait">
            {showSplash && (
                <motion.div
                    key="splash-loader"
                    className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden"
                    style={{ background: '#050505' }}
                    exit={{
                        opacity: 0,
                        scale: 1.08,
                        filter: 'blur(12px)',
                    }}
                    transition={{ duration: 0.7, ease: EASE_OUT_EXPO }}
                >
                    {/* ── Subtle noise texture ── */}
                    <div
                        className="absolute inset-0 opacity-[0.035] pointer-events-none"
                        style={{
                            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
                            backgroundSize: '128px 128px',
                        }}
                    />

                    {/* ── Ambient glow backdrop ── */}
                    <motion.div
                        className="absolute rounded-full pointer-events-none"
                        style={{
                            width: 700,
                            height: 700,
                            background: 'radial-gradient(circle, rgba(20, 184, 166, 0.12) 0%, rgba(20, 184, 166, 0.04) 40%, transparent 70%)',
                        }}
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{
                            scale: [0, 1.3, 1],
                            opacity: [0, 0.8, 0.6],
                        }}
                        transition={{ duration: 2.5, ease: 'easeOut' }}
                    />

                    {/* ── Secondary glow pulse ── */}
                    <motion.div
                        className="absolute rounded-full pointer-events-none"
                        style={{
                            width: 400,
                            height: 400,
                            background: 'radial-gradient(circle, rgba(20, 184, 166, 0.08) 0%, transparent 70%)',
                        }}
                        animate={{
                            scale: [1, 1.4, 1],
                            opacity: [0.3, 0.6, 0.3],
                        }}
                        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    />

                    {/* ── Floating particles ── */}
                    {particles.map(p => (
                        <FloatingParticle key={p.id} {...p} />
                    ))}

                    {/* ── Helix dots (science DNA aesthetic) ── */}
                    {Array.from({ length: 20 }, (_, i) => (
                        <HelixDot key={`helix-${i}`} index={i} total={20} />
                    ))}

                    {/* ── Orbital rings ── */}
                    <OrbitalRing size={200} duration={10} delay={0.2} opacity={0.12} dotSize={5} />
                    <OrbitalRing size={300} duration={14} delay={0.6} opacity={0.08} dotSize={4} reverse />
                    <OrbitalRing size={400} duration={20} delay={1.0} opacity={0.05} dotSize={3} />

                    {/* ── Central Content ── */}
                    <div className="relative z-10 flex flex-col items-center">

                        {/* Logo mark — glowing "K" icon */}
                        <motion.div
                            className="relative mb-8"
                            initial={{ scale: 0, opacity: 0, rotate: -180 }}
                            animate={{ scale: 1, opacity: 1, rotate: 0 }}
                            transition={{ duration: 1, ease: EASE_OUT_EXPO, delay: 0.2 }}
                        >
                            {/* Glow ring behind logo */}
                            <motion.div
                                className="absolute inset-0 rounded-2xl"
                                animate={{
                                    boxShadow: [
                                        '0 0 30px rgba(20, 184, 166, 0.2), 0 0 60px rgba(20, 184, 166, 0.1)',
                                        '0 0 50px rgba(20, 184, 166, 0.5), 0 0 100px rgba(20, 184, 166, 0.2)',
                                        '0 0 30px rgba(20, 184, 166, 0.2), 0 0 60px rgba(20, 184, 166, 0.1)',
                                    ],
                                }}
                                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                            />
                            <div
                                className="w-[72px] h-[72px] md:w-[88px] md:h-[88px] rounded-2xl flex items-center justify-center relative overflow-hidden"
                                style={{
                                    background: 'linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)',
                                }}
                            >
                                {/* Inner shine */}
                                <motion.div
                                    className="absolute inset-0"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%)',
                                    }}
                                    animate={{ opacity: [0.5, 0.8, 0.5] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                />
                                <span
                                    className="text-white font-bold relative z-10"
                                    style={{
                                        fontFamily: "'Clash Display', sans-serif",
                                        fontSize: 'clamp(2rem, 4vw, 2.5rem)',
                                    }}
                                >
                                    K
                                </span>
                            </div>
                        </motion.div>

                        {/* Brand name — TrueFocus scanning effect */}
                        <motion.div
                            className="mb-4"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.7, ease: EASE_OUT_QUART }}
                        >
                            <TrueFocus
                                sentence="Kaksha AI"
                                blurAmount={4}
                                borderColor="#14b8a6"
                                glowColor="rgba(20, 184, 166, 0.6)"
                                animationDuration={0.6}
                                pauseBetweenAnimations={1.2}
                                textStyle={{
                                    fontFamily: "'Clash Display', sans-serif",
                                    fontSize: 'clamp(2rem, 6vw, 3.5rem)',
                                    fontWeight: 700,
                                    color: '#ffffff',
                                }}
                            />
                        </motion.div>

                        {/* Divider line */}
                        <motion.div
                            className="h-[1px] bg-gradient-to-r from-transparent via-brand/40 to-transparent mb-5"
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 200, opacity: 1 }}
                            transition={{ duration: 0.8, delay: 1.6, ease: EASE_OUT_EXPO }}
                        />

                        {/* Tagline — MHT-CET callout */}
                        <motion.p
                            className="text-sm md:text-base tracking-[0.25em] uppercase mb-5 text-center"
                            style={{
                                fontFamily: "'General Sans', sans-serif",
                                color: 'rgba(255, 255, 255, 0.45)',
                            }}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 1.9, ease: 'easeOut' }}
                        >
                            {tagline}
                        </motion.p>

                        {/* Subject pills — Physics · Chemistry · Mathematics */}
                        <motion.div
                            className="flex items-center gap-3 md:gap-4 mb-10"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 2.3 }}
                        >
                            {subjects.map((subject, i) => (
                                <React.Fragment key={subject}>
                                    <motion.span
                                        className="text-xs md:text-sm tracking-wider uppercase"
                                        style={{
                                            fontFamily: "'General Sans', sans-serif",
                                            color: 'rgba(20, 184, 166, 0.6)',
                                        }}
                                        initial={{ opacity: 0, scale: 0.7 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{
                                            delay: 2.4 + i * 0.12,
                                            duration: 0.4,
                                            ease: EASE_OUT_QUART,
                                        }}
                                    >
                                        {subject}
                                    </motion.span>
                                    {i < subjects.length - 1 && (
                                        <motion.span
                                            className="w-1 h-1 rounded-full bg-brand/30"
                                            initial={{ opacity: 0, scale: 0 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{
                                                delay: 2.5 + i * 0.12,
                                                type: 'spring',
                                            }}
                                        />
                                    )}
                                </React.Fragment>
                            ))}
                        </motion.div>

                        {/* Progress bar */}
                        <div className="relative w-52 md:w-64">
                            <div className="h-[2px] bg-white/[0.06] rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full rounded-full"
                                    style={{
                                        width: `${progress}%`,
                                        background: 'linear-gradient(90deg, #14b8a6, #5eead4)',
                                        boxShadow: '0 0 12px rgba(20, 184, 166, 0.4)',
                                    }}
                                />
                            </div>
                            {/* Percentage text */}
                            <motion.span
                                className="block text-center mt-3 text-[10px] tracking-[0.3em] uppercase"
                                style={{
                                    fontFamily: "'General Sans', sans-serif",
                                    color: 'rgba(255, 255, 255, 0.2)',
                                }}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                            >
                                Loading experience
                            </motion.span>
                        </div>
                    </div>

                    {/* ── Bottom watermark ── */}
                    <motion.div
                        className="absolute bottom-8 flex flex-col items-center gap-1"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 2.8, duration: 0.5 }}
                    >
                        <span
                            className="text-[10px] tracking-[0.2em] uppercase"
                            style={{
                                fontFamily: "'General Sans', sans-serif",
                                color: 'rgba(255, 255, 255, 0.15)',
                            }}
                        >
                            Ace MHT-CET with AI
                        </span>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default SplashLoader;
