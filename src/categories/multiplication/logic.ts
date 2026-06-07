export function computeTotal(crates: number, applesPerCrate: number): number {
  return crates * applesPerCrate;
}

export function buildRepeatedAddition(crates: number, applesPerCrate: number): string {
  if (crates === 0) return '';
  return Array(crates).fill(String(applesPerCrate)).join(' + ');
}

export function buildMultiplicationSentence(crates: number, applesPerCrate: number): string {
  return `${crates} × ${applesPerCrate} = ${computeTotal(crates, applesPerCrate)}`;
}

export function getGroupCountingStep(
  step: number,
  applesPerCrate: number,
): { groupNum: number; groupTotal: number; runningTotal: number } {
  return {
    groupNum: step,
    groupTotal: applesPerCrate,
    runningTotal: step * applesPerCrate,
  };
}
