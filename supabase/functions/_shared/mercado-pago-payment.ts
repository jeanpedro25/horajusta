export function matchesExpectedMercadoPagoPayment(
  amount: unknown,
  currency: unknown,
  collectorId: unknown,
  expectedAmount: number,
  expectedCollectorId: string,
): boolean {
  return typeof amount === 'number' && Number.isFinite(amount) &&
    Number.isFinite(expectedAmount) && Math.abs(amount - expectedAmount) <= 0.001 &&
    currency === 'BRL' && typeof collectorId === 'string' &&
    collectorId === expectedCollectorId;
}
