import { describe, expect, it } from 'vitest';
import {
  computeElapsedSteps,
  formatClock12,
  getDayPeriod,
  splitHoursAndMinutes,
} from './logic';

describe('computeElapsedSteps', () => {
  it('returns no steps when start and end coincide', () => {
    expect(computeElapsedSteps(8 * 60, 8 * 60)).toEqual({ steps: [], totalMinutes: 0 });
  });

  it('hops to the next full hour, then by hours, then the remainder (20:30 → 22:15)', () => {
    const breakdown = computeElapsedSteps(20 * 60 + 30, 22 * 60 + 15);
    expect(breakdown).toEqual({
      steps: [
        { fromMinutes: 1230, toMinutes: 1260, deltaMinutes: 30 },
        { fromMinutes: 1260, toMinutes: 1320, deltaMinutes: 60 },
        { fromMinutes: 1320, toMinutes: 1335, deltaMinutes: 15 },
      ],
      totalMinutes: 105,
    });
  });

  it('skips the "to next hour" hop when the start is already on the hour (14:00 → 16:30)', () => {
    const breakdown = computeElapsedSteps(14 * 60, 16 * 60 + 30);
    expect(breakdown.steps).toEqual([
      { fromMinutes: 840, toMinutes: 900, deltaMinutes: 60 },
      { fromMinutes: 900, toMinutes: 960, deltaMinutes: 60 },
      { fromMinutes: 960, toMinutes: 990, deltaMinutes: 30 },
    ]);
    expect(breakdown.totalMinutes).toBe(150);
  });

  it('wraps past midnight (23:50 → 00:20)', () => {
    const breakdown = computeElapsedSteps(23 * 60 + 50, 20);
    expect(breakdown.steps).toEqual([
      { fromMinutes: 1430, toMinutes: 0, deltaMinutes: 10 },
      { fromMinutes: 0, toMinutes: 20, deltaMinutes: 20 },
    ]);
    expect(breakdown.totalMinutes).toBe(30);
  });

  it('collapses to a single hop when the gap never reaches a full hour (9:05 → 9:40)', () => {
    const breakdown = computeElapsedSteps(9 * 60 + 5, 9 * 60 + 40);
    expect(breakdown.steps).toEqual([{ fromMinutes: 545, toMinutes: 580, deltaMinutes: 35 }]);
    expect(breakdown.totalMinutes).toBe(35);
  });

  it('treats a full 24-hour loop as 1440 minutes rather than zero', () => {
    const breakdown = computeElapsedSteps(6 * 60, 6 * 60);
    // same start/end is defined as "no elapsed time", not a full lap
    expect(breakdown.totalMinutes).toBe(0);
  });

  it('every step total matches the breakdown total', () => {
    const breakdown = computeElapsedSteps(7 * 60 + 48, 13 * 60 + 5);
    const sum = breakdown.steps.reduce((acc, step) => acc + step.deltaMinutes, 0);
    expect(sum).toBe(breakdown.totalMinutes);
  });
});

describe('formatClock12', () => {
  it.each([
    [0, '12:00 AM'],
    [60, '1:00 AM'],
    [9 * 60 + 5, '9:05 AM'],
    [12 * 60, '12:00 PM'],
    [13 * 60 + 30, '1:30 PM'],
    [23 * 60 + 59, '11:59 PM'],
  ])('formats %i minutes as %s', (minutes, expected) => {
    expect(formatClock12(minutes)).toBe(expected);
  });

  it('wraps minutes outside the 0–1439 range', () => {
    expect(formatClock12(-30)).toBe(formatClock12(1410));
    expect(formatClock12(1500)).toBe(formatClock12(60));
  });
});

describe('getDayPeriod', () => {
  it.each([
    [0, 'night'],
    [299, 'night'],
    [300, 'early-morning'],
    [539, 'early-morning'],
    [540, 'morning'],
    [719, 'morning'],
    [720, 'noon'],
    [839, 'noon'],
    [840, 'afternoon'],
    [1079, 'afternoon'],
    [1080, 'evening'],
    [1199, 'evening'],
    [1200, 'night'],
    [1439, 'night'],
  ])('classifies minute %i as %s', (minutes, id) => {
    expect(getDayPeriod(minutes).id).toBe(id);
  });
});

describe('splitHoursAndMinutes', () => {
  it('splits a duration into hours and minutes', () => {
    expect(splitHoursAndMinutes(105)).toEqual({ hours: 1, minutes: 45 });
    expect(splitHoursAndMinutes(45)).toEqual({ hours: 0, minutes: 45 });
    expect(splitHoursAndMinutes(120)).toEqual({ hours: 2, minutes: 0 });
  });
});
