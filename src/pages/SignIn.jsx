import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, User, ArrowRight, Github, Eye, EyeOff, Sparkles, BookOpen, Brain, CheckCircle2, AlertCircle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';
import { validatePassword } from '../lib/passwordSecurity';

const FloatingOrb = ({ delay, size, x, y, color }) => (
    <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{ width: size, height: size, left: x, top: y }}
        animate={{
            y: [0, -30, 0],
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.1, 1],
        }}
        transition={{ duration: 6, delay, repeat: Infinity, ease: 'easeInOut' }}
    >
        <div className={`w-full h-full rounded-full ${color} blur-[60px]`} />
    </motion.div>
);

const FeatureItem = ({ icon: Icon, text, delay }) => (
    <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay, duration: 0.5 }}
        className="flex items-center gap-3"
    >
        <div className="w-10 h-10 rounded-xl bg-brand/10 border border-brand/20 flex items-center justify-center flex-shrink-0">
            <Icon size={18} className="text-brand" />
        </div>
        <span className="text-white/70 text-sm font-general">{text}</span>
    </motion.div>
);

const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
);

const SignIn = () => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [loading, setLoading] = useState(false);
    const [oauthLoading, setOauthLoading] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const navigate = useNavigate();
    const location = useLocation();
    const { isDark } = useTheme();

    // Get redirect path from query params (sanitize to prevent open redirect)
    const rawRedirect = new URLSearchParams(location.search).get('redirect') || '/dashboard';
    const redirectTo = (rawRedirect.startsWith('/') && !rawRedirect.startsWith('//')) ? rawRedirect : '/dashboard';

    // Check for existing session on mount (handles OAuth callback)
    useEffect(() => {
        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
                // User is already logged in, redirect to dashboard
                navigate(redirectTo, { replace: true });
            }
        };
        checkSession();
    }, [navigate, redirectTo]);

    // Listen for auth state changes (handles OAuth callback)
    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            // Handle OAuth sign-ins (email/password navigates manually)
            if (event === 'SIGNED_IN' && session?.user) {
                const provider = session.user.app_metadata?.provider;
                // Redirect for OAuth providers (google, github, etc.)
                if (provider !== 'email') {
                    navigate(redirectTo, { replace: true });
                }
            }
        });
        return () => subscription.unsubscribe();
    }, [navigate, redirectTo]);

    const handleAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSuccess('');

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email: email.trim(),
                    password,
                });
                if (error) throw error;
                navigate(redirectTo, { replace: true });
            } else {
                const passwordCheck = await validatePassword(password);
                if (!passwordCheck.safe) {
                    setError(passwordCheck.errors.join(' '));
                    setLoading(false);
                    return;
                }

                const { error } = await supabase.auth.signUp({
                    email: email.trim(),
                    password,
                    options: {
                        data: { full_name: fullName.trim() },
                        emailRedirectTo: `${window.location.origin}/login?redirect=${encodeURIComponent(redirectTo)}`,
                    },
                });
                if (error) throw error;
                setSuccess('Account created! Check your email to verify.');
                setIsLogin(true);
            }
        } catch (err) {
            setError(err.message || 'Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    const handleOAuth = async (provider) => {
        setOauthLoading(provider);
        setError('');
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: `${window.location.origin}/login?redirect=${encodeURIComponent(redirectTo)}`,
                },
            });
            if (error) throw error;
        } catch (err) {
            setError(err.message || `Failed to sign in with ${provider}`);
            setOauthLoading(null);
        }
    };

    const inputClasses = `w-full border rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand/50 transition-all duration-200 font-general disabled:opacity-50 disabled:cursor-not-allowed ${
        isDark
            ? 'bg-white/[0.04] border-white/[0.08] text-white placeholder:text-white/25 hover:border-white/15'
            : 'bg-gray-50/80 border-gray-200 text-gray-900 placeholder:text-gray-400 hover:border-gray-300'
    }`;

    const labelClasses = `text-xs font-medium ml-0.5 font-general tracking-wide uppercase ${
        isDark ? 'text-white/40' : 'text-gray-500'
    }`;

    return (
        <div className={`min-h-screen flex transition-colors duration-300 ${isDark ? 'bg-[#060608]' : 'bg-gray-50'}`}>
            
            {/* Left Panel - Branding (hidden on mobile) */}
            <div className="hidden lg:flex lg:w-[45%] relative overflow-hidden bg-gradient-to-br from-[#060608] via-[#0a0f0d] to-[#060608]">
                {/* Animated Orbs */}
                <FloatingOrb delay={0} size="300px" x="10%" y="20%" color="bg-brand/20" />
                <FloatingOrb delay={2} size="200px" x="60%" y="60%" color="bg-emerald-500/15" />
                <FloatingOrb delay={4} size="150px" x="30%" y="75%" color="bg-teal-400/10" />

                {/* Grid Pattern */}
                <div className="absolute inset-0 opacity-[0.03]" 
                    style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: '24px 24px' }} 
                />

                {/* Content */}
                <div className="relative z-10 flex flex-col justify-center px-12 xl:px-16">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                    >
                        {/* Logo */}
                        <div className="flex items-center gap-3 mb-10">
                            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-brand to-emerald-500 flex items-center justify-center shadow-lg shadow-brand/25">
                                <span className="text-white text-xl font-bold font-heading">K</span>
                            </div>
                            <span className="text-2xl font-heading font-bold text-white tracking-tight">
                                Kaksha<span className="text-brand">AI</span>
                            </span>
                        </div>

                        <h2 className="text-4xl xl:text-5xl font-heading font-bold text-white leading-tight mb-4">
                            Your path to
                            <br />
                            <span className="bg-gradient-to-r from-brand via-emerald-400 to-teal-300 bg-clip-text text-transparent">
                                MHT-CET success
                            </span>
                        </h2>

                        <p className="text-white/40 text-base font-general max-w-md mb-10 leading-relaxed">
                            AI-powered preparation platform designed for MHT-CET aspirants across Maharashtra.
                        </p>

                        <div className="space-y-4">
                            <FeatureItem icon={Brain} text="AI-driven personalized analytics & insights" delay={0.3} />
                            <FeatureItem icon={BookOpen} text="Curated questions with detailed solutions" delay={0.5} />
                            <FeatureItem icon={Sparkles} text="Smart study plans adapted to your pace" delay={0.7} />
                        </div>
                    </motion.div>

                    {/* Trust badge */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 1, duration: 0.6 }}
                        className="mt-14 flex items-center gap-3"
                    >
                    </motion.div>
                </div>

                {/* Bottom gradient fade */}
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#060608] to-transparent" />
            </div>

            {/* Right Panel - Auth Form */}
            <div className={`flex-1 flex items-center justify-center px-6 md:px-12 py-12 relative ${isDark ? '' : 'bg-white'}`}>
                
                {/* Subtle background accent */}
                <div className={`absolute top-0 right-0 w-[400px] h-[400px] rounded-full blur-[120px] pointer-events-none ${isDark ? 'bg-brand/[0.06]' : 'bg-brand/[0.04]'}`} />

                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                    className="w-full max-w-[420px] relative z-10"
                >
                    {/* Mobile Logo */}
                    <div className="flex lg:hidden items-center gap-2.5 mb-8 justify-center">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand to-emerald-500 flex items-center justify-center">
                            <span className="text-white text-lg font-bold font-heading">K</span>
                        </div>
                        <span className={`text-xl font-heading font-bold tracking-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            Kaksha<span className="text-brand">AI</span>
                        </span>
                    </div>

                    {/* Header */}
                    <div className="mb-8">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={isLogin ? 'login' : 'signup'}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.25 }}
                            >
                                <h1 className={`text-2xl md:text-3xl font-heading font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                    {isLogin ? 'Welcome back' : 'Create account'}
                                </h1>
                                <p className={`text-sm font-general ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                                    {isLogin ? 'Sign in to continue your preparation' : 'Start your journey to academic excellence'}
                                </p>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Error / Success Messages */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -8, height: 0 }}
                                animate={{ opacity: 1, y: 0, height: 'auto' }}
                                exit={{ opacity: 0, y: -8, height: 0 }}
                                className="mb-4"
                            >
                                <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
                                    <AlertCircle size={16} className="text-red-400 flex-shrink-0" />
                                    <p className="text-sm text-red-400 font-general">{error}</p>
                                </div>
                            </motion.div>
                        )}
                        {success && (
                            <motion.div
                                initial={{ opacity: 0, y: -8, height: 0 }}
                                animate={{ opacity: 1, y: 0, height: 'auto' }}
                                exit={{ opacity: 0, y: -8, height: 0 }}
                                className="mb-4"
                            >
                                <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                    <CheckCircle2 size={16} className="text-emerald-400 flex-shrink-0" />
                                    <p className="text-sm text-emerald-400 font-general">{success}</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* OAuth Buttons */}
                    <div className="grid grid-cols-2 gap-3 mb-6">
                        <motion.button
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={() => handleOAuth('google')}
                            disabled={loading || oauthLoading}
                            className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl border text-sm font-medium font-general transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                                isDark
                                    ? 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08] hover:border-white/15 text-white'
                                    : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-700 shadow-sm'
                            }`}
                        >
                            {oauthLoading === 'google' ? (
                                <div className="w-4 h-4 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
                            ) : (
                                <GoogleIcon />
                            )}
                            Google
                        </motion.button>

                        <motion.button
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={() => handleOAuth('github')}
                            disabled={loading || oauthLoading}
                            className={`flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl border text-sm font-medium font-general transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                                isDark
                                    ? 'bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08] hover:border-white/15 text-white'
                                    : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-700 shadow-sm'
                            }`}
                        >
                            {oauthLoading === 'github' ? (
                                <div className="w-4 h-4 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
                            ) : (
                                <Github size={18} />
                            )}
                            GitHub
                        </motion.button>
                    </div>

                    {/* Divider */}
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className={`w-full border-t ${isDark ? 'border-white/[0.06]' : 'border-gray-200'}`} />
                        </div>
                        <div className="relative flex justify-center">
                            <span className={`px-3 text-[11px] font-general uppercase tracking-[0.15em] ${
                                isDark ? 'bg-[#060608] text-white/25' : 'bg-white text-gray-400'
                            }`}>
                                or continue with email
                            </span>
                        </div>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleAuth} className="space-y-4">
                        <AnimatePresence mode="popLayout">
                            {!isLogin && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    transition={{ duration: 0.2 }}
                                    className="space-y-1.5"
                                >
                                    <label className={labelClasses}>Full Name</label>
                                    <div className="relative group">
                                        <User className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 ${isDark ? 'text-white/20 group-focus-within:text-brand' : 'text-gray-400 group-focus-within:text-brand'}`} size={16} />
                                        <input
                                            type="text"
                                            value={fullName}
                                            onChange={(e) => setFullName(e.target.value)}
                                            placeholder="Enter your full name"
                                            required={!isLogin}
                                            disabled={loading}
                                            className={inputClasses}
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="space-y-1.5">
                            <label className={labelClasses}>Email</label>
                            <div className="relative group">
                                <Mail className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 ${isDark ? 'text-white/20 group-focus-within:text-brand' : 'text-gray-400 group-focus-within:text-brand'}`} size={16} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    required
                                    disabled={loading}
                                    className={inputClasses}
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className={labelClasses}>Password</label>
                                {isLogin && (
                                    <button
                                        type="button"
                                        onClick={() => {/* TODO: implement forgot password */}}
                                        className="text-[11px] text-brand hover:text-brand-light transition-colors font-general font-medium"
                                    >
                                        Forgot password?
                                    </button>
                                )}
                            </div>
                            <div className="relative group">
                                <Lock className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 ${isDark ? 'text-white/20 group-focus-within:text-brand' : 'text-gray-400 group-focus-within:text-brand'}`} size={16} />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    required
                                    disabled={loading}
                                    className={`${inputClasses} !pr-11`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    disabled={loading}
                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    className={`absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors duration-200 disabled:opacity-50 ${isDark ? 'text-white/20 hover:text-white/40' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <motion.button
                            type="submit"
                            disabled={loading}
                            whileHover={{ scale: loading ? 1 : 1.005 }}
                            whileTap={{ scale: loading ? 1 : 0.995 }}
                            className="w-full bg-gradient-to-r from-brand to-emerald-500 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 font-general shadow-lg shadow-brand/20 hover:shadow-brand/30 transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed mt-2 text-sm"
                        >
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Processing...
                                </div>
                            ) : (
                                <>
                                    {isLogin ? 'Sign In' : 'Create Account'}
                                    <ArrowRight size={16} />
                                </>
                            )}
                        </motion.button>
                    </form>

                    {/* Toggle */}
                    <div className="mt-8 text-center">
                        <p className={`text-sm font-general ${isDark ? 'text-white/35' : 'text-gray-500'}`}>
                            {isLogin ? "Don't have an account? " : "Already have an account? "}
                            <button
                                type="button"
                                onClick={() => {
                                    setIsLogin(!isLogin);
                                    setError('');
                                    setSuccess('');
                                    setPassword('');
                                }}
                                disabled={loading}
                                className="text-brand hover:text-brand-light font-semibold transition-colors disabled:opacity-50"
                            >
                                {isLogin ? 'Sign Up' : 'Sign In'}
                            </button>
                        </p>
                    </div>

                    {/* Terms */}
                    <p className={`text-center text-[11px] mt-6 font-general leading-relaxed ${isDark ? 'text-white/20' : 'text-gray-400'}`}>
                        By continuing, you agree to our{' '}
                        <a href="/terms" className="text-brand/60 hover:text-brand transition-colors">Terms of Service</a>
                        {' '}and{' '}
                        <a href="/privacy" className="text-brand/60 hover:text-brand transition-colors">Privacy Policy</a>
                    </p>
                </motion.div>
            </div>
        </div>
    );
};

export default SignIn;