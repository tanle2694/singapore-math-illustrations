import type { MathCategory } from '../../core/category';
import { el, combineCleanup, clearChildren } from '../../core/dom';
import { createButton } from '../../components/ui/Button';
import { computeTotal, buildRepeatedAddition, getGroupCountingStep } from './logic';
import { makeDraggable } from './drag';

// ── constants ──────────────────────────────────────────────────────────────

const BROWN = '#92400e';
const CREAM = '#fef3c7';
const GREEN = '#2f9e6e';
const PURPLE = '#7c3aed';

// ── visual helpers ─────────────────────────────────────────────────────────

function makeAppleGrid(count: number, emojiSize: string = '1.25rem'): HTMLElement {
  const cols = count <= 3 ? count : count === 4 ? 2 : 3;
  return el(
    'div',
    {
      style: {
        display: 'grid',
        gridTemplateColumns: `repeat(${cols}, auto)`,
        gap: '3px',
        padding: '8px',
        justifyContent: 'center',
        alignItems: 'center',
      },
    },
    Array(count)
      .fill(null)
      .map(() =>
        el('span', { style: { fontSize: emojiSize, lineHeight: '1', userSelect: 'none' } }, [
          '🍎',
        ]),
      ),
  );
}

function makeNumberInput(min: number, max: number, value: number): HTMLInputElement {
  const inp = document.createElement('input');
  inp.type = 'number';
  inp.min = String(min);
  inp.max = String(max);
  inp.value = String(value);
  inp.style.cssText = [
    'width:4rem',
    'text-align:center',
    'font-weight:900',
    'font-size:1.5rem',
    'line-height:1',
    'border:2px solid #d97706',
    'border-radius:8px',
    'padding:4px 6px',
    'background:#fff',
    'color:#1c1917',
    'outline:none',
  ].join(';');
  return inp;
}

interface CrateHandle {
  root: HTMLElement;
  setHighlight(on: boolean): void;
}

function makeOpenCrate(count: number): CrateHandle {
  const root = el(
    'div',
    {
      style: {
        border: `3px solid ${BROWN}`,
        borderRadius: '10px',
        overflow: 'hidden',
        background: CREAM,
        transition: 'transform 0.3s ease, box-shadow 0.3s ease, border-color 0.3s ease',
        flexShrink: '0',
      },
    },
    [
      el('div', {
        style: {
          background: `linear-gradient(180deg, #78350f 0%, ${BROWN} 100%)`,
          height: '12px',
        },
      }),
      makeAppleGrid(count),
    ],
  );

  return {
    root,
    setHighlight(on: boolean) {
      root.style.transform = on ? 'scale(1.1) translateY(-6px)' : '';
      root.style.boxShadow = on ? `0 18px 42px ${GREEN}60` : '';
      root.style.borderColor = on ? GREEN : BROWN;
    },
  };
}

// ── mount ──────────────────────────────────────────────────────────────────

function mount(root: HTMLElement): () => void {
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const dragCleanupMap = new Map<HTMLElement, () => void>();

  // ── state ────────────────────────────────────────────────────────────────

  let crates = 3;
  let applesPerCrate = 3;
  let loadedCrates = 0;
  let pictorialStep = 0;
  let abstractStep = 0;
  let stars = 0;
  let pictorialHandles: CrateHandle[] = [];


  // ── concrete card ─────────────────────────────────────────────────────────

  const cratesInput = makeNumberInput(1, 6, crates);
  const applesInput = makeNumberInput(1, 6, applesPerCrate);

  const stagingEl = el('div', {
    className: 'flex flex-wrap gap-2',
    style: { minHeight: '80px', padding: '4px' },
  });

  const bayPlaceholderEl = el(
    'p',
    { className: 'text-sm italic text-center w-full m-0', style: { color: '#7dd3fc' } },
    ['Thả thùng vào đây ↓'],
  );

  const cargoBayEl = el(
    'div',
    {
      className: 'flex flex-wrap gap-2 items-center',
      style: {
        flex: '1',
        border: `3px dashed #0369a1`,
        borderLeft: 'none',
        borderRadius: '0 10px 10px 0',
        background: '#f0f9ff',
        minHeight: '90px',
        padding: '10px 12px',
      },
    },
    [bayPlaceholderEl],
  );

  const progressEl = el(
    'p',
    {
      className: 'text-center font-bold m-0',
      style: { color: GREEN, minHeight: '1.5rem' },
    },
    [`Đã nạp 0/${crates} thùng`],
  );

  const advanceBtn = createButton({
    label: '✅ Đã nạp hết! → Sang bước 2 🎉',
    variant: 'solid',
  });

  const advanceBtnWrapper = el(
    'div',
    { className: 'flex justify-center', style: { display: 'none' } },
    [advanceBtn],
  );

  const concreteCard = el(
    'div',
    { className: 'paper-card p-6 space-y-5' },
    [
      el('div', { className: 'flex items-center gap-3' }, [
        el(
          'div',
          {
            className:
              'w-10 h-10 rounded-full flex items-center justify-center font-black text-lg text-white flex-shrink-0',
            style: { background: GREEN },
          },
          ['①'],
        ),
        el('div', {}, [
          el('h2', { className: 'font-display text-xl font-bold text-ink m-0' }, [
            'Giai đoạn Cụ thể',
          ]),
          el('p', { className: 'text-sm text-ink-soft m-0' }, [
            'Kéo từng thùng táo vào xe tải 🚚',
          ]),
        ]),
      ]),
      // Inline inputs — changing them live-rebuilds the staging area
      el(
        'div',
        {
          className: 'flex flex-wrap gap-6 justify-center items-center rounded-xl p-3',
          style: { background: '#f8fafc', border: '1.5px solid #e2e8f0' },
        },
        [
          el('label', { className: 'flex items-center gap-2 text-sm font-bold text-ink-soft' }, [
            '📦 Số thùng:',
            cratesInput,
          ]),
          el('label', { className: 'flex items-center gap-2 text-sm font-bold text-ink-soft' }, [
            '🍎 Táo/thùng:',
            applesInput,
          ]),
        ],
      ),
      el('div', { className: 'flex flex-col sm:flex-row gap-4' }, [
        // Staging area — kho hàng
        el(
          'div',
          {
            className: 'flex-1 rounded-xl p-3',
            style: { background: '#fef3c7', border: '2px solid #d97706' },
          },
          [
            el(
              'p',
              { className: 'text-xs font-bold m-0 mb-2', style: { color: '#92400e' } },
              ['🏪 Kho hàng'],
            ),
            stagingEl,
          ],
        ),
        // Truck area — xe tải
        el(
          'div',
          {
            className: 'flex-1 rounded-xl p-3',
            style: { background: '#dbeafe', border: '2px solid #93c5fd' },
          },
          [
            el('p', { className: 'text-xs font-bold text-sky-700 m-0 mb-2' }, ['🚚 Xe tải']),
            el('div', { className: 'flex items-stretch gap-0' }, [
              el(
                'div',
                {
                  className:
                    'flex items-center justify-center text-5xl flex-shrink-0 pr-1 animate-float',
                  style: { minWidth: '68px' },
                },
                ['🚚'],
              ),
              cargoBayEl,
            ]),
          ],
        ),
      ]),
      progressEl,
      advanceBtnWrapper,
    ],
  );

  // ── pictorial card ────────────────────────────────────────────────────────

  const pictorialCratesEl = el('div', { className: 'flex flex-wrap gap-4 justify-center' });

  const groupLabelEl = el('p', {
    className: 'text-base font-bold text-ink m-0',
    style: { minHeight: '1.5rem' },
  });
  const groupTotalEl = el('p', {
    className: 'font-black text-2xl m-0',
    style: { color: GREEN, minHeight: '2rem' },
  });

  const additionEl = el('div', {
    className: 'font-display font-black text-2xl sm:text-3xl text-ink text-center',
    style: { minHeight: '2.5rem', letterSpacing: '-0.01em' },
  });

  const countBtn = createButton({ label: 'Bắt đầu đếm nhóm ▶', variant: 'solid' });

  const pictorialCard = el(
    'div',
    { className: 'paper-card p-6 space-y-5 animate-rise-in', style: { display: 'none' } },
    [
      el('div', { className: 'flex items-center gap-3' }, [
        el('div', {
          className:
            'w-10 h-10 rounded-full flex items-center justify-center font-black text-lg text-white flex-shrink-0',
          style: { background: '#f59e0b' },
        }, ['②']),
        el('div', {}, [
          el('h2', { className: 'font-display text-xl font-bold text-ink m-0' }, [
            'Giai đoạn Hình ảnh',
          ]),
          el('p', { className: 'text-sm text-ink-soft m-0' }, [
            'Nhìn thấy các nhóm táo bằng nhau',
          ]),
        ]),
      ]),
      pictorialCratesEl,
      el(
        'div',
        {
          className: 'rounded-2xl p-4 space-y-1',
          style: { background: 'var(--accent-soft)', border: '2px solid var(--accent)' },
        },
        [groupLabelEl, groupTotalEl],
      ),
      el(
        'div',
        {
          className: 'rounded-2xl p-4 text-center',
          style: { background: '#fef9c3', border: '2px solid #fde047', minHeight: '60px' },
        },
        [additionEl],
      ),
      el('div', { className: 'flex justify-center' }, [countBtn]),
    ],
  );

  // ── abstract card ─────────────────────────────────────────────────────────

  const abstractContentEl = el('div', { className: 'space-y-6' });
  const abstractNextBtn = createButton({ label: 'Tiếp theo ▶', variant: 'solid' });

  const abstractCard = el(
    'div',
    { className: 'paper-card p-6 space-y-5 animate-rise-in', style: { display: 'none' } },
    [
      el('div', { className: 'flex items-center gap-3' }, [
        el('div', {
          className:
            'w-10 h-10 rounded-full flex items-center justify-center font-black text-lg text-white flex-shrink-0',
          style: { background: PURPLE },
        }, ['③']),
        el('div', {}, [
          el('h2', { className: 'font-display text-xl font-bold text-ink m-0' }, [
            'Giai đoạn Trừu tượng',
          ]),
          el('p', { className: 'text-sm text-ink-soft m-0' }, ['Khám phá phép nhân!']),
        ]),
      ]),
      el(
        'div',
        {
          className: 'rounded-2xl p-6',
          style: { background: '#faf5ff', border: `2px solid #d8b4fe` },
        },
        [abstractContentEl],
      ),
      el('div', { className: 'flex justify-center' }, [abstractNextBtn]),
    ],
  );

  // ── complete card ─────────────────────────────────────────────────────────

  const starsEl = el('div', { className: 'text-3xl text-center tracking-widest' });
  const replayBtn = createButton({ label: 'Chơi lại 🔄', variant: 'outline' });

  const completeCard = el(
    'div',
    {
      className: 'paper-card p-8 text-center space-y-4 animate-rise-in',
      style: { display: 'none', border: '2px solid #fde047', background: '#fefce8' },
    },
    [
      el('div', { className: 'text-5xl animate-wiggle' }, ['🏅']),
      el('h2', { className: 'font-display text-2xl font-bold m-0', style: { color: GREEN } }, [
        'Làm tốt lắm!',
      ]),
      el('p', { className: 'text-ink-soft m-0 text-lg' }, ['Người giúp giao táo']),
      starsEl,
      el('div', { className: 'flex justify-center' }, [replayBtn]),
    ],
  );

  // ── page layout ───────────────────────────────────────────────────────────

  const page = el('div', { className: 'mx-auto max-w-3xl space-y-5 px-4 py-6' }, [
    el('div', { className: 'text-center space-y-2' }, [
      el('h1', { className: 'font-display text-2xl sm:text-3xl font-bold text-ink m-0' }, [
        '🍎 Nhân Pháp — Các Nhóm Bằng Nhau',
      ]),
      el('p', { className: 'text-ink-soft m-0' }, [
        'Học phép nhân qua câu chuyện chở táo bằng xe tải',
      ]),
    ]),
    concreteCard,
    pictorialCard,
    abstractCard,
    completeCard,
  ]);

  root.appendChild(page);
  buildStagingCrates();

  // ── helpers ───────────────────────────────────────────────────────────────

  function show(card: HTMLElement, visible: boolean) {
    card.style.display = visible ? '' : 'none';
  }

  // ── concrete stage ────────────────────────────────────────────────────────

  function buildStagingCrates() {
    dragCleanupMap.forEach((fn) => fn());
    dragCleanupMap.clear();

    clearChildren(stagingEl);
    clearChildren(cargoBayEl);
    cargoBayEl.appendChild(bayPlaceholderEl);
    bayPlaceholderEl.style.display = '';

    loadedCrates = 0;
    progressEl.textContent = `Đã nạp 0/${crates} thùng`;
    advanceBtnWrapper.style.display = 'none';
    cargoBayEl.style.borderColor = '#0369a1';
    cargoBayEl.style.background = '#f0f9ff';
    cargoBayEl.style.borderStyle = 'dashed';

    for (let i = 0; i < crates; i++) {
      const crateHandle = makeOpenCrate(applesPerCrate);
      const crateEl = crateHandle.root;
      crateEl.style.cursor = 'grab';
      crateEl.style.touchAction = 'none';

      const cleanup = makeDraggable(crateEl, cargoBayEl, {
        onDrop: () => loadCrate(crateEl),
        onDragOver: (isOver) => {
          cargoBayEl.style.borderColor = isOver ? '#2563eb' : '#0369a1';
          cargoBayEl.style.background = isOver ? '#bfdbfe' : '#f0f9ff';
          cargoBayEl.style.borderStyle = isOver ? 'solid' : 'dashed';
        },
      });
      dragCleanupMap.set(crateEl, cleanup);

      // Tap / click fallback so the stage is completable without dragging
      crateEl.addEventListener('click', () => {
        if (crateEl.parentElement === stagingEl) loadCrate(crateEl);
      });

      stagingEl.appendChild(crateEl);
    }
  }

  function loadCrate(crateEl: HTMLElement) {
    if (crateEl.parentElement !== stagingEl) return;

    const cleanup = dragCleanupMap.get(crateEl);
    cleanup?.();
    dragCleanupMap.delete(crateEl);

    crateEl.remove();

    if (loadedCrates === 0) {
      bayPlaceholderEl.style.display = 'none';
    }

    const loaded = makeOpenCrate(applesPerCrate);
    loaded.root.classList.add('animate-pop-in');
    cargoBayEl.appendChild(loaded.root);

    loadedCrates++;
    progressEl.textContent = `Đã nạp ${loadedCrates}/${crates} thùng`;

    if (loadedCrates >= crates) {
      advanceBtnWrapper.style.display = 'flex';
    }
  }

  function onCratesInput() {
    const v = parseInt(cratesInput.value);
    if (!isNaN(v) && v >= 1 && v <= 6) {
      crates = v;
      buildStagingCrates();
    }
  }

  function onApplesInput() {
    const v = parseInt(applesInput.value);
    if (!isNaN(v) && v >= 1 && v <= 6) {
      applesPerCrate = v;
      buildStagingCrates();
    }
  }

  // ── pictorial stage ───────────────────────────────────────────────────────

  function startPictorial() {
    pictorialStep = 0;
    pictorialHandles = [];
    clearChildren(pictorialCratesEl);
    groupLabelEl.textContent = 'Nhấn nút để bắt đầu đếm từng nhóm';
    groupTotalEl.textContent = '';
    clearChildren(additionEl);
    countBtn.textContent = 'Bắt đầu đếm nhóm ▶';
    countBtn.disabled = false;
    show(pictorialCard, true);
    show(abstractCard, false);

    for (let i = 0; i < crates; i++) {
      const h = makeOpenCrate(applesPerCrate);
      h.root.classList.add('animate-rise-in');
      h.root.style.animationDelay = `${i * 0.07}s`;
      pictorialCratesEl.appendChild(h.root);
      pictorialHandles.push(h);
    }
  }

  function handleCount() {
    if (pictorialStep >= crates) {
      startAbstract();
      return;
    }

    pictorialStep++;
    pictorialHandles.forEach((h, i) => h.setHighlight(i + 1 === pictorialStep));

    const { groupNum, groupTotal, runningTotal } = getGroupCountingStep(
      pictorialStep,
      applesPerCrate,
    );
    groupLabelEl.textContent = `Nhóm ${groupNum} = ${groupTotal} quả táo 🍎`;
    groupTotalEl.textContent = `Tổng = ${runningTotal}`;

    const partialAddition = buildRepeatedAddition(pictorialStep, applesPerCrate);
    clearChildren(additionEl);
    additionEl.appendChild(el('span', { className: 'animate-pop-in' }, [partialAddition]));

    if (pictorialStep >= crates) {
      const totalVal = computeTotal(crates, applesPerCrate);
      additionEl.appendChild(
        el('span', { className: 'animate-pop-in', style: { color: GREEN } }, [` = ${totalVal}`]),
      );
      countBtn.textContent = '✨ Sang bước 3 → Trừu tượng';
    } else {
      countBtn.textContent = `Tiếp theo (${pictorialStep}/${crates}) ▶`;
    }
  }

  // ── abstract stage ────────────────────────────────────────────────────────

  function startAbstract() {
    abstractStep = 0;
    clearChildren(abstractContentEl);
    abstractNextBtn.disabled = false;
    abstractNextBtn.textContent = 'Tiếp theo ▶';
    show(abstractCard, true);
    renderAbstractStep(0);
  }

  function renderAbstractStep(step: number) {
    const total = computeTotal(crates, applesPerCrate);
    const addition = buildRepeatedAddition(crates, applesPerCrate);

    if (step === 0) {
      clearChildren(abstractContentEl);
      abstractContentEl.appendChild(
        el('div', { className: 'space-y-2 animate-rise-in' }, [
          el('p', { className: 'text-sm font-bold text-ink-soft m-0' }, ['Phép cộng lặp lại:']),
          el('div', {
            className: 'font-display font-black text-3xl sm:text-4xl text-center',
            style: { color: BROWN, letterSpacing: '-0.01em' },
          }, [`${addition} = ${total}`]),
        ]),
      );
    } else if (step === 1) {
      abstractContentEl.appendChild(
        el('div', { className: 'space-y-2 animate-rise-in' }, [
          el('p', { className: 'text-sm font-bold text-ink-soft m-0' }, ['Có bao nhiêu nhóm?']),
          el('div', {
            className: 'font-display font-black text-2xl sm:text-3xl text-center',
            style: { color: GREEN },
          }, [`${crates} nhóm × ${applesPerCrate} quả 🍎`]),
        ]),
      );
    } else if (step === 2) {
      abstractContentEl.appendChild(
        el('div', { className: 'space-y-2 animate-rise-in' }, [
          el('p', { className: 'text-sm font-bold text-ink-soft m-0' }, ['Phép nhân:']),
          el('div', {
            className: 'font-display font-black text-5xl sm:text-6xl text-center',
            style: { color: PURPLE, letterSpacing: '-0.02em' },
          }, [`${crates} × ${applesPerCrate}`]),
        ]),
      );
      abstractNextBtn.textContent = 'Xem kết quả! 🎯';
    } else if (step === 3) {
      abstractContentEl.appendChild(
        el('div', { className: 'space-y-2 animate-pop-in' }, [
          el('p', { className: 'text-sm font-bold text-ink-soft m-0' }, ['Câu trả lời:']),
          el('div', {
            className: 'font-display font-black text-5xl sm:text-6xl text-center',
            style: { letterSpacing: '-0.02em', color: PURPLE },
          }, [
            `${crates} × ${applesPerCrate} = `,
            el('span', { style: { color: GREEN } }, [String(total)]),
          ]),
        ]),
      );
      abstractNextBtn.textContent = 'Hoàn thành! 🏅';
    }
  }

  function handleAbstractNext() {
    abstractStep++;
    if (abstractStep <= 3) {
      renderAbstractStep(abstractStep);
    } else {
      showComplete();
    }
  }

  // ── complete ──────────────────────────────────────────────────────────────

  function showComplete() {
    stars++;
    starsEl.textContent = '⭐'.repeat(Math.min(stars, 5));
    show(completeCard, true);
  }

  function handleReplay() {
    dragCleanupMap.forEach((fn) => fn());
    dragCleanupMap.clear();
    show(pictorialCard, false);
    show(abstractCard, false);
    show(completeCard, false);
    buildStagingCrates();
  }

  // ── wire up ───────────────────────────────────────────────────────────────

  advanceBtn.addEventListener('click', startPictorial);
  countBtn.addEventListener('click', handleCount);
  abstractNextBtn.addEventListener('click', handleAbstractNext);
  replayBtn.addEventListener('click', handleReplay);
  cratesInput.addEventListener('input', onCratesInput);
  applesInput.addEventListener('input', onApplesInput);

  // ── cleanup ───────────────────────────────────────────────────────────────

  return combineCleanup(() => {
    timers.forEach(clearTimeout);
    timers.clear();
    dragCleanupMap.forEach((fn) => fn());
    dragCleanupMap.clear();
    advanceBtn.removeEventListener('click', startPictorial);
    countBtn.removeEventListener('click', handleCount);
    abstractNextBtn.removeEventListener('click', handleAbstractNext);
    replayBtn.removeEventListener('click', handleReplay);
    cratesInput.removeEventListener('input', onCratesInput);
    applesInput.removeEventListener('input', onApplesInput);
    page.remove();
  });
}

// ── export ────────────────────────────────────────────────────────────────

const category: MathCategory = {
  id: 'multiplication',
  title: 'Nhân Pháp',
  description: 'Học phép nhân qua các nhóm bằng nhau',
  icon: '🍎',
  level: 'Lớp 2',
  accent: '#2f9e6e',
  order: 40,
  mount,
};

export default category;
