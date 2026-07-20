import React, { useState } from 'react';
import { CheckCircle2, Download, FileText, LayoutTemplate, Palette, Sparkles, Wand2 } from 'lucide-react';
import {
    AtlasActionButton,
    AtlasCommandHeader,
    AtlasEmptyState,
    AtlasSectionHeader,
    AtlasSignalCard
} from '../../components/atlas/AtlasSurface';

const documentTypes = ['Certificate of Completion', 'Progress Report', 'Official Letter'];
const themes = [
    { id: 'atlas', label: 'Atlas ink', swatch: 'bg-slate-900' },
    { id: 'paper', label: 'Paper', swatch: 'bg-[#F7F1E4]' },
    { id: 'mono', label: 'Monochrome', swatch: 'bg-white' }
];

export const DocDesignerView = () => {
    const [documentType, setDocumentType] = useState(documentTypes[0]);
    const [theme, setTheme] = useState('atlas');
    const [hasLayout, setHasLayout] = useState(false);

    return (
        <div className="flex h-full flex-col gap-5 pb-24 md:pb-8">
            <AtlasCommandHeader
                eyebrow="Installed app / Documents"
                title="AI Document Designer"
                description="Shape certificates, progress reports, and academy letters in one focused workspace."
                icon={FileText}
                badges={<span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-bold text-slate-300">Draft workspace</span>}
                actions={
                    <AtlasActionButton variant="primary" icon={Wand2} onClick={() => setHasLayout(true)}>
                        Generate layout
                    </AtlasActionButton>
                }
            />

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <AtlasSignalCard label="Document" value={documentType.split(' ')[0]} detail={documentType} icon={FileText} tone="teal" />
                <AtlasSignalCard label="Canvas" value="A4" detail="Portrait document" icon={LayoutTemplate} tone="blue" />
                <AtlasSignalCard label="Theme" value={themes.find(item => item.id === theme)?.label} detail="Current visual direction" icon={Palette} tone="amber" />
                <AtlasSignalCard label="Status" value={hasLayout ? 'Ready' : 'Draft'} detail={hasLayout ? 'Layout generated' : 'Waiting for generation'} icon={hasLayout ? CheckCircle2 : Sparkles} tone={hasLayout ? 'emerald' : 'slate'} />
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 xl:grid-cols-[280px_minmax(0,1fr)]">
                <aside className="flex flex-col gap-5 rounded-lg border border-white/10 bg-slate-900/70 p-4">
                    <AtlasSectionHeader title="Document setup" description="Choose the purpose and visual treatment." icon={LayoutTemplate} />

                    <div>
                        <label htmlFor="document-type" className="mb-2 block text-xs font-bold text-slate-300">Document type</label>
                        <select
                            id="document-type"
                            value={documentType}
                            onChange={event => { setDocumentType(event.target.value); setHasLayout(false); }}
                            className="h-10 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none transition-colors focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/10"
                        >
                            {documentTypes.map(type => <option key={type}>{type}</option>)}
                        </select>
                    </div>

                    <fieldset>
                        <legend className="mb-2 text-xs font-bold text-slate-300">Theme</legend>
                        <div className="grid grid-cols-3 gap-2">
                            {themes.map(item => (
                                <button
                                    key={item.id}
                                    type="button"
                                    title={item.label}
                                    aria-label={`Use ${item.label} theme`}
                                    aria-pressed={theme === item.id}
                                    onClick={() => { setTheme(item.id); setHasLayout(false); }}
                                    className={`flex h-12 items-center justify-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60 ${theme === item.id ? 'border-teal-300/70 bg-teal-400/10' : 'border-white/10 bg-slate-950 hover:border-white/25'}`}
                                >
                                    <span className={`h-6 w-8 rounded border border-black/20 ${item.swatch}`} />
                                </button>
                            ))}
                        </div>
                    </fieldset>

                    <div className="mt-auto rounded-lg border border-amber-300/15 bg-amber-300/[0.05] p-3 text-xs leading-5 text-amber-100/75">
                        Layout generation keeps the canvas stable. Student and program details can be connected during the content pass.
                    </div>
                </aside>

                <section className="flex min-h-[620px] min-w-0 flex-col rounded-lg border border-white/10 bg-slate-950/55 p-3 sm:p-4">
                    <AtlasSectionHeader
                        title="Document canvas"
                        description="A print-safe preview with controls kept outside the page."
                        icon={FileText}
                        actions={
                            <button
                                type="button"
                                title={hasLayout ? 'Download document' : 'Generate a layout before downloading'}
                                aria-label="Download document"
                                disabled={!hasLayout}
                                className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition-colors hover:border-teal-300/40 hover:text-teal-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60 disabled:cursor-not-allowed disabled:opacity-35"
                            >
                                <Download size={17} />
                            </button>
                        }
                    />

                    <div className="mt-4 flex min-h-0 flex-1 items-start justify-center overflow-auto rounded-lg border border-white/10 bg-slate-900/60 p-4 sm:p-8">
                        <div className="aspect-[1/1.414] w-full max-w-[540px] shrink-0 overflow-hidden rounded-sm border border-slate-300 bg-[#F7F1E4] shadow-2xl shadow-black/30">
                            {hasLayout ? (
                                <div className="flex h-full flex-col p-[9%] text-slate-900">
                                    <div className={`h-1 w-20 ${theme === 'atlas' ? 'bg-teal-600' : theme === 'mono' ? 'bg-slate-900' : 'bg-amber-500'}`} />
                                    <p className="mt-8 text-[10px] font-black uppercase tracking-widest text-slate-500">MakerLab Academy</p>
                                    <h3 className="mt-3 text-2xl font-black leading-tight sm:text-4xl">{documentType}</h3>
                                    <div className="my-auto text-center">
                                        <p className="text-xs text-slate-500">Presented to</p>
                                        <div className="mx-auto mt-3 h-px w-3/4 bg-slate-300" />
                                        <p className="mt-3 text-lg font-bold text-slate-700">Student name</p>
                                        <p className="mx-auto mt-5 max-w-xs text-xs leading-5 text-slate-500">For curiosity, commitment, and excellent work throughout the learning journey.</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-8 text-[10px] text-slate-500">
                                        <div className="border-t border-slate-300 pt-2">Date</div>
                                        <div className="border-t border-slate-300 pt-2 text-right">Authorized signature</div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex h-full items-center justify-center p-8">
                                    <AtlasEmptyState
                                        title="Your layout will appear here"
                                        description="Choose a document type and theme, then generate the first layout."
                                        icon={FileText}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};
