import React from 'react';
import { motion } from 'framer-motion';
import { FileText } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const TermsOfService = () => {
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
                        <FileText size={14} />
                        Legal
                    </div>

                    <h1 className={`text-4xl md:text-5xl font-heading font-bold leading-tight mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Terms of Service
                    </h1>
                    <p className={`text-sm font-general mb-12 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
                        Last updated: February 28, 2026
                    </p>

                    <div className={`rounded-2xl p-8 md:p-10 border ${isDark ? 'bg-white/[0.02] border-white/[0.06]' : 'bg-gray-50 border-gray-200'}`}>

                        <p className={sectionClass}>
                            Welcome to KakshaAI. These Terms of Service ("Terms") govern your access to and use of the KakshaAI platform, including our website, applications, and services (collectively, the "Service"). By accessing or using the Service, you agree to be bound by these Terms.
                        </p>

                        <h2 className={headingClass}>1. Acceptance of Terms</h2>
                        <p className={sectionClass}>
                            By creating an account or using the Service, you agree to these Terms and our Privacy Policy. If you do not agree, you may not access or use the Service. You must be at least 15 years old to use the Service.
                        </p>

                        <h2 className={headingClass}>2. Account Registration</h2>
                        <p className={sectionClass}>
                            To access certain features, you must create an account. You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
                        </p>

                        <h2 className={headingClass}>3. Use of the Service</h2>
                        <p className={sectionClass}>You agree to use the Service only for lawful purposes and in accordance with these Terms. You shall not:</p>
                        <ul className={`${sectionClass} list-disc pl-5 space-y-2 mt-3`}>
                            <li>Use the Service for any unauthorized or illegal purpose</li>
                            <li>Share your account credentials with others or allow others to access your account</li>
                            <li>Attempt to reverse-engineer, decompile, or disassemble any part of the Service</li>
                            <li>Upload, transmit, or distribute any malicious code or content</li>
                            <li>Scrape, crawl, or use automated means to access the Service without our permission</li>
                            <li>Reproduce, distribute, or sell any content from the Service without authorization</li>
                            <li>Interfere with or disrupt the integrity or performance of the Service</li>
                        </ul>

                        <h2 className={headingClass}>4. Intellectual Property</h2>
                        <p className={sectionClass}>
                            All content on the Service — including but not limited to text, questions, solutions, graphics, logos, UI design, software, and AI-generated analytics — is the intellectual property of KakshaAI or its licensors. You may not reproduce, modify, distribute, or create derivative works from any content without our express written consent.
                        </p>

                        <h2 className={headingClass}>5. Mock Tests & Academic Content</h2>
                        <p className={sectionClass}>
                            The questions, solutions, and study materials provided on KakshaAI are for educational purposes only. While we strive for accuracy, we do not guarantee that all content is error-free. Mock test scores and analytics are estimates and should not be considered as official exam predictions.
                        </p>

                        <h2 className={headingClass}>6. Termination</h2>
                        <p className={sectionClass}>
                            We reserve the right to suspend or terminate your account at any time, with or without notice, for conduct that we determine violates these Terms, is harmful to other users, or is otherwise objectionable. Upon termination, your right to use the Service will cease immediately.
                        </p>

                        <h2 className={headingClass}>7. Disclaimer of Warranties</h2>
                        <p className={sectionClass}>
                            The Service is provided on an "AS IS" and "AS AVAILABLE" basis without warranties of any kind, whether express or implied. We do not warrant that the Service will be uninterrupted, error-free, or free of viruses or other harmful components.
                        </p>

                        <h2 className={headingClass}>8. Limitation of Liability</h2>
                        <p className={sectionClass}>
                            To the maximum extent permitted by law, KakshaAI shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or related to your use of the Service, including but not limited to loss of data, academic outcomes, or admission results.
                        </p>

                        <h2 className={headingClass}>9. Governing Law</h2>
                        <p className={sectionClass}>
                            These Terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts in Maharashtra, India.
                        </p>

                        <h2 className={headingClass}>10. Changes to Terms</h2>
                        <p className={sectionClass}>
                            We reserve the right to modify these Terms at any time. We will notify users of material changes by posting a notice on the Service. Your continued use of the Service after such modifications constitutes your acceptance of the updated Terms.
                        </p>

                        <h2 className={headingClass}>11. Contact</h2>
                        <p className={sectionClass}>
                            For questions about these Terms, contact us at{' '}
                            <a href="mailto:support@kakshaai.com" className="text-brand hover:text-brand-light transition-colors">support@kakshaai.com</a>.
                        </p>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default TermsOfService;
