import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  FilePlus2,
  FileSpreadsheet,
  FileText,
  History,
  Plus,
  Printer,
  ReceiptText,
  Search,
  Trash2,
  Upload,
  UserRound,
  UsersRound,
} from 'lucide-react';
import type {
  AccountingExportField,
  AccountingExportTemplate,
  BillingCalculationMode,
  BillingUnitKind,
  FinanceDocument,
  FinanceParticipant,
} from '../../types';
import { useAppContext } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { useConfirm } from '../../context/ConfirmContext';
import { db } from '../../services/firebase';
import {
  createFullCreditNote,
  issueFinanceInvoice,
  saveAccountingTemplate,
  subscribeAccountingTemplates,
  subscribeFinanceDocuments,
} from '../../services/financeDocuments';
import {
  ACCOUNTING_FIELD_OPTIONS,
  downloadAccountingExport,
  MAKERLAB_ACCOUNTING_TEMPLATE,
  readAccountingTemplateFile,
} from '../../utils/accountingExport';
import { generateFinanceDocument } from '../../utils/financeDocumentGenerator';
import { Modal } from '../Modal';
import { ServiceCataloguePanel } from './ServiceCataloguePanel';
import { ServiceInvoiceModal } from './ServiceInvoiceModal';
import { subscribeServiceCatalogue } from '../../services/serviceCatalogue';
import { mergeServiceCatalogue } from '../../utils/serviceCatalogue';
import type { CatalogueService } from '../../types/serviceCatalogue';

const today = () => new Date().toISOString().slice(0, 10);
const endOfYear = () => `${new Date().getFullYear()}-12-31`;
const startOfYear = () => `${new Date().getFullYear()}-01-01`;
const fieldClass = 'min-h-11 w-full rounded-lg border border-white/10 bg-slate-950/80 px-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-teal-300/60 focus:ring-2 focus:ring-teal-300/15';
const labelClass = 'mb-1.5 block text-xs font-bold text-slate-400';

const BILLING_UNITS: Array<{ value: BillingUnitKind; label: string; hours: number; sessions: number }> = [
  { value: 'hour', label: 'À l’heure', hours: 1, sessions: 1 },
  { value: 'workshop', label: 'Par atelier', hours: 3, sessions: 1 },
  { value: 'half_day', label: 'Demi-journée', hours: 3, sessions: 1 },
  { value: 'day', label: 'Journée', hours: 6, sessions: 2 },
  { value: 'package', label: 'Forfait', hours: 0, sessions: 0 },
  { value: 'participant', label: 'Par participant', hours: 0, sessions: 1 },
  { value: 'group', label: 'Par groupe', hours: 0, sessions: 1 },
];

let participantSequence = 0;
const newParticipant = (name = ''): FinanceParticipant => ({
  id: `participant-${Date.now().toString(36)}-${++participantSequence}`,
  name,
  email: '',
  phone: '',
  role: '',
});

const emptyInvoiceDraft = () => ({
  programId: '',
  billingAudience: 'individual' as 'individual' | 'company',
  issueDate: today(),
  dueDate: today(),
  serviceDate: today(),
  customerName: '',
  contactName: '',
  address: '',
  email: '',
  phone: '',
  ice: '',
  rc: '',
  beneficiarySameAsCustomer: true,
  beneficiaryName: '',
  beneficiaryContactName: '',
  beneficiaryNotes: '',
  description: '',
  unitPrice: '',
  taxRate: '20',
  billingUnit: 'workshop' as BillingUnitKind,
  billingUnitLabel: 'Atelier',
  hoursPerUnit: '3',
  sessionsPerUnit: '1',
  calculationMode: 'planned' as BillingCalculationMode,
  quantity: '1',
  participants: [newParticipant()],
});

const formatMoney = (value: number, currency: string) => new Intl.NumberFormat('fr-MA', {
  style: 'currency',
  currency,
  minimumFractionDigits: 2,
}).format(value || 0);

const formatShortDate = (value: string) => new Date(`${value}T12:00:00`).toLocaleDateString('fr-FR');

export const FinanceDocumentsPanel: React.FC = () => {
  const { programs, settings } = useAppContext();
  const { currentOrganization, can, userProfile } = useAuth();
  const { confirm, alert: showAlert } = useConfirm();
  const organizationId = currentOrganization?.id || '';
  const currentOrgRef = useRef(organizationId);
  currentOrgRef.current = organizationId;
  const canManage = can('finance.record_payment') || can('settings.manage');
  const canExport = can('finance.view_totals');
  // Match the existing finance ledger's organization-manager persistence boundary.
  const canUseServices = canManage && ['owner', 'admin', 'super_admin'].includes(userProfile?.role || '');
  const [catalogueOpen, setCatalogueOpen] = useState(false);
  const [catalogueState, setCatalogueState] = useState<{ organizationId: string; services: CatalogueService[]; ready: boolean; error: string }>({ organizationId: '', services: [], ready: false, error: '' });
  const [serviceInvoice, setServiceInvoice] = useState<{ organizationId: string; initialService?: CatalogueService } | null>(null);
  const servicesReady = catalogueState.organizationId === organizationId && catalogueState.ready;
  const services = servicesReady ? mergeServiceCatalogue(organizationId, catalogueState.services) : [];
  useEffect(() => {
    setServiceInvoice(null); setCatalogueOpen(false);
    setDocuments([]); setCustomTemplates([]); setIsInvoiceOpen(false);
    setCatalogueState({ organizationId, services: [], ready: false, error: '' });
    if (!db || !organizationId || !canUseServices) return;
    return subscribeServiceCatalogue(db, organizationId,
      services => setCatalogueState({ organizationId, services, ready: true, error: '' }),
      () => setCatalogueState({ organizationId, services: [], ready: false, error: 'Le catalogue est inaccessible. Vérifiez votre connexion et vos permissions.' }));
  }, [organizationId, canUseServices]);

  const [documents, setDocuments] = useState<FinanceDocument[]>([]);
  const [customTemplates, setCustomTemplates] = useState<AccountingExportTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [kindFilter, setKindFilter] = useState<'all' | 'invoice' | 'credit_note'>('all');
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [creditTarget, setCreditTarget] = useState<FinanceDocument | null>(null);
  const [creditReason, setCreditReason] = useState('Annulation de la facture');
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState(emptyInvoiceDraft);

  const [selectedTemplateId, setSelectedTemplateId] = useState(MAKERLAB_ACCOUNTING_TEMPLATE.id);
  const [exportDates, setExportDates] = useState({ start: startOfYear(), end: endOfYear() });
  const [importedTemplate, setImportedTemplate] = useState<{
    name: string;
    headers: string[];
    mapping: Record<string, AccountingExportField | ''>;
    fileType: 'xlsx' | 'csv';
    journal: string;
    customerAccount: string;
    revenueAccount: string;
    vatAccount: string;
    taxCode: string;
  } | null>(null);

  useEffect(() => {
    if (!db || !organizationId) return undefined;
    setIsLoading(true);
    setLoadError('');
    const unsubscribeDocuments = subscribeFinanceDocuments(db, organizationId, nextDocuments => {
      setDocuments(nextDocuments);
      setIsLoading(false);
    }, error => {
      console.error('Unable to load finance documents', error);
      setLoadError("L'historique des factures n'est pas accessible avec ce compte.");
      setIsLoading(false);
    });
    const unsubscribeTemplates = subscribeAccountingTemplates(db, organizationId, setCustomTemplates, error => {
      console.error('Unable to load accounting templates', error);
    });
    return () => {
      unsubscribeDocuments();
      unsubscribeTemplates();
    };
  }, [organizationId]);

  const templates = useMemo(() => [MAKERLAB_ACCOUNTING_TEMPLATE, ...customTemplates], [customTemplates]);
  const selectedTemplate = templates.find(template => template.id === selectedTemplateId) || MAKERLAB_ACCOUNTING_TEMPLATE;
  const filteredDocuments = useMemo(() => documents.filter(document => {
    if (kindFilter !== 'all' && document.kind !== kindFilter) return false;
    const searchable = [document.number, document.customer.name, document.customer.contactName, document.beneficiary?.name, document.programName, ...document.lines.map(line => `${line.description} ${line.details || ''}`), ...document.participants.map(participant => participant.name)]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return searchable.includes(query.trim().toLowerCase());
  }), [documents, kindFilter, query]);

  const stats = useMemo(() => ({
    invoices: documents.filter(document => document.kind === 'invoice').length,
    companies: new Set(documents.filter(document => document.customer.type === 'company').map(document => document.customer.name.trim().toLowerCase())).size,
    participants: new Set(documents.flatMap(document => document.participants.map(participant => participant.name.trim().toLowerCase())).filter(Boolean)).size,
    issuedTotal: documents.reduce((sum, document) => sum + (document.kind === 'invoice' ? document.total : -document.total), 0),
  }), [documents]);

  const selectedProgram = programs.find(program => program.id === draft.programId);
  const participantCount = Math.max(1, draft.participants.filter(participant => participant.name.trim()).length);
  const quantity = draft.billingUnit === 'participant' ? participantCount : Math.max(0, Number(draft.quantity) || 0);
  const sessions = Math.max(0, quantity * (Number(draft.sessionsPerUnit) || 0));
  const subtotal = quantity * (Number(draft.unitPrice) || 0);
  const taxAmount = subtotal * (Number(draft.taxRate) || 0) / 100;
  const total = subtotal + taxAmount;

  const openInvoice = () => {
    setDraft(emptyInvoiceDraft());
    setIsInvoiceOpen(true);
  };

  const selectProgram = (programId: string) => {
    const program = programs.find(item => item.id === programId);
    const billingAudience = program?.billingAudience || 'individual';
    const profile = program?.billingProfile;
    const unit = BILLING_UNITS.find(item => item.value === profile?.unitKind) || BILLING_UNITS[1];
    const firstPack = program?.packs?.[0];
    const suggestedPrice = firstPack?.price || firstPack?.priceAnnual || firstPack?.priceTrimester || '';
    setDraft(previous => ({
      ...previous,
      programId,
      billingAudience,
      billingUnit: profile?.unitKind || unit.value,
      billingUnitLabel: profile?.unitLabel || unit.label,
      hoursPerUnit: String(profile?.hoursPerUnit ?? unit.hours),
      sessionsPerUnit: String(profile?.sessionsPerUnit ?? unit.sessions),
      calculationMode: profile?.calculationMode || 'planned',
      description: program ? `Formation — ${program.name}` : '',
      unitPrice: suggestedPrice ? String(suggestedPrice) : previous.unitPrice,
      participants: previous.participants.length ? previous.participants : [newParticipant()],
      quantity: previous.quantity || '1',
    }));
  };

  const updateParticipant = (id: string, field: keyof FinanceParticipant, value: string) => {
    setDraft(previous => ({
      ...previous,
      participants: previous.participants.map(participant => participant.id === id ? { ...participant, [field]: value } : participant),
    }));
  };

  const handleIssueInvoice = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!db || !organizationId || !selectedProgram) return;
    const participants = draft.participants
      .map(participant => ({ ...participant, name: participant.name.trim(), email: participant.email?.trim(), phone: participant.phone?.trim(), role: participant.role?.trim() }))
      .filter(participant => participant.name);
    if (!draft.customerName.trim()) {
      await showAlert('Client requis', draft.billingAudience === 'company' ? "Saisissez la raison sociale de l'entreprise." : 'Saisissez le nom du client.', 'warning');
      return;
    }
    if (!participants.length) {
      await showAlert('Participant requis', 'Ajoutez au moins une personne qui suit la formation.', 'warning');
      return;
    }
    if (draft.billingAudience === 'company' && !draft.beneficiarySameAsCustomer && !draft.beneficiaryName.trim()) {
      await showAlert('Entreprise bénéficiaire requise', 'Indiquez pour quelle entreprise la formation est réalisée.', 'warning');
      return;
    }
    if (!draft.description.trim() || quantity <= 0 || Number(draft.unitPrice) <= 0) {
      await showAlert('Prestation incomplète', 'Ajoutez une désignation et un prix unitaire HT supérieur à zéro.', 'warning');
      return;
    }

    try {
      setIsSaving(true);
      const invoice = await issueFinanceInvoice(db, {
        organizationId,
        issueDate: draft.issueDate,
        dueDate: draft.dueDate,
        serviceDate: draft.serviceDate,
        currency: settings.currency || 'MAD',
        customer: {
          type: draft.billingAudience,
          name: draft.customerName.trim(),
          contactName: draft.contactName.trim() || undefined,
          address: draft.address.trim() || undefined,
          email: draft.email.trim() || undefined,
          phone: draft.phone.trim() || undefined,
          ice: draft.billingAudience === 'company' ? draft.ice.trim() || undefined : undefined,
          rc: draft.billingAudience === 'company' ? draft.rc.trim() || undefined : undefined,
        },
        beneficiary: draft.billingAudience === 'company' && !draft.beneficiarySameAsCustomer && draft.beneficiaryName.trim()
          ? {
              name: draft.beneficiaryName.trim(),
              contactName: draft.beneficiaryContactName.trim() || undefined,
              notes: draft.beneficiaryNotes.trim() || undefined,
            }
          : undefined,
        participants,
        programId: selectedProgram.id,
          programName: selectedProgram.name,
        lines: [{
          description: draft.description,
          quantity,
          unitPrice: Number(draft.unitPrice),
          taxRate: Number(draft.taxRate),
          unitKind: draft.billingUnit,
          unitLabel: draft.billingUnitLabel,
          hoursPerUnit: Number(draft.hoursPerUnit),
          sessionCount: sessions,
          calculationMode: draft.calculationMode,
        }],
      });
      setIsInvoiceOpen(false);
      await showAlert('Facture émise', `La facture ${invoice.number} est enregistrée dans l'historique.`, 'success');
      generateFinanceDocument(invoice, settings);
    } catch (error) {
      console.error('Unable to issue invoice', error);
      await showAlert('Facture non créée', error instanceof Error ? error.message : 'Vérifiez les informations et vos permissions.', 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateCreditNote = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!db || !organizationId || !creditTarget) return;
    if (!creditReason.trim()) {
      await showAlert("Motif de l'avoir", "Indiquez pourquoi la facture est annulée ou créditée.", 'warning');
      return;
    }
    try {
      setIsSaving(true);
      const credit = await createFullCreditNote(db, organizationId, creditTarget, creditReason);
      setCreditTarget(null);
      await showAlert('Avoir émis', `L'avoir ${credit.number} est lié à la facture ${credit.originalInvoiceNumber}.`, 'success');
      generateFinanceDocument(credit, settings);
    } catch (error) {
      console.error('Unable to create credit note', error);
      await showAlert('Avoir non créé', error instanceof Error ? error.message : 'Vérifiez vos permissions et réessayez.', 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTemplateUpload = async (file: File | undefined) => {
    if (!file) return;
    try {
      const parsed = await readAccountingTemplateFile(file);
      setImportedTemplate({
        name: file.name.replace(/\.(xlsx|xls|csv)$/i, ''),
        ...parsed,
        journal: 'VEN',
        customerAccount: '3421',
        revenueAccount: '7111',
        vatAccount: '4455',
        taxCode: 'TVA20',
      });
    } catch (error) {
      await showAlert('Modèle non reconnu', error instanceof Error ? error.message : 'Utilisez un fichier Excel ou CSV avec les colonnes sur la première ligne.', 'warning');
    }
  };

  const handleSaveTemplate = async () => {
    if (!db || !organizationId || !importedTemplate) return;
    const mappedFields = Object.values(importedTemplate.mapping);
    if (!importedTemplate.name.trim() || !mappedFields.includes('debit') || !mappedFields.includes('credit') || !mappedFields.includes('accountNumber')) {
      await showAlert('Correspondances incomplètes', 'Nommez le modèle et associez au minimum le compte, le débit et le crédit.', 'warning');
      return;
    }
    const id = `custom-${Date.now().toString(36)}`;
    try {
      setIsSaving(true);
      await saveAccountingTemplate(db, organizationId, {
        id,
        organizationId,
        name: importedTemplate.name.trim(),
        source: 'custom',
        fileType: importedTemplate.fileType,
        headers: importedTemplate.headers,
        mapping: importedTemplate.mapping,
        defaults: {
          journal: importedTemplate.journal.trim() || 'VEN',
          customerAccount: importedTemplate.customerAccount.trim(),
          revenueAccount: importedTemplate.revenueAccount.trim(),
          vatAccount: importedTemplate.vatAccount.trim(),
          taxCode: importedTemplate.taxCode.trim(),
        },
      });
      setSelectedTemplateId(id);
      setImportedTemplate(null);
      await showAlert('Modèle enregistré', 'Ce format pourra être réutilisé pour les prochains exports.', 'success');
    } catch (error) {
      console.error('Unable to save accounting template', error);
      await showAlert('Modèle non enregistré', 'Vérifiez vos permissions et réessayez.', 'danger');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async () => {
    if (exportDates.start > exportDates.end) {
      await showAlert('Période invalide', 'La date de début doit précéder la date de fin.', 'warning');
      return;
    }
    const exportDocuments = documents.filter(document => document.issueDate >= exportDates.start && document.issueDate <= exportDates.end);
    if (!exportDocuments.length) {
      await showAlert('Aucune écriture', 'Aucune facture ou avoir ne correspond à cette période.', 'info');
      return;
    }
    const rowCount = downloadAccountingExport(exportDocuments, selectedTemplate, `${exportDates.start}_${exportDates.end}`);
    setIsExportOpen(false);
    await showAlert('Export comptable prêt', `${rowCount} écritures exportées avec le modèle ${selectedTemplate.name}.`, 'success');
  };

  const requestCreditNote = async (invoice: FinanceDocument) => {
    const proceed = await confirm({
      title: "Créer une facture d'avoir ?",
      message: `La facture ${invoice.number} restera dans l'historique. Un avoir total recevra son propre numéro annuel et annulera comptablement son montant.`,
      confirmText: "Préparer l'avoir",
      cancelText: 'Garder la facture',
      variant: 'warning',
    });
    if (proceed) {
      setCreditReason('Annulation de la facture');
      setCreditTarget(invoice);
    }
  };

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-[1.35rem] border border-sky-300/20 bg-[linear-gradient(135deg,rgba(14,116,144,.16),rgba(15,23,42,.45)_58%)] p-5">
        <div className="pointer-events-none absolute -right-14 -top-20 h-52 w-52 rounded-full border-[26px] border-sky-200/[0.05]" />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl"><p className="text-[10px] font-black uppercase tracking-[.18em] text-sky-200">Registre immuable</p><h3 className="mt-2 text-xl font-black text-white sm:text-2xl">Facturez vos formations et vos services.</h3><p className="mt-2 text-sm leading-6 text-slate-400">Choisissez une formation ou une prestation professionnelle. Retrouvez les factures, avoirs et exports dans le même historique.</p></div>
          <div className="flex flex-wrap gap-2">
            {canExport && <button type="button" onClick={() => setIsExportOpen(true)} className="flex min-h-11 items-center gap-2 rounded-lg border border-white/10 bg-slate-950/55 px-4 text-xs font-black text-white transition hover:border-sky-200/30 hover:bg-slate-900"><FileSpreadsheet size={17} className="text-sky-200" /> Export comptable</button>}
            {canManage && <button type="button" onClick={openInvoice} className="flex min-h-11 items-center gap-2 rounded-lg bg-teal-300 px-4 text-xs font-black text-slate-950 transition hover:bg-teal-200"><FilePlus2 size={17} /> Facture de formation</button>}
            {canUseServices && <div className="service-workspace"><div className="service-actions"><button onClick={() => setCatalogueOpen(previous => !previous)} aria-expanded={catalogueOpen}>Catalogue de services</button><button className="primary" disabled={!servicesReady} onClick={() => setServiceInvoice({ organizationId })}>Nouvelle facture de services</button></div></div>}
          </div>
        </div>
      </section>
      {canUseServices && catalogueState.organizationId === organizationId && catalogueState.error && <p role="alert" className="service-error">{catalogueState.error}</p>}
      {canUseServices && catalogueOpen && (servicesReady ? <ServiceCataloguePanel key={organizationId} organizationId={organizationId} services={services} currency={settings.currency || 'MAD'} onInvoice={initialService => setServiceInvoice({ organizationId, initialService })} /> : <p role="status">Chargement du catalogue…</p>)}
      {canUseServices && serviceInvoice?.organizationId === organizationId && <ServiceInvoiceModal key={organizationId} organizationId={organizationId} services={services} documents={documents} settings={settings} initialService={serviceInvoice.initialService} onClose={() => setServiceInvoice(null)} onIssued={invoice => { if (currentOrgRef.current === invoice.organizationId) setDocuments(previous => [invoice, ...previous.filter(item => item.id !== invoice.id)]); }} />}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Factures conservées', value: stats.invoices, icon: ReceiptText, tone: 'text-teal-200' },
          { label: 'Entreprises', value: stats.companies, icon: Building2, tone: 'text-sky-200' },
          { label: 'Participants', value: stats.participants, icon: UsersRound, tone: 'text-amber-200' },
          { label: 'Net facturé', value: formatMoney(stats.issuedTotal, settings.currency || 'MAD'), icon: CheckCircle2, tone: 'text-emerald-200' },
        ].map(item => <div key={item.label} className="rounded-lg border border-white/10 bg-slate-950/45 p-4"><item.icon size={17} className={item.tone} /><p className="mt-4 text-[10px] font-bold uppercase text-slate-500">{item.label}</p><p className="mt-1 truncate font-mono text-lg font-black text-white">{item.value}</p></div>)}
      </section>

      <section className="overflow-hidden rounded-lg border border-white/10 bg-slate-950/45">
        <div className="flex flex-col gap-3 border-b border-white/10 p-3 sm:flex-row sm:items-center">
          <div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} /><input className={`${fieldClass} pl-9`} value={query} onChange={event => setQuery(event.target.value)} placeholder="N° de facture, entreprise, programme, service ou participant" /></div>
          <select className={`${fieldClass} sm:w-44`} value={kindFilter} onChange={event => setKindFilter(event.target.value as typeof kindFilter)}><option value="all">Tous les documents</option><option value="invoice">Factures</option><option value="credit_note">Avoirs</option></select>
        </div>

        {isLoading ? <div className="p-10 text-center text-sm text-slate-500">Chargement du registre…</div>
          : loadError ? <div className="p-8 text-center"><FileText className="mx-auto text-amber-200" /><p className="mt-3 text-sm font-bold text-white">Registre non disponible</p><p className="mt-1 text-xs text-slate-500">{loadError}</p></div>
          : filteredDocuments.length === 0 ? <div className="p-10 text-center"><History className="mx-auto text-slate-600" size={30} /><p className="mt-3 text-sm font-black text-white">Aucune facture dans cette vue</p><p className="mt-1 text-xs text-slate-500">Émettez la première facture ou modifiez la recherche.</p></div>
          : <div className="divide-y divide-white/10">{filteredDocuments.map(document => (
            <article key={document.id} className="grid gap-3 p-4 transition hover:bg-white/[0.025] lg:grid-cols-[8rem_minmax(0,1.3fr)_minmax(0,1fr)_9rem_auto] lg:items-center">
              <div><span className={`inline-flex rounded-md border px-2 py-1 text-[9px] font-black uppercase tracking-wider ${document.kind === 'credit_note' ? 'border-amber-300/20 bg-amber-300/10 text-amber-200' : 'border-teal-300/20 bg-teal-300/10 text-teal-200'}`}>{document.kind === 'credit_note' ? 'Avoir' : 'Facture'}</span><p className="mt-2 font-mono text-sm font-black text-white">{document.number}</p><p className="mt-1 text-[10px] text-slate-500">{formatShortDate(document.issueDate)}</p></div>
              <div className="min-w-0"><p className="truncate text-sm font-black text-white">{document.customer.name}</p><p className="mt-1 truncate text-xs text-slate-500">{document.customer.type === 'company' ? document.customer.contactName || 'Entreprise facturée' : 'Particulier'} · {document.programName || document.lines[0]?.description || 'Prestation'}</p>{document.beneficiary?.name && <p className="mt-1 truncate text-[10px] font-bold text-sky-200">Formation réalisée pour {document.beneficiary.name}</p>}{document.originalInvoiceNumber && <p className="mt-1 text-[10px] font-bold text-amber-200">Réf. facture {document.originalInvoiceNumber}</p>}</div>
              <div className="min-w-0"><p className="text-[10px] font-bold uppercase text-slate-600">Participants</p><p className="mt-1 truncate text-xs text-slate-300" title={document.participants.map(participant => participant.name).join(', ')}>{document.participants.map(participant => participant.name).join(', ') || '—'}</p></div>
              <div className="lg:text-right"><p className={`font-mono text-sm font-black ${document.kind === 'credit_note' ? 'text-amber-200' : 'text-white'}`}>{document.kind === 'credit_note' ? '−' : ''}{formatMoney(document.total, document.currency)}</p><p className="mt-1 text-[10px] text-slate-500">{document.status === 'credited' ? `Créditée · ${document.creditNoteNumber}` : 'Émise'}</p></div>
              <div className="flex justify-end gap-1"><button type="button" onClick={() => generateFinanceDocument(document, settings)} className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/[0.06] hover:text-white" title="Imprimer ou enregistrer en PDF"><Printer size={16} /></button>{canManage && document.kind === 'invoice' && document.status !== 'credited' && <button type="button" onClick={() => requestCreditNote(document)} className="flex h-9 items-center gap-1.5 rounded-lg border border-amber-300/15 px-2.5 text-[10px] font-bold text-amber-200 transition hover:bg-amber-300/10" title="Créer un avoir total"><ReceiptText size={14} /> Avoir</button>}</div>
            </article>
          ))}</div>}
      </section>

      <Modal isOpen={isInvoiceOpen} onClose={() => !isSaving && setIsInvoiceOpen(false)} title="Émettre une facture" size="xl">
        <form onSubmit={handleIssueInvoice} className="space-y-5">
          <div className="rounded-lg border border-amber-300/20 bg-amber-300/[0.06] p-3 text-xs leading-5 text-amber-100/80"><strong className="text-amber-100">Numéro définitif :</strong> il sera attribué à l’émission selon la séquence annuelle. Une facture émise ne pourra plus être supprimée ; une correction passera par un avoir.</div>
          <div className="grid gap-4 sm:grid-cols-3"><div className="sm:col-span-3"><label className={labelClass}>Programme</label><select required className={fieldClass} value={draft.programId} onChange={event => selectProgram(event.target.value)}><option value="">Choisir un programme</option>{programs.filter(program => program.status !== 'archived').map(program => <option key={program.id} value={program.id}>{program.name} — {program.billingAudience === 'company' ? 'Entreprise' : 'Particulier'}</option>)}</select></div><div><label className={labelClass}>Date de facture</label><input required type="date" className={fieldClass} value={draft.issueDate} onChange={event => setDraft(previous => ({ ...previous, issueDate: event.target.value }))} /></div><div><label className={labelClass}>Échéance</label><input required type="date" min={draft.issueDate} className={fieldClass} value={draft.dueDate} onChange={event => setDraft(previous => ({ ...previous, dueDate: event.target.value }))} /></div><div><label className={labelClass}>Date de prestation</label><input required type="date" className={fieldClass} value={draft.serviceDate} onChange={event => setDraft(previous => ({ ...previous, serviceDate: event.target.value }))} /></div></div>

          {selectedProgram && <div className="flex items-center gap-3 rounded-lg border border-sky-300/20 bg-sky-300/[0.06] p-3"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-300/10 text-sky-200">{draft.billingAudience === 'company' ? <Building2 size={19} /> : <UserRound size={19} />}</span><div><p className="text-sm font-black text-white">Facturation {draft.billingAudience === 'company' ? 'entreprise' : 'particulier'}</p><p className="mt-0.5 text-xs text-slate-500">Ce choix vient du programme et sépare le client facturé des participants.</p></div></div>}

          <div className="grid gap-4 sm:grid-cols-2"><div><label className={labelClass}>{draft.billingAudience === 'company' ? 'Entreprise à facturer' : 'Nom du client'}</label><input required className={fieldClass} value={draft.customerName} onChange={event => setDraft(previous => ({ ...previous, customerName: event.target.value }))} placeholder={draft.billingAudience === 'company' ? 'AimPerformance' : 'Mme Zineb Loudyi'} /></div><div><label className={labelClass}>{draft.billingAudience === 'company' ? 'Contact administratif' : 'E-mail'}</label><input className={fieldClass} value={draft.billingAudience === 'company' ? draft.contactName : draft.email} onChange={event => setDraft(previous => draft.billingAudience === 'company' ? ({ ...previous, contactName: event.target.value }) : ({ ...previous, email: event.target.value }))} placeholder={draft.billingAudience === 'company' ? 'Mme / M. responsable' : 'client@example.com'} /></div><div className="sm:col-span-2"><label className={labelClass}>Adresse de facturation</label><input className={fieldClass} value={draft.address} onChange={event => setDraft(previous => ({ ...previous, address: event.target.value }))} placeholder="Adresse complète" /></div>{draft.billingAudience === 'company' && <><div><label className={labelClass}>ICE</label><input className={fieldClass} value={draft.ice} onChange={event => setDraft(previous => ({ ...previous, ice: event.target.value }))} /></div><div><label className={labelClass}>RC</label><input className={fieldClass} value={draft.rc} onChange={event => setDraft(previous => ({ ...previous, rc: event.target.value }))} /></div></>}</div>

          {draft.billingAudience === 'company' && <div className="rounded-lg border border-sky-300/20 bg-sky-300/[0.05] p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-black text-white">Entreprise bénéficiaire</p><p className="mt-1 text-xs leading-5 text-slate-500">Indiquez où la formation est réalisée. Cela ne change jamais le destinataire de la facture.</p></div><label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-slate-300"><input type="checkbox" checked={draft.beneficiarySameAsCustomer} onChange={event => setDraft(previous => ({ ...previous, beneficiarySameAsCustomer: event.target.checked }))} className="h-4 w-4 rounded border-white/20 bg-slate-950 text-teal-300" /> Même entreprise que le client facturé</label></div>{!draft.beneficiarySameAsCustomer && <div className="mt-4 grid gap-3 sm:grid-cols-2"><div><label className={labelClass}>Formation réalisée pour</label><input required className={fieldClass} value={draft.beneficiaryName} onChange={event => setDraft(previous => ({ ...previous, beneficiaryName: event.target.value }))} placeholder="Entreprise X" /></div><div><label className={labelClass}>Contact sur place <span className="font-medium text-slate-600">Facultatif</span></label><input className={fieldClass} value={draft.beneficiaryContactName} onChange={event => setDraft(previous => ({ ...previous, beneficiaryContactName: event.target.value }))} /></div><div className="sm:col-span-2"><label className={labelClass}>Référence ou note de mission <span className="font-medium text-slate-600">Facultatif</span></label><input className={fieldClass} value={draft.beneficiaryNotes} onChange={event => setDraft(previous => ({ ...previous, beneficiaryNotes: event.target.value }))} placeholder="Mission AI / site client / bon de commande" /></div></div>}</div>}

          <div className="rounded-lg border border-white/10 bg-slate-950/35 p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-black text-white">{draft.billingAudience === 'company' ? 'Participants envoyés par l’entreprise' : 'Participant'}</p><p className="mt-1 text-xs text-slate-500">Ces noms seront conservés pour les futures attestations et certifications.</p></div>{draft.billingAudience === 'company' && <button type="button" onClick={() => setDraft(previous => ({ ...previous, participants: [...previous.participants, newParticipant()] }))} className="flex min-h-9 items-center gap-1.5 rounded-lg border border-white/10 px-3 text-xs font-bold text-slate-200 hover:bg-white/[0.05]"><Plus size={14} /> Ajouter</button>}</div><div className="mt-4 space-y-2">{draft.participants.map((participant, index) => <div key={participant.id} className="grid gap-2 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,.8fr)_auto]"><input aria-label={`Nom participant ${index + 1}`} required className={fieldClass} value={participant.name} onChange={event => updateParticipant(participant.id, 'name', event.target.value)} placeholder="Nom complet" /><input aria-label={`E-mail participant ${index + 1}`} className={fieldClass} value={participant.email || ''} onChange={event => updateParticipant(participant.id, 'email', event.target.value)} placeholder="E-mail" /><input aria-label={`Fonction participant ${index + 1}`} className={fieldClass} value={participant.role || ''} onChange={event => updateParticipant(participant.id, 'role', event.target.value)} placeholder="Fonction" />{draft.billingAudience === 'company' && <button type="button" disabled={draft.participants.length === 1} onClick={() => setDraft(previous => ({ ...previous, participants: previous.participants.filter(item => item.id !== participant.id) }))} className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-500 hover:bg-red-300/10 hover:text-red-300 disabled:opacity-30" title="Retirer le participant"><Trash2 size={15} /></button>}</div>)}</div></div>

          <div className="border-t border-white/10 pt-5"><div className="mb-3 flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-300/10 text-sky-200"><Clock3 size={17} /></span><div><p className="text-sm font-black text-white">Unité et quantité facturées</p><p className="mt-1 text-xs leading-5 text-slate-500">La durée est enregistrée dans la ligne de facture pour expliquer précisément le montant.</p></div></div><div className="grid gap-4 sm:grid-cols-[minmax(0,1.2fr)_8rem_8rem_8rem]"><div><label className={labelClass}>Unité</label><select className={fieldClass} value={draft.billingUnit} onChange={event => { const unit = BILLING_UNITS.find(item => item.value === event.target.value) || BILLING_UNITS[1]; setDraft(previous => ({ ...previous, billingUnit: unit.value, billingUnitLabel: unit.label, hoursPerUnit: String(unit.hours), sessionsPerUnit: String(unit.sessions) })); }}>{BILLING_UNITS.map(unit => <option key={unit.value} value={unit.value}>{unit.label}</option>)}</select></div><div><label className={labelClass}>Quantité</label><input required type="number" min={draft.billingUnit === 'participant' ? 1 : 0.01} step="0.01" disabled={draft.billingUnit === 'participant'} className={`${fieldClass} disabled:cursor-not-allowed disabled:opacity-60`} value={draft.billingUnit === 'participant' ? participantCount : draft.quantity} onChange={event => setDraft(previous => ({ ...previous, quantity: event.target.value }))} /></div><div><label className={labelClass}>Heures / unité</label><input type="number" min="0" step="0.25" className={fieldClass} value={draft.hoursPerUnit} onChange={event => setDraft(previous => ({ ...previous, hoursPerUnit: event.target.value }))} /></div><div><label className={labelClass}>Séances / unité</label><input type="number" min="0" step="1" className={fieldClass} value={draft.sessionsPerUnit} onChange={event => setDraft(previous => ({ ...previous, sessionsPerUnit: event.target.value }))} /></div></div><div className="mt-3 grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"><div><label className={labelClass}>Désignation</label><input required className={fieldClass} value={draft.description} onChange={event => setDraft(previous => ({ ...previous, description: event.target.value }))} placeholder="Formation — Intelligence artificielle" /></div><div><label className={labelClass}>Calcul</label><select className={fieldClass} value={draft.calculationMode} onChange={event => setDraft(previous => ({ ...previous, calculationMode: event.target.value as BillingCalculationMode }))}><option value="planned">Sessions planifiées</option><option value="delivered">Sessions réalisées</option><option value="manual">Quantité manuelle</option></select></div></div><div className="mt-3 grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem_8rem]"><div><label className={labelClass}>Libellé affiché sur la facture</label><input className={fieldClass} value={draft.billingUnitLabel} onChange={event => setDraft(previous => ({ ...previous, billingUnitLabel: event.target.value }))} placeholder="Atelier / Journée / Forfait" /></div><div><label className={labelClass}>Prix unitaire HT</label><input required type="number" min="0.01" step="0.01" className={fieldClass} value={draft.unitPrice} onChange={event => setDraft(previous => ({ ...previous, unitPrice: event.target.value }))} /></div><div><label className={labelClass}>TVA %</label><input required type="number" min="0" max="100" step="0.01" className={fieldClass} value={draft.taxRate} onChange={event => setDraft(previous => ({ ...previous, taxRate: event.target.value }))} /></div></div></div>
          <div className="flex flex-col gap-3 rounded-lg bg-teal-300/10 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="text-xs text-slate-400">{quantity} {draft.billingUnitLabel.toLowerCase()} · {sessions || 0} séance(s) · {Number(draft.hoursPerUnit) * quantity || 0} h · HT {formatMoney(subtotal, settings.currency || 'MAD')} · TVA {formatMoney(taxAmount, settings.currency || 'MAD')}</div><div className="font-mono text-xl font-black text-teal-100">{formatMoney(total, settings.currency || 'MAD')} TTC</div></div>
          <div className="flex justify-end gap-2"><button type="button" disabled={isSaving} onClick={() => setIsInvoiceOpen(false)} className="min-h-11 rounded-lg px-4 text-sm font-bold text-slate-400 hover:bg-white/[0.05]">Fermer</button><button type="submit" disabled={isSaving || !selectedProgram} className="min-h-11 rounded-lg bg-teal-300 px-5 text-sm font-black text-slate-950 hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-50">{isSaving ? 'Émission…' : 'Émettre la facture'}</button></div>
        </form>
      </Modal>

      <Modal isOpen={Boolean(creditTarget)} onClose={() => !isSaving && setCreditTarget(null)} title="Émettre un avoir total" size="md"><form onSubmit={handleCreateCreditNote} className="space-y-4"><div className="rounded-lg border border-amber-300/20 bg-amber-300/[0.06] p-3 text-sm text-amber-100">La facture <strong>{creditTarget?.number}</strong> restera visible et sera reliée au nouvel avoir.</div><div><label className={labelClass}>Motif de l’avoir</label><textarea required className={`${fieldClass} h-24 py-3`} value={creditReason} onChange={event => setCreditReason(event.target.value)} /></div><div className="flex justify-end gap-2"><button type="button" onClick={() => setCreditTarget(null)} className="min-h-11 rounded-lg px-4 text-sm font-bold text-slate-400">Fermer</button><button type="submit" disabled={isSaving} className="min-h-11 rounded-lg bg-amber-300 px-5 text-sm font-black text-slate-950 disabled:opacity-50">{isSaving ? 'Émission…' : "Émettre l'avoir"}</button></div></form></Modal>

      <Modal isOpen={isExportOpen} onClose={() => !isSaving && setIsExportOpen(false)} title="Exporter la comptabilité" size="xl"><div className="space-y-5"><div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_10rem_10rem]"><div><label className={labelClass}>Format d’export</label><select className={fieldClass} value={selectedTemplateId} onChange={event => setSelectedTemplateId(event.target.value)}>{templates.map(template => <option key={template.id} value={template.id}>{template.name}{template.source === 'builtin' ? ' — inclus' : ''}</option>)}</select></div><div><label className={labelClass}>Du</label><input type="date" className={fieldClass} value={exportDates.start} onChange={event => setExportDates(previous => ({ ...previous, start: event.target.value }))} /></div><div><label className={labelClass}>Au</label><input type="date" className={fieldClass} value={exportDates.end} onChange={event => setExportDates(previous => ({ ...previous, end: event.target.value }))} /></div></div><div className="rounded-lg border border-sky-300/20 bg-sky-300/[0.05] p-4"><div className="flex gap-3"><FileSpreadsheet className="shrink-0 text-sky-200" size={20} /><div><p className="text-sm font-black text-white">{selectedTemplate.name}</p><p className="mt-1 text-xs leading-5 text-slate-500">{selectedTemplate.headers.length} colonnes · journal {selectedTemplate.defaults.journal} · comptes client {selectedTemplate.defaults.customerAccount}, produit {selectedTemplate.defaults.revenueAccount}, TVA {selectedTemplate.defaults.vatAccount}.</p></div></div></div>

        <div className="border-t border-white/10 pt-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-black text-white">Ajouter le format de votre logiciel comptable</p><p className="mt-1 text-xs text-slate-500">Importez un modèle dont la première ligne contient les colonnes, puis associez chaque colonne à une donnée Edufy.</p></div><label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-white/10 px-3 text-xs font-bold text-slate-200 hover:bg-white/[0.05]"><Upload size={15} /> Importer Excel / CSV<input type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={event => handleTemplateUpload(event.target.files?.[0])} /></label></div>
        {importedTemplate && <div className="mt-4 space-y-4 rounded-lg border border-white/10 bg-slate-950/35 p-4"><div className="grid gap-3 sm:grid-cols-2"><div><label className={labelClass}>Nom du modèle</label><input className={fieldClass} value={importedTemplate.name} onChange={event => setImportedTemplate(previous => previous ? ({ ...previous, name: event.target.value }) : previous)} /></div><div><label className={labelClass}>Journal</label><input className={fieldClass} value={importedTemplate.journal} onChange={event => setImportedTemplate(previous => previous ? ({ ...previous, journal: event.target.value }) : previous)} /></div></div><div className="grid gap-2 sm:grid-cols-2">{importedTemplate.headers.map(header => <div key={header} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-2 rounded-lg border border-white/10 p-2"><span className="truncate text-xs font-bold text-slate-300" title={header}>{header}</span><select className="min-h-9 rounded-md border border-white/10 bg-slate-950 px-2 text-xs text-white" value={importedTemplate.mapping[header] || ''} onChange={event => setImportedTemplate(previous => previous ? ({ ...previous, mapping: { ...previous.mapping, [header]: event.target.value as AccountingExportField | '' } }) : previous)}>{ACCOUNTING_FIELD_OPTIONS.map(option => <option key={option.value || 'empty'} value={option.value}>{option.label}</option>)}</select></div>)}</div><div className="grid gap-3 sm:grid-cols-4"><div><label className={labelClass}>Compte client</label><input className={fieldClass} value={importedTemplate.customerAccount} onChange={event => setImportedTemplate(previous => previous ? ({ ...previous, customerAccount: event.target.value }) : previous)} /></div><div><label className={labelClass}>Compte produit</label><input className={fieldClass} value={importedTemplate.revenueAccount} onChange={event => setImportedTemplate(previous => previous ? ({ ...previous, revenueAccount: event.target.value }) : previous)} /></div><div><label className={labelClass}>Compte TVA</label><input className={fieldClass} value={importedTemplate.vatAccount} onChange={event => setImportedTemplate(previous => previous ? ({ ...previous, vatAccount: event.target.value }) : previous)} /></div><div><label className={labelClass}>Code TVA</label><input className={fieldClass} value={importedTemplate.taxCode} onChange={event => setImportedTemplate(previous => previous ? ({ ...previous, taxCode: event.target.value }) : previous)} /></div></div><div className="flex justify-end"><button type="button" onClick={handleSaveTemplate} disabled={isSaving} className="min-h-10 rounded-lg border border-teal-300/25 bg-teal-300/10 px-4 text-xs font-black text-teal-100 hover:bg-teal-300/15 disabled:opacity-50">Enregistrer ce modèle</button></div></div>}
        </div>
        <div className="flex justify-end gap-2 border-t border-white/10 pt-4"><button type="button" onClick={() => setIsExportOpen(false)} className="min-h-11 rounded-lg px-4 text-sm font-bold text-slate-400">Fermer</button><button type="button" onClick={handleExport} className="flex min-h-11 items-center gap-2 rounded-lg bg-sky-300 px-5 text-sm font-black text-slate-950 hover:bg-sky-200"><Download size={16} /> Exporter</button></div>
      </div></Modal>
    </div>
  );
};
