import { useEffect, useRef, useState } from 'react';

type SoundCue = 'open' | 'step' | 'navigate' | 'celebrate';
const STORAGE_KEY = 'sparkquest:parent-sound:v1';

const readPreference = () => {
  try { return window.localStorage.getItem(STORAGE_KEY) === 'on'; }
  catch { return false; }
};

/** Short, quiet UI cues. Audio is created only after a parent enables sound. */
export const useParentSound = () => {
  const [enabled, setEnabled] = useState(readPreference);
  const contextRef = useRef<AudioContext | null>(null);

  useEffect(() => () => { void contextRef.current?.close(); contextRef.current = null; }, []);

  const play = (cue: SoundCue, force = false) => {
    if ((!enabled && !force) || document.hidden) return;
    try {
      const context = contextRef.current || new AudioContext();
      contextRef.current = context;
      if (context.state === 'suspended') void context.resume();
      const notes = cue === 'celebrate' ? [523, 659, 784]
        : cue === 'open' ? [440, 587] : cue === 'step' ? [587, 740] : [520];
      const start = context.currentTime + .015;
      notes.forEach((frequency, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        const at = start + index * .075;
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, at);
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.exponentialRampToValueAtTime(.032, at + .012);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + .13);
        oscillator.connect(gain).connect(context.destination);
        oscillator.start(at);
        oscillator.stop(at + .14);
      });
    } catch { /* Audio is optional; the action still works if sound is unavailable. */ }
  };

  const toggle = () => {
    const next = !enabled;
    setEnabled(next);
    try { window.localStorage.setItem(STORAGE_KEY, next ? 'on' : 'off'); } catch { /* private browsing */ }
    if (next) play('open', true);
  };

  return { enabled, toggle, play };
};
