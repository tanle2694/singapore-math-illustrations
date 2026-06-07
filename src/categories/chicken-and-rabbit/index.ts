import type { MathCategory } from '../../core/category';
import { el, combineCleanup, clearChildren } from '../../core/dom';
import {
  computeDerived,
  makeSlots,
  ANIMAL_DEFS,
  PRESETS,
  type AnimalType,
  type PenSlot,
} from './logic';

// ── constants ──────────────────────────────────────────────────────────────

const ACCENT = '#2f9e6e';
const CHICKEN_COLOR = '#f59e0b';
const RABBIT_COLOR = '#ef6f5b';

// ── emoji cursor ──────────────────────────────────────────────────────────

function makeEmojiCursor(emoji: string, size = 36): string {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.font = `${Math.floor(size * 0.82)}px serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(emoji, size / 2, size / 2);
  return canvas.toDataURL();
}

// ── slot element factory ───────────────────────────────────────────────────

interface SlotHandle {
  root: HTMLDivElement;
  sync(slot: PenSlot): void;
  dispose(): void;
}

function createSlotEl(
  slot: PenSlot,
  onPlace: () => void,
  getSelected: () => AnimalType | null,
  getDragAnimal: () => AnimalType | null,
): SlotHandle {
  const innerEl = el('div', {
    className: 'flex flex-col items-center justify-center p-2 w-full pointer-events-none',
  });

  const root = el('div', {
    className: [
      'relative rounded-2xl border-2 flex items-center justify-center',
      'transition-all cursor-pointer select-none',
    ].join(' '),
    style: { minHeight: '76px' },
    attrs: { role: 'button', tabindex: '0' },
  }, [innerEl]) as HTMLDivElement;

  function applyEmptyStyle() {
    root.style.borderStyle = 'dashed';
    root.style.borderColor = 'var(--color-card-line)';
    root.style.background = 'var(--color-paper)';
  }

  function applyFilledStyle(animal: AnimalType) {
    root.style.borderStyle = 'solid';
    root.style.borderColor = animal === 'chicken' ? `${CHICKEN_COLOR}55` : `${RABBIT_COLOR}55`;
    root.style.background = 'var(--color-card)';
  }

  function applyDragOverStyle() {
    root.style.borderStyle = 'solid';
    root.style.borderColor = ACCENT;
    root.style.background = '#dcfce7';
  }

  function syncInner(s: PenSlot) {
    clearChildren(innerEl);
    if (!s.animal) {
      innerEl.append(
        el('span', { style: { opacity: '0.25', fontSize: '1.6rem', lineHeight: '1' } }, ['＋']),
      );
    } else {
      const def = ANIMAL_DEFS[s.animal];
      const legRow = el('div', { className: 'flex flex-wrap justify-center gap-px text-sm mt-0.5' });
      for (let i = 0; i < def.legs; i++) legRow.append('🦶');
      innerEl.append(
        el('div', { className: 'text-3xl leading-none text-center' }, [def.emoji]),
        legRow,
      );
    }
  }

  function sync(s: PenSlot) {
    syncInner(s);
    if (s.animal) applyFilledStyle(s.animal);
    else applyEmptyStyle();
  }

  sync(slot);

  let dragCount = 0;

  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
  };
  const onDragEnter = (e: DragEvent) => {
    e.preventDefault();
    dragCount++;
    applyDragOverStyle();
  };
  const onDragLeave = () => {
    dragCount = Math.max(0, dragCount - 1);
    if (dragCount === 0) sync(slot);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    dragCount = 0;
    const type = (e.dataTransfer?.getData('text/plain') || getDragAnimal() || '') as AnimalType;
    if (type === 'chicken' || type === 'rabbit') {
      slot.animal = type;
      onPlace();
    }
    sync(slot);
  };
  const onClick = () => {
    const sel = getSelected();
    if (sel) {
      slot.animal = sel;
      onPlace();
      sync(slot);
    } else if (slot.animal) {
      slot.animal = null;
      onPlace();
      sync(slot);
    }
  };
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); }
  };

  root.addEventListener('dragover', onDragOver);
  root.addEventListener('dragenter', onDragEnter);
  root.addEventListener('dragleave', onDragLeave);
  root.addEventListener('drop', onDrop);
  root.addEventListener('click', onClick);
  root.addEventListener('keydown', onKeyDown);

  return {
    root,
    sync,
    dispose() {
      root.removeEventListener('dragover', onDragOver);
      root.removeEventListener('dragenter', onDragEnter);
      root.removeEventListener('dragleave', onDragLeave);
      root.removeEventListener('drop', onDrop);
      root.removeEventListener('click', onClick);
      root.removeEventListener('keydown', onKeyDown);
    },
  };
}

// ── mount ──────────────────────────────────────────────────────────────────

function mount(root: HTMLElement): () => void {
  // ── state ─────────────────────────────────────────────────────────────────
  let { animals: totalAnimals, legs: targetLegs } = PRESETS[0];
  let slots: PenSlot[] = makeSlots(totalAnimals);
  let selectedAnimal: AnimalType | null = null;
  let dragAnimal: AnimalType | null = null;
  let slotHandles: SlotHandle[] = [];

  // ── problem card ───────────────────────────────────────────────────────────
  const totalAnimalsDisplay = el('div', {
    className: 'text-6xl font-black font-display text-center',
    style: { color: ACCENT },
  }, [String(totalAnimals)]);

  const targetLegsDisplay = el('div', {
    className: 'text-6xl font-black font-display text-center',
    style: { color: RABBIT_COLOR },
  }, [String(targetLegs)]);

  const presetContainer = el('div', { className: 'flex flex-wrap gap-2 justify-center' });

  function buildPresetButtons() {
    clearChildren(presetContainer);
    PRESETS.forEach(preset => {
      const isActive = preset.animals === totalAnimals && preset.legs === targetLegs;
      const btn = el('button', {
        className: [
          'px-3 py-1.5 rounded-xl text-sm font-bold transition-all border-2',
          isActive
            ? 'border-[#2f9e6e] bg-[#2f9e6e] text-white shadow-md'
            : 'border-[var(--color-card-line)] bg-[var(--color-paper)] text-[var(--color-ink-soft)]',
        ].join(' '),
        attrs: { type: 'button' },
        on: {
          click: () => {
            if (isActive) return;
            totalAnimals = preset.animals;
            targetLegs = preset.legs;
            slots = makeSlots(totalAnimals);
            selectedAnimal = null;
            rebuildPen();
            buildPresetButtons();
            totalAnimalsDisplay.textContent = String(totalAnimals);
            targetLegsDisplay.textContent = String(targetLegs);
            updateToolboxSelection();
            update();
          },
        },
      }, [`${preset.animals} con · ${preset.legs} chân`]);
      presetContainer.append(btn);
    });
  }

  buildPresetButtons();

  const problemCard = el('div', { className: 'paper-card p-6 space-y-5' }, [
    el('h2', { className: 'font-display text-lg font-bold text-ink m-0 text-center' }, ['📋 Đề bài']),
    el('div', { className: 'grid grid-cols-2 gap-6' }, [
      el('div', { className: 'space-y-1' }, [
        el('div', { className: 'text-xs font-bold text-[var(--color-ink-soft)] text-center uppercase tracking-widest' }, ['Tổng số con']),
        totalAnimalsDisplay,
      ]),
      el('div', { className: 'space-y-1' }, [
        el('div', { className: 'text-xs font-bold text-[var(--color-ink-soft)] text-center uppercase tracking-widest' }, ['Tổng số chân']),
        targetLegsDisplay,
      ]),
    ]),
    el('div', { className: 'pt-3 border-t border-[var(--color-card-line)] space-y-2' }, [
      el('div', { className: 'text-xs font-bold text-[var(--color-ink-soft)] text-center' }, ['Chọn đề bài:']),
      presetContainer,
    ]),
  ]);

  // ── toolbox ────────────────────────────────────────────────────────────────
  const hintEl = el('p', {
    className: 'text-xs font-medium text-center m-0 transition-all',
    style: { color: 'var(--color-ink-soft)' },
  }, ['👆 Nhấn vào con vật để chọn']);

  function buildToolboxAnimalCard(animal: AnimalType): HTMLDivElement {
    const def = ANIMAL_DEFS[animal];
    const bgColor = animal === 'chicken' ? '#fef9c3' : '#fee2e2';
    const accentColor = animal === 'chicken' ? CHICKEN_COLOR : RABBIT_COLOR;
    const label = animal === 'chicken' ? 'Gà' : 'Thỏ';

    const legRow = el('div', { className: 'flex justify-center gap-px text-base mt-1' });
    for (let i = 0; i < def.legs; i++) legRow.append('🦶');

    const card = el('div', {
      className: 'flex flex-col items-center gap-1 px-4 py-4 rounded-2xl border-2 cursor-pointer transition-all select-none active:scale-[0.97]',
      style: { background: bgColor, borderColor: 'transparent', userSelect: 'none' },
      attrs: {
        draggable: true,
        role: 'button',
        tabindex: '0',
        'aria-label': `${label} — ${def.legs} chân`,
        'data-animal': animal,
      },
    }, [
      el('div', { className: 'text-5xl leading-none' }, [def.emoji]),
      legRow,
      el('div', { className: 'text-xs font-black mt-1', style: { color: accentColor } }, [`${def.legs} chân`]),
    ]) as HTMLDivElement;

    card.addEventListener('dragstart', (e) => {
      dragAnimal = animal;
      e.dataTransfer!.setData('text/plain', animal);
      e.dataTransfer!.effectAllowed = 'copy';
    });
    card.addEventListener('dragend', () => { dragAnimal = null; });

    const onSelect = () => {
      selectedAnimal = selectedAnimal === animal ? null : animal;
      updateToolboxSelection();
    };
    card.addEventListener('click', onSelect);
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); }
    });

    return card;
  }

  const chickenCard = buildToolboxAnimalCard('chicken');
  const rabbitCard = buildToolboxAnimalCard('rabbit');

  function updateToolboxSelection() {
    const cards: [AnimalType, HTMLDivElement][] = [
      ['chicken', chickenCard],
      ['rabbit', rabbitCard],
    ];
    for (const [animal, card] of cards) {
      const isSelected = selectedAnimal === animal;
      const accentColor = animal === 'chicken' ? CHICKEN_COLOR : RABBIT_COLOR;
      card.style.borderColor = isSelected ? accentColor : 'transparent';
      card.style.transform = isSelected ? 'scale(1.06) translateY(-2px)' : '';
      card.style.boxShadow = isSelected ? `0 12px 28px -10px ${accentColor}99` : '';
    }
    if (selectedAnimal) {
      hintEl.textContent = '👇 Nhấn vào ô chuồng để đặt';
      hintEl.style.color = ACCENT;
      hintEl.style.fontWeight = '700';
    } else {
      hintEl.textContent = '👆 Nhấn vào con vật để chọn';
      hintEl.style.color = 'var(--color-ink-soft)';
      hintEl.style.fontWeight = '500';
    }
    applyPenCursor();
  }

  function applyPenCursor() {
    let cursorVal = 'pointer';
    if (selectedAnimal) {
      const emoji = ANIMAL_DEFS[selectedAnimal].emoji;
      const dataUrl = makeEmojiCursor(emoji, 36);
      cursorVal = `url('${dataUrl}') 18 18, pointer`;
    }
    penCard.style.cursor = cursorVal;
    for (const h of slotHandles) h.root.style.cursor = cursorVal;
  }

  const toolboxCard = el('div', { className: 'paper-card p-5 space-y-4' }, [
    el('h3', { className: 'font-display text-sm font-bold text-ink m-0' }, ['📦 Kho động vật']),
    el('div', { className: 'grid grid-cols-2 gap-3' }, [chickenCard, rabbitCard]),
    hintEl,
  ]);

  // ── pen area ───────────────────────────────────────────────────────────────
  const penGridEl = el('div', {
    className: 'grid gap-3',
    style: { gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' },
  });

  function rebuildPen() {
    for (const h of slotHandles) h.dispose();
    slotHandles = [];
    clearChildren(penGridEl);
    for (const slot of slots) {
      const handle = createSlotEl(
        slot,
        () => update(),
        () => selectedAnimal,
        () => dragAnimal,
      );
      slotHandles.push(handle);
      penGridEl.append(handle.root);
    }
    applyPenCursor();
  }

  const clearPenBtn = el('button', {
    className: 'text-xs font-bold text-[var(--color-ink-soft)] transition rounded-xl px-3 py-1.5',
    style: { background: 'transparent' },
    attrs: { type: 'button' },
    on: {
      click: () => {
        for (const slot of slots) slot.animal = null;
        for (const [i, handle] of slotHandles.entries()) handle.sync(slots[i]);
        update();
      },
    },
  }, ['Xóa tất cả ✕']);

  const penCard = el('div', { className: 'paper-card p-5 space-y-4' }, [
    el('div', { className: 'flex items-center justify-between' }, [
      el('h3', { className: 'font-display text-sm font-bold text-ink m-0' }, ['🐾 Chuồng']),
      clearPenBtn,
    ]),
    penGridEl,
  ]);

  rebuildPen();

  // ── progress panel ─────────────────────────────────────────────────────────
  const animalCountEl = el('span', { className: 'text-3xl font-black font-display' }, ['0']);
  const animalTargetEl = el('span', { className: 'text-xl font-bold text-[var(--color-ink-soft)]' }, [` / ${totalAnimals}`]);
  const legCountEl = el('span', { className: 'text-3xl font-black font-display' }, ['0']);
  const legTargetEl = el('span', { className: 'text-xl font-bold text-[var(--color-ink-soft)]' }, [` / ${targetLegs}`]);
  const footIconsContainer = el('div', { className: 'flex flex-wrap gap-0.5 mt-2' });

  function updateFootIcons(current: number, target: number) {
    clearChildren(footIconsContainer);
    const visible = Math.min(target, 20);
    for (let i = 0; i < visible; i++) {
      footIconsContainer.append(
        el('span', {
          className: 'text-lg leading-none transition-opacity duration-200',
          style: { opacity: i < current ? '1' : '0.18' },
        }, ['🦶']),
      );
    }
    if (target > 20) {
      footIconsContainer.append(
        el('span', { className: 'text-xs text-[var(--color-ink-soft)] self-center ml-1' }, [`+${target - 20}`]),
      );
    }
  }

  updateFootIcons(0, targetLegs);

  const progressCard = el('div', { className: 'paper-card p-5' }, [
    el('div', { className: 'grid grid-cols-2 gap-6' }, [
      el('div', { className: 'space-y-1' }, [
        el('div', { className: 'text-xs font-bold text-[var(--color-ink-soft)] uppercase tracking-wide' }, ['Số con đã đặt']),
        el('div', { className: 'flex items-baseline' }, [animalCountEl, animalTargetEl]),
      ]),
      el('div', { className: 'space-y-1' }, [
        el('div', { className: 'text-xs font-bold text-[var(--color-ink-soft)] uppercase tracking-wide' }, ['Số chân hiện tại']),
        el('div', { className: 'flex items-baseline' }, [legCountEl, legTargetEl]),
        footIconsContainer,
      ]),
    ]),
  ]);

  // ── status card ────────────────────────────────────────────────────────────
  const statusCard = el('div', {
    className: 'rounded-3xl border-2 p-5 text-center transition-all space-y-2',
    style: { display: 'none' },
  });

  // ── layout ─────────────────────────────────────────────────────────────────
  const page = el('div', { className: 'mx-auto max-w-3xl space-y-5 px-4 py-6 animate-rise-in' }, [
    el('div', { className: 'text-center space-y-2' }, [
      el('h1', { className: 'font-display text-2xl sm:text-3xl font-bold text-ink m-0' }, [
        '🐔 Bài Toán Gà và Thỏ',
      ]),
      el('p', { className: 'text-[var(--color-ink-soft)] m-0' }, [
        'Đặt gà và thỏ vào chuồng, đếm chân cho đúng',
      ]),
    ]),
    problemCard,
    el('div', { className: 'grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4 items-start' }, [
      toolboxCard,
      penCard,
    ]),
    progressCard,
    statusCard,
  ]);

  root.appendChild(page);

  // ── update ─────────────────────────────────────────────────────────────────
  function update() {
    const d = computeDerived(slots, totalAnimals, targetLegs);

    animalCountEl.textContent = String(d.currentAnimals);
    animalTargetEl.textContent = ` / ${totalAnimals}`;
    legCountEl.textContent = String(d.currentLegs);
    legTargetEl.textContent = ` / ${targetLegs}`;
    updateFootIcons(d.currentLegs, targetLegs);

    if (d.isCorrect) {
      animalCountEl.style.color = '#16a34a';
      legCountEl.style.color = '#16a34a';
    } else if (d.isComplete) {
      animalCountEl.style.color = ACCENT;
      legCountEl.style.color = RABBIT_COLOR;
    } else {
      animalCountEl.style.color = 'var(--color-ink)';
      legCountEl.style.color = 'var(--color-ink)';
    }

    if (!d.isComplete) {
      statusCard.style.display = 'none';
      return;
    }

    statusCard.style.display = '';

    if (d.isCorrect) {
      statusCard.className = 'rounded-3xl border-2 p-6 text-center transition-all space-y-3 border-[#86efac] bg-[#f0fdf4] animate-pop-in';
      clearChildren(statusCard);
      statusCard.append(
        el('div', { className: 'text-4xl' }, ['🎉']),
        el('div', { className: 'font-display text-2xl font-black text-[#15803d]' }, ['Giỏi lắm!']),
        el('div', { className: 'flex justify-center items-center gap-6 mt-2' }, [
          el('div', { className: 'text-center' }, [
            el('div', { className: 'text-4xl' }, ['🐔']),
            el('div', { className: 'font-bold text-lg text-ink' }, [`${d.chickenCount} con gà`]),
          ]),
          el('div', { className: 'text-2xl text-[var(--color-ink-soft)] font-bold' }, ['+']),
          el('div', { className: 'text-center' }, [
            el('div', { className: 'text-4xl' }, ['🐰']),
            el('div', { className: 'font-bold text-lg text-ink' }, [`${d.rabbitCount} con thỏ`]),
          ]),
        ]),
      );
    } else {
      statusCard.className = 'rounded-3xl border-2 p-5 text-center transition-all space-y-2 border-[#fca5a5] bg-[#fef2f2]';
      clearChildren(statusCard);
      const diffText = d.legsDiff > 0
        ? `Cần thêm ${d.legsDiff} chân nữa`
        : `Thừa ${Math.abs(d.legsDiff)} chân`;
      statusCard.append(
        el('div', { className: 'font-display text-lg font-bold text-[#b91c1c]' }, [
          'Chưa đúng. Hãy thử đổi một số con vật.',
        ]),
        el('div', { className: 'text-sm font-medium text-[#dc2626]' }, [diffText]),
      );
    }
  }

  update();

  return combineCleanup(() => {
    for (const h of slotHandles) h.dispose();
    page.remove();
  });
}

// ── export ─────────────────────────────────────────────────────────────────

const category: MathCategory = {
  id: 'chicken-and-rabbit',
  title: 'Gà và Thỏ',
  description: 'Đặt gà và thỏ vào chuồng, đếm chân — bài toán cổ điển lớp 3',
  icon: '🐔',
  level: 'Lớp 3',
  accent: ACCENT,
  order: 20,
  mount,
};

export default category;
