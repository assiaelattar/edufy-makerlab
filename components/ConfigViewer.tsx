import React from 'react';
import { Copy, Check } from 'lucide-react';
import { FirebaseConfig } from '../services/firebase';

interface ConfigViewerProps {
  config: FirebaseConfig;
}

export const ConfigViewer: React.FC<ConfigViewerProps> = ({ config }) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    const text = JSON.stringify(config, null, 2);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-6 rounded-lg border border-slate-800 overflow-hidden bg-slate-950">
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Loaded Configuration
        </h3>
        <button 
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied' : 'Copy JSON'}
        </button>
      </div>
      <div className="p-4 overflow-x-auto">
        <pre className="font-mono text-xs leading-relaxed text-slate-300">
          {Object.entries(config).map(([key, rawValue]) => {
            const value = rawValue as string;
            return (
              <div key={key} className="flex">
                <span className="text-blue-400 min-w-[140px]">{key}:</span>
                <span className="text-amber-200">
                  "{key === 'apiKey' 
                    ? value.substring(0, 8) + '...' + value.substring(value.length - 4) 
                    : value}"
                </span>
              </div>
            );
          })}
        </pre>
      </div>
      <div className="px-4 py-2 bg-slate-900/50 border-t border-slate-800">
         <p className="text-[10px] text-slate-500">
           * API Key is masked for security in display only.
         </p>
      </div>
    </div>
  );
};