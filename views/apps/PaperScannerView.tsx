import React, { useState } from 'react';
import { Camera, Clipboard, FileOutput, FileText, Languages, Scan, TextSelect, Upload } from 'lucide-react';
import {
    AtlasActionButton,
    AtlasCommandHeader,
    AtlasEmptyState,
    AtlasSectionHeader,
    AtlasSignalCard,
    AtlasToolbar
} from '../../components/atlas/AtlasSurface';

export const PaperScannerView = () => {
    const [fileName, setFileName] = useState('');
    const [language, setLanguage] = useState('Auto detect');
    const [outputFormat, setOutputFormat] = useState('Plain text');

    const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        setFileName(file?.name || '');
    };

    return (
        <div className="flex h-full flex-col gap-5 pb-24 md:pb-8">
            <AtlasCommandHeader
                eyebrow="Installed app / Capture"
                title="Paper Note Scanner"
                description="Bring handwritten notes and assessments into a clean review workspace before saving the text."
                icon={Scan}
                badges={<span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-2 py-1 text-[10px] font-bold text-amber-200">OCR connection required</span>}
                actions={
                    <AtlasActionButton variant="primary" icon={TextSelect} disabled>
                        Extract text
                    </AtlasActionButton>
                }
            />

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <AtlasSignalCard label="Source" value={fileName ? 'Loaded' : 'Empty'} detail={fileName || 'Choose an image or PDF'} icon={Upload} tone={fileName ? 'teal' : 'slate'} />
                <AtlasSignalCard label="Language" value={language === 'Auto detect' ? 'Auto' : language} detail="Recognition language" icon={Languages} tone="blue" />
                <AtlasSignalCard label="Output" value={outputFormat} detail="Editable result" icon={FileOutput} tone="amber" />
                <AtlasSignalCard label="Pages" value={fileName ? '1' : '0'} detail="Current scan batch" icon={FileText} tone="slate" />
            </div>

            <AtlasToolbar>
                <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-[10px] font-bold uppercase text-slate-500 sm:flex-none">
                    Recognition language
                    <select
                        value={language}
                        onChange={event => setLanguage(event.target.value)}
                        className="h-10 rounded-lg border border-white/10 bg-slate-900 px-3 text-sm font-medium normal-case text-white outline-none transition-colors focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/10"
                    >
                        <option>Auto detect</option>
                        <option>English</option>
                        <option>French</option>
                        <option>Arabic</option>
                    </select>
                </label>
                <label className="flex min-w-[180px] flex-1 flex-col gap-1 text-[10px] font-bold uppercase text-slate-500 sm:flex-none">
                    Output format
                    <select
                        value={outputFormat}
                        onChange={event => setOutputFormat(event.target.value)}
                        className="h-10 rounded-lg border border-white/10 bg-slate-900 px-3 text-sm font-medium normal-case text-white outline-none transition-colors focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/10"
                    >
                        <option>Plain text</option>
                        <option>Structured notes</option>
                        <option>Assessment answers</option>
                    </select>
                </label>
            </AtlasToolbar>

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 xl:grid-cols-2">
                <section className="flex min-h-[480px] flex-col rounded-lg border border-white/10 bg-slate-900/70 p-4">
                    <AtlasSectionHeader title="Source page" description="Use a clear, straight image for the most reliable recognition." icon={Camera} />

                    <label className="group relative mt-4 flex flex-1 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-white/15 bg-slate-950/55 p-8 text-center transition-colors hover:border-teal-300/45 hover:bg-teal-400/[0.04] focus-within:ring-2 focus-within:ring-teal-400/60">
                        <input
                            type="file"
                            accept="image/jpeg,image/png,application/pdf"
                            onChange={handleFileSelection}
                            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                            aria-label="Choose a handwritten note or assessment"
                        />
                        <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-lg border border-teal-400/20 bg-teal-400/10 text-teal-300">
                            {fileName ? <FileText size={26} /> : <Upload size={26} />}
                        </span>
                        <h3 className="max-w-full truncate text-sm font-black text-white">{fileName || 'Drop a paper scan here'}</h3>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{fileName ? 'Choose another file to replace this page' : 'JPG, PNG, or PDF up to one page'}</p>
                        <span className="mt-4 rounded-full border border-white/10 px-2 py-1 font-mono text-[10px] text-slate-500">JPG · PNG · PDF</span>
                    </label>
                </section>

                <section className="flex min-h-[480px] min-w-0 flex-col rounded-lg border border-white/10 bg-slate-900/70 p-4">
                    <AtlasSectionHeader
                        title="Extracted text"
                        description="Review recognition results here before copying or saving."
                        icon={TextSelect}
                        actions={
                            <div className="flex gap-2">
                                <button type="button" title="Copy extracted text" aria-label="Copy extracted text" disabled className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-slate-500 disabled:cursor-not-allowed disabled:opacity-40"><Clipboard size={16} /></button>
                                <button type="button" title="Save as document" aria-label="Save as document" disabled className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-slate-500 disabled:cursor-not-allowed disabled:opacity-40"><FileOutput size={16} /></button>
                            </div>
                        }
                    />

                    <div className="mt-4 flex flex-1 items-center justify-center rounded-lg border border-white/10 bg-slate-950/55 p-6">
                        <AtlasEmptyState
                            title={fileName ? 'Source is ready for OCR' : 'No extracted text yet'}
                            description={fileName ? 'Connect the recognition service to extract and review this page.' : 'Choose a source page first. Recognition results will stay editable in this workspace.'}
                            icon={TextSelect}
                        />
                    </div>
                </section>
            </div>
        </div>
    );
};
