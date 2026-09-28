const TRIAL_DAYS = 7;
const DAY_MILLISECONDS = 24 * 60 * 60 * 1000;
const TRIAL_MILLISECONDS = TRIAL_DAYS * DAY_MILLISECONDS;

export interface TrialAccess {
  active: boolean;
  daysRemaining: number;
}

/** One authoritative seven-by-24-hour trial rule shared by the UI and server-side gates. */
export function getTrialAccess(
  createdAtValue: string | null | undefined,
  now = new Date(),
): TrialAccess {
  if (!createdAtValue) return { active: false, daysRemaining: 0 };

  const createdAt = new Date(createdAtValue);
  const elapsedMilliseconds = now.getTime() - createdAt.getTime();
  if (
    Number.isNaN(createdAt.getTime()) || Number.isNaN(now.getTime()) ||
    elapsedMilliseconds < 0 || elapsedMilliseconds >= TRIAL_MILLISECONDS
  ) {
    return { active: false, daysRemaining: 0 };
  }

  return {
    active: true,
    daysRemaining: Math.ceil((TRIAL_MILLISECONDS - elapsedMilliseconds) / DAY_MILLISECONDS),
  };
}
