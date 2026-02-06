
import React from 'react';
import { BookOpen, Sparkles, Image as ImageIcon, Wand2 } from 'lucide-react';

export const StoryGeneratorView = () => {
    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center text-white shadow-lg">
                    <BookOpen size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">DreamWeaver Library</h1>
                    <p className="text-slate-400">Collaborative story generation for kids, by kids.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-2">Hero's Name</label>
                            <input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white outline-none focus:border-amber-500" placeholder="e.g. Luna the Fox" />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-2">Adventure Theme</label>
                            <div className="grid grid-cols-3 gap-2">
                                <button className="p-2 border border-amber-500/50 bg-amber-950/20 text-amber-500 rounded-lg text-xs font-bold">Space</button>
                                <button className="p-2 border border-slate-800 bg-slate-950 text-slate-400 rounded-lg text-xs font-bold hover:bg-slate-800">Jungle</button>
                                <button className="p-2 border border-slate-800 bg-slate-950 text-slate-400 rounded-lg text-xs font-bold hover:bg-slate-800">Magic</button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-300 mb-2">Moral / Lesson</label>
                            <input type="text" className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white outline-none focus:border-amber-500" placeholder="e.g. Kindness wins" />
                        </div>
                    </div>

                    <button className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-xl shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 text-lg">
                        <Wand2 size={20} /> Generate Story
                    </button>
                </div>

                <div className="bg-slate-50 rounded-xl p-8 min-h-[500px] relative shadow-inner rotate-1 transform transition-transform hover:rotate-0">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/paper.png')] opacity-50 pointer-events-none"></div>

                    <div className="text-center mt-20 opacity-30">
                        <BookOpen size={64} className="mx-auto text-slate-400 mb-4" />
                        <h3 className="text-2xl font-serif text-slate-800 font-bold">Once upon a time...</h3>
                        <p className="text-slate-500 font-serif italic mt-2">Your story will appear here</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
