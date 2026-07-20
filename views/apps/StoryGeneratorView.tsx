import React, { useState } from 'react';
import { BookOpen, CheckCircle2, Compass, Download, GraduationCap, Sparkles, UserRound, Wand2 } from 'lucide-react';
import {
    AtlasActionButton,
    AtlasCommandHeader,
    AtlasEmptyState,
    AtlasSectionHeader,
    AtlasSignalCard
} from '../../components/atlas/AtlasSurface';

const storyThemes = ['Space', 'Jungle', 'Magic'];

export const StoryGeneratorView = () => {
    const [heroName, setHeroName] = useState('');
    const [theme, setTheme] = useState('Space');
    const [lesson, setLesson] = useState('');
    const [readerLevel, setReaderLevel] = useState('Ages 7–9');
    const [hasStory, setHasStory] = useState(false);

    const resetPreview = () => setHasStory(false);

    return (
        <div className="flex h-full flex-col gap-5 pb-24 md:pb-8">
            <AtlasCommandHeader
                eyebrow="Installed app / Learning"
                title="DreamWeaver Library"
                description="Build a child-led story from one hero, one world, and one lesson worth carrying home."
                icon={BookOpen}
                badges={<span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-bold text-slate-300">Story draft</span>}
                actions={
                    <AtlasActionButton
                        variant="primary"
                        icon={Wand2}
                        onClick={() => setHasStory(true)}
                        disabled={!heroName.trim() || !lesson.trim()}
                    >
                        Generate story
                    </AtlasActionButton>
                }
            />

            <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                <AtlasSignalCard label="Hero" value={heroName.trim() || 'Unnamed'} detail="Lead character" icon={UserRound} tone={heroName.trim() ? 'teal' : 'slate'} />
                <AtlasSignalCard label="World" value={theme} detail="Adventure setting" icon={Compass} tone="blue" />
                <AtlasSignalCard label="Reader" value={readerLevel.replace('Ages ', '')} detail={readerLevel} icon={GraduationCap} tone="amber" />
                <AtlasSignalCard label="Status" value={hasStory ? 'Ready' : 'Draft'} detail={hasStory ? 'Story generated locally' : 'Complete the story brief'} icon={hasStory ? CheckCircle2 : Sparkles} tone={hasStory ? 'emerald' : 'slate'} />
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 xl:grid-cols-[340px_minmax(0,1fr)]">
                <aside className="flex flex-col gap-5 rounded-lg border border-white/10 bg-slate-900/70 p-4">
                    <AtlasSectionHeader title="Story brief" description="Give the generator a simple, teachable direction." icon={Sparkles} />

                    <div>
                        <label htmlFor="story-hero" className="mb-2 block text-xs font-bold text-slate-300">Hero’s name</label>
                        <input
                            id="story-hero"
                            type="text"
                            value={heroName}
                            onChange={event => { setHeroName(event.target.value); resetPreview(); }}
                            className="h-11 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/10"
                            placeholder="Luna the inventor"
                        />
                    </div>

                    <fieldset>
                        <legend className="mb-2 text-xs font-bold text-slate-300">Adventure world</legend>
                        <div className="grid grid-cols-3 gap-2">
                            {storyThemes.map(item => (
                                <button
                                    key={item}
                                    type="button"
                                    aria-pressed={theme === item}
                                    onClick={() => { setTheme(item); resetPreview(); }}
                                    className={`h-10 rounded-lg border px-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60 ${theme === item ? 'border-teal-300/50 bg-teal-400/10 text-teal-200' : 'border-white/10 bg-slate-950 text-slate-500 hover:text-white'}`}
                                >
                                    {item}
                                </button>
                            ))}
                        </div>
                    </fieldset>

                    <div>
                        <label htmlFor="story-lesson" className="mb-2 block text-xs font-bold text-slate-300">Moral or lesson</label>
                        <input
                            id="story-lesson"
                            type="text"
                            value={lesson}
                            onChange={event => { setLesson(event.target.value); resetPreview(); }}
                            className="h-11 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none transition-colors placeholder:text-slate-600 focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/10"
                            placeholder="Curiosity grows when we help each other"
                        />
                    </div>

                    <div>
                        <label htmlFor="reader-level" className="mb-2 block text-xs font-bold text-slate-300">Reader level</label>
                        <select
                            id="reader-level"
                            value={readerLevel}
                            onChange={event => { setReaderLevel(event.target.value); resetPreview(); }}
                            className="h-10 w-full rounded-lg border border-white/10 bg-slate-950 px-3 text-sm text-white outline-none transition-colors focus:border-teal-400/60 focus:ring-2 focus:ring-teal-400/10"
                        >
                            <option>Ages 5–6</option>
                            <option>Ages 7–9</option>
                            <option>Ages 10–12</option>
                        </select>
                    </div>

                    <div className="mt-auto rounded-lg border border-amber-300/15 bg-amber-300/[0.05] p-3 text-xs leading-5 text-amber-100/75">
                        Keep names and lessons short. A clear prompt gives young readers a stronger story arc.
                    </div>
                </aside>

                <section className="flex min-h-[620px] min-w-0 flex-col rounded-lg border border-white/10 bg-slate-950/55 p-3 sm:p-4">
                    <AtlasSectionHeader
                        title="Story page"
                        description="A calm reading canvas with the authoring controls kept nearby."
                        icon={BookOpen}
                        actions={
                            <button
                                type="button"
                                title={hasStory ? 'Download story' : 'Generate a story before downloading'}
                                aria-label="Download story"
                                disabled={!hasStory}
                                className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition-colors hover:border-teal-300/40 hover:text-teal-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400/60 disabled:cursor-not-allowed disabled:opacity-35"
                            >
                                <Download size={17} />
                            </button>
                        }
                    />

                    <div className="mt-4 flex min-h-0 flex-1 items-start justify-center overflow-auto rounded-lg border border-white/10 bg-slate-900/60 p-4 sm:p-8">
                        <article className="aspect-[1/1.294] w-full max-w-[620px] shrink-0 overflow-hidden rounded-sm border border-slate-300 bg-[#F7F1E4] p-[8%] text-slate-900 shadow-2xl shadow-black/30">
                            {hasStory ? (
                                <div className="flex h-full flex-col">
                                    <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-500">
                                        <span>DreamWeaver Library</span>
                                        <span>{readerLevel}</span>
                                    </div>
                                    <div className="mt-[14%]">
                                        <div className="mb-5 h-1 w-16 bg-amber-500" />
                                        <h3 className="text-3xl font-black leading-tight sm:text-5xl">{heroName.trim()} and the {theme} Signal</h3>
                                        <p className="mt-3 text-xs font-bold uppercase text-teal-700">A story about {lesson.trim().toLowerCase()}</p>
                                    </div>
                                    <div className="my-auto space-y-4 text-sm leading-7 text-slate-700 sm:text-base sm:leading-8">
                                        <p>Once, at the edge of a bright {theme.toLowerCase()} workshop, {heroName.trim()} discovered a quiet signal that no one else could hear.</p>
                                        <p>It did not ask for the strongest builder. It asked for someone curious enough to listen, and kind enough to invite a friend.</p>
                                        <p>Together, they learned that {lesson.trim().toLowerCase()}.</p>
                                    </div>
                                    <div className="border-t border-slate-300 pt-4 text-[10px] text-slate-500">Page 1 · MakerLab Academy</div>
                                </div>
                            ) : (
                                <div className="flex h-full items-center justify-center">
                                    <AtlasEmptyState
                                        title="Once upon a time starts here"
                                        description="Name the hero, choose a world, and add the lesson before generating the story."
                                        icon={BookOpen}
                                    />
                                </div>
                            )}
                        </article>
                    </div>
                </section>
            </div>
        </div>
    );
};
