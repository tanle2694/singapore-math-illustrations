export interface DivisionResult {
  total: number;
  divisor: number;
  quotient: number;
  remainder: number;
}

export function computeDivision(total: number, divisor: number): DivisionResult {
  return {
    total,
    divisor,
    quotient: Math.floor(total / divisor),
    remainder: total % divisor,
  };
}

export const PRESETS: ReadonlyArray<{ total: number; divisor: number }> = [
  { total: 14, divisor: 3 },
  { total: 20, divisor: 4 },
  { total: 17, divisor: 5 },
  { total: 15, divisor: 4 },
  { total: 22, divisor: 6 },
];

export function randomParams(): { total: number; divisor: number } {
  return {
    total: Math.floor(Math.random() * 20) + 6,
    divisor: Math.floor(Math.random() * 4) + 2,
  };
}
