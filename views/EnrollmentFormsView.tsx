import React, { useEffect, useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import {
    Check,
    Copy,
    ExternalLink,
    FileText,
    GraduationCap,
    Printer,
    QrCode,
    Search,
    Tablet,
    UserRound,
    X,
    AlertCircle,
    ChevronRight
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useAppContext } from '../context/AppContext';
import { Lead, Program } from '../types';
import { FormTemplateRenderer } from '../components/enrollment/FormTemplateRenderer';
import {
    AtlasActionButton,
    AtlasCommandHeader,
    AtlasEmptyState,
    AtlasSectionHeader,
    AtlasSignalCard,
    AtlasToolbar
} from '../components/atlas/AtlasSurface';
import { getProgramReadiness } from '../utils/program-readiness';

interface EnrollmentFormsViewProps {
    onEnrollLead?: (lead: Lead) => void;
}

export const EnrollmentFormsView: React.FC<EnrollmentFormsViewProps> = () => {
    const { programs, navigateTo } = useAppContext();
    const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);
    const [qrProgram, setQrProgram] = useState<Program | null>(null);
    const [copiedProgramId, setCopiedProgramId] = useState<string | null>(null);
    const [copyError, setCopyError] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const componentRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: componentRef,
        documentTitle: `Inscription_${selectedProgram?.name || 'Form'}`,
    });

    const baseUrl = window.location.origin;
    const activePrograms = programs.filter(program => program.status === 'active');
    const kidsPrograms = activePrograms.filter(program => program.targetAudience !== 'adults').length;
    const adultPrograms = activePrograms.filter(program => program.targetAudience === 'adults').length;
    const isProgramReady = (program: Program) => getProgramReadiness(program).isReady;
    const readyPrograms = activePrograms.filter(isProgramReady).length;
    const filteredPrograms = activePrograms.filter(program => {
        const query = searchQuery.trim().toLowerCase();
        return !query || [program.name, program.type, program.description, program.partnerName]
            .some(value => value?.toLowerCase().includes(query));
    });

    useEffect(() => {
        if (!qrProgram) return;

        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setQrProgram(null);
        };

        window.addEventListener('keydown', closeOnEscape);
        return () => window.removeEventListener('keydown', closeOnEscape);
    }, [qrProgram]);

    const triggerPrint = (program: Program) => {
        setSelectedProgram(program);
        window.setTimeout(() => handlePrint(), 100);
    };

    const getEnrollmentUrl = (program: Program) => `${baseUrl}/enroll?program=${program.id}`;
    const openQr = (program: Program) => {
        setCopyError('');
        setQrProgram(program);
    };

    const copyEnrollmentLink = async (program: Program) => {
        setCopyError('');

        try {
            await navigator.clipboard.writeText(getEnrollmentUrl(program));
            setCopiedProgramId(program.id);
            window.setTimeout(() => {
                setCopiedProgramId(current => current === program.id ? null : current);
            }, 1800);
        } catch (error) {
            console.error('Unable to copy enrollment link', error);
            setCopyError('The link could not be copied. Open the form and copy the address from the new tab.');
        }
    };

    return (
        <div className="space-y-5 pb-10">
            <AtlasCommandHeader
                eyebrow="Admissions workspace"
                title="Enrollment forms"
                description="Share one clear enrollment path for every active program, in person or online."
                icon={FileText}
                badges={(
                    <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2 py-1 text-[10px] font-bold uppercase text-amber-200">
                        Public links live
                    </span>
                )}
            />

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                <AtlasSignalCard
                    label="Ready to share"
                    value={readyPrograms}
                    detail="Pricing and schedule complete"
                    icon={Tablet}
                    tone="teal"
                />
                <AtlasSignalCard
                    label="Youth programs"
                    value={kidsPrograms}
                    detail="Guardian enrollment path"
                    icon={GraduationCap}
                    tone="amber"
                />
                <AtlasSignalCard
                    label="Needs setup"
                    value={activePrograms.length - readyPrograms}
                    detail={`${adultPrograms} adult enrollment paths`}
                    icon={AlertCircle}
                    tone={activePrograms.length - readyPrograms > 0 ? 'amber' : 'blue'}
                />
            </div>

            <AtlasToolbar
                leading={(
                    <label className="relative min-w-0 flex-1 sm:max-w-md">
                        <span className="sr-only">Search enrollment forms</span>
                        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
                        <input
                            value={searchQuery}
                            onChange={event => setSearchQuery(event.target.value)}
                            placeholder="Search enrollment forms"
                            className="min-h-10 w-full rounded-lg border border-white/10 bg-slate-950 pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/15"
                        />
                    </label>
                )}
                trailing={<AtlasActionButton icon={ChevronRight} onClick={() => navigateTo('programs')}>Manage catalog</AtlasActionButton>}
            >
                <span className="text-xs font-bold text-slate-500">{filteredPrograms.length} public enrollment points</span>
            </AtlasToolbar>

            <section className="space-y-4">
                <AtlasSectionHeader
                    title="Program enrollment points"
                    description="Print a paper form or open the public kiosk experience without changing program configuration."
                    icon={QrCode}
                    meta={(
                        <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] font-bold text-slate-400">
                            {activePrograms.length}
                        </span>
                    )}
                />

                {activePrograms.length === 0 ? (
                    <AtlasEmptyState
                        title="No active enrollment forms"
                        description="Activate a program to make its printable form, kiosk link, and QR code available here."
                        icon={FileText}
                        action={<AtlasActionButton icon={ChevronRight} variant="primary" onClick={() => navigateTo('programs')}>Open program catalog</AtlasActionButton>}
                    />
                ) : filteredPrograms.length === 0 ? (
                    <AtlasEmptyState
                        title="No enrollment forms match"
                        description="Clear the search to see all active program forms."
                        icon={Search}
                        action={<AtlasActionButton onClick={() => setSearchQuery('')}>Clear search</AtlasActionButton>}
                    />
                ) : (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {filteredPrograms.map(program => {
                            const isAdult = program.targetAudience === 'adults';
                            const isReady = isProgramReady(program);

                            return (
                                <article
                                    key={program.id}
                                    className="flex min-h-[250px] flex-col overflow-hidden rounded-lg border border-white/10 bg-slate-950/55 transition-colors hover:border-teal-300/30"
                                >
                                    <div className="h-1 bg-teal-400" />
                                    <div className="flex flex-1 flex-col p-4">
                                        <div className="mb-4 flex items-start gap-3">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-teal-300/20 bg-teal-400/10 text-teal-300">
                                                {isAdult ? <UserRound size={19} /> : <GraduationCap size={19} />}
                                            </div>
                                            <div className="min-w-0">
                                                <h3 className="truncate text-base font-black text-white" title={program.name}>{program.name}</h3>
                                                <p className="mt-1 text-[10px] font-bold uppercase text-amber-200">
                                                    {program.type} / {isAdult ? 'Adult learner' : 'Youth learner'}
                                                </p>
                                            </div>
                                        </div>

                                        <p className="line-clamp-3 flex-1 text-sm leading-5 text-slate-400">
                                            {program.description || 'A public enrollment form is ready for this program.'}
                                        </p>

                                        <div className="my-4 flex flex-wrap gap-2 text-[11px] font-bold text-slate-400">
                                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1">{program.packs?.length || 0} packs</span>
                                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1">{program.grades?.length || 0} levels</span>
                                            <span className={`rounded-full border px-2 py-1 ${isReady ? 'border-emerald-300/20 bg-emerald-300/10 text-emerald-200' : 'border-amber-300/20 bg-amber-300/10 text-amber-200'}`}>
                                                {isReady ? 'Ready' : 'Needs pricing or schedule'}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <AtlasActionButton icon={Printer} onClick={() => triggerPrint(program)}>
                                                Print form
                                            </AtlasActionButton>
                                            <AtlasActionButton icon={QrCode} variant="primary" onClick={() => openQr(program)} disabled={!isReady} title={isReady ? 'Open public link and QR code' : 'Complete pricing and schedule first'}>
                                                {isReady ? 'Link & QR' : 'Setup needed'}
                                            </AtlasActionButton>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => navigateTo('programs', { programId: program.id })}
                                            className="mt-2 flex min-h-10 w-full items-center justify-between rounded-lg px-3 text-sm font-bold text-slate-400 transition-colors hover:bg-white/[0.05] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60"
                                        >
                                            {isReady ? 'Open program workspace' : 'Complete program setup'} <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>

            <div className="absolute left-0 top-0 h-0 overflow-hidden" aria-hidden="true">
                <div ref={componentRef}>
                    {selectedProgram && <FormTemplateRenderer program={selectedProgram} />}
                </div>
            </div>

            {qrProgram && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="enrollment-qr-title"
                    onMouseDown={event => {
                        if (event.currentTarget === event.target) setQrProgram(null);
                    }}
                >
                    <div className="w-full max-w-sm rounded-lg border border-white/10 bg-[#0F1B2D] p-5 shadow-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-[10px] font-black uppercase text-teal-300">Public enrollment</p>
                                <h3 id="enrollment-qr-title" className="mt-1 text-lg font-black text-white">{qrProgram.name}</h3>
                                <p className="mt-1 text-xs text-slate-400">Scan to open the program form.</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setQrProgram(null)}
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                                aria-label="Close QR code"
                                title="Close"
                            >
                                <X size={19} />
                            </button>
                        </div>

                        <div className="my-5 flex justify-center rounded-lg border border-slate-200 bg-[#F7F1E4] p-5">
                            <QRCodeSVG value={getEnrollmentUrl(qrProgram)} size={200} />
                        </div>

                        {!isProgramReady(qrProgram) && (
                            <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-300/20 bg-amber-300/10 p-3 text-xs leading-5 text-amber-100">
                                <AlertCircle className="mt-0.5 shrink-0" size={15} />
                                Pricing or schedule options are incomplete. Complete setup before distributing this enrollment link.
                            </div>
                        )}

                        {copyError && (
                            <p role="alert" className="mb-3 rounded-lg border border-rose-400/20 bg-rose-400/10 p-3 text-xs leading-5 text-rose-200">
                                {copyError}
                            </p>
                        )}

                        <div className="grid gap-2 sm:grid-cols-2">
                            <AtlasActionButton
                                icon={ExternalLink}
                                variant="primary"
                                onClick={() => window.open(getEnrollmentUrl(qrProgram), '_blank', 'noopener,noreferrer')}
                            >
                                Open form
                            </AtlasActionButton>
                            <AtlasActionButton icon={copiedProgramId === qrProgram.id ? Check : Copy} onClick={() => copyEnrollmentLink(qrProgram)}>
                                {copiedProgramId === qrProgram.id ? 'Link copied' : 'Copy link'}
                            </AtlasActionButton>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
