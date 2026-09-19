import type { ProgramPack } from '../types';

export type ProgramPackPriceField = 'priceAnnual' | 'priceTrimester' | 'price' | 'promoPrice';

export interface ProgramPackPriceCatalog {
  priceAnnual: number | null;
  priceTrimester: number | null;
  price: number | null;
  promoPrice: number | null;
}

const PRICE_FIELDS: ProgramPackPriceField[] = ['priceAnnual', 'priceTrimester', 'price', 'promoPrice'];

const normalizedPrice = (value: unknown) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
};

export const getProgramPackPriceCatalog = (pack: ProgramPack): ProgramPackPriceCatalog => ({
  priceAnnual: normalizedPrice(pack.priceAnnual),
  priceTrimester: normalizedPrice(pack.priceTrimester),
  price: normalizedPrice(pack.price),
  promoPrice: normalizedPrice(pack.promoPrice),
});

/** Centralizes the guided-enrollment pricing policy over the canonical Program pack. */
export const resolveProgramPackStandardPrice = (pack: ProgramPack) => {
  const priceCatalog = getProgramPackPriceCatalog(pack);
  const availablePrices = PRICE_FIELDS
    .map(field => ({ field, amount: priceCatalog[field] }))
    .filter((entry): entry is { field: ProgramPackPriceField; amount: number } => entry.amount !== null);

  if (availablePrices.length === 0) return null;
  return availablePrices.reduce((highest, candidate) => candidate.amount > highest.amount ? candidate : highest);
};
