import type { MathCategory } from '../../core/category';
import { el, combineCleanup, clearChildren } from '../../core/dom';
import { computeDivision, PRESETS, randomParams, type DivisionResult } from './logic';

// ── constants ──────────────────────────────────────────────────────────────

const ACCENT = '#f97316';
const APPLE_EMOJI = '🍎';

// ── helpers ────────────────────────────────────────────────────────────────

function repeatApple(n: number): string {
  return APPLE_EMOJI.repeat(Math.max(0, n));
}

// ── mount ──────────────────────────────────────────────────────────────────

function mount(root: HTMLElement): () => void {
  // ── timer state ────────────────────────────────────────────────────────
  let animInterval: ReturnType<typeof setInterval> | null = null;
  const pendingTimers = new Set<ReturnType<typeof setTimeout>>();

  function safeTimeout(fn: () => void, delay: number) {
    const id = setTimeout(() => { pendingTimers.delete(id); fn(); }, delay);
    pendingTimers.add(id);
  }

  function stopAll() {
    if (animInterval !== null) { clearInterval(animInterval); animInterval = null; }
    for (const t of pendingTimers) clearTimeout(t);
    pendingTimers.clear();
  }

  // ── manual drag state ──────────────────────────────────────────────────
  let manualPool = 0;
  let manualCounts: number[] = [];
  let childNames: string[] = [];
  const dropDisposers: Array<() => void> = [];

  function disposeDropTargets() {
    for (const d of dropDisposers) d();
    dropDisposers.length = 0;
  }

  // ── controls ───────────────────────────────────────────────────────────
  const appleInput = el('input', {
    className: 'w-24 p-2 text-center text-2xl font-black border-2 rounded-2xl focus:outline-none transition-colors',
    style: { borderColor: ACCENT, fontFamily: 'var(--font-display)' },
    attrs: { type: 'number', value: String(PRESETS[0].total), min: '1', max: '100' },
  }) as HTMLInputElement;

  const friendInput = el('input', {
    className: 'w-24 p-2 text-center text-2xl font-black border-2 rounded-2xl focus:outline-none transition-colors',
    style: { borderColor: '#60a5fa', fontFamily: 'var(--font-display)' },
    attrs: { type: 'number', value: String(PRESETS[0].divisor), min: '1', max: '20' },
  }) as HTMLInputElement;

  const autoBtn = el('button', {
    className: 'px-5 py-3 rounded-2xl font-bold text-white text-base transition-all active:scale-95 hover:brightness-110',
    style: { background: ACCENT },
    attrs: { type: 'button' },
    on: { click: () => runAutoAnimation() },
  }, ['🎬 Bắt Đầu']);

  const randomBtn = el('button', {
    className: 'px-5 py-3 rounded-2xl font-bold text-white text-base transition-all active:scale-95 hover:brightness-110 bg-[#6366f1]',
    attrs: { type: 'button' },
    on: {
      click: () => {
        const p = randomParams();
        appleInput.value = String(p.total);
        friendInput.value = String(p.divisor);
        showManual();
      },
    },
  }, ['🎲 Ngẫu Nhiên']);

  const presetContainer = el('div', { className: 'flex flex-wrap gap-2 justify-center' });

  PRESETS.forEach(preset => {
    presetContainer.append(
      el('button', {
        className: 'px-3 py-1.5 rounded-xl text-sm font-bold border-2 transition-all hover:brightness-95',
        style: { borderColor: 'var(--color-card-line)', background: 'var(--color-paper)', color: 'var(--color-ink-soft)' },
        attrs: { type: 'button' },
        on: {
          click: () => {
            appleInput.value = String(preset.total);
            friendInput.value = String(preset.divisor);
            showManual();
          },
        },
      }, [`${preset.total} ÷ ${preset.divisor}`]),
    );
  });

  const controlsCard = el('div', { className: 'paper-card p-5 space-y-4' }, [
    el('div', { className: 'grid grid-cols-2 gap-6' }, [
      el('div', { className: 'flex flex-col items-center gap-2' }, [
        el('label', {
          className: 'text-xs font-bold text-[var(--color-ink-soft)] uppercase tracking-widest',
        }, ['🍎 Số quả táo']),
        appleInput,
      ]),
      el('div', { className: 'flex flex-col items-center gap-2' }, [
        el('label', {
          className: 'text-xs font-bold text-[var(--color-ink-soft)] uppercase tracking-widest',
        }, ['👦 Số bạn nhỏ']),
        friendInput,
      ]),
    ]),
    el('div', { className: 'flex gap-3 justify-center flex-wrap' }, [autoBtn, randomBtn]),
    el('p', {
      className: 'text-center text-xs text-[var(--color-ink-soft)] m-0',
    }, ['Concrete → Pictorial → Abstract → Multiplication Connection']),
    el('div', { className: 'pt-3 border-t border-[var(--color-card-line)] space-y-2' }, [
      el('div', {
        className: 'text-xs font-bold text-center text-[var(--color-ink-soft)]',
      }, ['Chọn ví dụ:']),
      presetContainer,
    ]),
  ]);

  // ── stage 1: concrete ──────────────────────────────────────────────────
  const poolHintEl = el('p', {
    className: 'text-xs font-medium text-center m-0 mb-2',
    style: { color: 'var(--color-ink-soft)' },
  }, ['👆 Kéo táo vào hộp của các bạn · Kéo táo từ hộp trở lại giỏ']);

  const applePoolEl = el('div', {
    className: 'min-h-16 rounded-2xl border-2 border-dashed p-3 flex flex-wrap gap-1 items-start',
    style: { borderColor: '#fb923c', background: '#fffbf0' },
  });

  const poolCountEl = el('span', {
    className: 'text-xs font-black px-2 py-0.5 rounded-full',
    style: { background: '#fed7aa', color: '#9a3412' },
  });

  const remainderEl = el('div', {
    className: 'text-center text-2xl font-bold mt-3',
    style: { color: '#dc2626' },
  });

  const studentsEl = el('div', { className: 'flex flex-wrap justify-center gap-4 mt-4' });

  const stage1Card = el('div', { className: 'paper-card p-5 space-y-2' }, [
    el('h2', {
      className: 'font-display text-base font-bold text-ink m-0',
    }, ['1️⃣ Concrete – Chia Táo']),
    poolHintEl,
    el('div', { className: 'flex items-center justify-between px-1' }, [
      el('span', { className: 'text-xs font-bold', style: { color: '#ea580c' } }, ['🧺 Giỏ táo']),
      poolCountEl,
    ]),
    applePoolEl,
    remainderEl,
    studentsEl,
  ]);

  // ── stage 2: pictorial (bar model) ────────────────────────────────────
  const barModelEl = el('div', { className: 'flex flex-wrap justify-center' });
  const barRemainderEl = el('div', {
    className: 'text-center text-2xl font-bold mt-3',
    style: { color: '#dc2626' },
  });

  const stage2Card = el('div', {
    className: 'paper-card p-5 space-y-3',
    style: { display: 'none' },
  }, [
    el('h2', {
      className: 'font-display text-base font-bold text-ink m-0',
    }, ['2️⃣ Pictorial – Bar Model']),
    barModelEl,
    barRemainderEl,
  ]);

  // ── stage 3: abstract (equation) ──────────────────────────────────────
  const equationEl = el('div', {
    className: 'text-center font-black font-display',
    style: { color: '#dc2626', fontSize: '3rem' },
  });

  const messageEl = el('div', {
    className: 'text-center text-xl font-bold mt-2',
    style: { color: '#16a34a' },
  });

  const stage3Card = el('div', {
    className: 'paper-card p-5 space-y-3',
    style: { display: 'none' },
  }, [
    el('h2', {
      className: 'font-display text-base font-bold text-ink m-0',
    }, ['3️⃣ Abstract – Công Thức']),
    equationEl,
    messageEl,
  ]);

  // ── stage 4: multiplication connection ────────────────────────────────
  const multVisualEl = el('div', { className: 'text-center text-2xl leading-loose' });
  const multEquationEl = el('div', {
    className: 'text-center text-4xl font-black font-display mt-4',
    style: { color: '#8b5cf6' },
  });

  const stage4Card = el('div', {
    className: 'paper-card p-5 space-y-3',
    style: { display: 'none' },
  }, [
    el('h2', {
      className: 'font-display text-base font-bold text-ink m-0',
    }, ['4️⃣ Kết Nối Phép Nhân']),
    multVisualEl,
    multEquationEl,
  ]);

  // ── helpers ────────────────────────────────────────────────────────────

  function hideStages() {
    stage2Card.style.display = 'none';
    stage3Card.style.display = 'none';
    stage4Card.style.display = 'none';
  }

  // ── stage renderers ────────────────────────────────────────────────────

  function renderBarModel(result: DivisionResult) {
    clearChildren(barModelEl);
    clearChildren(barRemainderEl);

    for (let i = 0; i < result.divisor; i++) {
      barModelEl.append(
        el('div', {
          className: 'flex items-center justify-center w-20 h-14 border-2 font-black text-2xl font-display',
          style: { borderColor: '#22c55e', background: '#dcfce7', color: '#166534' },
        }, [String(result.quotient)]),
      );
    }

    if (result.remainder > 0) {
      barRemainderEl.textContent = `Dư: ${repeatApple(result.remainder)}`;
    }

    stage2Card.style.display = '';
    safeTimeout(() => renderEquation(result), 1000);
  }

  function renderEquation(result: DivisionResult) {
    equationEl.style.fontSize = '3rem';
    if (result.remainder === 0) {
      equationEl.textContent = `${result.total} ÷ ${result.divisor} = ${result.quotient}`;
      messageEl.textContent = `🎉 Mỗi bạn nhận ${result.quotient} quả táo`;
      messageEl.style.color = '#16a34a';
    } else {
      equationEl.textContent = `${result.total} ÷ ${result.divisor} = ${result.quotient} dư ${result.remainder}`;
      messageEl.textContent = `🎉 Mỗi bạn nhận ${result.quotient} quả táo, còn dư ${result.remainder} quả`;
      messageEl.style.color = '#16a34a';
    }
    stage3Card.style.display = '';
    safeTimeout(() => renderMultiplication(result), 1500);
  }

  function renderMultiplication(result: DivisionResult) {
    clearChildren(multVisualEl);

    for (let i = 1; i <= result.divisor; i++) {
      const name = childNames[i - 1] || `Bạn ${i}`;
      multVisualEl.append(
        el('div', {}, [`👦 ${name}  ${repeatApple(result.quotient)}`]),
      );
    }

    multEquationEl.textContent = result.remainder === 0
      ? `${result.divisor} × ${result.quotient} = ${result.total}`
      : `${result.total} = (${result.divisor} × ${result.quotient}) + ${result.remainder}`;

    stage4Card.style.display = '';
  }

  // ── draggable pool renderer ────────────────────────────────────────────

  function renderDraggablePool(count: number) {
    poolCountEl.textContent = `${count} quả`;
    clearChildren(applePoolEl);
    if (count === 0) {
      applePoolEl.append(
        el('span', {
          className: 'text-sm italic w-full text-center',
          style: { color: 'var(--color-ink-soft)' },
        }, ['Hết táo trong giỏ 🎉']),
      );
      return;
    }
    for (let i = 0; i < count; i++) {
      const span = el('span', {
        className: 'inline-block text-3xl cursor-grab active:cursor-grabbing select-none transition-transform hover:scale-125',
        draggable: true,
      }, [APPLE_EMOJI]);
      span.addEventListener('dragstart', (e) => {
        e.dataTransfer!.setData('text/plain', 'apple');
        e.dataTransfer!.effectAllowed = 'move';
      });
      applePoolEl.append(span);
    }
  }

  // ── manual completion ──────────────────────────────────────────────────

  function onManualPoolEmpty() {
    const total = manualCounts.reduce((a, b) => a + b, 0);
    const divisor = manualCounts.length;
    const isEqual = manualCounts.length > 0 && manualCounts.every(n => n === manualCounts[0]);

    if (isEqual) {
      const result: DivisionResult = { total, divisor, quotient: manualCounts[0], remainder: 0 };
      safeTimeout(() => renderBarModel(result), 500);
    } else {
      safeTimeout(() => {
        clearChildren(barModelEl);
        clearChildren(barRemainderEl);
        for (const count of manualCounts) {
          barModelEl.append(
            el('div', {
              className: 'flex items-center justify-center w-20 h-14 border-2 font-black text-2xl font-display',
              style: { borderColor: ACCENT, background: '#fff7ed', color: '#9a3412' },
            }, [String(count)]),
          );
        }
        stage2Card.style.display = '';
        safeTimeout(() => {
          equationEl.style.fontSize = '2rem';
          equationEl.textContent = '⚠️ Chia chưa đều!';
          messageEl.textContent = '💡 Chia đều mỗi bạn một số táo bằng nhau thì mới thành phép chia nhé!';
          messageEl.style.color = '#b45309';
          stage3Card.style.display = '';
        }, 1000);
      }, 500);
    }
  }

  // ── manual (drag-and-drop) mode ────────────────────────────────────────

  function showManual() {
    stopAll();
    disposeDropTargets();
    hideStages();
    clearChildren(studentsEl);
    clearChildren(remainderEl);

    const total = parseInt(appleInput.value, 10);
    const divisor = parseInt(friendInput.value, 10);
    if (isNaN(total) || isNaN(divisor) || total <= 0 || divisor <= 0 || divisor > total) return;

    manualPool = total;
    manualCounts = new Array(divisor).fill(0);
    if (childNames.length !== divisor) {
      childNames = Array.from({ length: divisor }, (_, i) => `Bạn ${i + 1}`);
    }

    poolHintEl.style.display = '';
    renderDraggablePool(total);

    const childBoxes: HTMLElement[] = [];
    const childCountEls: HTMLElement[] = [];

    function renderChildBox(idx: number) {
      const appleBox = childBoxes[idx];
      if (!appleBox) return;
      clearChildren(appleBox);

      for (let j = 0; j < manualCounts[idx]; j++) {
        const span = el('span', {
          className: 'inline-block text-3xl cursor-grab active:cursor-grabbing select-none transition-transform hover:scale-125',
          draggable: true,
        }, [APPLE_EMOJI]);
        span.addEventListener('dragstart', (e: DragEvent) => {
          e.dataTransfer!.setData('text/plain', `from-child-${idx}`);
          e.dataTransfer!.effectAllowed = 'move';
        });
        appleBox.append(span);
      }
      const countEl = childCountEls[idx];
      if (countEl) countEl.textContent = `${manualCounts[idx]} quả`;
    }

    // pool accepts apples dragged back from child slots
    const onPoolDragOver = (e: DragEvent) => {
      e.preventDefault();
      applePoolEl.style.borderColor = '#16a34a';
      applePoolEl.style.background = '#f0fdf4';
    };
    const onPoolDragLeave = (e: DragEvent) => {
      if (!applePoolEl.contains(e.relatedTarget as Node)) {
        applePoolEl.style.borderColor = '#fb923c';
        applePoolEl.style.background = '#fffbf0';
      }
    };
    const onPoolDrop = (e: DragEvent) => {
      e.preventDefault();
      applePoolEl.style.borderColor = '#fb923c';
      applePoolEl.style.background = '#fffbf0';
      const data = e.dataTransfer!.getData('text/plain');
      if (data.startsWith('from-child-')) {
        const idx = parseInt(data.slice('from-child-'.length), 10);
        if (!isNaN(idx) && manualCounts[idx] > 0) {
          manualPool++;
          manualCounts[idx]--;
          renderChildBox(idx);
          renderDraggablePool(manualPool);
          stopAll();
          hideStages();
        }
      }
    };
    applePoolEl.addEventListener('dragover', onPoolDragOver);
    applePoolEl.addEventListener('dragleave', onPoolDragLeave);
    applePoolEl.addEventListener('drop', onPoolDrop);
    dropDisposers.push(() => {
      applePoolEl.removeEventListener('dragover', onPoolDragOver);
      applePoolEl.removeEventListener('dragleave', onPoolDragLeave);
      applePoolEl.removeEventListener('drop', onPoolDrop);
    });

    for (let i = 0; i < divisor; i++) {
      const idx = i;
      const appleBox = el('div', { className: 'text-2xl leading-snug min-h-8 text-center break-all' });
      childBoxes.push(appleBox);
      const countEl = el('div', {
        className: 'text-xs font-black mt-1 px-2 py-0.5 rounded-full',
        style: { background: '#dbeafe', color: '#1d4ed8' },
      }, ['0 quả']);
      childCountEls.push(countEl);
      const nameInput = el('input', {
        className: 'text-base font-bold text-center bg-transparent border-0 border-b-2 border-transparent focus:border-[#60a5fa] focus:outline-none w-24 transition-colors cursor-text',
        attrs: { type: 'text', value: childNames[idx], maxlength: '20' },
        on: { input: (e: Event) => { childNames[idx] = (e.target as HTMLInputElement).value; } },
      }) as HTMLInputElement;
      const container = el('div', {
        className: 'flex flex-col items-center rounded-2xl border-2 p-3 min-w-28 transition-colors duration-150',
        style: { background: '#eef8ff', borderColor: '#60a5fa' },
      }, [
        el('div', { className: 'flex items-center gap-1 mb-2' }, ['👦', nameInput]),
        appleBox,
        countEl,
      ]);

      const onDragOver = (e: DragEvent) => {
        e.preventDefault();
        if (manualPool > 0) {
          container.style.borderColor = ACCENT;
          container.style.background = '#fff7ed';
        }
      };
      const onDragLeave = (e: DragEvent) => {
        if (!container.contains(e.relatedTarget as Node)) {
          container.style.borderColor = '#60a5fa';
          container.style.background = '#eef8ff';
        }
      };
      const onDrop = (e: DragEvent) => {
        e.preventDefault();
        container.style.borderColor = '#60a5fa';
        container.style.background = '#eef8ff';
        if (manualPool > 0 && e.dataTransfer!.getData('text/plain') === 'apple') {
          manualPool--;
          manualCounts[idx]++;
          renderChildBox(idx);
          renderDraggablePool(manualPool);
          if (manualPool === 0) onManualPoolEmpty();
        }
      };

      container.addEventListener('dragover', onDragOver);
      container.addEventListener('dragleave', onDragLeave);
      container.addEventListener('drop', onDrop);
      dropDisposers.push(() => {
        container.removeEventListener('dragover', onDragOver);
        container.removeEventListener('dragleave', onDragLeave);
        container.removeEventListener('drop', onDrop);
      });

      studentsEl.append(container);
    }
  }

  // ── auto animation mode ────────────────────────────────────────────────

  function runAutoAnimation() {
    stopAll();
    disposeDropTargets();
    hideStages();
    clearChildren(studentsEl);
    clearChildren(remainderEl);

    const total = parseInt(appleInput.value, 10);
    const divisor = parseInt(friendInput.value, 10);
    if (isNaN(total) || isNaN(divisor) || total <= 0 || divisor <= 0 || divisor > total) return;

    const result = computeDivision(total, divisor);

    poolHintEl.style.display = 'none';

    const boxes: HTMLElement[] = [];
    for (let i = 0; i < divisor; i++) {
      const appleBox = el('div', { className: 'text-2xl leading-snug min-h-8 text-center' });
      studentsEl.append(
        el('div', {
          className: 'flex flex-col items-center rounded-2xl border-2 p-3 min-w-28',
          style: { background: '#eef8ff', borderColor: '#60a5fa' },
        }, [
          el('div', { className: 'text-lg font-bold mb-2' }, [`👦 Bạn ${i + 1}`]),
          appleBox,
        ]),
      );
      boxes.push(appleBox);
    }

    applePoolEl.textContent = repeatApple(total);

    let distributed = 0;
    let current = 0;
    const target = result.quotient * divisor;

    animInterval = setInterval(() => {
      if (distributed >= target) {
        clearInterval(animInterval!);
        animInterval = null;

        applePoolEl.textContent = repeatApple(result.remainder);
        remainderEl.textContent = result.remainder > 0
          ? `🧺 Táo dư: ${repeatApple(result.remainder)}`
          : '✅ Chia hết, không còn dư';

        renderBarModel(result);
        return;
      }

      boxes[current].textContent += APPLE_EMOJI;
      distributed++;
      applePoolEl.textContent = repeatApple(total - distributed);
      current = (current + 1) % divisor;
    }, 250);
  }

  // ── layout ─────────────────────────────────────────────────────────────
  const page = el('div', { className: 'mx-auto max-w-3xl space-y-5 px-4 py-6 animate-rise-in' }, [
    el('div', { className: 'text-center space-y-2' }, [
      el('h1', {
        className: 'font-display text-2xl sm:text-3xl font-bold text-ink m-0',
      }, ['🍎 Phép Chia Có Dư']),
      el('p', { className: 'm-0 text-[var(--color-ink-soft)]' }, [
        'Minh họa phép chia theo Singapore Math',
      ]),
    ]),
    controlsCard,
    stage1Card,
    stage2Card,
    stage3Card,
    stage4Card,
  ]);

  appleInput.addEventListener('input', () => { stopAll(); hideStages(); showManual(); });
  friendInput.addEventListener('input', () => { stopAll(); hideStages(); showManual(); });

  root.appendChild(page);
  showManual();

  return combineCleanup(stopAll, () => { disposeDropTargets(); page.remove(); });
}

// ── export ─────────────────────────────────────────────────────────────────

const category: MathCategory = {
  id: 'division',
  title: 'Phép Chia Có Dư',
  description: 'Chia táo có dư qua 4 bước: Concrete, Pictorial, Abstract, Phép Nhân',
  icon: '🍎',
  level: 'Lớp 2–3',
  accent: ACCENT,
  order: 30,
  mount,
};

export default category;
