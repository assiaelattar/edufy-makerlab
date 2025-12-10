// Studio Theme for Instructor Learning Management
// Creates a distinct visual layer between ERP and LMS

export const STUDIO_THEME = {
    // Background gradients
    background: {
        main: 'bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50',
        card: 'bg-white/80 backdrop-blur-sm',
        cardHover: 'hover:bg-white/90',
        dark: 'bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-900',
    },

    // Borders
    border: {
        light: 'border-indigo-100',
        medium: 'border-indigo-200',
        accent: 'border-indigo-400',
    },

    // Colors
    colors: {
        primary: 'bg-indigo-600',
        primaryHover: 'hover:bg-indigo-700',
        secondary: 'bg-blue-500',
        secondaryHover: 'hover:bg-blue-600',
        success: 'bg-emerald-500',
        warning: 'bg-amber-500',
        danger: 'bg-rose-500',
    },

    // Text colors
    text: {
        primary: 'text-slate-900',
        secondary: 'text-slate-600',
        tertiary: 'text-slate-400',
        accent: 'text-indigo-600',
        accentHover: 'hover:text-indigo-700',
        white: 'text-white',
    },

    // Shadows
    shadow: {
        card: 'shadow-lg shadow-indigo-100/50',
        cardHover: 'hover:shadow-xl hover:shadow-indigo-200/50',
        button: 'shadow-md shadow-indigo-900/20',
        soft: 'shadow-sm shadow-slate-200/50',
    },

    // Rounded corners
    rounded: {
        sm: 'rounded-lg',
        md: 'rounded-xl',
        lg: 'rounded-2xl',
        xl: 'rounded-3xl',
        full: 'rounded-full',
    },

    // Status badges
    status: {
        pending: 'bg-amber-100 text-amber-700 border-amber-200',
        approved: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        rejected: 'bg-rose-100 text-rose-700 border-rose-200',
        active: 'bg-blue-100 text-blue-700 border-blue-200',
        completed: 'bg-slate-100 text-slate-700 border-slate-200',
    },

    // Transitions
    transition: {
        default: 'transition-all duration-200',
        slow: 'transition-all duration-300',
        fast: 'transition-all duration-150',
    },

    // Glassmorphism effect
    glass: {
        light: 'bg-white/60 backdrop-blur-md',
        medium: 'bg-white/40 backdrop-blur-lg',
        dark: 'bg-slate-900/60 backdrop-blur-md',
    },
};

// Helper function to combine theme classes
export const studioClass = (...classes: string[]) => classes.filter(Boolean).join(' ');
