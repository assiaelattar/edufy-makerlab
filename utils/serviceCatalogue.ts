import type { CatalogueService, ServiceValues } from '../types/serviceCatalogue';
import type { FinanceDocumentLine } from '../types/finance';

// Source: Future_Makers_AI_Services_Catalogue_2026.pdf, service map p4,
// details p5–12. Prices/taxes are absent; 20% is the existing invoice UI default.
const definitions = [
  ['AI Content Studio', 'Content', 'UGC-style images and videos\nProduct visuals, mockups and campaigns\nAI avatars, personas and content calendars'],
  ['Chatbots + Personas', 'Customer AI', 'Website and WhatsApp assistants\nMultilingual support and qualification\nBooking, CRM creation and team handoff'],
  ['Voice AI', 'Customer AI', 'AI reception and call qualification\nBooking, reminders and simple support\nConversation summaries and escalation'],
  ['Workflow Automation', 'Automation', 'Lead routing and follow-up\nDocuments, invoices and notifications\nApprovals, checklists and integrations'],
  ['Specialized AI Agents', 'Agents', 'Sales, support and reporting agents\nResearch and document-analysis agents\nInternal knowledge and productivity assistants'],
  ['Web + Applications', 'Applications', 'Premium websites and landing pages\nClient and partner portals\nCustom web apps, SaaS and responsive PWA'],
  ['CRM + Business Systems', 'Business systems', 'Custom CRM, ERP and booking systems\nOperational dashboards and alerts\nRoles, documents, partner and customer portals'],
  ['AI Strategy + Deployment', 'Strategy', 'Business and workflow audit\nAI opportunity map and implementation roadmap\nControls, testing, training and adoption'],
] as const;

export const defaultServices = (organizationId: string): CatalogueService[] => definitions.map(([name, category, description], index) => ({
  id: `future-makers-2026-${String(index + 1).padStart(2, '0')}`, organizationId,
  name, category, description, unitLabel: 'Forfait', quantity: 1, unitPrice: null,
  taxRate: 20, status: 'active', version: 0,
  source: `Future Makers 2026 · p. ${index + 5}`,
}));

export const mergeServiceCatalogue = (organizationId: string, stored: CatalogueService[]) => {
  const catalogue = new Map(defaultServices(organizationId).map(service => [service.id, service]));
  stored.filter(service => service.organizationId === organizationId).forEach(service => catalogue.set(service.id, service));
  return [...catalogue.values()].sort((a, b) => a.name.localeCompare(b.name));
};

export const validateService = (value: ServiceValues): ServiceValues => {
  const result: ServiceValues = { quantity: value.quantity, unitPrice: value.unitPrice, taxRate: value.taxRate, status: value.status, name: value.name.trim(), description: value.description.trim(), category: value.category.trim(), unitLabel: value.unitLabel.trim(), source: value.source.trim() };
  if (!result.name || result.name.length > 160 || result.description.length > 4000 || result.category.length > 80 || !result.unitLabel || result.unitLabel.length > 80 || result.source.length > 200) throw new Error('Vérifiez le nom, les détails et l’unité du service.');
  if (!Number.isFinite(result.quantity) || result.quantity <= 0 || result.quantity > 1000000 || (result.unitPrice !== null && (!Number.isFinite(result.unitPrice) || result.unitPrice < 0 || result.unitPrice > 1000000000)) || !Number.isFinite(result.taxRate) || result.taxRate < 0 || result.taxRate > 100 || !['active', 'archived'].includes(result.status)) throw new Error('Quantité, prix ou TVA invalide.');
  return result;
};

export type ServiceInvoiceLine = Pick<FinanceDocumentLine, 'description' | 'details' | 'quantity' | 'unitPrice' | 'taxRate' | 'unitLabel' | 'serviceId' | 'serviceName' | 'serviceVersion'>;
export const snapshotService = (service: CatalogueService, organizationId: string): ServiceInvoiceLine => {
  if (service.organizationId !== organizationId || service.status !== 'active') throw new Error('Ce service n’est pas disponible dans cette organisation.');
  return { serviceId: service.id, serviceName: service.name, serviceVersion: service.version, description: service.name, details: service.description, quantity: service.quantity, unitPrice: service.unitPrice ?? 0, taxRate: service.taxRate, unitLabel: service.unitLabel };
};
