import React, { useState } from 'react';
import { CalendarDays, Download, Facebook, Image as ImageIcon, Instagram, Linkedin, Send, Share2, Sparkles, Type } from 'lucide-react';
import {
    AtlasActionButton,
    AtlasCommandHeader,
    AtlasEmptyState,
    AtlasSectionHeader,
    AtlasSignalCard
} from '../../components/atlas/AtlasSurface';

const platforms = [
    { id: 'instagram', label: 'Instagram', icon: Instagram },
    { id: 'linkedin', label: 'LinkedIn', icon: Linkedin },
    { id: 'facebook', label: 'Facebook', icon: Facebook }
];

export const SocialPosterView = () => {
    const [brief, setBrief] = useState('');
    const [platform, setPlatform] = useState('instagram');
    const [format, setFormat] = useState('Square · 1080 × 1080');
    const [hasPreview, setHasPreview] = useState(false);

    const activePlatform = platforms.find(item => item.id === platform) || platforms[0];
    const previewAspect = format.startsWith('Portrait') ? 'aspect-[4/5]' : format.startsWith('Landscape') ? 'aspect-[1.91/1]' : 'aspect-square';

    return (
        <div className="flex h-full flex-col gap-5 pb-24 md:pb-8">
            <AtlasCommandHeader
                eyebrow="Installed app / Marketing"
                title="Social Poster Studio"
                description="Turn an academy update into a focused visual draft sized for the channel you choose."
                icon={Share2}
                badges={<span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-bold text-slate-300">Local draft</span>}
                actions={
                    <AtlasActionButton
                        variant="primary"
                        icon={Sparkles}
                        onClick={() => setHasPreview(true)}
                        disabled={!brief.trim()}
                    >
                        Generate design
                    </AtlasActionButton>
                }
            />

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <AtlasSignalCard label="Channel" value={activePlatform.label} detail="Current publishing target" icon={activePlatform.icon} tone="teal" />
                <AtlasSignalCard label="Format" value={format.split(' · ')[0]} detail={format.split(' · ')[1]} icon={ImageIcon} tone="blue" />
                <AtlasSignalCard label="Brief" value={`${brief.trim().length}/500`} detail="Characters prepared" icon={Type} tone={brief.trim() ? 'amber' : 'slate'} />
                <AtlasSignalCard label="Status" value={hasPreview ? 'Preview' : 'Draft'} detail={hasPreview ? 'Design prepared locally' : 'Waiting for a brief'} icon={hasPreview ? ImageIcon : Sparkles} tone={hasPreview ? 'emerald' : 'slate'} />
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
                <aside className="flex flex-col gap-5 rounded-lg border border-white/10 bg-slate-900/70 p-4">
                    <AtlasSectionHeader title="Creative brief" description="Set the message and publishing target." icon={Type} />

                    <div>
                        <label htmlFor="poster-brief" className="mb-2 block text-xs font-bold text-slate-300">What is this post about?</label>
                        <textarea
                            id="poster-brief"
                            value={brief}
                            maxLength={500}
                            onChange={event => { setBrief(event.target.value); setHasPreview(false); }}
                            className="min-h-36 w-full resize-y rounded-lg border border-white/10 bg-slate-950 p-3 text-sm leading-6 text-white outline-none transition-colors placeholder:text-slate-600 focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/10"
                            placeholder="Announce the new robotics workshop for makers aged 8–12..."
                        />
                        <div className="mt-1 text-right font-mono text-[10px] text-slate-600">{brief.length}/500</div>
                    </div>

                    <fieldset>
                        <legend className="mb-2 text-xs font-bold text-slate-300">Channel</legend>
                        <div className="grid grid-cols-3 gap-2">
                            {platforms.map(item => (
                                <button
                                    key={item.id}
                                    type="button"
                                    title={item.label}
                                    aria-label={`Design for ${item.label}`}
                                    aria-pressed={platform === item.id}
                                    onClick={() => { setPlatform(item.id); setHasPreview(false); }}
                                    className={`flex h-11 items-center justify-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60 ${platform === item.id ? 'border-teal-300/50 bg-teal-400/10 text-teal-200' : 'border-white/10 bg-slate-950 text-slate-500 hover:text-white'}`}
                                >
                                    <item.icon size={17} />
                                </button>
                            ))}
                        </div>
                    </fieldset>

                    <div>
                        <label htmlFor="poster-format" className="mb-2 block text-xs font-bold text-slate-300">Canvas format</label>
                        <select
                            id="poster-format"
                            value={format}
                            onChange={event => { setFormat(event.target.value); setHasPreview(false); }}
                            className="h-10 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none transition-colors focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/10"
                        >
                            <option>Square · 1080 × 1080</option>
                            <option>Portrait · 1080 × 1350</option>
                            <option>Landscape · 1200 × 628</option>
                        </select>
                    </div>

                    <div className="mt-auto grid grid-cols-2 gap-2">
                        <AtlasActionButton icon={CalendarDays} disabled>Schedule</AtlasActionButton>
                        <AtlasActionButton icon={Send} disabled>Publish</AtlasActionButton>
                    </div>
                </aside>

                <section className="flex min-h-[580px] min-w-0 flex-col rounded-lg border border-white/10 bg-slate-950/55 p-3 sm:p-4">
                    <AtlasSectionHeader
                        title="Design canvas"
                        description="Preview remains stable while channel and size change."
                        icon={ImageIcon}
                        actions={
                            <button
                                type="button"
                                title={hasPreview ? 'Download design' : 'Generate a design before downloading'}
                                aria-label="Download design"
                                disabled={!hasPreview}
                                className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition-colors hover:border-teal-300/40 hover:text-teal-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60 disabled:cursor-not-allowed disabled:opacity-35"
                            >
                                <Download size={17} />
                            </button>
                        }
                    />

                    <div className="mt-4 flex min-h-0 flex-1 items-center justify-center overflow-auto rounded-lg border border-white/10 bg-slate-900/60 p-4 sm:p-8">
                        {hasPreview ? (
                            <div className={`relative flex w-full max-w-[500px] overflow-hidden rounded-lg border border-teal-300/20 bg-[#08111F] shadow-2xl shadow-black/30 ${previewAspect}`}>
                                <div className="flex w-full flex-col justify-between p-[8%]">
                                    <div className="flex items-center justify-between gap-4">
                                        <span className="text-xs font-black uppercase text-teal-300">MakerLab Academy</span>
                                        <activePlatform.icon size={18} className="text-slate-400" />
                                    </div>
                                    <div>
                                        <div className="mb-5 h-1 w-16 bg-amber-300" />
                                        <h3 className="line-clamp-4 text-2xl font-black leading-tight text-white sm:text-4xl">{brief.trim()}</h3>
                                        <p className="mt-4 text-sm leading-6 text-slate-400">Learn by building. Create something worth sharing.</p>
                                    </div>
                                    <div className="flex items-center justify-between border-t border-white/10 pt-4 text-[10px] font-bold text-slate-500">
                                        <span>makerlab.academy</span>
                                        <span className="text-amber-200">Enrollment open</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <AtlasEmptyState
                                title="Your social design will appear here"
                                description="Add the announcement, choose a channel, and generate a focused first draft."
                                icon={ImageIcon}
                            />
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
};
