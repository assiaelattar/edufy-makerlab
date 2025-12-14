import React from 'react';

export const StyleGuide: React.FC = () => {
  return (
    <div className="h-full w-full bg-slate-900 overflow-y-auto text-slate-200 p-8 selection:bg-blue-500 selection:text-white">
      
      {/* Background Decor (Same as App) */}
      <div className="fixed inset-0 z-0 opacity-20 pointer-events-none">
         <svg width="100%" height="100%"><pattern id="cosmic-grid" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M 60 0 L 0 0 0 60" fill="none" stroke="#60a5fa" strokeWidth="1"/></pattern><rect width="100%" height="100%" fill="url(#cosmic-grid)" /></svg>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto space-y-16 pb-20">
        
        {/* Header */}
        <div className="text-center space-y-4">
            <h1 className="text-5xl font-black uppercase tracking-tight text-white flex items-center justify-center gap-4">
                <span className="text-6xl">🪐</span> Cosmic Theme Guide
            </h1>
            <p className="text-blue-400 font-bold text-xl uppercase tracking-widest">Design System & Engineering Breakdown</p>
        </div>

        {/* 1. Color Palette */}
        <section className="space-y-6">
            <h2 className="text-3xl font-black border-b border-slate-700 pb-4">1. Color Palette</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="space-y-2">
                    <div className="h-24 rounded-2xl bg-slate-900 border border-slate-700 shadow-lg"></div>
                    <p className="font-bold">Space Black</p>
                    <code className="text-xs text-slate-500">bg-slate-900</code>
                </div>
                <div className="space-y-2">
                    <div className="h-24 rounded-2xl bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.5)]"></div>
                    <p className="font-bold text-blue-400">Plasma Blue</p>
                    <code className="text-xs text-slate-500">bg-blue-500</code>
                </div>
                <div className="space-y-2">
                    <div className="h-24 rounded-2xl bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.5)]"></div>
                    <p className="font-bold text-green-400">Success Green</p>
                    <code className="text-xs text-slate-500">bg-green-500</code>
                </div>
                <div className="space-y-2">
                    <div className="h-24 rounded-2xl bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.5)]"></div>
                    <p className="font-bold text-indigo-400">Deep Space</p>
                    <code className="text-xs text-slate-500">bg-indigo-500</code>
                </div>
                <div className="space-y-2">
                    <div className="h-24 rounded-2xl bg-slate-800 border border-slate-700"></div>
                    <p className="font-bold text-slate-400">Hull Gray</p>
                    <code className="text-xs text-slate-500">bg-slate-800</code>
                </div>
            </div>
        </section>

        {/* 2. Typography */}
        <section className="space-y-6">
            <h2 className="text-3xl font-black border-b border-slate-700 pb-4">2. Typography</h2>
            <div className="space-y-4 bg-slate-800/50 p-8 rounded-3xl border border-white/5 backdrop-blur-sm">
                <div>
                    <h1 className="text-4xl font-black uppercase tracking-tight text-white">Headline XL (Nunito Black)</h1>
                    <code className="text-xs text-slate-500">font-black uppercase tracking-tight</code>
                </div>
                <div>
                    <h2 className="text-2xl font-black uppercase tracking-wider text-blue-400">Subheader / Label</h2>
                    <code className="text-xs text-slate-500">font-black uppercase tracking-wider</code>
                </div>
                <div>
                    <p className="text-lg font-bold text-slate-300">Body text is bold by default to maintain legibility against dark backgrounds. It uses a softer white (slate-300) to reduce eye strain.</p>
                    <code className="text-xs text-slate-500">font-bold text-slate-300</code>
                </div>
            </div>
        </section>

        {/* 3. Interactive Elements */}
        <section className="space-y-6">
            <h2 className="text-3xl font-black border-b border-slate-700 pb-4">3. UI Components</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Buttons */}
                <div className="space-y-6">
                    <h3 className="text-xl font-bold text-slate-400 uppercase">3D Buttons</h3>
                    <div className="flex gap-4 items-end">
                        <button className="relative w-32 h-32 rounded-[2.5rem] bg-blue-500 border-b-[8px] border-blue-700 flex items-center justify-center text-4xl shadow-[0_0_30px_rgba(59,130,246,0.6)] hover:scale-105 transition-transform">
                            🚀
                            <div className="absolute top-4 left-4 w-6 h-3 bg-white opacity-20 rounded-full rotate-45 pointer-events-none"></div>
                        </button>
                        <button className="relative w-24 h-24 rounded-[2rem] bg-slate-800 border-b-[8px] border-slate-900 flex items-center justify-center text-2xl text-slate-600 grayscale opacity-50 cursor-not-allowed">
                            🔒
                        </button>
                    </div>
                    <p className="text-sm text-slate-500">
                        Uses <code>border-b-[8px]</code> to simulate depth. On <code>:active</code>, the border width reduces to 0 and <code>translate-y</code> increases, mimicking a physical press.
                    </p>
                </div>

                {/* Modals/Cards */}
                <div className="space-y-6">
                    <h3 className="text-xl font-bold text-slate-400 uppercase">Glass Panels</h3>
                    <div className="bg-slate-900/60 backdrop-blur-md p-6 rounded-3xl border border-white/10 shadow-xl">
                        <h4 className="text-xl font-black text-white mb-2">Glassmorphism Container</h4>
                        <p className="text-slate-400 text-sm">
                            Created using <code>bg-slate-900/60</code> and <code>backdrop-blur-md</code>. 
                            This allows the star particles to drift visibly behind the UI.
                        </p>
                    </div>
                </div>
            </div>
        </section>

        {/* 4. Roadmap Implementation Logic */}
        <section className="space-y-8">
            <h2 className="text-3xl font-black border-b border-slate-700 pb-4">4. Roadmap Mechanics</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h3 className="text-xl font-bold text-blue-400 mb-4">A. The "Zig-Zag" Grid</h3>
                    <p className="text-slate-300 mb-4">
                        Nodes are placed in a flex container. We create the wave effect by applying a CSS transform to every odd child.
                    </p>
                    <div className="bg-slate-800 p-4 rounded-xl font-mono text-xs text-green-400 overflow-x-auto">
{`{nodes.map((node, i) => (
  <div 
    className={
      i % 2 === 0 
        ? '-translate-y-0' 
        : 'translate-y-10' // Moves odd nodes down 40px
    }
  >
    <Node />
  </div>
))}`}
                    </div>
                </div>

                <div>
                    <h3 className="text-xl font-bold text-blue-400 mb-4">B. The SVG Bezier Path</h3>
                    <p className="text-slate-300 mb-4">
                        The line connecting nodes is calculated dynamically. We use a Cubic Bezier Curve (<code>C</code>) to smooth the transition between the zig-zag heights.
                    </p>
                    <div className="relative h-32 bg-slate-800 rounded-xl overflow-hidden border border-slate-700">
                        <svg className="absolute inset-0 w-full h-full">
                            {/* Visualization of the curve logic */}
                            <path d="M 50 40 C 150 40, 150 90, 250 90" stroke="#3b82f6" strokeWidth="4" fill="none" />
                            
                            {/* Points */}
                            <circle cx="50" cy="40" r="4" fill="white" />
                            <text x="50" y="30" fill="white" fontSize="10" textAnchor="middle">Start</text>

                            <circle cx="250" cy="90" r="4" fill="white" />
                            <text x="250" y="110" fill="white" fontSize="10" textAnchor="middle">End</text>

                            {/* Control Points */}
                            <line x1="50" y1="40" x2="150" y2="40" stroke="rgba(255,255,255,0.2)" strokeDasharray="4" />
                            <circle cx="150" cy="40" r="3" fill="gray" />
                            <text x="150" y="35" fill="gray" fontSize="8" textAnchor="middle">CP1 (Mid X, Start Y)</text>

                            <line x1="250" y1="90" x2="150" y2="90" stroke="rgba(255,255,255,0.2)" strokeDasharray="4" />
                            <circle cx="150" cy="90" r="3" fill="gray" />
                            <text x="150" y="105" fill="gray" fontSize="8" textAnchor="middle">CP2 (Mid X, End Y)</text>
                        </svg>
                    </div>
                </div>
            </div>
        </section>

      </div>
    </div>
  );
};
