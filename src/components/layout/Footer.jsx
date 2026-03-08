import React from 'react';
import { Link } from 'react-router-dom';
import { Twitter, Instagram, Linkedin, Github, Mail, Heart } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const Footer = () => {
    const { isDark } = useTheme();

    return (
        <footer className={`pt-20 pb-10 border-t transition-colors duration-300 ${isDark ? 'bg-[#060608] border-white/[0.05]' : 'bg-gray-50 border-gray-200'}`}>
            <div className="container mx-auto px-6 max-w-6xl">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                    {/* Brand */}
                    <div className="space-y-5 md:col-span-1">
                        <Link to="/" className="text-2xl font-heading font-bold tracking-tight flex items-center gap-2.5">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand to-emerald-500 flex items-center justify-center shadow-lg shadow-brand/20">
                                <span className="text-white text-lg font-bold">K</span>
                            </div>
                            <span className={isDark ? 'text-white' : 'text-gray-900'}>Kaksha<span className="text-brand">AI</span></span>
                        </Link>
                        <p className={`text-sm leading-relaxed max-w-xs font-general ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                            AI-powered MHT-CET preparation platform with smart analytics, curated study resources, and mock tests.
                        </p>
                        <div className="flex items-center gap-3">
                            {[
                                { icon: Twitter, href: '#' },
                                { icon: Instagram, href: '#' },
                                { icon: Linkedin, href: '#' },
                                { icon: Github, href: '#' },
                            ].map(({ icon: Icon, href }, i) => (
                                <a
                                    key={i}
                                    href={href}
                                    className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 ${
                                        isDark
                                            ? 'bg-white/[0.04] hover:bg-white/[0.08] text-white/40 hover:text-brand border border-white/[0.06]'
                                            : 'bg-gray-100 hover:bg-gray-200 text-gray-400 hover:text-brand'
                                    }`}
                                >
                                    <Icon size={16} />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Product */}
                    <div>
                        <h4 className={`font-heading font-bold text-sm mb-5 uppercase tracking-wider ${isDark ? 'text-white/60' : 'text-gray-900'}`}>Product</h4>
                        <ul className={`space-y-3.5 text-sm font-general ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                            <li><Link to="/study-hub" className="hover:text-brand transition-colors duration-200">Study Hub</Link></li>
                            <li><Link to="/mock-tests" className="hover:text-brand transition-colors duration-200">Mock Tests</Link></li>
                            <li><Link to="/papers" className="hover:text-brand transition-colors duration-200">Past Papers</Link></li>
                            <li><Link to="/cutoffs" className="hover:text-brand transition-colors duration-200">Cutoff Tracker</Link></li>
                        </ul>
                    </div>

                    {/* Company */}
                    <div>
                        <h4 className={`font-heading font-bold text-sm mb-5 uppercase tracking-wider ${isDark ? 'text-white/60' : 'text-gray-900'}`}>Company</h4>
                        <ul className={`space-y-3.5 text-sm font-general ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                            <li><Link to="/about" className="hover:text-brand transition-colors duration-200">About Us</Link></li>
                            <li><Link to="/blog" className="hover:text-brand transition-colors duration-200">Blog</Link></li>
                            <li><a href="mailto:support@kakshaai.com" className="hover:text-brand transition-colors duration-200">Contact</a></li>
                        </ul>
                    </div>

                    {/* Legal */}
                    <div>
                        <h4 className={`font-heading font-bold text-sm mb-5 uppercase tracking-wider ${isDark ? 'text-white/60' : 'text-gray-900'}`}>Legal</h4>
                        <ul className={`space-y-3.5 text-sm font-general ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                            <li><Link to="/privacy" className="hover:text-brand transition-colors duration-200">Privacy Policy</Link></li>
                            <li><Link to="/terms" className="hover:text-brand transition-colors duration-200">Terms of Service</Link></li>
                            <li><Link to="/cookies" className="hover:text-brand transition-colors duration-200">Cookie Policy</Link></li>
                        </ul>
                    </div>
                </div>

                <div className={`pt-8 border-t flex flex-col md:flex-row items-center justify-between gap-4 ${isDark ? 'border-white/[0.05]' : 'border-gray-200'}`}>
                    <p className={`text-sm font-general ${isDark ? 'text-white/25' : 'text-gray-400'}`}>
                        &copy; {new Date().getFullYear()} KakshaAI. All rights reserved.
                    </p>
                    <p className={`text-xs font-general flex items-center gap-1 ${isDark ? 'text-white/20' : 'text-gray-400'}`}>
                        Built with <Heart size={12} className="text-brand" /> for MHT-CET aspirants
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
