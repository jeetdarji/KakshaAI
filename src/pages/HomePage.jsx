import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart, BookOpen, Target, Rocket } from 'lucide-react';
import MagicBento from '../components/ui/MagicBento';
import TextType from '../components/ui/TextType';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';

// Typewriter Script (Defined outside to ensure stable reference)
const typeScript = [
    [
        { text: "Get ready to ", className: "text-gray-300" },
        { text: "accelerate your rank", className: "text-brand font-semibold" },
        { text: " with AI-driven mock tests.", className: "text-gray-300" },
    ],
    [
        { text: "Prepare to ", className: "text-gray-300" },
        { text: "smash every goal", className: "text-brand font-semibold" },
        { text: " with precision analytics.", className: "text-gray-300" },
    ]
];

const HomePage = () => {
    const containerRef = useRef(null);
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const { isDark } = useTheme();

    // Check auth state on mount
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user || null);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user || null);
        });

        return () => subscription.unsubscribe();
    }, []);

    // Handle CTA click based on auth state
    const handleCTAClick = () => {
        if (user) {
            navigate('/study-hub');
        } else {
            navigate('/login');
        }
    };

    // Features Data for Magic Bento (Strictly Green/Teal)
    const featuresData = [
        {
            title: "Adaptive Mock Tests",
            description: "AI analyzes weak areas and customizes papers.",
            label: "PRACTICE",
            icon: <Rocket size={20} />,
            color: "rgba(20, 184, 166, 0.2)" // Teal
        },
        {
            title: "Deep Analytics",
            description: "Track accuracy and speed with granular reports.",
            label: "INSIGHTS",
            icon: <BarChart size={20} />,
            color: "rgba(16, 185, 129, 0.2)" // Emerald
        },
        {
            title: "Study Hub",
            description: "Premium notes and formula sheets.",
            label: "RESOURCES",
            icon: <BookOpen size={20} />,
            color: "rgba(20, 184, 166, 0.2)"
        },
        {
            title: "Goal Tracking",
            description: "Gamified learning streak maintenance.",
            label: "TARGETS",
            icon: <Target size={20} />,
            color: "rgba(16, 185, 129, 0.2)"
        }
    ];

    return (
        <div
            ref={containerRef}
            className={`relative overflow-hidden min-h-screen selection:bg-brand selection:text-black transition-colors duration-300 ${isDark ? 'bg-dark-bg text-white' : 'bg-white text-gray-900'}`}
        >
            {/* HERO SECTION */}
            <section className="relative min-h-screen w-full flex flex-col pt-20 overflow-visible">

                {/* --- FIX 1: THE ASYMMETRIC AURORA GRADIENT --- */}
                {/* Note: top-[-35%] ensures it covers the Navbar area completely */}

                {/* Layer 1: The Main Wash (Left Tilt) */}
                <div className="absolute top-[-55%] left-[-10%] w-[70vw] h-[85vh] bg-gradient-to-br from-brand/40 to-transparent blur-[120px] -rotate-12 pointer-events-none z-0" />

                {/* Layer 2: The Secondary Glow (Right Tilt) */}
                <div className="absolute top-[-40%] right-[-5%] w-[80vw] h-[80vh] bg-gradient-to-bl from-brand/30 to-transparent blur-[140px] rotate-6 pointer-events-none z-0" />

                {/* --- FIX 2: THE ANCHORED LAYOUT --- */}
                <div className="container mx-auto px-6 relative z-10">

                    {/* Centered Relative Parent for Text */}
                    <div className="relative max-w-4xl mx-auto text-center mt-8">

                        {/* MAIN HEADLINE */}
                        <motion.h1
                            className={`text-5xl md:text-7xl font-heading leading-tight relative z-20 mt-24 ${isDark ? 'text-white' : 'text-gray-900'}`}
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                        >
                            We help you <span className="text-brand italic font-heading">crack</span> <br />
                            what you are <span className="font-heading">really</span> <br />
                            <span className="font-heading italic">really</span> <span className="text-brand font-heading">aiming</span> for.
                        </motion.h1>

                        {/* SUBTEXT "SATELLITE" */}
                        {/* Positioned Absolute: Pushed to bottom-right of the H1, but kept CLOSE */}
                        <motion.div
                            className="hidden md:block absolute -right-16 -bottom-12 w-[240px] text-left z-20"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <div className="text-sm opacity-90 leading-relaxed pl-4 min-h-[48px] flex items-start">
                                <TextType
                                    scripts={typeScript}
                                    typingSpeed={50}
                                    deletingSpeed={30}
                                    pauseDuration={2000}
                                    cursorClassName="bg-brand"
                                />
                            </div>
                        </motion.div>
                    </div>

                    {/* BUTTON (Centered Below) */}
                    <div className="flex justify-center mt-20 relative z-20">
                        <motion.button
                            onClick={handleCTAClick}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                            className="bg-brand text-black font-medium px-8 py-3 rounded-xl hover:scale-105 transition-transform shadow-[0_0_15px_rgba(20,184,166,0.3)] cursor-pointer"
                        >
                            {user ? 'Go to Study Hub' : 'Start Learning Free'}
                        </motion.button>
                    </div>
                </div>

                {/* STATS ROW (Replaced with Inspirational Text) */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="absolute bottom-12 left-0 right-0 container mx-auto px-6 z-10"
                >
                    <div className="flex flex-wrap justify-between items-center pt-6 max-w-4xl mx-auto">
                        <div className="text-center w-auto">
                            <h3 className={`text-3xl md:text-4xl font-heading font-normal ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                <span className="text-brand">D</span>ream.
                            </h3>
                        </div>
                        <div className="text-center w-auto">
                            <h3 className={`text-3xl md:text-4xl font-heading font-normal ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                <span className="text-brand">P</span>lan.
                            </h3>
                        </div>
                        <div className="text-center w-auto">
                            <h3 className={`text-3xl md:text-4xl font-heading font-normal ${isDark ? 'text-white' : 'text-gray-900'}`}>
                                <span className="text-brand">A</span>chieve.
                            </h3>
                        </div>
                    </div>
                </motion.div>

            </section>

            {/* SECONDARY GLOW (Keep existing) */}
            <div className="absolute top-[80vh] right-[-7%] w-[40vw] h-[60vh] bg-gradient-to-l from-brand/10 to-transparent blur-[80px] rounded-full pointer-events-none z-0" />

            {/* MAGIC BENTO SECTION (Keep existing) */}
            <section className="py-24 px-6 relative z-10 bg-transparent">
                <div className="container mx-auto">
                    <div className="mb-20 text-center space-y-3">
                        <h2 className={`text-4xl font-heading font-normal ${isDark ? 'text-white' : 'text-gray-900'}`}>Why Choose <span className="text-brand">KakshaAI?</span></h2>
                        <p className={`text-base max-w-lg mx-auto ${isDark ? 'text-white/40' : 'text-gray-500'}`}>Everything you need to secure a top rank, engineered for performance.</p>
                    </div>

                    <div className="max-w-5xl mx-auto">
                        <MagicBento
                            cardData={featuresData}
                            spotlightRadius={300}
                            glowColor="20, 184, 166" // Teal RGB
                            enableBorderGlow={true}
                        />
                    </div>
                </div>
            </section>
        </div>
    );
};

export default HomePage;
