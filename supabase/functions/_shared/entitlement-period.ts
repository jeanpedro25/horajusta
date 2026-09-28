export function addCalendarMonths(start: Date, months: number): Date {
  if (!Number.isInteger(months) || Number.isNaN(start.getTime())) {
    throw new RangeError("invalid_entitlement_period");
  }

  const result = new Date(start.getTime());
  const dayOfMonth = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);

  const lastDayOfTargetMonth = new Date(Date.UTC(
    result.getUTCFullYear(),
    result.getUTCMonth() + 1,
    0,
  )).getUTCDate();
  result.setUTCDate(Math.min(dayOfMonth, lastDayOfTargetMonth));

  return result;
}
