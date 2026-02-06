import React, { useEffect, useState, useRef } from 'react';
import './ParentShowcase.css';

interface ParentShowcaseProps {
    onViewProject?: () => void;
    coverImage?: string; // URL for the project cover
}

const ParentShowcase: React.FC<ParentShowcaseProps> = ({ onViewProject, coverImage }) => {
    const [loading, setLoading] = useState(false);
    const [studentName, setStudentName] = useState('');
    const pageRef = useRef<HTMLDivElement>(null);
    const [scale, setScale] = useState(1);

    useEffect(() => {
        // Load html2pdf
        const script = document.createElement('script');
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
        script.async = true;
        document.body.appendChild(script);

        // Load Fonts - Adding Nunito explicitly just in case, plus Bungee
        const link = document.createElement('link');
        link.href = "https://fonts.googleapis.com/css2?family=Bungee&family=Nunito:wght@400;700;900&family=Fira+Code:wght@500;700&display=swap";
        link.rel = "stylesheet";
        document.head.appendChild(link);

        const handleResize = () => {
            if (!pageRef.current) return;
            const containerWidth = document.querySelector('.parent-showcase-body')?.clientWidth || window.innerWidth;
            const padding = containerWidth < 500 ? 10 : 40; // Smaller padding on mobile
            const availableWidth = containerWidth - padding;

            // 210mm is approx 794px at 96dpi
            const baseWidth = 794;

            // Calculate scale to fit width
            let newScale = availableWidth / baseWidth;

            // Cap the scale
            newScale = Math.min(1.2, newScale);

            // For very small screens, ensure it doesn't get ridiculously small, but it MUST fit width to avoid scroll
            // Note: If scale is too small, text might be unreadable, but "filling the page" is the request.
            setScale(newScale);
        };

        window.addEventListener('resize', handleResize);
        setTimeout(handleResize, 100);

        return () => {
            document.body.removeChild(script);
            document.head.removeChild(link);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    const downloadPDF = async () => {
        setLoading(true);
        const element = document.getElementById('poster-canvas');
        const name = studentName || "AI_Author";

        const opt = {
            margin: 0,
            filename: `Storybook_Mission_${name.replace(/\s+/g, '_')}.pdf`,
            image: { type: 'jpeg', quality: 1.0 },
            html2canvas: {
                scale: 2, // Slightly lower scale for speed/memory if cover image is heavy
                useCORS: true,
                letterRendering: true,
                scrollY: 0
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        const html2pdf = (window as any).html2pdf;
        if (html2pdf) {
            try {
                await html2pdf().set(opt).from(element).save();
            } catch (err) {
                console.error("Export Failed", err);
                alert("Failed to export PDF. Please try again.");
            } finally {
                setLoading(false);
            }
        } else {
            console.error("html2pdf library not loaded");
            setLoading(false);
            alert("PDF library not loaded yet. Please wait.");
        }
    };

    return (
        <div className="parent-showcase-body">
            {/* Loading Indicator */}
            {loading && (
                <div id="loading-overlay">
                    <div className="w-16 h-16 border-4 border-t-transparent border-indigo-400 rounded-full animate-spin mb-4"></div>
                    <p className="bungee tracking-widest text-lg text-center">GENERATING YOUR<br />STORYBOOK LOG...</p>
                </div>
            )}

            {/* Toolbar */}
            <div className="no-print w-full max-w-[800px] mb-4 flex flex-wrap justify-between items-center bg-white p-3 sm:p-4 rounded-xl shadow-xl border-2 border-indigo-100 z-50 sticky top-2 sm:top-4 mx-2">
                <div className="flex items-center gap-3 mb-2 sm:mb-0">
                    <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center font-black text-white shadow-md">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
                    </div>
                    <div>
                        <h3 className="bungee text-indigo-700 text-sm sm:text-base leading-none">AI Author</h3>
                        <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest mt-0.5">Parent Portal</p>
                    </div>
                </div>

                <div className="flex gap-2 w-full sm:w-auto justify-end">
                    {onViewProject && (
                        <button
                            onClick={onViewProject}
                            className="flex-1 sm:flex-none justify-center bg-white text-indigo-600 border-2 border-indigo-200 px-3 py-2 rounded-lg font-black hover:bg-indigo-50 hover:border-indigo-300 transition flex items-center gap-2 shadow-sm bungee text-[10px] sm:text-xs whitespace-nowrap"
                        >
                            <span>👀</span>
                            SEE PROJECT
                        </button>
                    )}

                    <button
                        onClick={downloadPDF}
                        disabled={loading}
                        className="flex-1 sm:flex-none justify-center bg-indigo-600 text-white px-4 py-2 rounded-lg font-black hover:bg-indigo-700 hover:scale-105 active:scale-95 transition flex items-center gap-2 shadow-lg hover:shadow-indigo-500/30 bungee text-[10px] sm:text-xs disabled:opacity-50 whitespace-nowrap"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 16v1h16v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        PDF
                    </button>
                </div>
            </div>

            {/* Poster Content Wrapper for Scaling */}
            <div className="page-container">
                <div
                    id="poster-canvas"
                    className="page-a4"
                    ref={pageRef}
                    style={{
                        transform: `scale(${scale})`,
                        marginBottom: `${(scale - 1) * 300}px`
                    }}
                >

                    {/* Header with Cover Integration */}
                    <header className="flex items-start gap-6 mb-8">
                        {/* Cover Image Placeholder / Display */}
                        <div className="w-32 h-40 bg-indigo-100 rounded-lg shadow-lg border-4 border-white transform -rotate-3 overflow-hidden shrink-0 relative flex items-center justify-center group">
                            {coverImage ? (
                                <img src={coverImage} alt="Book Cover" className="w-full h-full object-cover" />
                            ) : (
                                <div className="text-center p-2">
                                    <div className="text-indigo-300 mb-1">
                                        <svg className="w-10 h-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    </div>
                                    <span className="text-[10px] font-black text-indigo-400 uppercase leading-tight block">Your Cover Here</span>
                                </div>
                            )}
                            {/* "Cover" Badge */}
                            <div className="absolute top-2 right-2 w-2 h-2 bg-red-400 rounded-full shadow-sm"></div>
                        </div>

                        <div className="pt-2">
                            <h1 className="bungee text-5xl text-indigo-700 leading-none drop-shadow-sm mb-2">MY AI <br /><span className="text-teal-500">STORYBOOK</span></h1>
                            <div className="flex flex-wrap gap-2">
                                <span className="bg-indigo-600 text-white text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider">Project Complete</span>
                                <span className="bg-amber-400 text-indigo-900 text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider">A+ Execution</span>
                            </div>
                        </div>
                    </header>

                    {/* Mission Goal */}
                    <div className="mb-6 relative">
                        <div className="section-header bungee">🌟 The Creative Mission</div>
                        <div className="fun-card bg-indigo-50/50">
                            <p className="text-sm leading-relaxed font-bold text-indigo-900">
                                I became an <strong>AI-Powered Author!</strong> My mission was to use advanced Artificial Intelligence tools to write, illustrate, and design a real storybook. I learned how to "speak" to computers to bring my imagination to life!
                            </p>
                        </div>
                    </div>

                    {/* Steps */}
                    <div className="grid grid-cols-1 gap-4 mb-6">
                        <div className="fun-card flex gap-4 border-indigo-200">
                            <div className="flex flex-col items-center w-20">
                                <div className="icon-circle">✍️</div>
                                <span className="bungee text-[10px] text-indigo-600">STEP 1</span>
                            </div>
                            <div className="flex-1">
                                <h3 className="bungee text-indigo-700 text-sm">Writing with Gemini</h3>
                                <p className="text-[11px] text-slate-600">I collaborated with <strong>Gemini</strong> to write my plot. I learned <strong>Prompt Engineering</strong> to create exciting characters, funny dialogue, and a world-class adventure!</p>
                            </div>
                            <div className="corner-badge">PROMPT ENGINEER</div>
                        </div>

                        <div className="fun-card flex gap-4 border-teal-200 bg-teal-50/50">
                            <div className="flex flex-col items-center w-20">
                                <div className="icon-circle !bg-teal-600">🖼️</div>
                                <span className="bungee text-[10px] text-teal-600">STEP 2</span>
                            </div>
                            <div className="flex-1">
                                <h3 className="bungee text-teal-700 text-sm">Visuals with Whisk</h3>
                                <p className="text-[11px] text-slate-600">I used <strong>Whisk AI</strong> to generate consistent images. I learned how to keep my characters looking the same on every page by using smart image prompts.</p>
                            </div>
                            <div className="corner-badge !bg-emerald-400 !shadow-emerald-700">ART DIRECTOR</div>
                        </div>

                        <div className="fun-card flex gap-4 border-amber-200 bg-amber-50/50">
                            <div className="flex flex-col items-center w-20">
                                <div className="icon-circle !bg-amber-500">🎨</div>
                                <span className="bungee text-[10px] text-amber-600">STEP 3</span>
                            </div>
                            <div className="flex-1">
                                <h3 className="bungee text-amber-700 text-sm">Design in Canva</h3>
                                <p className="text-[11px] text-slate-600">I used <strong>Canva</strong> to put it all together. I mastered layout design, text wrapping, and professional typography to make my book look like it's from a real bookstore!</p>
                            </div>
                            <div className="corner-badge !bg-sky-400 !shadow-sky-700">GRAPHIC DESIGNER</div>
                        </div>
                    </div>

                    {/* Superpowers Gained & Prompt Logic - Compact Grid */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        {/* Box 1: Skills */}
                        <div className="col-span-2 sm:col-span-1">
                            <div className="section-header bungee mb-2 !text-[0.7rem] !py-1">🚀 Mastered Skills</div>
                            <div className="grid grid-cols-1 gap-2">
                                <div className="p-2 border-2 border-dashed border-indigo-300 rounded-lg flex items-center gap-3 bg-white">
                                    <div className="text-xl">🗣️</div>
                                    <div>
                                        <div className="text-[10px] font-black uppercase text-indigo-800">AI Prompting</div>
                                        <div className="text-[8px] text-slate-500 uppercase font-bold">Talking to Tech</div>
                                    </div>
                                </div>
                                <div className="p-2 border-2 border-dashed border-teal-300 rounded-lg flex items-center gap-3 bg-white">
                                    <div className="text-xl">👁️</div>
                                    <div>
                                        <div className="text-[10px] font-black uppercase text-teal-800">Visuals</div>
                                        <div className="text-[8px] text-slate-500 uppercase font-bold">Consitent Style</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Box 2: Logic */}
                        <div className="col-span-2 sm:col-span-1">
                            <div className="section-header bungee mb-2 !text-[0.7rem] !py-1 !bg-slate-700">🧠 The Code</div>
                            <div className="fun-card bg-slate-900 border-slate-700 shadow-xl h-[95px] flex items-center justify-center p-2">
                                <div className="code-font text-[9px] text-indigo-300 leading-tight w-full">
                                    <span className="text-pink-400">/generate:</span> character_sheet,<br />
                                    boy_adventurer, <span className="text-teal-300">blue_cape</span>,<br />
                                    consistent_face, high_detail,<br />
                                    <span className="text-amber-300">--v 6.0 --ar 3:4</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <footer className="mt-auto border-t-4 border-indigo-500 pt-4 pb-2">
                        <div className="flex justify-between items-end">
                            <div className="w-1/2">
                                <span className="bungee text-xs text-slate-400 block mb-1 text-indigo-800">Creative Author</span>
                                <div className="bg-indigo-50 px-4 py-2 rounded-lg border-2 border-indigo-300">
                                    <input
                                        type="text"
                                        value={studentName}
                                        onChange={(e) => setStudentName(e.target.value)}
                                        className="name-input bungee text-lg text-indigo-700 placeholder-indigo-300 border-none p-0 bg-transparent w-full focus:ring-0"
                                        placeholder="Type Your Name Here..."
                                    />
                                </div>
                            </div>
                            <div className="text-right flex flex-col items-end gap-2">
                                <div className="bg-teal-500 text-white bungee px-4 py-1 text-sm rounded shadow-md transform -rotate-2">MISSION SUCCESS!</div>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">MakerLab Academy • 2026</span>
                            </div>
                        </div>
                    </footer>
                </div>
            </div>
        </div>
    );
};

export default ParentShowcase;
