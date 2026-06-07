import type { MathCategory } from '../../core/category';
import { el, combineCleanup } from '../../core/dom';
import { createButton } from '../../components/ui/Button';
import { createSlider } from '../../components/ui/Slider';
import { computeAges, isValidInput, getTimeLabel } from './logic';

// ── constants ──────────────────────────────────────────────────────────────

const SLIDER_MIN = -20;
const SLIDER_MAX = 20;
const DEFAULT_FATHER = 30;
const DEFAULT_CHILD = 10;

const BAR_EQUAL = '#4f6df5'; // father's portion equal to child (indigo)
const BAR_DIFF = '#ef6f5b';  // father's extra years (coral)
const BAR_CHILD = '#ef9d0e'; // child's bar (sun)

// ── helpers ────────────────────────────────────────────────────────────────

interface BracketHandle {
  root: HTMLElement;
  setWidth(pct: number): void;
  setText(t: string): void;
}

function makeBracket(color: string): BracketHandle {
  const labelEl = el('div', {
    className: 'text-xs font-semibold text-center pt-1.5 leading-tight overflow-hidden',
    style: { color },
  });
  const root = el('div', {
    style: {
      borderTop: `2.5px solid ${color}`,
      width: '0%',
      flexShrink: '0',
      overflow: 'hidden',
      transition: 'width 0.4s ease',
    },
  }, [labelEl]);
  return {
    root,
    setWidth(pct) { root.style.width = `${pct}%`; },
    setText(t) { labelEl.textContent = t; },
  };
}

// ── mount ──────────────────────────────────────────────────────────────────

function mount(root: HTMLElement): () => void {
  let fatherNow = DEFAULT_FATHER;
  let childNow = DEFAULT_CHILD;
  let years = 0;
  // Reference width for bar scaling: fixed to the max possible father age so
  // the diff bar's percentage (and therefore visual size) never changes when
  // the slider moves — only the child/equal bars grow and shrink.
  let totalRef = DEFAULT_FATHER + SLIDER_MAX;

  // ── Inputs ─────────────────────────────────────────────────────────────────
  const INPUT_CLS =
    'w-full rounded-xl border-2 bg-card px-3 py-2.5 text-xl font-bold text-ink outline-none transition-colors';

  const fatherInput = el('input', {
    className: INPUT_CLS,
    style: { borderColor: 'var(--color-card-line)' },
    attrs: { type: 'number', min: 1, max: 99, value: DEFAULT_FATHER },
  });

  const childInput = el('input', {
    className: INPUT_CLS,
    style: { borderColor: 'var(--color-card-line)' },
    attrs: { type: 'number', min: 0, max: 98, value: DEFAULT_CHILD },
  });

  const warningEl = el('p', {
    className: 'text-sm font-semibold transition-opacity m-0',
    style: { opacity: '0', color: 'var(--color-coral)' },
  }, ['⚠️ Tuổi bố phải lớn hơn tuổi con']);

  const timeLabelEl = el('div', {
    className: 'text-center text-xl font-bold text-ink',
  }, ['📍 Hiện tại']);

  // ── Slider ─────────────────────────────────────────────────────────────────
  const yearSlider = createSlider({
    min: SLIDER_MIN,
    max: SLIDER_MAX,
    value: 0,
    ariaLabel: 'Số năm thay đổi',
    onInput: (v) => { years = v; update(); },
  });

  const minusBtn = createButton({ label: 'Giảm năm', icon: '−', variant: 'square', ariaLabel: 'Giảm 1 năm' });
  const plusBtn = createButton({ label: 'Tăng năm', icon: '+', variant: 'square', ariaLabel: 'Tăng 1 năm' });

  const ticksEl = el('div', { className: 'flex justify-between px-16 mt-2' }, [
    el('span', { className: 'text-xs font-semibold text-ink-soft' }, ['−20 năm']),
    el('span', { className: 'text-xs font-semibold text-ink-soft' }, ['−10 năm']),
    el('span', { className: 'text-xs font-bold text-[var(--accent)]' }, ['Hiện tại']),
    el('span', { className: 'text-xs font-semibold text-ink-soft' }, ['+10 năm']),
    el('span', { className: 'text-xs font-semibold text-ink-soft' }, ['+20 năm']),
  ]);

  const controlCard = el('div', { className: 'paper-card p-6 space-y-4' }, [
    el('div', { className: 'grid grid-cols-2 gap-4' }, [
      el('div', { className: 'space-y-1.5' }, [
        el('label', { className: 'text-sm font-bold text-ink block' }, ['👨 Tuổi bố hiện tại']),
        fatherInput,
      ]),
      el('div', { className: 'space-y-1.5' }, [
        el('label', { className: 'text-sm font-bold text-ink block' }, ['🧒 Tuổi con hiện tại']),
        childInput,
      ]),
    ]),
    warningEl,
    timeLabelEl,
    el('div', { className: 'space-y-1' }, [
      el('div', { className: 'flex items-center gap-3' }, [minusBtn, el('div', { className: 'flex-1' }, [yearSlider.root]), plusBtn]),
      ticksEl,
    ]),
  ]);

  // ── Father bar ─────────────────────────────────────────────────────────────
  const fatherAgeEl = el('span', {}, [String(DEFAULT_FATHER)]);
  const fatherLabelEl = el('div', { className: 'text-sm font-bold text-ink-soft mb-2' });

  const equalBarEl = el('div', {
    className: 'rounded-l-2xl',
    style: {
      background: `linear-gradient(135deg, ${BAR_EQUAL}, #2563eb)`,
      minHeight: '72px',
      width: '0%',
      flexShrink: '0',
      transition: 'width 0.4s ease',
    },
  });

  const diffBarEl = el('div', {
    className: 'rounded-r-2xl flex items-center justify-center font-bold',
    style: {
      background: `linear-gradient(135deg, ${BAR_DIFF}, #dc2626)`,
      minHeight: '72px',
      width: '0%',
      flexShrink: '0',
      transition: 'width 0.4s ease',
      color: 'white',
      fontSize: '1.1rem',
      overflow: 'hidden',
      whiteSpace: 'nowrap',
    },
  });

  const equalBracket = makeBracket(BAR_EQUAL);
  const diffBracket = makeBracket(BAR_DIFF);

  const fatherCard = el('div', { className: 'paper-card p-6 space-y-3' }, [
    el('div', { className: 'flex items-center gap-4' }, [
      el('div', {
        className: 'w-14 h-14 rounded-full flex items-center justify-center text-3xl flex-shrink-0',
        style: { background: 'var(--accent-soft)' },
      }, ['👨']),
      el('h2', { className: 'font-display text-2xl font-bold text-ink m-0' }, ['Bố (', fatherAgeEl, ' tuổi)']),
    ]),
    fatherLabelEl,
    el('div', {
      className: 'flex items-stretch w-full rounded-2xl overflow-hidden',
      style: { background: 'var(--color-paper-deep)' },
    }, [equalBarEl, diffBarEl]),
    el('div', { className: 'flex' }, [equalBracket.root, diffBracket.root]),
  ]);

  // ── Child bar ──────────────────────────────────────────────────────────────
  const childAgeEl = el('span', {}, [String(DEFAULT_CHILD)]);
  const childLabelEl = el('div', { className: 'text-sm font-bold text-ink-soft mb-2' });

  const childBarEl = el('div', {
    className: 'rounded-2xl',
    style: {
      background: `linear-gradient(135deg, ${BAR_CHILD}, #ea580c)`,
      minHeight: '72px',
      width: '0%',
      flexShrink: '0',
      transition: 'width 0.4s ease',
    },
  });

  const childBracket = makeBracket(BAR_CHILD);

  const childCard = el('div', { className: 'paper-card p-6 space-y-3' }, [
    el('div', { className: 'flex items-center gap-4' }, [
      el('div', {
        className: 'w-14 h-14 rounded-full flex items-center justify-center text-3xl flex-shrink-0',
        style: { background: 'var(--accent-soft)' },
      }, ['🧒']),
      el('h2', { className: 'font-display text-2xl font-bold text-ink m-0' }, ['Con (', childAgeEl, ' tuổi)']),
    ]),
    childLabelEl,
    el('div', {
      className: 'w-full rounded-2xl overflow-hidden flex items-stretch',
      style: { background: 'var(--color-paper-deep)' },
    }, [childBarEl]),
    el('div', { className: 'flex' }, [childBracket.root]),
  ]);

  // ── Equation card ──────────────────────────────────────────────────────────
  const eqFatherEl = el('span', { style: { color: BAR_EQUAL } }, [String(DEFAULT_FATHER)]);
  const eqChildEl = el('span', { style: { color: BAR_CHILD } }, [String(DEFAULT_CHILD)]);
  const eqDiffEl = el('span', { style: { color: BAR_DIFF } }, [String(DEFAULT_FATHER - DEFAULT_CHILD)]);

  const equationCard = el('div', {
    className: 'rounded-3xl border-2 border-[#fdba74] bg-[#fff7ed] p-7 text-center space-y-3',
  }, [
    el('div', { className: 'text-4xl sm:text-5xl font-black font-display' }, [
      eqFatherEl, ' − ', eqChildEl, ' = ', eqDiffEl, ' tuổi',
    ]),
    el('p', { className: 'text-lg font-bold text-ink-soft m-0' }, [
      'Hiệu số tuổi = Tuổi bố − Tuổi con',
    ]),
    el('span', {
      className: 'inline-block rounded-xl border-2 border-[#fbbf24] bg-[#fef3c7] px-4 py-1.5 text-sm font-bold text-[#92400e]',
    }, ['Không bao giờ thay đổi dù thời gian có trôi qua! ✨']),
  ]);

  // ── Knowledge card ─────────────────────────────────────────────────────────
  const knowledgeCard = el('div', { className: 'paper-card p-6 space-y-4' }, [
    el('h3', { className: 'font-display text-lg font-bold text-ink m-0' }, ['💡 Nhận xét']),
    el('div', { className: 'grid grid-cols-1 sm:grid-cols-3 gap-3' }, [
      el('div', { className: 'flex items-start gap-3 bg-paper rounded-xl p-4' }, [
        el('div', { className: 'w-5 h-5 rounded-md flex-shrink-0 mt-0.5', style: { background: BAR_EQUAL } }),
        el('p', { className: 'text-sm text-ink leading-relaxed m-0' }, [
          'Phần màu xanh là phần bố và con ', el('b', {}, ['bằng nhau']), ' — bằng tuổi của con.',
        ]),
      ]),
      el('div', { className: 'flex items-start gap-3 bg-paper rounded-xl p-4' }, [
        el('div', { className: 'w-5 h-5 rounded-md flex-shrink-0 mt-0.5', style: { background: BAR_DIFF } }),
        el('p', { className: 'text-sm text-ink leading-relaxed m-0' }, [
          'Phần màu đỏ là phần bố ', el('b', {}, ['lớn hơn']), ' con — không bao giờ thay đổi.',
        ]),
      ]),
      el('div', { className: 'flex items-start gap-3 bg-paper rounded-xl p-4' }, [
        el('div', { className: 'w-5 h-5 rounded-md flex-shrink-0 mt-0.5', style: { background: '#8b5cf6' } }),
        el('p', { className: 'text-sm text-ink leading-relaxed m-0' }, [
          'Khi thời gian thay đổi, cả bố lẫn con đều ', el('b', {}, ['tăng thêm']), ' số tuổi như nhau.',
        ]),
      ]),
    ]),
  ]);

  // ── Bottom tip ─────────────────────────────────────────────────────────────
  const bottomTip = el('div', {
    className: 'flex items-center gap-3 rounded-2xl border-2 border-[#fde047] bg-[#fefce8] px-5 py-4 text-sm font-medium text-[#713f12]',
  }, [
    el('span', { className: 'text-xl flex-shrink-0' }, ['⭐']),
    'Kéo thanh trượt hoặc nhấn nút + / − để xem tuổi bố và con thay đổi theo thời gian.',
  ]);

  // ── Layout ─────────────────────────────────────────────────────────────────
  const page = el('div', { className: 'mx-auto max-w-3xl space-y-5 px-4 py-6' }, [
    el('div', { className: 'text-center space-y-2' }, [
      el('h1', { className: 'font-display text-2xl sm:text-3xl font-bold text-ink m-0' }, [
        '👨‍👦 Bài Toán Tuổi Bố Và Con',
      ]),
      el('p', { className: 'text-ink-soft m-0' }, [
        'Theo dõi sự thay đổi tuổi của bố và con theo thời gian',
      ]),
    ]),
    controlCard,
    fatherCard,
    childCard,
    equationCard,
    knowledgeCard,
    bottomTip,
  ]);

  root.appendChild(page);

  // ── update ─────────────────────────────────────────────────────────────────
  function update() {
    const valid = isValidInput(fatherNow, childNow);
    warningEl.style.opacity = valid ? '0' : '1';
    if (!valid) return;

    const { father, child, diff } = computeAges(fatherNow, childNow, years);
    const dFather = Math.max(0, father);
    const dChild = Math.max(0, child);
    // Use totalRef (fatherNow + SLIDER_MAX) as the fixed denominator so that
    // diffPct never changes while the slider moves — only childPct varies.
    const childPct = totalRef > 0 ? (dChild / totalRef) * 100 : 0;
    const diffPct = totalRef > 0 ? (diff / totalRef) * 100 : 0;

    const timeLabel = getTimeLabel(years);
    const timeEmoji = years === 0 ? '📍' : years > 0 ? '⏩' : '⏪';
    timeLabelEl.textContent = `${timeEmoji} ${timeLabel}`;

    fatherAgeEl.textContent = String(dFather);
    childAgeEl.textContent = String(dChild);
    eqFatherEl.textContent = String(dFather);
    eqChildEl.textContent = String(dChild);
    eqDiffEl.textContent = String(diff);

    equalBarEl.style.width = `${childPct}%`;
    diffBarEl.style.width = `${diffPct}%`;
    diffBarEl.textContent = `+${diff} tuổi`;
    childBarEl.style.width = `${childPct}%`;

    fatherLabelEl.textContent = `${timeLabel} (${dFather} tuổi)`;
    childLabelEl.textContent = `${timeLabel} (${dChild} tuổi)`;

    equalBracket.setWidth(childPct);
    diffBracket.setWidth(diffPct);
    childBracket.setWidth(childPct);

    equalBracket.setText(`Bằng tuổi con (${dChild} tuổi)`);
    diffBracket.setText(`Hơn con ${diff} tuổi`);
    childBracket.setText(`${dChild} tuổi`);
  }

  // ── event listeners ────────────────────────────────────────────────────────
  function onFatherChange() {
    const v = Number(fatherInput.value);
    if (!isNaN(v)) { fatherNow = v; totalRef = fatherNow + SLIDER_MAX; update(); }
  }
  function onChildChange() {
    const v = Number(childInput.value);
    if (!isNaN(v)) { childNow = v; update(); }
  }
  function onMinus() {
    if (years > SLIDER_MIN) { years--; yearSlider.setValue(years); update(); }
  }
  function onPlus() {
    if (years < SLIDER_MAX) { years++; yearSlider.setValue(years); update(); }
  }

  fatherInput.addEventListener('input', onFatherChange);
  childInput.addEventListener('input', onChildChange);
  minusBtn.addEventListener('click', onMinus);
  plusBtn.addEventListener('click', onPlus);

  update();

  return combineCleanup(() => {
    fatherInput.removeEventListener('input', onFatherChange);
    childInput.removeEventListener('input', onChildChange);
    minusBtn.removeEventListener('click', onMinus);
    plusBtn.removeEventListener('click', onPlus);
    page.remove();
  });
}

// ── export ─────────────────────────────────────────────────────────────────

const category: MathCategory = {
  id: 'age-relationship',
  title: 'Tuổi Bố và Con',
  description: 'Theo dõi sự thay đổi tuổi của bố và con theo thời gian',
  icon: '👨‍👦',
  level: 'Lớp 4',
  accent: '#e07a10',
  order: 30,
  mount,
};

export default category;
