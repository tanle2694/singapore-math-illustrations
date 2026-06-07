export type AnimalType = 'chicken' | 'rabbit';

export const ANIMAL_DEFS = {
  chicken: { legs: 2, emoji: '🐔' },
  rabbit:  { legs: 4, emoji: '🐰' },
} as const;

export interface PenSlot {
  id: string;
  animal: AnimalType | null;
}

export interface DerivedState {
  currentAnimals: number;
  currentLegs: number;
  chickenCount: number;
  rabbitCount: number;
  isComplete: boolean;
  isCorrect: boolean;
  /** positive = need more legs, negative = too many */
  legsDiff: number;
}

export function makeSlots(n: number): PenSlot[] {
  return Array.from({ length: n }, (_, i) => ({ id: `slot-${i}`, animal: null }));
}

export function computeDerived(
  slots: PenSlot[],
  totalAnimals: number,
  targetLegs: number,
): DerivedState {
  const filled = slots.filter(s => s.animal !== null);
  const currentAnimals = filled.length;
  const currentLegs = filled.reduce((sum, s) => sum + ANIMAL_DEFS[s.animal!].legs, 0);
  const chickenCount = filled.filter(s => s.animal === 'chicken').length;
  const rabbitCount = filled.filter(s => s.animal === 'rabbit').length;
  const isComplete = currentAnimals === totalAnimals;
  const isCorrect = isComplete && currentLegs === targetLegs;
  const legsDiff = targetLegs - currentLegs;
  return { currentAnimals, currentLegs, chickenCount, rabbitCount, isComplete, isCorrect, legsDiff };
}

export const PRESETS: Array<{ animals: number; legs: number }> = [
  { animals: 5, legs: 14 },
  { animals: 6, legs: 16 },
  { animals: 4, legs: 12 },
  { animals: 7, legs: 22 },
  { animals: 3, legs: 10 },
];
