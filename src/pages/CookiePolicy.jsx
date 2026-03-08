import React from 'react';
import { motion } from 'framer-motion';
import { Cookie } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const CookiePolicy = () => {
    const { isDark } = useTheme();

    const sectionClass = `text-sm font-general leading-relaxed ${isDark ? 'text-white/45' : 'text-gray-600'}`;
    const headingClass = `text-lg font-heading font-bold mt-10 mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`;

    return (
        <div className={`min-h-screen pt-28 pb-20 transition-colors duration-300 ${isDark ? 'bg-[#060608]' : 'bg-white'}`}>
            <div className="container mx-auto px-6 max-w-3xl">

                <motion.div
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-general font-medium mb-6 ${isDark ? 'bg-brand/10 text-brand border border-brand/20' : 'bg-brand/5 text-brand border border-brand/10'}`}>
                        <Cookie size={14} />
                        Legal
                    </div>

                    <h1 className={`text-4xl md:text-5xl font-heading font-bold leading-tight mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Cookie Policy
                    </h1>
                    <p className={`text-sm font-general mb-12 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                        Last updated: February 28, 2026
                    </p>

                    <div className={`rounded-2xl p-8 md:p-10 border ${isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-gray-50 border-gray-200'}`}>

                        <p className={sectionClass}>
                            This Cookie Policy explains how KakshaAI ("we", "our", or "us") uses cookies and similar technologies when you visit or use our platform. This policy should be read together with our Privacy Policy.
                        </p>

                        <h2 className={headingClass}>1. What Are Cookies?</h2>
                        <p className={sectionClass}>
                            Cookies are small text files that are placed on your device when you visit a website. They are widely used to make websites work more efficiently, provide a better browsing experience, and give site operators information about how users interact with their service.
                        </p>

                        <h2 className={headingClass}>2. Cookies We Use</h2>

                        <div className={`mt-4 rounded-xl overflow-hidden border ${isDark ? 'border-white/[0.06]' : 'border-gray-200'}`}>
                            <table className="w-full text-sm font-general">
                                <thead>
                                    <tr className={isDark ? 'bg-white/[0.03]' : 'bg-gray-50'}>
                                        <th className={`text-left p-4 font-heading font-bold ${isDark ? 'text-white/70' : 'text-gray-800'}`}>Type</th>
                                        <th className={`text-left p-4 font-heading font-bold ${isDark ? 'text-white/70' : 'text-gray-800'}`}>Purpose</th>
                                        <th className={`text-left p-4 font-heading font-bold ${isDark ? 'text-white/70' : 'text-gray-800'}`}>Duration</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        { type: 'Essential', purpose: 'Authentication, session management, and security. These are required for the platform to function.', duration: 'Session / 7 days' },
                                        { type: 'Functional', purpose: 'Remember your preferences like theme (dark/light mode), language, and display settings.', duration: '1 year' },
                                        { type: 'Analytics', purpose: 'Track usage patterns, page views, and feature engagement to help us improve the platform.', duration: '90 days' },
                                        { type: 'Performance', purpose: 'Monitor platform performance, loading times, and error rates to ensure a smooth experience.', duration: '30 days' },
                                    ].map((cookie, i) => (
                                        <tr key={i} className={`border-t ${isDark ? 'border-white/[0.04]' : 'border-gray-100'}`}>
                                            <td className={`p-4 font-medium ${isDark ? 'text-white/60' : 'text-gray-700'}`}>{cookie.type}</td>
                                            <td className={`p-4 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>{cookie.purpose}</td>
                                            <td className={`p-4 ${isDark ? 'text-white/40' : 'text-gray-500'}`}>{cookie.duration}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <h2 className={headingClass}>3. Third-Party Cookies</h2>
                        <p className={sectionClass}>
                            Some cookies are placed by third-party services that appear on our pages. We use services from Supabase (authentication and database), and Google (OAuth sign-in). These third parties may set their own cookies according to their respective privacy policies.
                        </p>

                        <h2 className={headingClass}>4. Local Storage</h2>
                        <p className={sectionClass}>
                            In addition to cookies, we use browser local storage and session storage to store certain preferences and session data. This includes your theme preference (dark/light mode), splash screen status, and cached user session tokens. This data never leaves your browser.
                        </p>

                        <h2 className={headingClass}>5. Managing Cookies</h2>
                        <p className={sectionClass}>
                            Most web browsers allow you to control cookies through their settings. You can set your browser to refuse cookies, delete existing cookies, or alert you when a cookie is being set. However, please note that disabling essential cookies may prevent you from using certain features of the platform, including signing in.
                        </p>
                        <p className={`${sectionClass} mt-3`}>
                            For more information on managing cookies in your browser:
                        </p>
                        <ul className={`${sectionClass} list-disc pl-5 space-y-1.5 mt-2`}>
                            <li>Chrome: Settings &gt; Privacy and Security &gt; Cookies</li>
                            <li>Firefox: Settings &gt; Privacy &amp; Security &gt; Cookies</li>
                            <li>Safari: Preferences &gt; Privacy</li>
                            <li>Edge: Settings &gt; Cookies and Site Permissions</li>
                        </ul>

                        <h2 className={headingClass}>6. Updates to This Policy</h2>
                        <p className={sectionClass}>
                            We may update this Cookie Policy from time to time to reflect changes in technology, regulation, or our business practices. The "Last updated" date at the top of this page indicates when the policy was last revised.
                        </p>

                        <h2 className={headingClass}>7. Contact Us</h2>
                        <p className={sectionClass}>
                            If you have questions about our use of cookies, please contact us at{' '}
                            <a href="mailto:support@kakshaai.com" className="text-brand hover:text-brand-light transition-colors">support@kakshaai.com</a>.
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default CookiePolicy;
