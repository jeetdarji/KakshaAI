/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Satoshi', 'sans-serif'],
                heading: ['Clash Display', 'sans-serif'],
                general: ['General Sans', 'sans-serif'],
            },
            colors: {
                brand: {
                    light: '#5eead4', // Teal 300
                    DEFAULT: '#14b8a6', // Teal 500 (Primary Brand - Strict No Blue)
                    dark: '#0f766e', // Teal 700
                },
                accent: {
                    light: '#34d399', // Emerald 400
                    DEFAULT: '#10b981', // Emerald 500
                    dark: '#059669', // Emerald 600
                },
                dark: {
                    bg: '#0a0a0a', // Jet Black
                    card: '#121212',
                    border: '#262626',
                },
            },
            animation: {
                'slow-spin': 'spin 10s linear infinite',
                'float': 'float 6s ease-in-out infinite',
                'pulse-glow': 'pulse-glow 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            },
            keyframes: {
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-20px)' },
                },
                'pulse-glow': {
                    '0%, 100%': { opacity: '1' },
                    '50%': { opacity: '.5' },
                },
            },
        },
    },
    plugins: [],
}