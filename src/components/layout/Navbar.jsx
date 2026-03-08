import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Sparkles, Layers, FileText, Target, BookOpen, BarChart2, User, LogOut, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useTheme } from '../../contexts/ThemeContext';

// Extract initials from email
const getInitials = (email) => {
    if (!email) return '?';
    const name = email.split('@')[0];
    return name.charAt(0).toUpperCase();
};

// Profile Avatar Component with Tooltip
const ProfileAvatar = ({ email }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const initials = getInitials(email);

    return (
        <div className="relative">
            <button
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                onFocus={() => setShowTooltip(true)}
                onBlur={() => setShowTooltip(false)}
                className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-white font-semibold uppercase border-2 border-teal-400/30 hover:scale-110 transition-transform duration-200 cursor-pointer select-none"
                aria-label={`Profile: ${email}`}
            >
                {initials}
            </button>

            {/* Email Tooltip */}
            <AnimatePresence>
                {showTooltip && (
                    <motion.div
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full mt-2 right-0 z-50"
                    >
                        {/* Arrow */}
                        <div className="absolute -top-1 right-4 w-2 h-2 rotate-45 bg-gray-900/95 dark:bg-gray-900/95 border-l border-t border-teal-500/30" />
                        <div className="px-3 py-2 rounded-lg bg-gray-900/95 backdrop-blur-md text-xs text-white border border-teal-500/30 whitespace-nowrap shadow-lg">
                            {email}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Theme Toggle Button
const ThemeToggle = ({ theme, toggleTheme, buttonRef }) => {
    const [isAnimating, setIsAnimating] = useState(false);
    const { isDark } = useTheme();

    const handleClick = () => {
        setIsAnimating(true);
        toggleTheme();
        setTimeout(() => setIsAnimating(false), 600);
    };

    return (
        <button
            ref={buttonRef}
            onClick={handleClick}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer border
                ${isDark
                    ? 'bg-gray-800/50 hover:bg-gray-700/50 border-white/10 text-teal-400'
                    : 'bg-gray-200/50 hover:bg-gray-300/50 border-gray-300 text-teal-600'
                }
                hover:scale-110 active:scale-95
            `}
            aria-label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
        >
            <motion.div
                animate={{ rotate: isAnimating ? 180 : 0 }}
                transition={{ duration: 0.4, ease: 'easeInOut' }}
            >
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
            </motion.div>
        </button>
    );
};

// Theme Transition Overlay
const ThemeTransitionOverlay = ({ isVisible, isDark, originX, originY }) => {
    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{
                        clipPath: `circle(0px at ${originX}px ${originY}px)`,
                        opacity: 1,
                    }}
                    animate={{
                        clipPath: `circle(200vmax at ${originX}px ${originY}px)`,
                        opacity: 1,
                    }}
                    exit={{ opacity: 0 }}
                    transition={{
                        clipPath: { duration: 0.6, ease: [0.4, 0, 0.2, 1] },
                        opacity: { duration: 0.3, delay: 0.4 },
                    }}
                    className="fixed inset-0 z-[9999] pointer-events-none"
                    style={{
                        backgroundColor: isDark ? '#0a0a0a' : '#ffffff',
                    }}
                />
            )}
        </AnimatePresence>
    );
};

const Navbar = () => {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [hidden, setHidden] = useState(false);
    const [user, setUser] = useState(null);
    const [overlayVisible, setOverlayVisible] = useState(false);
    const [overlayOrigin, setOverlayOrigin] = useState({ x: 0, y: 0 });
    const { scrollY } = useScroll();
    const location = useLocation();
    const navigate = useNavigate();
    const { theme, toggleTheme, isDark } = useTheme();
    const themeButtonRef = useRef(null);

    // Listen to auth state changes
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user || null);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user || null);
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        setMobileMenuOpen(false);
        navigate('/');
    };

    const handleThemeToggle = () => {
        // Get button position for origin of animation
        if (themeButtonRef.current) {
            const rect = themeButtonRef.current.getBoundingClientRect();
            setOverlayOrigin({
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
            });
        }
        setOverlayVisible(true);
        // Small delay so overlay starts expanding before color change
        setTimeout(() => {
            toggleTheme();
        }, 50);
        setTimeout(() => {
            setOverlayVisible(false);
        }, 700);
    };

    useMotionValueEvent(scrollY, "change", (latest) => {
        const previous = scrollY.getPrevious() || 0;
        if (latest > previous && latest > 50) {
            setHidden(true);
        } else {
            setHidden(false);
        }
    });

    const navLinks = [
        { name: 'Dashboard', path: '/dashboard', icon: Layers },
        { name: 'Papers', path: '/papers', icon: FileText },
        { name: 'Mock Test', path: '/mock-tests', icon: Target },
        { name: 'Study Hub', path: '/study-hub', icon: BookOpen },
        { name: 'Cutoff', path: '/cutoffs', icon: BarChart2 },
        { name: 'Analytics', path: '/analytics', icon: BarChart2 },
    ];

    return (
        <>
            {/* Theme Transition Overlay */}
            <ThemeTransitionOverlay
                isVisible={overlayVisible}
                isDark={isDark}
                originX={overlayOrigin.x}
                originY={overlayOrigin.y}
            />

            <motion.nav
                variants={{
                    visible: { y: 0 },
                    hidden: { y: "-100%" },
                }}
                animate={hidden ? "hidden" : "visible"}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className={`fixed top-0 left-0 w-full z-50 backdrop-blur-xl border-b h-20 flex items-center transition-colors duration-300
                    ${isDark ? 'border-white/5 bg-black/20' : 'border-gray-200/80 bg-white/70'}
                `}
            >
                <div className="container mx-auto px-6 md:px-8 h-full flex items-center justify-between">
                    {/* Logo */}
                    <Link to="/" className="text-2xl font-sans font-bold tracking-tight flex items-center gap-2 group">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center group-hover:shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-shadow duration-300">
                            <span className={`text-lg ${isDark ? 'text-white' : 'text-emerald-600'}`}>K</span>
                        </div>
                        <span className={isDark ? 'text-white' : 'text-gray-900'}>
                            Kaksha<span className="text-emerald-500">AI</span>
                        </span>
                    </Link>

                    {/* Desktop Nav */}
                    <div className="hidden lg:flex items-center gap-6 xl:gap-8">
                        {navLinks.map((link) => (
                            <Link
                                key={link.path}
                                to={link.path}
                                className={`text-sm font-medium transition-colors hover:text-emerald-400 ${
                                    location.pathname === link.path
                                        ? 'text-emerald-400'
                                        : isDark ? 'text-white' : 'text-gray-700'
                                }`}
                            >
                                {link.name}
                            </Link>
                        ))}
                    </div>

                    {/* CTA & Auth Buttons - Desktop */}
                    <div className="flex items-center gap-3">
                        <Link
                            to="/ai-assistant"
                            className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-medium text-sm hover:opacity-90 transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)]"
                        >
                            <Sparkles size={16} />
                            AI Assistant
                        </Link>

                        {/* Theme Toggle */}
                        <ThemeToggle
                            theme={theme}
                            toggleTheme={handleThemeToggle}
                            buttonRef={themeButtonRef}
                        />

                        {user ? (
                            /* Logged In: show avatar + logout */
                            <div className="hidden md:flex items-center gap-3">
                                <ProfileAvatar email={user.email} />
                                <button
                                    onClick={handleLogout}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg border font-medium text-sm transition-all
                                        ${isDark
                                            ? 'border-white/10 text-white hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400'
                                            : 'border-gray-200 text-gray-700 hover:bg-red-50 hover:border-red-300 hover:text-red-500'
                                        }
                                    `}
                                >
                                    <LogOut size={16} />
                                    Logout
                                </button>
                            </div>
                        ) : (
                            /* Logged Out: show Sign In */
                            <Link
                                to="/login"
                                className={`hidden md:flex items-center gap-2 px-4 py-2 rounded-lg border font-medium text-sm transition-all
                                    ${isDark
                                        ? 'border-white/10 text-white hover:bg-white/5'
                                        : 'border-gray-200 text-gray-700 hover:bg-gray-50'
                                    }
                                `}
                            >
                                <User size={16} />
                                Sign In
                            </Link>
                        )}

                        {/* Mobile Menu Toggle */}
                        <button
                            className={`lg:hidden p-2 transition-colors ${isDark ? 'text-white hover:text-emerald-500' : 'text-gray-700 hover:text-emerald-500'}`}
                            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        >
                            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                <AnimatePresence>
                    {mobileMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className={`lg:hidden backdrop-blur-md border-b overflow-hidden absolute top-20 left-0 right-0 shadow-2xl
                                ${isDark ? 'bg-black/95 border-white/5' : 'bg-white/95 border-gray-200'}
                            `}
                        >
                            <div className="flex flex-col p-6 gap-4">
                                {navLinks.map((link) => (
                                    <Link
                                        key={link.path}
                                        to={link.path}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={`flex items-center gap-3 text-lg font-medium hover:text-emerald-400
                                            ${isDark ? 'text-white' : 'text-gray-800'}
                                        `}
                                    >
                                        <link.icon size={20} />
                                        {link.name}
                                    </Link>
                                ))}
                                <hr className={isDark ? 'border-white/10' : 'border-gray-200'} />
                                <div className="flex flex-col gap-3">
                                    <Link
                                        to="/ai-assistant"
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold"
                                    >
                                        <Sparkles size={18} />
                                        AI Assistant
                                    </Link>

                                    {user ? (
                                        /* Mobile: Logged In */
                                        <>
                                            <div className="flex items-center justify-center gap-2 py-2">
                                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-teal-500 to-emerald-500 flex items-center justify-center text-white text-xs font-semibold uppercase border border-teal-400/30">
                                                    {getInitials(user.email)}
                                                </div>
                                                <p className={`text-xs font-general ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                                                    {user.email}
                                                </p>
                                            </div>
                                            <button
                                                onClick={handleLogout}
                                                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-red-500/30 text-red-400 font-semibold hover:bg-red-500/10 transition-colors"
                                            >
                                                <LogOut size={18} />
                                                Logout
                                            </button>
                                        </>
                                    ) : (
                                        /* Mobile: Logged Out */
                                        <Link
                                            to="/login"
                                            onClick={() => setMobileMenuOpen(false)}
                                            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border font-semibold
                                                ${isDark ? 'border-white/10 text-white hover:bg-white/5' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}
                                            `}
                                        >
                                            <User size={18} />
                                            Sign In
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.nav>
        </>
    );
};

export default Navbar;