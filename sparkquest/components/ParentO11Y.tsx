import React, { useEffect, useRef, useState } from 'react';
import wasmUrl from '@rive-app/webgl2/rive.wasm?url';

const ARTBOARD = 'O11Y-Expression';
const MACHINE = 'O11Y-Expressions';

/** Patgrivet's original 011Y Rive file. A single instance survives parent rerenders. */
export const ParentO11Y: React.FC<{ cue: number }> = ({ cue }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const riveRef = useRef<import('@rive-app/webgl2').Rive | null>(null);
  const hitRef = useRef<import('@rive-app/webgl2').StateMachineInput | null>(null);
  const pauseTimer = useRef<number | null>(null);
  const visibleRef = useRef(true);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);

  const pause = () => {
    if (pauseTimer.current !== null) window.clearTimeout(pauseTimer.current);
    pauseTimer.current = null;
    riveRef.current?.pause();
  };

  const react = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !visibleRef.current || document.hidden) return;
    const rive = riveRef.current;
    const hit = hitRef.current;
    if (!rive || !hit) return;
    if (pauseTimer.current !== null) window.clearTimeout(pauseTimer.current);
    rive.play();
    hit.fire();
    pauseTimer.current = window.setTimeout(pause, 1600);
  };

  useEffect(() => {
    let disposed = false;
    let observer: IntersectionObserver | null = null;
    let resizer: ResizeObserver | null = null;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onVisibility = () => { if (document.hidden) pause(); };
    document.addEventListener('visibilitychange', onVisibility);
    observer = new IntersectionObserver(entries => {
      visibleRef.current = Boolean(entries[0]?.isIntersecting);
      if (!visibleRef.current) pause();
    });
    observer.observe(canvas);
    void import('@rive-app/webgl2').then(({ Rive, RuntimeLoader, Fit, Alignment, Layout, StateMachineInputType }) => {
      if (disposed) return;
      RuntimeLoader.setWasmUrl(wasmUrl);
      RuntimeLoader.setWasmFallbackUrl(null);
      let instance: import('@rive-app/webgl2').Rive;
      instance = new Rive({
        src: '/mascot/011y.riv', canvas, artboard: ARTBOARD, stateMachine: MACHINE,
        autoplay: false, shouldDisableRiveListeners: true, isTouchScrollEnabled: true,
        layout: new Layout({ fit: Fit.Cover, alignment: Alignment.Center }),
        onLoad: () => {
          if (disposed) return;
          setReady(true);
          riveRef.current = instance;
          instance.volume = 0;
          instance.resizeDrawingSurfaceToCanvas();
          const inputs = instance.stateMachineInputs(MACHINE) || [];
          canvas.dataset.riveInputs = inputs.map(input => `${input.name}:${input.type}`).join(',');
          hitRef.current = inputs.find(input => input.name === 'Hit' && input.type === StateMachineInputType.Trigger) || null;
          resizer = new ResizeObserver(() => instance.resizeDrawingSurfaceToCanvas());
          resizer.observe(canvas);
          if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && visibleRef.current && !document.hidden) {
            instance.play();
            hitRef.current?.fire();
            pauseTimer.current = window.setTimeout(pause, 1600);
          }
        },
        onLoadError: () => { if (!disposed) setFailed(true); },
      });
      riveRef.current = instance;
    }).catch(() => { if (!disposed) setFailed(true); });
    return () => {
      disposed = true;
      document.removeEventListener('visibilitychange', onVisibility);
      observer?.disconnect();
      resizer?.disconnect();
      if (pauseTimer.current !== null) window.clearTimeout(pauseTimer.current);
      riveRef.current?.cleanup();
      riveRef.current = null;
      hitRef.current = null;
    };
  }, []);

  useEffect(() => { if (cue > 0) react(); }, [cue]);

  return <div className="sq-parent-o11y" aria-label="011Y, le compagnon du parcours">
    <div className="sq-parent-o11y-art"><canvas ref={canvasRef} aria-hidden="true" /></div>
    {(!ready || failed) && <span className="sq-parent-o11y-fallback" aria-hidden="true">✳</span>}
  </div>;
};
