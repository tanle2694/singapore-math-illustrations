export interface AgeState {
  father: number;
  child: number;
  diff: number;
}

/** Compute the ages of father and child at a given year offset from now. */
export function computeAges(fatherNow: number, childNow: number, years: number): AgeState {
  return {
    father: fatherNow + years,
    child: childNow + years,
    diff: fatherNow - childNow, // constant — never changes
  };
}

export function isValidInput(fatherNow: number, childNow: number): boolean {
  return Number.isFinite(fatherNow) && Number.isFinite(childNow) && fatherNow > childNow && childNow >= 0;
}

export function getTimeLabel(years: number): string {
  if (years === 0) return 'Hiện tại';
  if (years > 0) return `Sau ${years} năm`;
  return `${Math.abs(years)} năm trước`;
}
