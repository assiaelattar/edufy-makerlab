import type { Timestamp } from 'firebase/firestore';

export interface CatalogueService {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  category: string;
  unitLabel: string;
  quantity: number;
  unitPrice: number | null;
  taxRate: number;
  status: 'active' | 'archived';
  version: number;
  source: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
}

export type ServiceValues = Pick<CatalogueService, 'name' | 'description' | 'category' | 'unitLabel' | 'quantity' | 'unitPrice' | 'taxRate' | 'status' | 'source'>;
