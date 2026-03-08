import React from 'react';
import { motion } from 'framer-motion';
import { Shield } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const PrivacyPolicy = () => {
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
                        <Shield size={14} />
                        Legal
                    </div>

                    <h1 className={`text-4xl md:text-5xl font-heading font-bold leading-tight mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Privacy Policy
                    </h1>
                    <p className={`text-sm font-general mb-12 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                        Last updated: February 28, 2026
                    </p>

                    <div className={`rounded-2xl p-8 md:p-10 border ${isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-gray-50 border-gray-200'}`}>

                        <p className={sectionClass}>
                            KakshaAI ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform at kakshaai.com (the "Service").
                        </p>

                        <h2 className={headingClass}>1. Information We Collect</h2>
                        <p className={sectionClass}>
                            <strong className={isDark ? 'text-white/70' : 'text-gray-800'}>Personal Information:</strong> When you create an account, we collect your name, email address, and authentication credentials. If you sign in via Google or GitHub, we receive your public profile information from those providers.
                        </p>
                        <p className={`${sectionClass} mt-3`}>
                            <strong className={isDark ? 'text-white/70' : 'text-gray-800'}>Usage Data:</strong> We automatically collect information about how you interact with the Service, including pages visited, mock test scores, study time, feature usage, browser type, device information, and IP address.
                        </p>
                        <p className={`${sectionClass} mt-3`}>
                            <strong className={isDark ? 'text-white/70' : 'text-gray-800'}>Academic Data:</strong> We collect data about your test performance, study patterns, and learning progress to provide personalized analytics and recommendations.
                        </p>

                        <h2 className={headingClass}>2. How We Use Your Information</h2>
                        <ul className={`${sectionClass} list-disc pl-5 space-y-2`}>
                            <li>To provide, operate, and maintain the Service</li>
                            <li>To personalize your learning experience using AI-driven analytics</li>
                            <li>To track your preparation progress and generate performance insights</li>
                            <li>To communicate with you about updates, features, and support</li>
                            <li>To improve our platform, content, and algorithms</li>
                            <li>To detect, prevent, and address technical issues and security threats</li>
                        </ul>

                        <h2 className={headingClass}>3. Data Storage & Security</h2>
                        <p className={sectionClass}>
                            Your data is stored securely on Supabase infrastructure with encryption at rest and in transit. We implement industry-standard security measures including TLS encryption, secure authentication, and regular security audits. We do not store your passwords in plain text — all credentials are hashed using bcrypt.
                        </p>

                        <h2 className={headingClass}>4. Data Sharing</h2>
                        <p className={sectionClass}>
                            We do not sell, trade, or rent your personal information to third parties. We may share anonymized, aggregated data for research or analytical purposes. We may share data with service providers (like Supabase and hosting services) who help us operate the platform, subject to strict confidentiality agreements.
                        </p>

                        <h2 className={headingClass}>5. Third-Party Services</h2>
                        <p className={sectionClass}>
                            Our Service integrates with third-party providers including Google (OAuth), GitHub (OAuth), and Supabase (database & authentication). Each of these providers has their own privacy policy governing their data practices. We encourage you to review their policies.
                        </p>

                        <h2 className={headingClass}>6. Your Rights</h2>
                        <ul className={`${sectionClass} list-disc pl-5 space-y-2`}>
                            <li><strong className={isDark ? 'text-white/70' : 'text-gray-800'}>Access:</strong> You can request a copy of the personal data we hold about you.</li>
                            <li><strong className={isDark ? 'text-white/70' : 'text-gray-800'}>Correction:</strong> You can update your profile information at any time through your account settings.</li>
                            <li><strong className={isDark ? 'text-white/70' : 'text-gray-800'}>Deletion:</strong> You can request deletion of your account and associated data by contacting us at support@kakshaai.com.</li>
                            <li><strong className={isDark ? 'text-white/70' : 'text-gray-800'}>Portability:</strong> You can request your data in a machine-readable format.</li>
                        </ul>

                        <h2 className={headingClass}>7. Children's Privacy</h2>
                        <p className={sectionClass}>
                            Our Service is intended for students aged 15 and above. We do not knowingly collect information from children under 15. If we become aware that we have collected data from a child under 15, we will take steps to delete that information.
                        </p>

                        <h2 className={headingClass}>8. Changes to This Policy</h2>
                        <p className={sectionClass}>
                            We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date. Your continued use of the Service after changes constitutes acceptance of the updated policy.
                        </p>

                        <h2 className={headingClass}>9. Contact Us</h2>
                        <p className={sectionClass}>
                            If you have any questions about this Privacy Policy, please contact us at{' '}
                            <a href="mailto:support@kakshaai.com" className="text-brand hover:text-brand-light transition-colors">support@kakshaai.com</a>.
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
