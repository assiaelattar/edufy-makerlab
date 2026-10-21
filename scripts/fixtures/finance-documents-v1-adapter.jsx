// Browser-only document boundary. Every record and write stays in this module.
import React, { useSyncExternalStore } from 'react';

const params = new URLSearchParams(location.search);
const organizationId = 'synthetic-finance-only';
const fail = operation => { if (params.get('save') === 'failure' || params.get('save') === `${operation}-failure`) throw new Error('Synthetic connection failure'); };
let revision = 0;
let message = '';
const statusListeners = new Set();
const documentListeners = new Set();
const serviceListeners = new Set();
const templateListeners = new Set();
const note = value => { message = value; revision++; statusListeners.forEach(listener => listener()); };
const invoice = {
  id: 'invoice-example', organizationId, kind: 'invoice', status: 'issued', number: '2026F001',
  sequenceType: 'formation', sequenceYear: 2026, sequenceNumber: 1, issueDate: '2026-10-10',
  dueDate: '2026-11-10', serviceDate: '2026-10-10', currency: 'MAD',
  customer: { type: 'company', name: 'Example Learning Co', contactName: 'Sample Contact' },
  participants: [{ id: 'participant-example', name: 'Alex Example' }], programId: 'program-1',
  programName: 'Robotics workshop', lines: [{ id: 'line-1', description: 'Robotics workshop', quantity: 1,
    unitPrice: 1000, taxRate: 20, subtotal: 1000, taxAmount: 200, total: 1200 }],
  subtotal: 1000, taxAmount: 200, total: 1200, revision: 0,
};
let documents = params.get('scenario') === 'empty' ? [] : [invoice];
let services = [{ id: 'service-example', organizationId, name: 'Workshop design', description: 'Synthetic service',
  category: 'Learning', quantity: 1, unitLabel: 'Forfait', unitPrice: 500, taxRate: 20,
  status: 'active', source: 'fixture', version: 1 }];
let templates = [];
const emitDocuments = () => documentListeners.forEach(listener => listener([...documents]));
const emitServices = () => serviceListeners.forEach(listener => listener([...services]));
const emitTemplates = () => templateListeners.forEach(listener => listener([...templates]));
export const db = {};
export const useAppContext = () => ({ programs: [{ id: 'program-1', name: 'Robotics workshop',
  status: 'active', billingAudience: 'company', billingProfile: { unitKind: 'workshop', unitLabel: 'Atelier',
    hoursPerUnit: 3, sessionsPerUnit: 1, calculationMode: 'planned' }, packs: [{ price: 1000 }] }],
  settings: { academyName: 'Example school', academicYear: '2026-2027', currency: 'MAD' } });
export const useAuth = () => ({ currentOrganization: { id: organizationId },
  userProfile: { role: params.get('role') === 'readonly' ? 'admission_officer' : params.get('role') === 'accountant' ? 'accountant' : 'admin' },
  can: permission => params.get('role') === 'readonly' ? ['finance.view', 'finance.record_payment'].includes(permission)
    : params.get('role') === 'accountant' ? permission.startsWith('finance.') : true });
export const useConfirm = () => ({ confirm: async () => true, alert: async (title, detail) => note(`${title}: ${detail}`) });
export const subscribeFinanceDocuments = (_db, _organizationId, onData, onError) => {
  if (params.get('scenario') === 'error') onError(new Error('Synthetic listener denial'));
  else if (params.get('scenario') !== 'loading') onData([...documents]);
  documentListeners.add(onData); return () => documentListeners.delete(onData);
};
export const subscribeAccountingTemplates = (_db, _organizationId, onData) => {
  onData([...templates]); templateListeners.add(onData); return () => templateListeners.delete(onData);
};
export const subscribeServiceCatalogue = (_db, _organizationId, onData) => {
  onData([...services]); serviceListeners.add(onData); return () => serviceListeners.delete(onData);
};
export const normalizeLines = lines => lines.map((line, index) => {
  const quantity = Number(line.quantity), unitPrice = Number(line.unitPrice), taxRate = Number(line.taxRate);
  if (!line.description?.trim() || quantity <= 0 || unitPrice <= 0 || taxRate < 0 || taxRate > 100)
    throw new Error('Check each service description, quantity, price and tax.');
  const subtotal = Math.round(quantity * unitPrice * 100) / 100;
  const taxAmount = Math.round(subtotal * taxRate) / 100;
  return { ...line, id: `line-${index + 1}`, quantity, unitPrice, taxRate, subtotal, taxAmount,
    total: Math.round((subtotal + taxAmount) * 100) / 100 };
});
export const issueFinanceInvoice = async (_db, input) => {
  fail(); const lines = normalizeLines(input.lines);
  const subtotal = lines.reduce((sum, line) => sum + line.subtotal, 0);
  const taxAmount = lines.reduce((sum, line) => sum + line.taxAmount, 0);
  const record = { ...input, id: `invoice-${documents.length + 1}`, kind: 'invoice', status: 'issued',
    number: `2026${input.sequenceType === 'formation' ? 'F' : 'S'}${String(documents.length + 1).padStart(3, '0')}`,
    sequenceYear: 2026, sequenceNumber: documents.length + 1, lines, subtotal, taxAmount,
    total: subtotal + taxAmount, participants: input.participants || [] };
  documents = [record, ...documents]; emitDocuments(); note('Synthetic invoice saved'); return record;
};
export const updateFinanceInvoice = async (_db, input) => {
  fail('correction'); const previous = documents.find(document => document.id === input.invoiceId);
  const lines = normalizeLines(input.lines), subtotal = lines.reduce((sum, line) => sum + line.subtotal, 0);
  const taxAmount = lines.reduce((sum, line) => sum + line.taxAmount, 0);
  const record = { ...previous, ...input, lines, subtotal, taxAmount, total: subtotal + taxAmount,
    revision: (previous.revision || 0) + 1 };
  documents = documents.map(document => document.id === record.id ? record : document);
  emitDocuments(); note('Synthetic invoice correction saved'); return record;
};
export const createFullCreditNote = async (_db, _organizationId, target, reason) => {
  fail(); const record = { ...target, id: 'credit-example', kind: 'credit_note', number: 'AV20260001',
    originalInvoiceId: target.id, originalInvoiceNumber: target.number, creditReason: reason };
  documents = [record, ...documents.map(document => document.id === target.id
    ? { ...document, status: 'credited', creditNoteId: record.id, creditNoteNumber: record.number } : document)];
  emitDocuments(); note('Synthetic credit note saved'); return record;
};
export const loadFinanceInvoiceSequences = async (_db, _organizationId, year) => {
  return { year, formation: { lastUsed: 1, nextNumber: `${year}F002` },
    service: { lastUsed: 1, nextNumber: `${year}S002` } };
};
export const saveFinanceInvoiceSequences = async (_db, _organizationId, year, values) => {
  fail(); note('Synthetic sequences saved'); return { year,
    formation: { lastUsed: values.formation, nextNumber: `${year}F${String(values.formation + 1).padStart(3, '0')}` },
    service: { lastUsed: values.service, nextNumber: `${year}S${String(values.service + 1).padStart(3, '0')}` } };
};
export const saveAccountingTemplate = async (_db, _organizationId, template) => {
  fail(); templates = [...templates, template]; emitTemplates(); note('Synthetic accounting template saved');
};
export const saveCatalogueService = async (_db, _organizationId, id, version, values) => {
  fail(); services = id ? services.map(service => service.id === id ? { ...service, ...values, version: version + 1 } : service)
    : [...services, { ...values, id: `service-${services.length + 1}`, organizationId, version: 1 }];
  emitServices(); note('Synthetic service saved');
};
export const importDefaultServices = async () => { fail(); note('Synthetic service import requested'); return 0; };
export const FixtureStatus = () => {
  useSyncExternalStore(listener => { statusListeners.add(listener); return () => statusListeners.delete(listener); }, () => revision);
  return <aside role="status" style={{ maxWidth: 1320, margin: '20px auto', color: 'var(--ds-muted)' }}>
    Synthetic Documents fixture · no production records. {message}</aside>;
};
