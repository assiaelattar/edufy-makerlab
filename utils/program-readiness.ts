import { Group, Program } from '../types';

export interface ProgramReadiness {
  hasPricing: boolean;
  hasSchedule: boolean;
  validGroups: Group[];
  isReady: boolean;
}

export const getProgramReadiness = (program: Program): ProgramReadiness => {
  const hasPricing = (program.packs || []).some(pack =>
    Math.max(pack.priceAnnual || 0, pack.priceTrimester || 0, pack.price || 0, pack.promoPrice || 0) > 0
  );
  const validGroups = (program.grades || []).flatMap(grade => grade.groups || []).filter(group =>
    Boolean(group.name?.trim() && group.day?.trim() && group.time?.trim())
  );
  const hasSchedule = validGroups.length > 0;

  return {
    hasPricing,
    hasSchedule,
    validGroups,
    isReady: program.status === 'active' && hasPricing && hasSchedule
  };
};
