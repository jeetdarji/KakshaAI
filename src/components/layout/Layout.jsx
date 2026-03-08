import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import { Outlet, useLocation } from 'react-router-dom';
import Chatbot from '../ui/Chatbot';
import { useTheme } from '../../contexts/ThemeContext';

// Pages that should show the footer
const FOOTER_PAGES = ['/', '/about', '/blog', '/privacy', '/terms', '/cookies'];

const Layout = () => {
    const location = useLocation();
    const isAuthPage = location.pathname === '/login' || location.pathname === '/signup' || location.pathname === '/signin';
    const isAIPage = location.pathname === '/ai-assistant';
    const showFooter = FOOTER_PAGES.includes(location.pathname);
    const { isDark } = useTheme();

    // AI Assistant page: no navbar, no footer, no chatbot widget — full-screen chat
    if (isAIPage) {
        return (
            <div className={`h-screen overflow-hidden transition-colors duration-300 ${isDark ? 'bg-dark-bg' : 'bg-white'}`}>
                <Outlet />
            </div>
        );
    }

    return (
        <div className={`flex flex-col min-h-screen relative transition-colors duration-300 ${isDark ? 'bg-dark-bg' : 'bg-white'}`}>
            {!isAuthPage && <Navbar />}
            {isAuthPage && <div className="absolute top-0 left-0 w-full z-50"><Navbar /></div>}

            {/* Removed pt-20 to fix Black Navbar clipping. Pages must handle their own top padding. */}
            <main className="flex-grow relative overflow-x-hidden">
                <Outlet />
            </main>

            {!isAuthPage && showFooter && <Footer />}
            {!isAuthPage && <Chatbot />}
        </div>
    );
};

export default Layout;
