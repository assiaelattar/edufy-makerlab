import React, { useState } from 'react';
import { Plus, Search, Pencil, Archive, RotateCcw, PackageOpen, ReceiptText } from 'lucide-react';
import { Modal } from '../Modal';
import type { CatalogueService, ServiceValues } from '../../types/serviceCatalogue';
import { db } from '../../services/firebase';
import { importDefaultServices, saveCatalogueService } from '../../services/serviceCatalogue';
import './service-catalogue.css';

export function ServiceCataloguePanel({ organizationId, services, currency, onInvoice }: { organizationId: string; services: CatalogueService[]; currency: string; onInvoice: (service?: CatalogueService) => void }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('active');
  const [editing, setEditing] = useState<CatalogueService | null>(null);
  const [values, setValues] = useState<ServiceValues | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const edit = (service?: CatalogueService) => {
    setEditing(service || null); setError('');
    setValues(service ? { name: service.name, description: service.description, category: service.category, quantity: service.quantity, unitLabel: service.unitLabel, unitPrice: service.unitPrice, taxRate: service.taxRate, status: service.status, source: service.source } : { name: '', description: '', category: '', unitLabel: 'Forfait', quantity: 1, unitPrice: null, taxRate: 20, status: 'active', source: '' });
  };
  const run = async (action: () => Promise<unknown>, success: string) => {
    if (busy) return;
    setBusy(true); setError(''); setMessage('');
    try { await action(); setMessage(success); return true; }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Impossible d’enregistrer le service.'); return false; }
    finally { setBusy(false); }
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault(); if (!db || !values) return;
    if (await run(() => saveCatalogueService(db!, organizationId, editing?.id, editing?.version || 0, values), 'Service enregistré.')) setValues(null);
  };
  const filtered = services.filter(service => (status === 'all' || service.status === status) && `${service.name} ${service.description} ${service.category}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  return <section className="service-workspace service-catalogue">
    <header className="service-catalogue__header">
      <div className="service-catalogue__title"><span><PackageOpen size={20} /></span><div><h3>Catalogue de services</h3><p>{services.filter(service => service.status === 'active').length} prestations actives prêtes à facturer</p></div></div>
      <div className="service-actions"><button disabled={busy} onClick={() => db && run(async () => { const count = await importDefaultServices(db!, organizationId); return count; }, 'Catalogue enregistré. Les services existants sont préservés.')}>Importer les services proposés</button><button className="primary" onClick={() => edit()}><Plus size={16} /> Nouveau service</button></div>
    </header>
    <p className="service-catalogue__guidance"><strong>À compléter :</strong> les prestations sans tarif restent visibles mais ne sont pas prêtes à être facturées. La TVA proposée peut être ajustée pour chaque service.</p>
    {error && !values && <p role="alert" className="service-error">{error}</p>}{message && <p role="status" className="service-catalogue__success">{message}</p>}
    <div className="service-catalogue__filters"><label className="service-search"><Search size={17} /><input aria-label="Rechercher un service" placeholder="Rechercher par nom, catégorie ou détail…" value={query} onChange={event => setQuery(event.target.value)} /></label><select aria-label="Statut des services" value={status} onChange={event => setStatus(event.target.value)}><option value="active">Services actifs</option><option value="archived">Services archivés</option><option value="all">Tous les services</option></select></div>
    <div className="service-list">{filtered.map(service => <article className="service-card" key={service.id} data-status={service.status} data-ready={service.unitPrice !== null}><div className="service-card__body"><div className="service-card__meta"><span className="service-tag">{service.category || 'Service'}</span><span className="service-card__status">{service.status === 'archived' ? 'Archivé' : service.unitPrice === null ? 'Tarif requis' : 'Prêt'}</span></div><h4>{service.name}</h4><p className="service-details">{service.description || 'Ajoutez une description pour guider la préparation de la facture.'}</p><div className="service-card__price"><strong>{service.unitPrice === null ? 'Prix à définir' : `${service.unitPrice.toLocaleString('fr-MA')} ${currency} HT`}</strong><span>par {service.unitLabel.toLocaleLowerCase()} · TVA {service.taxRate}%</span></div></div><div className="service-actions service-card__actions"><button aria-label={`Modifier ${service.name}`} onClick={() => edit(service)}><Pencil size={15} /> Modifier</button><button disabled={busy} aria-label={`${service.status === 'active' ? 'Archiver' : 'Activer'} ${service.name}`} onClick={() => db && run(() => saveCatalogueService(db!, organizationId, service.id, service.version, { ...service, status: service.status === 'active' ? 'archived' : 'active' }), service.status === 'active' ? 'Service archivé.' : 'Service activé.')} >{service.status === 'active' ? <Archive size={15} /> : <RotateCcw size={15} />}{service.status === 'active' ? 'Archiver' : 'Activer'}</button>{service.status === 'active' && <button className="primary" onClick={() => onInvoice(service)}><ReceiptText size={15} /> Facturer</button>}</div></article>)}</div>
    {!filtered.length && <div className="service-empty"><PackageOpen size={28} /><strong>Aucun service dans cette vue</strong><span>Modifiez la recherche ou le filtre de statut.</span></div>}
    <Modal designSystem isOpen={Boolean(values)} onClose={() => !busy && setValues(null)} title={editing ? 'Modifier le service' : 'Nouveau service'} size="lg">{values && <form className="service-workspace" onSubmit={save}>
      <fieldset disabled={busy} className="service-form">
        <label>Nom du service<input required maxLength={160} value={values.name} onChange={event => setValues({ ...values, name: event.target.value })} /></label>
        <label>Détails par défaut<textarea rows={4} maxLength={4000} value={values.description} onChange={event => setValues({ ...values, description: event.target.value })} /></label>
        <div className="service-grid"><label>Catégorie<input maxLength={80} value={values.category} onChange={event => setValues({ ...values, category: event.target.value })} /></label><label>Unité<input required maxLength={80} value={values.unitLabel} onChange={event => setValues({ ...values, unitLabel: event.target.value })} /></label></div>
        <div className="service-grid"><label>Quantité par défaut<input required type="number" min="0.01" max="1000000" step="0.01" value={values.quantity} onChange={event => setValues({ ...values, quantity: Number(event.target.value) })} /></label><label>Prix unitaire HT ({currency})<input type="number" min="0" max="1000000000" step="0.01" placeholder="Prix à définir" value={values.unitPrice ?? ''} onChange={event => setValues({ ...values, unitPrice: event.target.value === '' ? null : Number(event.target.value) })} /></label><label>TVA (%)<input required type="number" min="0" max="100" step="0.01" value={values.taxRate} onChange={event => setValues({ ...values, taxRate: Number(event.target.value) })} /></label><label>Statut<select value={values.status} onChange={event => setValues({ ...values, status: event.target.value as ServiceValues['status'] })}><option value="active">Actif</option><option value="archived">Archivé</option></select></label></div>
        <p className="service-note">Les modifications s’appliquent aux prochaines sélections. Les factures déjà émises sont conservées.</p>
        {error && <p role="alert" className="service-error">{error}</p>}
        <div className="service-actions"><button type="button" onClick={() => setValues(null)}>Annuler</button><button className="primary" type="submit">{busy ? 'Enregistrement…' : 'Enregistrer le service'}</button></div>
      </fieldset>
    </form>}</Modal>
  </section>;
}
