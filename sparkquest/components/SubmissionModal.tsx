import React, { useState, useRef } from 'react';
import { RoadmapStep } from '../types';
import { analyzeSubmission } from '../services/gemini';

interface SubmissionModalProps {
  step: RoadmapStep;
  onClose: () => void;
  onSuccess: (xp: number) => void;
}

export const SubmissionModal: React.FC<SubmissionModalProps> = ({ step, onClose, onSuccess }) => {
  const [note, setNote] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note && !file) return;

    setIsSubmitting(true);
    
    // Convert preview to base64 raw string
    let base64Image = undefined;
    if (preview) {
        base64Image = preview.split(',')[1];
    }

    const result = await analyzeSubmission(step.title, note, base64Image);

    setIsSubmitting(false);
    setFeedback(result.feedback);

    if (result.approved) {
      setTimeout(() => {
        onSuccess(step.xpReward);
      }, 3000); 
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden relative animate-float border-[6px] border-slate-100">
        
        {/* Header */}
        <div className="bg-white p-8 pb-4 text-center relative border-b-2 border-slate-100">
          <h2 className="text-3xl font-black text-slate-800 uppercase tracking-wide">Mission Upload</h2>
          <p className="text-blue-500 font-extrabold text-xl mt-2">{step.title}</p>
          <button 
            onClick={onClose} 
            className="absolute top-6 right-6 text-slate-300 hover:text-slate-500 hover:bg-slate-100 p-3 rounded-full transition-colors"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          {feedback ? (
            <div className="text-center py-8">
               <div className="mb-8 inline-flex items-center justify-center w-32 h-32 rounded-full bg-green-100 text-green-500 border-8 border-green-200 animate-bounce">
                 <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7"/></svg>
               </div>
               <h3 className="text-4xl font-black text-slate-800 mb-4">Awesome!</h3>
               <p className="text-slate-600 mb-8 bg-slate-50 p-6 rounded-3xl border-4 border-slate-100 font-bold text-lg leading-relaxed">
                 "{feedback}"
               </p>
               <button className="w-full bg-green-500 border-b-8 border-green-700 text-white font-black py-4 rounded-3xl uppercase tracking-wider text-xl shadow-lg">
                 Level Up!
               </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-blue-50 p-6 rounded-3xl text-blue-900 border-4 border-blue-100">
                <p className="font-bold text-lg">{step.description}</p>
              </div>

              <div>
                <label className="block text-sm font-black text-slate-400 uppercase tracking-wider mb-3">Evidence</label>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="border-4 border-dashed border-slate-300 rounded-3xl p-8 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors bg-slate-50 min-h-[200px]"
                >
                  {preview ? (
                    <img src={preview} alt="Preview" className="h-48 object-cover rounded-2xl shadow-md transform rotate-2" />
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 text-blue-500">
                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                      </div>
                      <span className="text-lg font-bold text-slate-400">Tap here to upload a photo</span>
                    </>
                  )}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    className="hidden" 
                    accept="image/*"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-black text-slate-400 uppercase tracking-wider mb-3">Your Notes</label>
                <textarea
                  className="w-full rounded-3xl border-4 border-slate-200 shadow-sm focus:border-blue-400 focus:ring-0 min-h-[120px] text-lg p-5 font-bold text-slate-600 bg-slate-50"
                  placeholder="I built the chassis using..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting || (!note && !file)}
                className={`w-full py-5 px-6 rounded-3xl font-black text-xl uppercase tracking-wider shadow-md transition-all transform ${
                  isSubmitting || (!note && !file)
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed border-b-8 border-slate-300'
                    : 'bg-green-500 text-white border-b-8 border-green-700 hover:bg-green-400 active:border-b-0 active:translate-y-2'
                }`}
              >
                {isSubmitting ? 'Checking...' : 'Check My Work'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
