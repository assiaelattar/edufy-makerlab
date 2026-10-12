import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, Download, Share2, X } from 'lucide-react';
import { ParentO11Y } from './ParentO11Y';
import './parent-install-invitation.css';

interface Props {
  nativeReady: boolean;
  onInstall: () => Promise<void>;
  onDismiss: () => void;
}

const isAppleMobile = () => /iPhone|iPad|iPod/i.test(navigator.userAgent)
  || (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1);

export const ParentInstallInvitation: React.FC<Props> = ({ nativeReady, onInstall, onDismiss }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [showSteps, setShowSteps] = useState(false);
  const appleMobile = isAppleMobile();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    return () => { if (dialog?.open) dialog.close(); };
  }, []);

  return <dialog ref={dialogRef} className="pf-install-dialog" aria-labelledby="pf-install-title" aria-describedby="pf-install-description" onCancel={event => { event.preventDefault(); onDismiss(); }}>
    <button type="button" className="pf-install-close" onClick={onDismiss} aria-label="Plus tard"><X size={20} /></button>
    <div className="pf-install-hero">
      <div className="pf-install-orbit pf-install-orbit-one" /><div className="pf-install-orbit pf-install-orbit-two" />
      <span className="pf-install-spark pf-install-spark-one">✳</span><span className="pf-install-spark pf-install-spark-two">✦</span>
      <ParentO11Y cue={0} />
      <span className="pf-install-app-icon" aria-hidden="true">✳</span>
    </div>
    <div className="pf-install-content">
      <span className="pf-install-kicker">VOTRE ESPACE FAMILLE, À PORTÉE DE MAIN</span>
      <h2 id="pf-install-title">Son aventure vous suit partout<span>.</span></h2>
      <p id="pf-install-description">Ajoutez SparkQuest Famille à votre écran d’accueil pour retrouver ses projets et son prochain atelier en un geste.</p>
      {showSteps && <div className="pf-install-steps" role="status">
        {appleMobile ? <><strong>Sur iPhone ou iPad</strong><p>Ouvrez cette page dans Safari, touchez <Share2 size={16} aria-label="Partager" /> <b>Partager</b>, puis <b>Sur l’écran d’accueil</b> et <b>Ajouter</b>.</p></>
          : <><strong>Depuis votre navigateur</strong><p>Ouvrez son menu et choisissez <b>Installer l’application</b> ou <b>Ajouter à l’écran d’accueil</b>.</p></>}
      </div>}
      <button type="button" className="pf-install-primary" onClick={() => { if (nativeReady) void onInstall(); else if (showSteps) onDismiss(); else setShowSteps(true); }}>
        {nativeReady ? <Download size={20} /> : <Share2 size={20} />}
        {nativeReady ? 'Installer l’application' : showSteps ? 'J’ai compris' : 'Voir comment l’installer'}
        <ArrowRight size={19} />
      </button>
      <button type="button" className="pf-install-later" onClick={onDismiss}>Plus tard</button>
      <small>Une connexion est nécessaire pour consulter les informations de votre famille.</small>
    </div>
  </dialog>;
};
