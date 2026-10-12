import React from 'react';
import { ParentO11Y } from './ParentO11Y';
import './parent-family-loading.css';

/** The shared SparkQuest loading language. Progress is deliberately indeterminate. */
export const ParentFamilyLoading: React.FC<{ audience?: 'family' | 'studio' }> = ({ audience = 'family' }) => <main className="pfl-shell" role="status" aria-live="polite" aria-label={audience === 'family' ? 'Chargement du parcours famille' : 'Chargement de SparkQuest'}>
  <div className="pfl-brand"><span aria-hidden="true">✳</span><strong>sparkquest<span>.</span></strong><small>{audience === 'family' ? 'FAMILLE' : 'ATELIER'}</small></div>
  <section className="pfl-content">
    <div className="pfl-stage" aria-hidden="true"><span className="pfl-orbit pfl-orbit-one" /><span className="pfl-orbit pfl-orbit-two" /><div className="pfl-mascot"><ParentO11Y cue={1} /></div><span className="pfl-spark pfl-spark-one">✳</span><span className="pfl-spark pfl-spark-two">✳</span></div>
    <span className="pfl-kicker">UN PETIT INSTANT</span>
    <h1>{audience === 'family' ? 'On retrouve son univers' : 'Votre atelier s’ouvre'}<span>.</span></h1>
    <p>{audience === 'family' ? 'Ses projets, ses moments et son prochain atelier arrivent.' : 'Vos projets et vos découvertes arrivent.'}</p>
    <div className="pfl-progress" aria-hidden="true"><span /></div>
    <div className="pfl-chips" aria-hidden="true"><span>Projets</span><span>Moments</span><span>Atelier</span></div>
  </section>
</main>;
