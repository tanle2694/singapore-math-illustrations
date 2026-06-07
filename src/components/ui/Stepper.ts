import { el } from '../../core/dom';
import { createButton } from './Button';
import { createSlider } from './Slider';

export interface StepperTick {
  value: number;
  label: string;
  emphasize?: boolean;
}

export interface StepperOptions {
  min: number;
  max: number;
  value: number;
  step?: number;
  ariaLabel: string;
  onChange: (value: number) => void;
  ticks?: StepperTick[];
}

export interface StepperHandle {
  root: HTMLElement;
  setValue(value: number): void;
}

/** The "−  ━━●━━  +" control with optional tick labels — built around `Slider`. */
export function createStepper(opts: StepperOptions): StepperHandle {
  const step = opts.step ?? 1;
  let value = opts.value;

  const slider = createSlider({
    min: opts.min,
    max: opts.max,
    step,
    value,
    ariaLabel: opts.ariaLabel,
    onInput: (next) => {
      value = next;
      opts.onChange(value);
    },
  });

  function nudge(direction: 1 | -1): void {
    const next = Math.min(opts.max, Math.max(opts.min, value + direction * step));
    if (next === value) return;
    value = next;
    slider.setValue(value);
    opts.onChange(value);
  }

  const minus = createButton({
    label: '−',
    variant: 'square',
    ariaLabel: 'Giảm giá trị',
    onClick: () => nudge(-1),
  });
  const plus = createButton({
    label: '+',
    variant: 'square',
    ariaLabel: 'Tăng giá trị',
    onClick: () => nudge(1),
  });

  const tickRow = opts.ticks
    ? el(
        'div',
        { className: 'mt-2.5 flex justify-between px-1 text-[11px] font-bold text-ink-soft' },
        opts.ticks.map((tick) =>
          el(
            'span',
            {
              className: tick.emphasize
                ? 'rounded-full bg-[var(--accent-soft)] px-2.5 py-0.5 text-[var(--accent-deep)]'
                : '',
            },
            [tick.label],
          ),
        ),
      )
    : null;

  const root = el('div', { className: 'w-full' }, [
    el('div', { className: 'flex items-center gap-3 sm:gap-4' }, [minus, slider.root, plus]),
    tickRow,
  ]);

  return {
    root,
    setValue(next) {
      value = next;
      slider.setValue(next);
    },
  };
}
