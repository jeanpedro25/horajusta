export const PLAN_CATALOG = {
  pro: {
    name: 'PRO Mensal',
    mercadoPagoTitle: 'Hora Justa PRO Mensal',
    amountCents: 990,
    durationMonths: 1,
  },
  anual: {
    name: 'PRO Anual',
    mercadoPagoTitle: 'Hora Justa PRO Anual',
    amountCents: 8990,
    durationMonths: 12,
  },
} as const;

export type PaidPlanId = keyof typeof PLAN_CATALOG;

export function isPaidPlanId(value: unknown): value is PaidPlanId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(PLAN_CATALOG, value);
}

export function getPlanDurationLabel(plan: PaidPlanId): string {
  const months = PLAN_CATALOG[plan].durationMonths;
  return `${months} ${months === 1 ? 'mês' : 'meses'}`;
}

export function formatBRLCents(amountCents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
    .format(amountCents / 100);
}

export const ANNUAL_SAVINGS_CENTS =
  Math.round(
    PLAN_CATALOG.pro.amountCents *
      PLAN_CATALOG.anual.durationMonths / PLAN_CATALOG.pro.durationMonths,
  ) - PLAN_CATALOG.anual.amountCents;
