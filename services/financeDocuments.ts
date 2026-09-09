import {
  collection,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  setDoc,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';
import type {
  AccountingExportTemplate,
  CorporateEnrollment,
  FinanceCustomerSnapshot,
  FinanceBeneficiarySnapshot,
  FinanceDocument,
  FinanceDocumentLine,
  FinanceParticipant,
} from '../types';

export interface IssueFinanceInvoiceInput {
  organizationId: string;
  issueDate: string;
  dueDate?: string;
  serviceDate?: string;
  currency: string;
  customer: FinanceCustomerSnapshot;
  beneficiary?: FinanceBeneficiarySnapshot;
  participants: FinanceParticipant[];
  programId?: string;
  programName?: string;
  sourcePaymentId?: string;
  idempotencyKey?: string;
  lines: Array<Pick<FinanceDocumentLine, 'description' | 'quantity' | 'unitPrice' | 'taxRate'> & Partial<Pick<FinanceDocumentLine, 'details' | 'serviceId' | 'serviceName' | 'serviceVersion' | 'unitKind' | 'unitLabel' | 'hoursPerUnit' | 'sessionCount' | 'calculationMode'>>>;
}

const cleanId = (value: string) => value.replace(/[^a-zA-Z0-9_-]/g, '_');
const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export const normalizeLines = (lines: IssueFinanceInvoiceInput['lines']): FinanceDocumentLine[] => lines.map((line, index) => {
  if (![line.quantity, line.unitPrice, line.taxRate].every(Number.isFinite) || line.quantity <= 0 || line.unitPrice <= 0 || line.taxRate < 0 || line.taxRate > 100) throw new Error('Every invoice line needs a positive quantity and price, and tax between 0 and 100%.');
  const quantity = Math.max(0, Number(line.quantity) || 0);
  const unitPrice = roundMoney(Math.max(0, Number(line.unitPrice) || 0));
  const taxRate = Math.max(0, Number(line.taxRate) || 0);
  const subtotal = roundMoney(quantity * unitPrice);
  const taxAmount = roundMoney(subtotal * taxRate / 100);
  return {
    id: `line-${index + 1}`,
    description: line.description.trim(),
    details: line.details?.trim() || undefined,
    serviceId: line.serviceId,
    serviceName: line.serviceName,
    serviceVersion: line.serviceVersion,
    quantity,
    unitPrice,
    taxRate,
    subtotal,
    taxAmount,
    total: roundMoney(subtotal + taxAmount),
    unitKind: line.unitKind,
    unitLabel: line.unitLabel?.trim() || undefined,
    hoursPerUnit: line.hoursPerUnit !== undefined ? Math.max(0, Number(line.hoursPerUnit) || 0) : undefined,
    sessionCount: line.sessionCount !== undefined ? Math.max(0, Number(line.sessionCount) || 0) : undefined,
    calculationMode: line.calculationMode,
  };
});

const nextNumber = (kind: 'invoice' | 'credit_note', year: number, sequence: number) => (
  kind === 'invoice'
    ? `${year}${String(sequence).padStart(4, '0')}`
    : `AV${year}${String(sequence).padStart(4, '0')}`
);

export const subscribeFinanceDocuments = (
  firestore: Firestore,
  organizationId: string,
  onData: (documents: FinanceDocument[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe => onSnapshot(
  collection(firestore, 'organizations', organizationId, 'financeDocuments'),
  snapshot => {
    const documents = snapshot.docs
      .map(item => ({ id: item.id, ...item.data() } as FinanceDocument))
      .sort((left, right) => right.issueDate.localeCompare(left.issueDate) || right.number.localeCompare(left.number));
    onData(documents);
  },
  error => onError?.(error),
);

export const subscribeAccountingTemplates = (
  firestore: Firestore,
  organizationId: string,
  onData: (templates: AccountingExportTemplate[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe => onSnapshot(
  collection(firestore, 'organizations', organizationId, 'accountingExportTemplates'),
  snapshot => onData(snapshot.docs.map(item => ({ id: item.id, ...item.data() } as AccountingExportTemplate))),
  error => onError?.(error),
);

export const issueFinanceInvoice = async (
  firestore: Firestore,
  input: IssueFinanceInvoiceInput,
): Promise<FinanceDocument> => {
  const year = Number(input.issueDate.slice(0, 4));
  if (!Number.isInteger(year) || year < 2000 || year > 9999) throw new Error('Choose a valid invoice date.');

  const lines = normalizeLines(input.lines);
  if (!lines.length || lines.some(line => !line.description || line.quantity <= 0 || line.unitPrice <= 0)) {
    throw new Error('Every invoice line needs a description, quantity, and positive unit price.');
  }

  const subtotal = roundMoney(lines.reduce((sum, line) => sum + line.subtotal, 0));
  const taxAmount = roundMoney(lines.reduce((sum, line) => sum + line.taxAmount, 0));
  const total = roundMoney(subtotal + taxAmount);
  const documentsCollection = collection(firestore, 'organizations', input.organizationId, 'financeDocuments');
  const documentRef = input.idempotencyKey
    ? doc(documentsCollection, cleanId(input.idempotencyKey))
    : doc(documentsCollection);
  const counterRef = doc(firestore, 'organizations', input.organizationId, 'financeCounters', `invoice-${year}`);

  return runTransaction(firestore, async transaction => {
    const existing = await transaction.get(documentRef);
    if (existing.exists()) return { id: existing.id, ...existing.data() } as FinanceDocument;

    const counter = await transaction.get(counterRef);
    const sequenceNumber = Math.max(0, Number(counter.data()?.value) || 0) + 1;
    const number = nextNumber('invoice', year, sequenceNumber);

    let corporateEnrollmentId: string | undefined;
    if (input.customer.type === 'company' && input.programId && input.programName) {
      const enrollmentRef = doc(collection(firestore, 'organizations', input.organizationId, 'corporateEnrollments'));
      corporateEnrollmentId = enrollmentRef.id;
      const corporateEnrollment: Omit<CorporateEnrollment, 'createdAt' | 'updatedAt'> = {
        id: enrollmentRef.id,
        organizationId: input.organizationId,
        programId: input.programId,
        programName: input.programName,
        company: input.customer,
        beneficiary: input.beneficiary,
        participants: input.participants,
        status: 'active',
        financeDocumentIds: [documentRef.id],
      };
      transaction.set(enrollmentRef, {
        ...JSON.parse(JSON.stringify(corporateEnrollment)),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    const document: Omit<FinanceDocument, 'createdAt' | 'updatedAt' | 'issuedAt'> = {
      id: documentRef.id,
      organizationId: input.organizationId,
      kind: 'invoice',
      number,
      sequenceYear: year,
      sequenceNumber,
      status: 'issued',
      issueDate: input.issueDate,
      dueDate: input.dueDate || input.issueDate,
      serviceDate: input.serviceDate || input.issueDate,
      currency: input.currency,
      customer: input.customer,
      beneficiary: input.beneficiary,
      participants: input.participants,
      programId: input.programId,
      programName: input.programName,
      corporateEnrollmentId,
      sourcePaymentId: input.sourcePaymentId,
      lines,
      subtotal,
      taxAmount,
      total,
    };

    const serializableDocument = JSON.parse(JSON.stringify(document));
    transaction.set(documentRef, {
      ...serializableDocument,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      issuedAt: serverTimestamp(),
    });
    transaction.set(counterRef, {
      organizationId: input.organizationId,
      kind: 'invoice',
      year,
      value: sequenceNumber,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    return document as FinanceDocument;
  });
};

export const createFullCreditNote = async (
  firestore: Firestore,
  organizationId: string,
  invoice: FinanceDocument,
  reason: string,
): Promise<FinanceDocument> => {
  if (invoice.organizationId !== organizationId || invoice.kind !== 'invoice') throw new Error('Only an invoice from this workspace can be credited.');
  const creditDate = new Date().toISOString().slice(0, 10);
  const year = Number(creditDate.slice(0, 4));
  const invoiceRef = doc(firestore, 'organizations', organizationId, 'financeDocuments', invoice.id);
  const creditRef = doc(collection(firestore, 'organizations', organizationId, 'financeDocuments'));
  const counterRef = doc(firestore, 'organizations', organizationId, 'financeCounters', `credit-note-${year}`);

  return runTransaction(firestore, async transaction => {
    const currentInvoice = await transaction.get(invoiceRef);
    if (!currentInvoice.exists()) throw new Error('The original invoice no longer exists.');
    const current = { id: currentInvoice.id, ...currentInvoice.data() } as FinanceDocument;
    if (current.status === 'credited' || current.creditNoteId) throw new Error('This invoice already has a credit note.');

    const counter = await transaction.get(counterRef);
    const sequenceNumber = Math.max(0, Number(counter.data()?.value) || 0) + 1;
    const number = nextNumber('credit_note', year, sequenceNumber);
    const credit: Omit<FinanceDocument, 'createdAt' | 'updatedAt' | 'issuedAt'> = {
      id: creditRef.id,
      organizationId,
      kind: 'credit_note',
      number,
      sequenceYear: year,
      sequenceNumber,
      status: 'issued',
      issueDate: creditDate,
      dueDate: creditDate,
      serviceDate: current.serviceDate || current.issueDate,
      currency: current.currency,
      customer: current.customer,
      beneficiary: current.beneficiary,
      participants: current.participants,
      programId: current.programId,
      programName: current.programName,
      corporateEnrollmentId: current.corporateEnrollmentId,
      originalInvoiceId: current.id,
      originalInvoiceNumber: current.number,
      creditReason: reason.trim(),
      lines: current.lines,
      subtotal: current.subtotal,
      taxAmount: current.taxAmount,
      total: current.total,
    };

    transaction.set(creditRef, {
      ...JSON.parse(JSON.stringify(credit)),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      issuedAt: serverTimestamp(),
    });
    transaction.update(invoiceRef, {
      status: 'credited',
      creditNoteId: creditRef.id,
      creditNoteNumber: number,
      updatedAt: serverTimestamp(),
    });
    transaction.set(counterRef, {
      organizationId,
      kind: 'credit_note',
      year,
      value: sequenceNumber,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    return credit as FinanceDocument;
  });
};

export const saveAccountingTemplate = async (
  firestore: Firestore,
  organizationId: string,
  template: AccountingExportTemplate,
) => {
  const templateRef = doc(firestore, 'organizations', organizationId, 'accountingExportTemplates', cleanId(template.id));
  await setDoc(templateRef, {
    ...JSON.parse(JSON.stringify({ ...template, id: templateRef.id, organizationId, source: 'custom' })),
    updatedAt: serverTimestamp(),
    createdAt: template.createdAt || serverTimestamp(),
  }, { merge: true });
};
