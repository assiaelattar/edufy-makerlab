/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans: ['Outfit', 'Inter', 'sans-serif'],
            },
            colors: {
                brand: {
                    50: '#F0F7FF',
                    100: '#E0EFFF',
                    200: '#B8DBFF',
                    300: '#85C2FF',
                    400: '#4DA3FF',
                    500: '#1A84FF',   // Primary Vibrant Blue
                    600: '#0066E6',
                    700: '#0052B8',
                    800: '#004192',
                    900: '#003371',
                    950: '#00204A',
                },
                accent: {
                    500: '#6366f1', // Indigo accent
                    600: '#4f46e5',
                },
                surface: {
                    50: '#F8FAFC',
                    100: '#F1F5F9',
                    200: '#E2E8F0',
                    300: '#CBD5E1',
                    900: '#0F172A',
                }
            },
            boxShadow: {
                'glass': '0 4px 30px rgba(0, 0, 0, 0.1)',
                'premium': '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            },
            backgroundImage: {
                'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
                'subtle-grid': "url(\"data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%239C92AC' fill-opacity='0.1' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E\")",
            }
        },
    },
    plugins: [],
}
