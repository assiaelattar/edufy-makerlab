import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle2, Shield, Zap, Globe, Users, BarChart3, Rocket, Layout, Sparkles } from 'lucide-react';
import { Logo } from '../../components/Logo';

export const LandingView = () => {
    const handleLogin = () => {
        window.location.hash = '#login';
    };

    const handleGetStarted = () => {
        window.location.hash = '#signup';
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30">
            {/* Header */}
            <header className="fixed top-0 left-0 w-full z-50 bg-slate-950/80 backdrop-blur-md border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Logo className="w-8 h-8" />
                        <span className="text-xl font-bold text-white tracking-tight">Edufy SaaS</span>
                    </div>
                    <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-400">
                        <a href="#features" className="hover:text-white transition-colors">Features</a>
                        <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
                        <a href="#testimonials" className="hover:text-white transition-colors">Stories</a>
                    </nav>
                    <div className="flex items-center gap-4">
                        <button onClick={handleLogin} className="text-sm font-semibold text-white hover:text-blue-400 transition-colors">Sign In</button>
                        <button onClick={handleGetStarted} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-full transition-all hover:shadow-[0_0_20px_-5px_rgba(37,99,235,0.5)]">
                            Get Started
                        </button>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none">
                    <div className="absolute top-20 left-1/4 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[100px]" />
                    <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[100px]" />
                </div>

                <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold uppercase tracking-wider mb-8">
                            <Sparkles size={12} /> New Generation ERP
                        </div>
                        <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight mb-8 leading-tight">
                            Manage your Academy <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">Like a Pro.</span>
                        </h1>
                        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
                            The all-in-one platform for modern education centers. Streamline enrollments, track finances, and engage students with gamified learning.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <button onClick={handleGetStarted} className="px-8 py-4 bg-white text-slate-900 font-bold rounded-full hover:bg-slate-200 transition-colors flex items-center gap-2 text-lg">
                                Start Free Trial <ArrowRight size={20} />
                            </button>
                            <button onClick={handleLogin} className="px-8 py-4 bg-slate-800/50 text-white font-bold rounded-full hover:bg-slate-800 transition-colors border border-white/10 backdrop-blur-sm">
                                View Demo
                            </button>
                        </div>
                    </motion.div>

                    {/* Dashboard Preview */}
                    {/* Dashboard Preview */}
                    <motion.div
                        initial={{ opacity: 0, y: 60 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="mt-20 relative rounded-2xl border border-slate-800 bg-slate-900/50 shadow-2xl shadow-blue-900/20 max-w-5xl mx-auto overflow-hidden group"
                    >
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent z-10" />
                        <img
                            src="/images/hero-devices.png"
                            alt="Edufy Dashboard Devices"
                            className="w-full h-auto object-cover transform group-hover:scale-[1.02] transition-transform duration-700"
                        />
                    </motion.div>
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" className="py-24 bg-slate-950 relative border-t border-slate-900">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Everything you need to grow.</h2>
                        <p className="text-slate-400 max-w-2xl mx-auto">Focus on teaching, let us handle the administration.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <FeatureCard
                            icon={<Layout className="text-blue-400" />}
                            title="Smart ERP"
                            desc="Automate student registration, class management, and attendance tracking with ease."
                        />
                        <FeatureCard
                            icon={<BarChart3 className="text-emerald-400" />}
                            title="Financial Suite"
                            desc="Track payments, manage subscriptions, and generate revenue reports instantly."
                        />
                        <FeatureCard
                            icon={<Rocket className="text-purple-400" />}
                            title="Gamified Learning"
                            desc="Engage students with SparkQuest - quests, badges, and XP tracking built-in."
                        />
                        <FeatureCard
                            icon={<Globe className="text-cyan-400" />}
                            title="Multi-Site Ready"
                            desc="Manage multiple campuses or franchises from a single Super Admin dashboard."
                        />
                        <FeatureCard
                            icon={<Users className="text-amber-400" />}
                            title="Parent Portal"
                            desc="Give parents real-time access to their child's progress, payments, and schedule."
                        />
                        <FeatureCard
                            icon={<Shield className="text-rose-400" />}
                            title="Secure & Reliable"
                            desc="Enterprise-grade security with role-based access control and daily backups."
                        />
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-24 relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-full bg-blue-500/5 blur-3xl pointer-events-none" />

                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">Simple, transparent pricing.</h2>
                        <p className="text-slate-400 max-w-xl mx-auto">Choose the plan that fits your academy's stage.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        <PricingCard
                            title="Starter"
                            price="Free"
                            desc="For small clubs & hobbyists."
                            features={['Up to 50 Students', 'Basic ERP', 'Attendance Tracking', 'Email Support']}
                        />
                        <PricingCard
                            title="Growth"
                            price="490 MAD"
                            period="/mo"
                            desc="For growing academies."
                            isPopular
                            features={['Up to 200 Students', 'Full Financial Suite', 'Parent Portal Access', 'SparkQuest Gamification', 'Priority Support']}
                        />
                        <PricingCard
                            title="Scale"
                            price="990 MAD"
                            period="/mo"
                            desc="For large institutions."
                            features={['Unlimited Students', 'Multi-Campus Support', 'Custom Branding', 'API Access', 'Dedicated Account Manager']}
                        />
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 border-t border-slate-900 text-slate-500 text-sm text-center">
                <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
                    <div className="flex items-center gap-2">
                        <Logo className="w-6 h-6 grayscale opacity-50" />
                        <span>© 2026 Edufy Inc.</span>
                    </div>
                    <div className="flex gap-6">
                        <a href="#" className="hover:text-slate-300">Privacy</a>
                        <a href="#" className="hover:text-slate-300">Terms</a>
                        <a href="#" className="hover:text-slate-300">Contact</a>
                    </div>
                </div>
            </footer>
        </div>
    );
};

const FeatureCard = ({ icon, title, desc }: { icon: any, title: string, desc: string }) => (
    <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700 transition-colors">
        <div className="mb-4 p-3 bg-slate-950 rounded-xl inline-block border border-slate-800">{icon}</div>
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-slate-400 leading-relaxed text-sm">{desc}</p>
    </div>
);

const PricingCard = ({ title, price, period, desc, features, isPopular }: { title: string, price: string, period?: string, desc: string, features: string[], isPopular?: boolean }) => (
    <div className={`p-8 rounded-3xl border flex flex-col ${isPopular ? 'bg-slate-900/80 border-blue-500/50 shadow-xl shadow-blue-500/10 scale-105 z-10' : 'bg-slate-950/50 border-slate-800'}`}>
        {isPopular && <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-4">Most Popular</div>}
        <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
        <p className="text-slate-400 text-sm mb-6">{desc}</p>
        <div className="mb-8">
            <span className="text-4xl font-bold text-white">{price}</span>
            {period && <span className="text-slate-500">{period}</span>}
        </div>
        <button className={`w-full py-3 rounded-xl font-bold mb-8 transition-colors ${isPopular ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-white'}`}>
            Choose {title}
        </button>
        <ul className="space-y-4 flex-1">
            {features.map((f, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-300">
                    <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
                    {f}
                </li>
            ))}
        </ul>
    </div>
);
