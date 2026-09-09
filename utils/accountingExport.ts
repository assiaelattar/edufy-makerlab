import * as XLSX from 'xlsx';
import type {
  AccountingEntry,
  AccountingExportField,
  AccountingExportTemplate,
  FinanceDocument,
} from '../types';

export const MAKERLAB_ACCOUNTING_TEMPLATE: AccountingExportTemplate = {
  id: 'makerlab-default',
  name: 'MakerLab — modèle par défaut',
  source: 'builtin',
  fileType: 'xlsx',
  headers: [
    'N° Pièce',
    'Date',
    'Journal',
    'N° compte',
    'Contre partie',
    'Libelle',
    'Débit',
    'Crédit',
    'Reference',
    'Taux TVA',
    'Code TVA',
    'Prorata',
    'Code Nature',
    'Code Type',
    'Réf. Interne',
    'Lettrage',
    "Date d'échéance",
    'Date de livraison',
  ],
  mapping: {
    'N° Pièce': 'documentNumber',
    Date: 'date',
    Journal: 'journal',
    'N° compte': 'accountNumber',
    'Contre partie': 'counterpartyAccount',
    Libelle: 'label',
    Débit: 'debit',
    Crédit: 'credit',
    Reference: 'reference',
    'Taux TVA': 'taxRate',
    'Code TVA': 'taxCode',
    Prorata: 'prorata',
    'Code Nature': 'natureCode',
    'Code Type': 'typeCode',
    'Réf. Interne': 'internalReference',
    Lettrage: 'lettering',
    "Date d'échéance": 'dueDate',
    'Date de livraison': 'deliveryDate',
  },
  defaults: {
    journal: 'VEN',
    customerAccount: '3421',
    revenueAccount: '7111',
    vatAccount: '4455',
    taxCode: 'TVA20',
    natureCode: '',
    typeCode: '',
  },
};

export const ACCOUNTING_FIELD_OPTIONS: Array<{ value: AccountingExportField | ''; label: string }> = [
  { value: '', label: 'Laisser vide' },
  { value: 'documentNumber', label: 'Numéro de pièce' },
  { value: 'date', label: 'Date' },
  { value: 'journal', label: 'Journal' },
  { value: 'accountNumber', label: 'Numéro de compte' },
  { value: 'counterpartyAccount', label: 'Compte de contrepartie' },
  { value: 'label', label: 'Libellé' },
  { value: 'debit', label: 'Débit' },
  { value: 'credit', label: 'Crédit' },
  { value: 'reference', label: 'Référence' },
  { value: 'taxRate', label: 'Taux TVA' },
  { value: 'taxCode', label: 'Code TVA' },
  { value: 'prorata', label: 'Prorata' },
  { value: 'natureCode', label: 'Code nature' },
  { value: 'typeCode', label: 'Code type' },
  { value: 'internalReference', label: 'Référence interne' },
  { value: 'lettering', label: 'Lettrage' },
  { value: 'dueDate', label: "Date d'échéance" },
  { value: 'deliveryDate', label: 'Date de livraison' },
  { value: 'customerName', label: 'Client' },
  { value: 'beneficiaryName', label: 'Entreprise bénéficiaire' },
  { value: 'programName', label: 'Programme' },
  { value: 'participantNames', label: 'Participants' },
  { value: 'unitLabel', label: 'Unité facturée' },
  { value: 'hoursPerUnit', label: 'Heures / unité' },
  { value: 'sessionCount', label: 'Nombre de séances' },
  { value: 'calculationMode', label: 'Mode de calcul' },
  { value: 'documentType', label: 'Type de document' },
];

const normalizeHeader = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]/g, '');

const headerAliases: Record<string, AccountingExportField> = {
  nopiece: 'documentNumber',
  numeropiece: 'documentNumber',
  piece: 'documentNumber',
  date: 'date',
  journal: 'journal',
  nocompte: 'accountNumber',
  numerocompte: 'accountNumber',
  compte: 'accountNumber',
  contrepartie: 'counterpartyAccount',
  comptecontrepartie: 'counterpartyAccount',
  libelle: 'label',
  debit: 'debit',
  credit: 'credit',
  reference: 'reference',
  tauxtva: 'taxRate',
  codetva: 'taxCode',
  prorata: 'prorata',
  codenature: 'natureCode',
  codetype: 'typeCode',
  refinterne: 'internalReference',
  referenceinterne: 'internalReference',
  lettrage: 'lettering',
  datedecheance: 'dueDate',
  datelivraison: 'deliveryDate',
  datedelivraison: 'deliveryDate',
  client: 'customerName',
  nomclient: 'customerName',
  entreprisebeneficiaire: 'beneficiaryName',
  beneficiaire: 'beneficiaryName',
  programme: 'programName',
  participants: 'participantNames',
  unitefacturee: 'unitLabel',
  heuresunite: 'hoursPerUnit',
  nombredeseances: 'sessionCount',
  modedecalcul: 'calculationMode',
  typedocument: 'documentType',
};

export const inferAccountingMapping = (headers: string[]) => headers.reduce<Record<string, AccountingExportField | ''>>((mapping, header) => {
  mapping[header] = headerAliases[normalizeHeader(header)] || '';
  return mapping;
}, {});

export const readAccountingTemplateFile = async (file: File) => {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new Error('Le fichier ne contient aucune feuille.');
  const rows = XLSX.utils.sheet_to_json<Array<string | number>>(workbook.Sheets[sheetName], { header: 1, blankrows: false });
  const headers = (rows[0] || []).map(value => String(value || '').trim()).filter(Boolean);
  if (!headers.length) throw new Error("La première ligne doit contenir les noms de colonnes du modèle.");
  if (new Set(headers).size !== headers.length) throw new Error('Chaque colonne du modèle doit avoir un nom unique.');
  return {
    headers,
    mapping: inferAccountingMapping(headers),
    fileType: file.name.toLowerCase().endsWith('.csv') ? 'csv' as const : 'xlsx' as const,
  };
};

const toDateLabel = (value: string | undefined) => {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  return year && month && day ? `${day}/${month}/${year}` : value;
};

export const buildAccountingEntries = (
  documents: FinanceDocument[],
  template: AccountingExportTemplate,
): AccountingEntry[] => {
  const entries: AccountingEntry[] = [];
  documents.forEach(document => {
    const isCredit = document.kind === 'credit_note';
    const label = `${isCredit ? 'Avoir' : 'Facture'} ${document.number} — ${document.customer.name}${document.programName ? ` — ${document.programName}` : ''}${document.beneficiary?.name ? ` — pour ${document.beneficiary.name}` : ''}`;
    const common = {
      documentNumber: document.number,
      date: toDateLabel(document.issueDate),
      journal: template.defaults.journal,
      reference: document.originalInvoiceNumber || document.number,
      taxRate: document.lines[0]?.taxRate || 0,
      taxCode: document.taxAmount > 0 ? template.defaults.taxCode : '',
      prorata: 100,
      natureCode: template.defaults.natureCode || '',
      typeCode: template.defaults.typeCode || '',
      internalReference: document.id,
      lettering: '',
      dueDate: toDateLabel(document.dueDate),
      deliveryDate: toDateLabel(document.serviceDate || document.issueDate),
      customerName: document.customer.name,
      beneficiaryName: document.beneficiary?.name || document.customer.name,
      programName: document.programName || '',
      participantNames: document.participants.map(participant => participant.name).join(', '),
      unitLabel: document.lines[0]?.unitLabel || '',
      hoursPerUnit: document.lines[0]?.hoursPerUnit || 0,
      sessionCount: document.lines.reduce((sum, line) => sum + (line.sessionCount || 0), 0),
      calculationMode: document.lines[0]?.calculationMode || '',
      documentType: isCredit ? 'AVOIR' : 'FACTURE',
    };

    entries.push({
      ...common,
      accountNumber: template.defaults.customerAccount,
      counterpartyAccount: template.defaults.revenueAccount,
      label,
      debit: isCredit ? 0 : document.total,
      credit: isCredit ? document.total : 0,
    });
    entries.push({
      ...common,
      accountNumber: template.defaults.revenueAccount,
      counterpartyAccount: template.defaults.customerAccount,
      label,
      debit: isCredit ? document.subtotal : 0,
      credit: isCredit ? 0 : document.subtotal,
    });
    if (document.taxAmount > 0) {
      entries.push({
        ...common,
        accountNumber: template.defaults.vatAccount,
        counterpartyAccount: template.defaults.customerAccount,
        label: `${label} — TVA`,
        debit: isCredit ? document.taxAmount : 0,
        credit: isCredit ? 0 : document.taxAmount,
      });
    }
  });
  return entries;
};

const safeFileName = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-zA-Z0-9_-]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .toLowerCase();

export const downloadAccountingExport = (
  documents: FinanceDocument[],
  template: AccountingExportTemplate,
  periodLabel: string,
) => {
  const entries = buildAccountingEntries(documents, template);
  const rows = [
    template.headers,
    ...entries.map(entry => template.headers.map(header => {
      const field = template.mapping[header];
      return field ? entry[field] : '';
    })),
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet['!cols'] = template.headers.map(header => ({ wch: Math.max(12, Math.min(28, header.length + 3)) }));
  worksheet['!autofilter'] = { ref: `A1:${XLSX.utils.encode_col(Math.max(0, template.headers.length - 1))}${Math.max(1, rows.length)}` };
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Ecritures');
  const baseName = `export-comptable-${safeFileName(template.name)}-${safeFileName(periodLabel)}`;
  if (template.fileType === 'csv') {
    const csv = `\uFEFF${XLSX.utils.sheet_to_csv(worksheet, { FS: ';' })}`;
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${baseName}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  } else {
    XLSX.writeFile(workbook, `${baseName}.xlsx`);
  }
  return entries.length;
};
