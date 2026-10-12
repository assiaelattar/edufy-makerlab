import React from 'react';
import { AlertCircle, ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck } from 'lucide-react';
import { ParentO11Y } from './ParentO11Y';
import './parent-login.css';

interface Props {
  email: string;
  password: string;
  error: string;
  loading: boolean;
  showPassword: boolean;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onShowPasswordChange: () => void;
  onSubmit: (event: React.FormEvent) => void;
}

export const ParentLoginView: React.FC<Props> = ({ email, password, error, loading, showPassword, onEmailChange, onPasswordChange, onShowPasswordChange, onSubmit }) =>
  <main className="sq-parent-login">
    <header className="sq-parent-login-header">
      <div className="sq-parent-login-brand"><span aria-hidden="true">✳</span><strong>sparkquest<span>.</span></strong><small>FAMILLE</small></div>
      <a href="/#login">Espace élève <ArrowRight size={16} aria-hidden="true" /></a>
    </header>
    <div className="sq-parent-login-layout">
      <section className="sq-parent-login-hero" aria-labelledby="parent-login-heading">
        <span className="sq-parent-login-eyebrow">LE LIEN AVEC SON ATELIER</span>
        <h1 id="parent-login-heading">Leurs idées, <em>près de vous.</em></h1>
        <p>Les projets, les moments partagés et le prochain atelier de votre enfant, au même endroit.</p>
        <div className="sq-parent-login-orbit" aria-hidden="true" />
        <div className="sq-parent-login-mascot"><ParentO11Y cue={0} mood="welcome" /><span aria-hidden="true">✦</span></div>
      </section>
      <section className="sq-parent-login-panel" aria-labelledby="parent-login-form-title">
        <div className="sq-parent-login-form-head"><span className="sq-parent-login-step">01 / VOTRE ESPACE FAMILLE</span><h2 id="parent-login-form-title">On se retrouve&nbsp;?</h2><p>Connectez-vous avec l’identifiant et le mot de passe remis par MakerLab.</p></div>
        {error && <p className="sq-parent-login-error" role="alert"><AlertCircle size={19} aria-hidden="true" />{error}</p>}
        <form className="sq-parent-login-form" onSubmit={onSubmit}>
          <label htmlFor="parent-login-email">Identifiant MakerLab</label>
          <input id="parent-login-email" type="email" inputMode="email" autoComplete="username" placeholder="p.nom@makerlab.academy" value={email} onChange={event => onEmailChange(event.target.value)} required />
          <label htmlFor="parent-login-password">Mot de passe</label>
          <div className="sq-parent-login-password"><LockKeyhole size={19} aria-hidden="true" /><input id="parent-login-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={event => onPasswordChange(event.target.value)} required /><button type="button" onClick={onShowPasswordChange} aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>{showPassword ? <EyeOff size={19} /> : <Eye size={19} />}</button></div>
          <button className="sq-parent-login-submit" type="submit" disabled={loading}>{loading ? 'Connexion en cours…' : <>Entrer dans mon espace <ArrowRight size={20} aria-hidden="true" /></>}</button>
        </form>
        <p className="sq-parent-login-help">Mot de passe oublié&nbsp;? Demandez une nouvelle remise sécurisée à l’équipe MakerLab.</p>
        <p className="sq-parent-login-trust"><ShieldCheck size={19} aria-hidden="true" /> Seuls les enfants reliés à votre compte sont visibles.</p>
      </section>
    </div>
  </main>;
