import { describe, it, expect } from 'vitest';
import { computeDerived, makeSlots, type PenSlot } from './logic';

describe('makeSlots', () => {
  it('creates n empty slots with sequential ids', () => {
    const slots = makeSlots(3);
    expect(slots).toHaveLength(3);
    expect(slots.every(s => s.animal === null)).toBe(true);
    expect(slots.map(s => s.id)).toEqual(['slot-0', 'slot-1', 'slot-2']);
  });

  it('creates zero slots', () => {
    expect(makeSlots(0)).toEqual([]);
  });
});

describe('computeDerived', () => {
  it('returns all zeros when pen is empty', () => {
    const d = computeDerived(makeSlots(5), 5, 14);
    expect(d.currentAnimals).toBe(0);
    expect(d.currentLegs).toBe(0);
    expect(d.chickenCount).toBe(0);
    expect(d.rabbitCount).toBe(0);
    expect(d.isComplete).toBe(false);
    expect(d.isCorrect).toBe(false);
    expect(d.legsDiff).toBe(14);
  });

  it('correct answer: 3 chickens + 2 rabbits = 14 legs', () => {
    const slots: PenSlot[] = [
      { id: 's0', animal: 'chicken' },
      { id: 's1', animal: 'chicken' },
      { id: 's2', animal: 'chicken' },
      { id: 's3', animal: 'rabbit' },
      { id: 's4', animal: 'rabbit' },
    ];
    const d = computeDerived(slots, 5, 14);
    expect(d.chickenCount).toBe(3);
    expect(d.rabbitCount).toBe(2);
    expect(d.currentLegs).toBe(14);
    expect(d.isComplete).toBe(true);
    expect(d.isCorrect).toBe(true);
    expect(d.legsDiff).toBe(0);
  });

  it('complete but wrong legs: too few', () => {
    const slots: PenSlot[] = Array.from({ length: 5 }, (_, i) => ({
      id: `s${i}`,
      animal: 'chicken' as const,
    }));
    const d = computeDerived(slots, 5, 14);
    expect(d.currentLegs).toBe(10);
    expect(d.isComplete).toBe(true);
    expect(d.isCorrect).toBe(false);
    expect(d.legsDiff).toBe(4);
  });

  it('complete but wrong legs: too many', () => {
    const slots: PenSlot[] = Array.from({ length: 5 }, (_, i) => ({
      id: `s${i}`,
      animal: 'rabbit' as const,
    }));
    const d = computeDerived(slots, 5, 14);
    expect(d.currentLegs).toBe(20);
    expect(d.isComplete).toBe(true);
    expect(d.isCorrect).toBe(false);
    expect(d.legsDiff).toBe(-6);
  });

  it('partially filled is not complete', () => {
    const slots: PenSlot[] = [
      { id: 's0', animal: 'chicken' },
      { id: 's1', animal: null },
      { id: 's2', animal: null },
    ];
    const d = computeDerived(slots, 3, 8);
    expect(d.currentAnimals).toBe(1);
    expect(d.isComplete).toBe(false);
    expect(d.isCorrect).toBe(false);
  });
});
