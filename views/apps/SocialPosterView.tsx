
import React from 'react';
import { Sparkles, Image as ImageIcon, Share2 } from 'lucide-react';

export const SocialPosterView = () => {
    return (
        <div className="p-6 max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                    <Share2 size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-white">Social Media AI Poster</h1>
                    <p className="text-slate-400">Generate engagement-ready content for Instagram, LinkedIn, and Facebook.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
                        <label className="block text-sm font-bold text-slate-300 mb-2">What is this post about?</label>
                        <textarea
                            className="w-full h-32 bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-pink-500 outline-none resize-none"
                            placeholder="e.g. Announcing our new Robotics workshop for kids aged 8-12..."
                        ></textarea>
                    </div>

                    <button className="w-full py-3 bg-gradient-to-r from-pink-600 to-rose-600 text-white font-bold rounded-lg shadow-lg hover:opacity-90 transition-all flex items-center justify-center gap-2">
                        <Sparkles size={18} /> Generate Designs
                    </button>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center min-h-[400px] relative overflow-hidden group">
                    <div className="text-center space-y-3 relative z-10">
                        <ImageIcon size={48} className="mx-auto text-slate-700" />
                        <p className="text-slate-600 font-medium">Preview will appear here</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
