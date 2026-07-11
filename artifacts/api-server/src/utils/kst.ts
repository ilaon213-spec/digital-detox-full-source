/** KST (Korean Standard Time) = UTC+9 */
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** Returns the current Date adjusted to KST */
export function nowKST(): Date {
  return new Date(Date.now() + KST_OFFSET_MS);
}

/** Returns 0–6 day of week in KST (0 = Sunday) */
export function getDayOfWeekKST(): number {
  return nowKST().getUTCDay();
}

/** Returns true if today is Sunday in KST */
export function isSundayKST(): boolean {
  return getDayOfWeekKST() === 0;
}

/** Returns today's date string in KST (YYYY-MM-DD) */
export function todayStringKST(): string {
  const kst = nowKST();
  const year = kst.getUTCFullYear();
  const month = String(kst.getUTCMonth() + 1).padStart(2, "0");
  const day = String(kst.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Returns current hour and minute in KST */
export function getCurrentMinutesKST(): number {
  const kst = nowKST();
  return kst.getUTCHours() * 60 + kst.getUTCMinutes();
}
