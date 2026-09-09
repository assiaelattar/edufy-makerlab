import type { Timestamp } from 'firebase/firestore';

export type BillingAudience = 'individual' | 'company';

export type BillingUnitKind = 'hour' | 'workshop' | 'half_day' | 'day' | 'package' | 'participant' | 'group';
export type BillingCalculationMode = 'planned' | 'delivered' | 'manual';

export interface FinanceBillingProfile {
  unitKind: BillingUnitKind;
  unitLabel: string;
  hoursPerUnit: number;
  sessionsPerUnit: number;
  calculationMode: BillingCalculationMode;
}

export interface FinanceParticipant {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role?: string;
  studentId?: string;
}

export interface FinanceCustomerSnapshot {
  type: BillingAudience;
  name: string;
  contactName?: string;
  address?: string;
  email?: string;
  phone?: string;
  ice?: string;
  rc?: string;
  taxId?: string;
}

export interface FinanceBeneficiarySnapshot {
  name: string;
  contactName?: string;
  address?: string;
  notes?: string;
}

export interface FinanceDocumentLine {
  id: string;
  description: string;
  details?: string;
  serviceId?: string;
  serviceName?: string;
  serviceVersion?: number;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  subtotal: number;
  taxAmount: number;
  total: number;
  unitKind?: BillingUnitKind;
  unitLabel?: string;
  hoursPerUnit?: number;
  sessionCount?: number;
  calculationMode?: BillingCalculationMode;
}

export type FinanceDocumentKind = 'invoice' | 'credit_note';
export type FinanceDocumentStatus = 'issued' | 'credited';

export interface FinanceDocument {
  id: string;
  organizationId: string;
  kind: FinanceDocumentKind;
  number: string;
  sequenceYear: number;
  sequenceNumber: number;
  status: FinanceDocumentStatus;
  issueDate: string;
  dueDate?: string;
  serviceDate?: string;
  currency: string;
  customer: FinanceCustomerSnapshot;
  beneficiary?: FinanceBeneficiarySnapshot;
  participants: FinanceParticipant[];
  programId?: string;
  programName?: string;
  corporateEnrollmentId?: string;
  sourcePaymentId?: string;
  originalInvoiceId?: string;
  originalInvoiceNumber?: string;
  creditNoteId?: string;
  creditNoteNumber?: string;
  creditReason?: string;
  lines: FinanceDocumentLine[];
  subtotal: number;
  taxAmount: number;
  total: number;
  createdAt?: Timestamp | string;
  updatedAt?: Timestamp | string;
  issuedAt?: Timestamp | string;
}

export interface CorporateEnrollment {
  id: string;
  organizationId: string;
  programId: string;
  programName: string;
  company: FinanceCustomerSnapshot;
  beneficiary?: FinanceBeneficiarySnapshot;
  participants: FinanceParticipant[];
  status: 'active' | 'completed' | 'cancelled';
  financeDocumentIds: string[];
  createdAt?: Timestamp | string;
  updatedAt?: Timestamp | string;
}

export type AccountingExportField =
  | 'documentNumber'
  | 'date'
  | 'journal'
  | 'accountNumber'
  | 'counterpartyAccount'
  | 'label'
  | 'debit'
  | 'credit'
  | 'reference'
  | 'taxRate'
  | 'taxCode'
  | 'prorata'
  | 'natureCode'
  | 'typeCode'
  | 'internalReference'
  | 'lettering'
  | 'dueDate'
  | 'deliveryDate'
  | 'customerName'
  | 'beneficiaryName'
  | 'programName'
  | 'participantNames'
  | 'unitLabel'
  | 'hoursPerUnit'
  | 'sessionCount'
  | 'calculationMode'
  | 'documentType';

export interface AccountingExportTemplate {
  id: string;
  organizationId?: string;
  name: string;
  source: 'builtin' | 'custom';
  fileType: 'xlsx' | 'csv';
  headers: string[];
  mapping: Record<string, AccountingExportField | ''>;
  defaults: {
    journal: string;
    customerAccount: string;
    revenueAccount: string;
    vatAccount: string;
    taxCode: string;
    natureCode?: string;
    typeCode?: string;
  };
  createdAt?: Timestamp | string;
  updatedAt?: Timestamp | string;
}

export interface AccountingEntry {
  documentNumber: string;
  date: string;
  journal: string;
  accountNumber: string;
  counterpartyAccount: string;
  label: string;
  debit: number;
  credit: number;
  reference: string;
  taxRate: number;
  taxCode: string;
  prorata: number;
  natureCode: string;
  typeCode: string;
  internalReference: string;
  lettering: string;
  dueDate: string;
  deliveryDate: string;
  customerName: string;
  beneficiaryName: string;
  programName: string;
  participantNames: string;
  unitLabel: string;
  hoursPerUnit: number;
  sessionCount: number;
  calculationMode: string;
  documentType: string;
}
