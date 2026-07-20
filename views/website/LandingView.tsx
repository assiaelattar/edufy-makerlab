import React from 'react';
import { motion } from 'framer-motion';
import {
    ArrowRight,
    Bot,
    Briefcase,
    CheckCircle2,
    ChevronRight,
    Clock,
    FileSpreadsheet,
    GraduationCap,
    MessageCircle,
    PhoneCall,
    ShieldCheck,
    Sparkles,
    Target,
    Wallet,
    Zap
} from 'lucide-react';
import { Logo } from '../../components/Logo';

const centerTypes = [
    'Centres de langues',
    'Soutien scolaire',
    'Ateliers enfants',
    'Coding & robotics',
    'Centres de formation',
    'Petites ecoles privees'
];

const ownerQuestions = [
    'Who has not paid?',
    'Which lead should we call today?',
    'Which parent needs an update?',
    'What should we post this week?',
    'Which student is losing progress?',
    'What needs my attention now?'
];

const clarityCards = [
    {
        icon: FileSpreadsheet,
        label: 'Before',
        title: 'The center depends on memory.',
        points: ['Excel for payments', 'WhatsApp for parents', 'Instagram for leads', 'Notebooks for attendance']
    },
    {
        icon: Sparkles,
        label: 'After',
        title: 'Edufy prepares the next action.',
        points: ['Hot leads to call', 'Payments to collect', 'Parents to message', 'Content to publish']
    }
];

const cockpitMetrics = [
    { label: 'Leads to call', value: '24', tone: 'amber' },
    { label: 'To collect', value: '18.4k', tone: 'teal' },
    { label: 'Students at risk', value: '7', tone: 'rose' },
    { label: 'Posts ready', value: '12', tone: 'blue' }
];

const autopilotActions = [
    { icon: Target, title: 'Sell smarter', desc: 'Edufy shows which leads, workshops, and campaigns deserve attention first.' },
    { icon: Wallet, title: 'Collect faster', desc: 'See balances, pending payments, checks, transfers, and reminders in one view.' },
    { icon: GraduationCap, title: 'Show progress', desc: 'Turn projects, badges, portfolios, and learning steps into parent-visible value.' },
    { icon: MessageCircle, title: 'Communicate clearly', desc: 'Prepare WhatsApp messages for payments, absences, schedules, and campaigns.' },
    { icon: Briefcase, title: 'Align the team', desc: 'Keep staff tasks, internal projects, quality reviews, and daily work connected.' },
    { icon: Bot, title: 'Ask your AI', desc: 'Connect Edufy to ChatGPT or Claude through MCP-ready controlled workflows.' }
];

const simpleSteps = [
    { title: 'Edufy gathers the center', desc: 'Students, parents, leads, payments, classes, team, content, and learning data.' },
    { title: 'Edufy reads what matters', desc: 'It highlights what is urgent, what is stuck, and where growth can happen.' },
    { title: 'Edufy prepares action', desc: 'Messages, reports, content ideas, lead follow-up, and decisions become easier.' }
];

const plans = [
    {
        title: 'Starter',
        price: 'Free',
        desc: 'A clean start for small centers.',
        features: ['Up to 50 students', 'Basic management', 'Attendance', 'Simple setup']
    },
    {
        title: 'Growth',
        price: '490 MAD',
        period: '/mois',
        desc: 'Recommended for centers ready to pilot the business.',
        features: ['Up to 200 students', 'Finance + CRM', 'WhatsApp workflows', 'Parent portal', 'AI content support'],
        isPopular: true
    },
    {
        title: 'Scale',
        price: '990 MAD',
        period: '/mois',
        desc: 'For advanced centers, teams, and multi-site growth.',
        features: ['High volume', 'Multi-campus', 'Custom branding', 'MCP setup', 'Advanced AI workflows']
    }
];

export const LandingView = () => {
    const handleLogin = () => {
        window.location.hash = '#login';
    };

    const handleGetStarted = () => {
        window.location.hash = '#signup';
    };

    return (
        <div className="atlas-marketing-shell min-h-screen text-[#08111f] font-sans selection:bg-[#14b8a6]/25">
            <header className="fixed inset-x-0 top-0 z-50 border-b border-[#08111f]/10 bg-[#f7f1e4]">
                <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
                    <button onClick={handleGetStarted} className="flex items-center gap-3 text-left focus:outline-none focus:ring-2 focus:ring-[#1f9d8e] focus:ring-offset-2" aria-label="Edufy home">
                        <Logo className="h-8 w-8" />
                        <span className="text-xl font-black tracking-tight text-[#08111f]">Edufy</span>
                    </button>

                    <nav className="hidden items-center gap-7 text-sm font-semibold text-[#5d6760] md:flex">
                        <a href="#why" className="transition-colors hover:text-[#08111f]">Why it matters</a>
                        <a href="#autopilot" className="transition-colors hover:text-[#08111f]">Autopilot</a>
                        <a href="#pricing" className="transition-colors hover:text-[#08111f]">Pricing</a>
                    </nav>

                    <div className="flex items-center gap-2 sm:gap-3">
                        <button onClick={handleLogin} className="hidden text-sm font-bold text-[#334155] transition-colors hover:text-[#08111f] sm:inline-flex">
                            Sign in
                        </button>
                        <button onClick={handleGetStarted} className="inline-flex items-center gap-2 rounded-lg bg-[#08111f] px-4 py-2 text-sm font-black text-white transition-colors hover:bg-[#10213a] focus:outline-none focus:ring-2 focus:ring-[#08111f] focus:ring-offset-2">
                            Book demo <ArrowRight size={16} />
                        </button>
                    </div>
                </div>
            </header>

            <main>
                <section className="relative overflow-hidden pt-28 sm:pt-32">
                    <div className="absolute inset-x-0 top-0 h-[680px] bg-[#08111f]" />
                    <div className="atlas-grid-field absolute inset-x-0 top-0 h-[680px] opacity-70" />

                    <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
                        <div className="grid gap-10 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
                            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }}>
                                <div className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/8 px-3 py-2 text-xs font-black uppercase tracking-[0.18em] text-[#f2c766]">
                                    <Sparkles size={14} /> AI autopilot for education centers
                                </div>

                                <h1 className="mt-6 max-w-3xl text-5xl font-black leading-[0.94] tracking-tight text-white sm:text-6xl lg:text-7xl">
                                    Your center, finally under control.
                                </h1>

                                <p className="mt-6 max-w-2xl text-lg leading-8 text-[#d8e1dc] sm:text-xl">
                                    Edufy shows what is happening in the business, what needs attention, and what action your team should take next.
                                </p>

                                <div className="mt-8 grid gap-3 sm:grid-cols-[auto_auto] sm:justify-start">
                                    <button onClick={handleGetStarted} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#14b8a6] px-6 py-4 text-sm font-black text-[#08111f] transition-colors hover:bg-[#5eead4] focus:outline-none focus:ring-2 focus:ring-[#14b8a6] focus:ring-offset-2 focus:ring-offset-[#08111f]">
                                        See the autopilot demo <ArrowRight size={18} />
                                    </button>
                                    <button onClick={handleLogin} className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/18 bg-white/8 px-6 py-4 text-sm font-black text-white transition-colors hover:bg-white/14 focus:outline-none focus:ring-2 focus:ring-white/60 focus:ring-offset-2 focus:ring-offset-[#08111f]">
                                        Open demo space <PhoneCall size={18} />
                                    </button>
                                </div>

                                <div className="mt-8 flex flex-wrap gap-2">
                                    {centerTypes.map((type) => (
                                        <span key={type} className="rounded-md border border-white/12 bg-white/8 px-3 py-2 text-xs font-bold text-[#d8e1dc]">
                                            {type}
                                        </span>
                                    ))}
                                </div>
                            </motion.div>

                            <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.1 }} className="relative">
                                <CommandCenterMockup />
                            </motion.div>
                        </div>

                        <div className="relative mt-12 overflow-hidden rounded-lg border border-[#08111f]/10 bg-white shadow-[0_30px_100px_rgba(8,17,31,0.18)]">
                            <img src="/images/hero-devices.png" alt="Edufy dashboard preview on multiple devices" className="h-auto w-full object-cover" />
                        </div>
                    </div>
                </section>

                <section id="why" className="px-4 py-20 sm:px-6">
                    <div className="mx-auto max-w-7xl">
                        <div className="grid gap-10 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#9f6b10]">For non-technical owners</p>
                                <h2 className="mt-3 text-4xl font-black leading-tight tracking-tight text-[#101411] sm:text-5xl">
                                    You do not need to understand software to understand this power.
                                </h2>
                                <p className="mt-5 text-lg leading-8 text-[#5b665f]">
                                    A director needs simple answers. Edufy turns scattered work into a daily command view.
                                </p>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                {ownerQuestions.map((question) => (
                                    <div key={question} className="flex min-h-[92px] items-center gap-4 rounded-lg border border-black/10 bg-white p-5 shadow-sm">
                                        <CheckCircle2 className="h-6 w-6 shrink-0 text-[#17a08f]" />
                                        <p className="text-xl font-black leading-tight text-[#101411]">{question}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <section className="bg-[#101411] px-4 py-20 text-white sm:px-6">
                    <div className="mx-auto max-w-7xl">
                        <div className="max-w-3xl">
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#f1d17a]">Before and after</p>
                            <h2 className="mt-3 text-4xl font-black leading-tight tracking-tight sm:text-5xl">
                                Edufy changes the job from chasing information to choosing the next move.
                            </h2>
                        </div>

                        <div className="mt-10 grid gap-4 lg:grid-cols-2">
                            {clarityCards.map((card) => (
                                <ClarityCard key={card.label} {...card} />
                            ))}
                        </div>
                    </div>
                </section>

                <section id="autopilot" className="px-4 py-20 sm:px-6">
                    <div className="mx-auto max-w-7xl">
                        <div className="grid gap-10 lg:grid-cols-[0.84fr_1.16fr]">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#9f6b10]">What the autopilot does</p>
                                <h2 className="mt-3 text-4xl font-black leading-tight tracking-tight text-[#101411] sm:text-5xl">
                                    It connects the pieces that make the center grow.
                                </h2>
                                <p className="mt-5 text-lg leading-8 text-[#5b665f]">
                                    Management is only the first layer. Edufy also connects sales, learning, team work, content, and AI assistants.
                                </p>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                {autopilotActions.map((action) => (
                                    <AutopilotCard key={action.title} {...action} />
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <section className="bg-[#fdfaf2] px-4 py-20 sm:px-6">
                    <div className="mx-auto max-w-7xl">
                        <div className="text-center">
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#9f6b10]">Simple explanation</p>
                            <h2 className="mx-auto mt-3 max-w-3xl text-4xl font-black leading-tight tracking-tight text-[#101411] sm:text-5xl">
                                Edufy works like a business brain for the academy.
                            </h2>
                        </div>

                        <div className="mt-12 grid gap-4 md:grid-cols-3">
                            {simpleSteps.map((step, index) => (
                                <div key={step.title} className="relative rounded-lg border border-black/10 bg-white p-7 shadow-sm">
                                    <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-lg bg-[#101411] text-lg font-black text-white">
                                        {index + 1}
                                    </div>
                                    <h3 className="text-2xl font-black text-[#101411]">{step.title}</h3>
                                    <p className="mt-4 text-base leading-7 text-[#5b665f]">{step.desc}</p>
                                    {index < simpleSteps.length - 1 && (
                                        <ChevronRight className="absolute -right-6 top-1/2 hidden h-8 w-8 -translate-y-1/2 text-[#b9aea0] md:block" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="bg-[#101411] px-4 py-20 text-white sm:px-6">
                    <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                        <div>
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#20c7b0]">ChatGPT + Claude ready vision</p>
                            <h2 className="mt-3 text-4xl font-black leading-tight tracking-tight sm:text-5xl">
                                Your AI assistant can finally understand your center.
                            </h2>
                            <p className="mt-5 text-lg leading-8 text-[#d8e1dc]">
                                With MCP-ready tools, Edufy can let AI assistants inspect controlled business data, prepare follow-ups, summarize reports, and generate content.
                            </p>
                        </div>

                        <div className="rounded-lg border border-white/12 bg-white/[0.05] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.3)]">
                            <div className="rounded-lg bg-[#07110f] p-5">
                                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                                    <div className="flex items-center gap-3">
                                        <Bot className="h-6 w-6 text-[#20c7b0]" />
                                        <span className="font-black">Ask Edufy through AI</span>
                                    </div>
                                    <span className="rounded-md bg-[#20c7b0]/12 px-3 py-1 text-xs font-black text-[#64e8d7]">MCP</span>
                                </div>

                                <div className="mt-5 space-y-3">
                                    {['Which leads should I call today?', 'Who has unpaid balances this month?', 'Generate a WhatsApp reminder.', 'Create 5 posts for summer camp.'].map((prompt) => (
                                        <div key={prompt} className="rounded-lg border border-white/8 bg-white/[0.06] px-4 py-3 text-sm font-semibold text-[#d8e1dc]">
                                            {prompt}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                <section className="px-4 py-20 sm:px-6">
                    <div className="mx-auto max-w-7xl">
                        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
                            <div>
                                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#9f6b10]">Guided launch</p>
                                <h2 className="mt-3 text-4xl font-black leading-tight tracking-tight text-[#101411] sm:text-5xl">
                                    Start with one real group. Prove the value in 7 days.
                                </h2>
                                <p className="mt-5 text-lg leading-8 text-[#5b665f]">
                                    We set up real students, real payments, real leads, WhatsApp templates, and content ideas. Your team tests Edufy on daily work before expanding.
                                </p>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                {['Students imported', 'Groups and programs', 'Payment workflow', 'CRM leads', 'WhatsApp templates', 'Content ideas'].map((item) => (
                                    <div key={item} className="flex items-center gap-3 rounded-lg border border-black/10 bg-white p-5 shadow-sm">
                                        <Zap className="h-5 w-5 shrink-0 text-[#17a08f]" />
                                        <span className="font-black text-[#101411]">{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                <section id="pricing" className="bg-[#fdfaf2] px-4 py-20 sm:px-6">
                    <div className="mx-auto max-w-7xl">
                        <div className="mx-auto max-w-3xl text-center">
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#9f6b10]">Pricing</p>
                            <h2 className="mt-3 text-4xl font-black leading-tight tracking-tight text-[#101411] sm:text-5xl">
                                Start simple. Grow into autopilot.
                            </h2>
                        </div>

                        <div className="mt-12 grid gap-4 lg:grid-cols-3">
                            {plans.map((plan) => (
                                <PricingCard key={plan.title} {...plan} />
                            ))}
                        </div>
                    </div>
                </section>

                <section className="bg-[#101411] px-4 py-20 text-white sm:px-6">
                    <div className="mx-auto flex max-w-7xl flex-col gap-8 md:flex-row md:items-center md:justify-between">
                        <div className="max-w-2xl">
                            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#f1d17a]">Next step</p>
                            <h2 className="mt-3 text-4xl font-black leading-tight tracking-tight sm:text-5xl">
                                Let the owner see the whole center in one view.
                            </h2>
                            <p className="mt-5 text-lg leading-8 text-[#d8e1dc]">
                                A short demo is enough to understand the power.
                            </p>
                        </div>

                        <button onClick={handleGetStarted} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#20c7b0] px-7 py-4 text-sm font-black text-[#07110f] transition-colors hover:bg-[#48dac6] focus:outline-none focus:ring-2 focus:ring-[#20c7b0] focus:ring-offset-2 focus:ring-offset-[#101411] md:w-auto">
                            Book the demo <ArrowRight size={18} />
                        </button>
                    </div>
                </section>
            </main>

            <footer className="border-t border-black/10 bg-[#f6f3ec] px-4 py-8 text-sm font-semibold text-[#5b665f] sm:px-6">
                <div className="mx-auto flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                        <Logo className="h-6 w-6" />
                        <span>Edufy, AI autopilot for education centers.</span>
                    </div>
                    <div className="flex gap-5">
                        <a href="#autopilot" className="hover:text-[#101411]">Autopilot</a>
                        <a href="#pricing" className="hover:text-[#101411]">Pricing</a>
                        <button onClick={handleLogin} className="hover:text-[#101411]">Sign in</button>
                    </div>
                </div>
            </footer>
        </div>
    );
};

const CommandCenterMockup = () => (
    <div className="rounded-lg border border-white/14 bg-white/[0.08] p-3 shadow-[0_40px_120px_rgba(0,0,0,0.35)] backdrop-blur">
        <div className="rounded-lg bg-[#07110f] p-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f1d17a]">Live command center</p>
                    <h2 className="mt-2 text-2xl font-black text-white">Today at your center</h2>
                </div>
                <div className="rounded-md bg-[#20c7b0]/12 px-3 py-2 text-xs font-black text-[#64e8d7]">AI ready</div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
                {cockpitMetrics.map((metric) => (
                    <MetricCard key={metric.label} {...metric} />
                ))}
            </div>

            <div className="mt-5 rounded-lg bg-white/[0.06] p-5">
                <div className="flex items-center gap-2 text-[#f1d17a]">
                    <Sparkles size={18} />
                    <span className="font-black">Edufy recommendation</span>
                </div>
                <p className="mt-3 text-lg font-semibold leading-7 text-white">
                    Call the 6 hot leads from robotics week, send 9 payment reminders, and publish the summer camp post today.
                </p>
            </div>

            <div className="mt-5 grid gap-2">
                {['Lead follow-up prepared', 'Payment messages ready', 'Parent updates suggested'].map((item) => (
                    <div key={item} className="flex items-center justify-between rounded-md bg-white/[0.04] px-4 py-3 text-sm font-bold text-[#d8e1dc]">
                        <span>{item}</span>
                        <Clock size={16} className="text-[#20c7b0]" />
                    </div>
                ))}
            </div>
        </div>
    </div>
);

const MetricCard = ({ label, value, tone }: { label: string; value: string; tone: string }) => {
    const colors: Record<string, string> = {
        amber: 'text-[#f1d17a]',
        teal: 'text-[#64e8d7]',
        rose: 'text-[#ff9b82]',
        blue: 'text-[#8ab4ff]'
    };

    return (
        <div className="rounded-lg bg-white/[0.055] p-4">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-[#93a29a]">{label}</p>
            <p className={`mt-2 text-3xl font-black ${colors[tone]}`}>{value}</p>
        </div>
    );
};

const ClarityCard = ({ icon: Icon, label, title, points }: { icon: React.ElementType; label: string; title: string; points: string[] }) => (
    <div className="rounded-lg border border-white/12 bg-white/[0.055] p-7">
        <div className="flex items-center gap-3">
            <Icon className="h-7 w-7 text-[#f1d17a]" />
            <span className="text-xs font-black uppercase tracking-[0.2em] text-[#f1d17a]">{label}</span>
        </div>
        <h3 className="mt-6 text-3xl font-black leading-tight text-white">{title}</h3>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {points.map((point) => (
                <div key={point} className="rounded-md bg-white/[0.06] px-4 py-3 text-sm font-bold text-[#d8e1dc]">
                    {point}
                </div>
            ))}
        </div>
    </div>
);

const AutopilotCard = ({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) => (
    <div className="min-h-[178px] rounded-lg border border-black/10 bg-white p-6 shadow-sm transition-transform hover:-translate-y-0.5">
        <Icon className="h-7 w-7 text-[#17a08f]" />
        <h3 className="mt-5 text-2xl font-black text-[#101411]">{title}</h3>
        <p className="mt-3 text-base leading-7 text-[#5b665f]">{desc}</p>
    </div>
);

const PricingCard = ({ title, price, period, desc, features, isPopular }: { title: string; price: string; period?: string; desc: string; features: string[]; isPopular?: boolean }) => (
    <div className={`relative rounded-lg border p-7 shadow-sm ${isPopular ? 'border-[#17a08f] bg-[#101411] text-white shadow-[0_30px_90px_rgba(16,20,17,0.18)]' : 'border-black/10 bg-white text-[#101411]'}`}>
        {isPopular && (
            <div className="absolute right-5 top-5 rounded-md bg-[#f1d17a] px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[#101411]">
                Recommended
            </div>
        )}
        <ShieldCheck className={`h-7 w-7 ${isPopular ? 'text-[#64e8d7]' : 'text-[#17a08f]'}`} />
        <h3 className="mt-6 text-2xl font-black">{title}</h3>
        <p className={`mt-3 min-h-[56px] text-base leading-7 ${isPopular ? 'text-[#d8e1dc]' : 'text-[#5b665f]'}`}>{desc}</p>

        <div className="mt-6 flex items-end gap-2">
            <span className="text-4xl font-black">{price}</span>
            {period && <span className={`pb-1 text-sm font-black ${isPopular ? 'text-[#93a29a]' : 'text-[#5b665f]'}`}>{period}</span>}
        </div>

        <ul className="mt-7 space-y-3">
            {features.map((feature) => (
                <li key={feature} className="flex items-start gap-3 text-sm font-bold">
                    <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${isPopular ? 'text-[#64e8d7]' : 'text-[#17a08f]'}`} />
                    <span>{feature}</span>
                </li>
            ))}
        </ul>
    </div>
);
