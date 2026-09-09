import React, { useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Modal } from '../Modal';
import type { AppSettings, FinanceDocument } from '../../types';
import type { FinanceCustomerSnapshot } from '../../types/finance';
import type { CatalogueService } from '../../types/serviceCatalogue';
import { snapshotService, type ServiceInvoiceLine } from '../../utils/serviceCatalogue';
import { issueFinanceInvoice, normalizeLines } from '../../services/financeDocuments';
import { generateFinanceDocument } from '../../utils/financeDocumentGenerator';
import { db } from '../../services/firebase';
import './service-catalogue.css';

interface Props {
  organizationId: string;
  services: CatalogueService[];
  documents: FinanceDocument[];
  settings: AppSettings;
  initialService?: CatalogueService;
  onClose: () => void;
  onIssued: (invoice: FinanceDocument) => void;
}
const blankCustomer = (): FinanceCustomerSnapshot => ({ type: 'company', name: '', address: '', contactName: '', email: '', phone: '', ice: '', rc: '' });
export function ServiceInvoiceModal({ organizationId, services, documents, settings, initialService, onClose, onIssued }: Props) {
  const [customer, setCustomer] = useState(blankCustomer);
  const [clientSearch, setClientSearch] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');
  const [lines, setLines] = useState<Array<ServiceInvoiceLine & { key: string }>>(() => initialService ? [{ ...snapshotService(initialService, organizationId), key: crypto.randomUUID() }] : []);
  const [dates, setDates] = useState(() => { const date = new Date().toISOString().slice(0, 10); return { issueDate: date, dueDate: date, serviceDate: date }; });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [review, setReview] = useState(false);
  const [issued, setIssued] = useState<FinanceDocument | null>(null);
  const saving = useRef(false);
  // Retained on ambiguous network failure; retry cannot consume another invoice number.
  const idempotencyKey = useRef(`service-${crypto.randomUUID()}`);
  const currency = settings.currency || 'MAD';
  const money = (amount: number) => new Intl.NumberFormat('fr-MA', { style: 'currency', currency }).format(amount);
  const clients = [...new Map(documents.filter(record => record.organizationId === organizationId).map(record => [JSON.stringify(record.customer), record.customer])).values()];
  let normalized: ReturnType<typeof normalizeLines> = [];
  try { normalized = normalizeLines(lines); } catch { /* Invalid drafts show no misleading totals. */ }
  const subtotal = Math.round(normalized.reduce((sum, line) => sum + line.subtotal, 0) * 100) / 100;
  const taxAmount = Math.round(normalized.reduce((sum, line) => sum + line.taxAmount, 0) * 100) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;
  const updateLine = (key: string, change: Partial<ServiceInvoiceLine>) => setLines(previous => previous.map(line => line.key === key ? { ...line, ...change } : line));
  const buildInput = () => ({ organizationId, ...dates, currency, customer: { ...customer, name: customer.name.trim(), ice: customer.type === 'company' ? customer.ice : undefined, rc: customer.type === 'company' ? customer.rc : undefined }, participants: [], idempotencyKey: idempotencyKey.current, lines: lines.map(({ key, ...line }) => ({ ...line, unitKind: 'package' as const, calculationMode: 'manual' as const })) });
  const validate = () => {
    if (!customer.name.trim()) throw new Error('Saisissez ou sélectionnez le client à facturer.');
    if (!lines.length || lines.some(line => !line.description.trim())) throw new Error('Ajoutez au moins un service avec une désignation.');
    normalizeLines(lines);
    if (!dates.issueDate || !dates.serviceDate || !dates.dueDate || dates.dueDate < dates.issueDate) throw new Error('Vérifiez les dates de la facture.');
  };
  const preview = () => {
    try {
      validate(); const input = buildInput();
      const record: FinanceDocument = { ...input, id: 'preview', kind: 'invoice', status: 'issued', number: 'APERÇU — NON ÉMISE', sequenceYear: Number(dates.issueDate.slice(0, 4)), sequenceNumber: 0, lines: normalizeLines(input.lines), subtotal, taxAmount, total };
      if (!generateFinanceDocument(record, settings, { preview: true })) setError('Autorisez les fenêtres contextuelles pour ouvrir l’aperçu.');
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Vérifiez la facture.'); }
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); if (saving.current) return;
    setError('');
    try {
      validate();
      if (!review) { setReview(true); return; }
      if (!db) throw new Error('Connexion indisponible.');
      saving.current = true; setBusy(true);
      const invoice = await issueFinanceInvoice(db, buildInput());
      setIssued(invoice); onIssued(invoice);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Facture non enregistrée. Réessayez.'); }
    finally { saving.current = false; setBusy(false); }
  };
  return <Modal isOpen onClose={() => !busy && onClose()} title={issued ? `Facture ${issued.number} émise` : 'Nouvelle facture de services'} size="xl">
    <div className="service-workspace">{issued ? <><p role="status">La facture {issued.number} est enregistrée dans l’historique.</p><div className="service-totals"><span>{issued.customer.name}</span><strong>{money(issued.total)} TTC</strong></div><div className="service-actions"><button onClick={onClose}>Fermer</button><button className="primary" onClick={() => { if (!generateFinanceDocument(issued, settings)) setError('Autorisez les fenêtres contextuelles pour ouvrir le PDF.'); }}>Imprimer / PDF</button></div></> : <form onSubmit={submit} className="service-form">
      <div className="service-steps"><strong>{review ? '3 · Vérification et émission' : '1 · Client'}</strong><span>2 · Services et détails</span>{!review && <span>3 · Aperçu et émission</span>}</div>
      {review ? <>
        <div className="service-card"><h4>{customer.name}</h4><p>{customer.address}</p><p className="service-note">Facture du {dates.issueDate} · Échéance {dates.dueDate}</p></div>
        {lines.map(line => <div className="service-card" key={line.key}><h4>{line.description}</h4><p className="service-details">{line.details}</p><p>{line.quantity} × {money(line.unitPrice)} HT · {line.unitLabel} · TVA {line.taxRate}%</p></div>)}
        <p className="service-note">À l’émission, le numéro définitif est attribué et la facture est conservée. Toute correction ultérieure passe par un avoir.</p>
      </> : <fieldset disabled={busy} className="service-form">
        <div className="service-grid"><label>Rechercher un client<input value={clientSearch} onChange={event => setClientSearch(event.target.value)} placeholder="Client d’une facture précédente" /></label><label>Choisir un client existant<select value="" onChange={event => { const found = clients[Number(event.target.value)]; if (found) setCustomer({ ...found }); }}><option value="">Nouveau client / sélection…</option>{clients.map((client, index) => ({ client, index })).filter(({ client }) => `${client.name} ${client.ice || ''} ${client.email || ''}`.toLowerCase().includes(clientSearch.toLowerCase())).map(({ client, index }) => <option key={index} value={index}>{client.name}{client.ice ? ` · ${client.ice}` : ''}{client.address ? ` · ${client.address}` : ''}</option>)}</select></label></div>
        <div className="service-grid"><label>Type de client<select value={customer.type} onChange={event => setCustomer({ ...customer, type: event.target.value as FinanceCustomerSnapshot['type'] })}><option value="company">Entreprise</option><option value="individual">Particulier</option></select></label><label>Client à facturer<input required maxLength={200} value={customer.name} onChange={event => setCustomer({ ...customer, name: event.target.value })} /></label></div>
        <details className="service-billing-details"><summary>Coordonnées et dates · facture du {dates.issueDate}</summary><div className="service-form">
        <label>Adresse de facturation<input maxLength={500} value={customer.address || ''} onChange={event => setCustomer({ ...customer, address: event.target.value })} /></label>
        <div className="service-grid"><label>Contact<input maxLength={200} value={customer.contactName || ''} onChange={event => setCustomer({ ...customer, contactName: event.target.value })} /></label><label>E-mail<input type="email" value={customer.email || ''} onChange={event => setCustomer({ ...customer, email: event.target.value })} /></label>{customer.type === 'company' && <><label>ICE<input value={customer.ice || ''} onChange={event => setCustomer({ ...customer, ice: event.target.value })} /></label><label>RC<input value={customer.rc || ''} onChange={event => setCustomer({ ...customer, rc: event.target.value })} /></label></>}</div>
        <div className="service-grid">{(['issueDate', 'dueDate', 'serviceDate'] as const).map((key, index) => <label key={key}>{['Date de facture', 'Échéance', 'Date de prestation'][index]}<input required type="date" min={key === 'dueDate' ? dates.issueDate : '2000-01-01'} max="9999-12-31" value={dates[key]} onChange={event => setDates({ ...dates, [key]: event.target.value })} /></label>)}</div>
        </div></details>
        <div className="service-line"><h4>Services à facturer</h4><label>Rechercher dans le catalogue<input placeholder="Nom, catégorie ou détail" value={serviceSearch} onChange={event => setServiceSearch(event.target.value)} /></label><label>Ajouter un service<select value="" onChange={event => { const service = services.find(item => item.id === event.target.value); if (service) setLines(previous => [...previous, { ...snapshotService(service, organizationId), key: crypto.randomUUID() }]); }}><option value="">Sélectionner un service actif…</option>{services.filter(service => service.status === 'active' && `${service.name} ${service.category} ${service.description}`.toLowerCase().includes(serviceSearch.toLowerCase())).map(service => <option value={service.id} key={service.id}>{service.name}{service.unitPrice === null ? ' · Prix à définir' : ` · ${money(service.unitPrice)} HT`}</option>)}</select></label><p className="service-note">Chaque sélection copie les valeurs du catalogue. Adaptez les détails et le prix à cette mission.</p></div>
        {lines.map((line, index) => <div className="service-line" key={line.key}>
          <div className="service-toolbar"><h4>Service {index + 1}</h4><button type="button" aria-label={`Retirer le service ${index + 1}`} onClick={() => setLines(previous => previous.filter(item => item.key !== line.key))}><Trash2 size={16} /> Retirer</button></div>
          <label>Désignation {index + 1}<input required maxLength={200} value={line.description} onChange={event => updateLine(line.key, { description: event.target.value })} /></label>
          <label>Détails {index + 1}<textarea aria-label={`Détails ${index + 1}`} rows={3} maxLength={4000} value={line.details || ''} onChange={event => updateLine(line.key, { details: event.target.value })} /></label>
          <div className="service-grid"><label>Quantité {index + 1}<input required type="number" min="0.01" max="1000000" step="0.01" value={line.quantity || ''} onChange={event => updateLine(line.key, { quantity: Number(event.target.value) })} /></label><label>Prix unitaire HT {index + 1} ({currency})<input required type="number" min="0.01" max="1000000000" step="0.01" placeholder="Prix à définir" value={line.unitPrice || ''} onChange={event => updateLine(line.key, { unitPrice: Number(event.target.value) })} /></label><label>Unité {index + 1}<input required maxLength={80} value={line.unitLabel || ''} onChange={event => updateLine(line.key, { unitLabel: event.target.value })} /></label><label>TVA {index + 1} (%)<input required type="number" min="0" max="100" step="0.01" value={line.taxRate} onChange={event => updateLine(line.key, { taxRate: Number(event.target.value) })} /></label></div>
        </div>)}
      </fieldset>}
      <div className="service-totals"><span>{normalized.length === lines.length && lines.length ? `HT ${money(subtotal)} · TVA ${money(taxAmount)}` : 'Complétez les services et leurs prix pour calculer le total.'}</span><strong>{normalized.length === lines.length && lines.length ? `${money(total)} TTC` : '—'}</strong></div>
      <div className="service-actions">{review ? <><button type="button" disabled={busy} onClick={() => setReview(false)}>Modifier</button><button type="button" disabled={busy} onClick={preview}>Aperçu / PDF</button></> : <button type="button" onClick={onClose}>Annuler</button>}<button className="primary" type="submit" disabled={busy || !lines.length}>{busy ? 'Émission…' : review ? 'Émettre la facture' : 'Vérifier la facture'}</button></div>
    </form>}{error && <p role="alert" className="service-error">{error}</p>}</div>
  </Modal>;
}
