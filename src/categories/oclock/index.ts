import type { MathCategory } from '../../core/category';
import { el, combineCleanup } from '../../core/dom';
import { createBubble } from '../../components/ui/Bubble';
import { createButton } from '../../components/ui/Button';
import { createPanel } from '../../components/ui/Card';
import { createSlider } from '../../components/ui/Slider';
import { drawClockFace, fitCanvasToDisplaySize, DEFAULT_CLOCK_PALETTE } from './clock-canvas';
import {
  computeElapsedSteps,
  formatClock12,
  getDayPeriod,
  splitHoursAndMinutes,
  type ElapsedStep,
} from './logic';

// ── constants ──────────────────────────────────────────────────────────────

const SPEEDS = {
  1: { label: 'Chậm', clockMs: 2000, gapMs: 800, teachMs: 3500 },
  2: { label: 'Bình thường', clockMs: 1200, gapMs: 500, teachMs: 2000 },
  3: { label: 'Nhanh', clockMs: 500, gapMs: 200, teachMs: 800 },
} as const;

const CLOCK_CSS_SIZE = 220;

// ── helpers ────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function dayPeriodBadge(totalMinutes: number): HTMLElement {
  const p = getDayPeriod(totalMinutes);
  const colorMap: Record<string, string> = {
    night: 'bg-[#1e1b4b] text-[#c4b5fd]',
    'early-morning': 'bg-orange-100 text-orange-700',
    morning: 'bg-yellow-100 text-yellow-700',
    noon: 'bg-yellow-200 text-yellow-800',
    afternoon: 'bg-orange-50 text-orange-700',
    evening: 'bg-red-50 text-red-700',
  };
  return el(
    'span',
    {
      className: `inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-sm font-bold ${colorMap[p.id] ?? ''}`,
    },
    [`${p.icon} ${p.label}`],
  );
}

function teachingMsg(i: number, total: number, step: ElapsedStep): string {
  const to = formatClock12(step.toMinutes);
  if (i === 0 && total > 1) {
    if (step.deltaMinutes % 60 === 0) {
      const hrs = step.deltaMinutes / 60;
      return `Cộng thêm ${hrs} giờ để đến ${to}.`;
    }
    return `Cộng thêm ${step.deltaMinutes} phút để đến giờ tròn tiếp theo: ${to}.`;
  }
  if (i === total - 1 && i > 0) return `Cộng thêm ${step.deltaMinutes} phút nữa để đến ${to}.`;
  if (step.deltaMinutes === 60) return `Cộng thêm 1 giờ để đến ${to}.`;
  if (step.deltaMinutes % 60 === 0) return `Cộng thêm ${step.deltaMinutes / 60} giờ để đến ${to}.`;
  return `Cộng thêm ${step.deltaMinutes} phút để đến ${to}.`;
}

// ── Clock widget ───────────────────────────────────────────────────────────

interface ClockWidget {
  root: HTMLElement;
  canvas: HTMLCanvasElement;
  totalMinutes: number;
  draw(): void;
  cleanup(): void;
}

function createClockWidget(opts: {
  label: string;
  initialMinutes: number;
  interactive: boolean;
  onDrag?: (minutes: number) => void;
}): ClockWidget {
  const canvas = el('canvas') as HTMLCanvasElement;
  canvas.className = 'block mx-auto cursor-grab active:cursor-grabbing rounded-2xl';
  fitCanvasToDisplaySize(canvas, CLOCK_CSS_SIZE);

  let totalMinutes = opts.initialMinutes;
  let dragging = false;

  function draw() {
    const ctx = canvas.getContext('2d')!;
    drawClockFace(ctx, CLOCK_CSS_SIZE, totalMinutes, DEFAULT_CLOCK_PALETTE);
    updateDisplay();
  }

  const timeEl = el('div', { className: 'mt-3 text-2xl font-bold font-display text-ink text-center' });
  const periodEl = el('div', { className: 'mt-1 flex justify-center' });

  function updateDisplay() {
    const h = Math.floor(totalMinutes / 60) % 24;
    const m = Math.floor(totalMinutes % 60);
    const h12 = h % 12 || 12;
    const isAM = h < 12;
    const ampm = el(
      'span',
      {
        className: `ml-1.5 rounded-lg px-2 py-0.5 text-base font-bold align-middle ${isAM ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`,
      },
      [isAM ? 'AM' : 'PM'],
    );
    timeEl.replaceChildren(`${h12}:${String(m).padStart(2, '0')}`, ampm);
    periodEl.replaceChildren(dayPeriodBadge(totalMinutes));
  }

  function getMinuteFromEvent(e: MouseEvent): number {
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left - CLOCK_CSS_SIZE / 2;
    const y = e.clientY - r.top - CLOCK_CSS_SIZE / 2;
    let a = Math.atan2(y, x) + Math.PI / 2;
    if (a < 0) a += Math.PI * 2;
    let min = Math.round((a / (Math.PI * 2)) * 60);
    if (min === 60) min = 0;
    return min;
  }

  function onMouseDown() {
    if (!opts.interactive) return;
    dragging = true;
  }
  function onMouseMove(e: MouseEvent) {
    if (!dragging || !opts.interactive) return;
    const nm = getMinuteFromEvent(e);
    const pm = totalMinutes % 60;
    let d = nm - pm;
    if (d > 30) d -= 60;
    if (d < -30) d += 60;
    totalMinutes = ((totalMinutes + d) % 1440 + 1440) % 1440;
    draw();
    opts.onDrag?.(totalMinutes);
  }
  function onMouseUp() {
    dragging = false;
  }

  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);

  draw();

  const root = el('div', { className: 'flex flex-col items-center' }, [canvas, timeEl, periodEl]);

  return {
    root,
    canvas,
    get totalMinutes() {
      return totalMinutes;
    },
    set totalMinutes(v: number) {
      totalMinutes = v;
    },
    draw,
    cleanup() {
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    },
  };
}

// ── Timeline ───────────────────────────────────────────────────────────────

interface TimelineHandle {
  root: HTMLElement;
  build(steps: ElapsedStep[]): (index: number) => number;
  applyProgress(target: number, steps: ElapsedStep[], durationMs: number): void;
}

function createTimeline(): TimelineHandle {
  const base = el('div', { className: 'absolute top-12 left-[5%] right-[5%] h-2 rounded-full bg-paper-deep' });
  const fill = el('div', {
    className: 'absolute top-12 left-[5%] h-2 w-0 rounded-full transition-[width] duration-700 ease-[cubic-bezier(.4,0,.2,1)]',
    style: { background: 'linear-gradient(90deg,var(--accent),#a855f7)' },
  });
  const marker = el('div', {
    className:
      'absolute top-[35px] w-8 h-8 -translate-x-1/2 rounded-full bg-sun border-[3px] border-card shadow-[0_0_0_4px_rgba(245,158,11,.35),0_0_16px_rgba(245,158,11,.5)] z-10 transition-[left] duration-700 ease-[cubic-bezier(.4,0,.2,1)]',
    style: { left: '5%' },
  });

  const container = el('div', { className: 'relative h-32 select-none' }, [base, fill, marker]);

  let pointsLayer: HTMLElement[] = [];
  let jumpsLayer: HTMLElement[] = [];

  function build(steps: ElapsedStep[]): (i: number) => number {
    pointsLayer.forEach((e) => e.remove());
    jumpsLayer.forEach((e) => e.remove());
    pointsLayer = [];
    jumpsLayer = [];

    const pts = steps.map((s) => s.fromMinutes).concat(steps[steps.length - 1].toMinutes);
    const n = pts.length;
    const pos = (i: number) => 5 + (i / (n - 1)) * 90;

    pts.forEach((min, i) => {
      const dot = el('div', {
        className: 'tl-dot w-7 h-7 rounded-full bg-paper-deep border-[3px] border-card mx-auto transition-all duration-500',
      });
      dot.dataset.dot = String(i);
      const timeLabel = el('div', { className: 'mt-2.5 text-xs font-bold text-ink whitespace-nowrap text-center' }, [
        formatClock12(min),
      ]);
      const pt = el(
        'div',
        { className: 'absolute -translate-x-1/2 top-[35px] z-[5] text-center', style: { left: `${pos(i)}%` } },
        [dot, timeLabel],
      );
      container.appendChild(pt);
      pointsLayer.push(pt);
    });

    steps.forEach((step, i) => {
      const mid = (pos(i) + pos(i + 1)) / 2;
      const lbl = el(
        'div',
        {
          className:
            'absolute top-[72px] -translate-x-1/2 bg-coral text-white text-xs font-bold px-2.5 py-0.5 rounded-xl opacity-0 pointer-events-none whitespace-nowrap',
          style: { left: `${mid}%` },
        },
        [`+${step.deltaMinutes} phút`],
      );
      lbl.dataset.jump = String(i);
      container.appendChild(lbl);
      jumpsLayer.push(lbl);
    });

    // reset fill & marker
    fill.style.transition = 'none';
    fill.style.width = '0%';
    marker.style.transition = 'none';
    marker.style.left = `${pos(0)}%`;
    const dot0 = container.querySelector('[data-dot="0"]') as HTMLElement | null;
    if (dot0) dot0.style.background = 'var(--accent)';
    void fill.offsetWidth;
    fill.style.transition = '';
    marker.style.transition = '';

    return pos;
  }

  function applyProgress(target: number, steps: ElapsedStep[], durationMs: number): void {
    const n = steps.length;
    const pts = steps.map((s) => s.fromMinutes).concat(steps[steps.length - 1].toMinutes);
    const pos = (i: number) => 5 + (i / (pts.length - 1)) * 90;

    const dur = `${durationMs}ms`;
    fill.style.transition = `width ${dur} cubic-bezier(.4,0,.2,1)`;
    marker.style.transition = `left ${dur} cubic-bezier(.4,0,.2,1)`;
    fill.style.width = target === 0 ? '0%' : `${pos(target) - 5}%`;
    marker.style.left = `${pos(target)}%`;

    for (let i = 0; i <= n; i++) {
      const dot = container.querySelector(`[data-dot="${i}"]`) as HTMLElement | null;
      if (!dot) continue;
      if (i < target) {
        dot.style.background = '#10b981';
        dot.style.boxShadow = '0 0 8px rgba(16,185,129,.5)';
      } else if (i === target) {
        dot.style.background = 'var(--accent)';
        dot.style.boxShadow = '0 0 12px rgba(79,109,245,.6)';
      } else {
        dot.style.background = '';
        dot.style.boxShadow = '';
      }
    }

    for (let i = 0; i < n; i++) {
      const lbl = container.querySelector(`[data-jump="${i}"]`) as HTMLElement | null;
      if (!lbl) continue;
      if (i < target) {
        if (lbl.style.opacity === '0' || lbl.style.opacity === '') {
          lbl.style.opacity = '0';
          lbl.style.transform = 'translateX(-50%) scale(.4) translateY(12px)';
          void lbl.offsetWidth;
          lbl.style.transition = 'opacity .4s, transform .4s cubic-bezier(.21,1.02,.27,1)';
          lbl.style.opacity = '1';
          lbl.style.transform = 'translateX(-50%) scale(1) translateY(0)';
        }
      } else {
        lbl.style.opacity = '0';
        lbl.style.transform = '';
        lbl.style.transition = '';
      }
    }
  }

  return { root: container, build, applyProgress };
}

// ── Calc panel ─────────────────────────────────────────────────────────────

interface CalcHandle {
  linesRoot: HTMLElement;
  finalRoot: HTMLElement;
  build(steps: ElapsedStep[]): void;
  revealLines(upTo: number): void;
  showFinal(totalMinutes: number): void;
  hideFinal(): void;
}

function createCalcPanel(): CalcHandle {
  const linesRoot = el('div', { className: 'space-y-1' });
  const finalRoot = el('div', {
    className:
      'mt-5 rounded-2xl p-4 text-center opacity-0 translate-y-2.5 transition-all duration-500 ease-out ' +
      'bg-gradient-to-br from-emerald-50 to-emerald-100',
    style: { transform: 'translateY(10px)' },
  });

  function build(steps: ElapsedStep[]) {
    linesRoot.replaceChildren();
    let run = 0;
    steps.forEach((step, i) => {
      run += step.deltaMinutes;
      const line = el(
        'div',
        {
          className:
            'flex items-center gap-3 py-2 border-b border-paper text-base opacity-0 -translate-x-5 transition-all duration-300 ease-out',
          attrs: { 'data-line': i },
        },
        [
          el('span', { className: 'text-[var(--accent)] text-lg font-bold w-6 text-center' }, ['+']),
          el('span', { className: 'text-ink font-bold' }, [`${step.deltaMinutes} phút`]),
          el('span', { className: 'text-ink-soft' }, ['=']),
          el('span', { className: 'text-purple-700 font-bold' }, [`${run} phút`]),
        ],
      );
      linesRoot.appendChild(line);
    });
  }

  function revealLines(upTo: number) {
    const lines = linesRoot.querySelectorAll<HTMLElement>('[data-line]');
    lines.forEach((line) => {
      const i = Number(line.dataset.line);
      if (i < upTo) {
        line.style.opacity = '1';
        line.style.transform = 'translateX(0)';
      } else {
        line.style.opacity = '0';
        line.style.transform = 'translateX(-20px)';
      }
    });
  }

  function showFinal(total: number) {
    const { hours, minutes } = splitHoursAndMinutes(total);
    const hrStr = hours > 0 ? `${hours} giờ` : '';
    const minStr = minutes > 0 ? `${minutes} phút` : '';
    finalRoot.innerHTML = `
      <div class="text-emerald-700 text-lg">${total} phút</div>
      <div class="text-ink-soft text-2xl my-1">=</div>
      <div class="text-emerald-800 text-3xl font-bold font-display">${[hrStr, minStr].filter(Boolean).join(' ')}</div>
    `;
    finalRoot.style.opacity = '1';
    finalRoot.style.transform = 'translateY(0)';
  }

  function hideFinal() {
    finalRoot.style.opacity = '0';
    finalRoot.style.transform = 'translateY(10px)';
  }

  return { linesRoot, finalRoot, build, revealLines, showFinal, hideFinal };
}

// ── Confetti ───────────────────────────────────────────────────────────────

function launchConfetti(canvas: HTMLCanvasElement) {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx = canvas.getContext('2d')!;
  const colors = ['#ef6f5b', '#ffd93d', '#6bcb77', '#4d96ff', '#c77dff', '#ff9f43'];
  const parts = Array.from({ length: 180 }, (_, i) => ({
    x: Math.random() * canvas.width,
    y: -10 - Math.random() * 200,
    vx: (Math.random() - 0.5) * 5,
    vy: Math.random() * 3 + 2,
    color: colors[i % colors.length],
    size: Math.random() * 9 + 4,
    rot: Math.random() * Math.PI * 2,
    rotV: (Math.random() - 0.5) * 0.15,
    rect: Math.random() < 0.5,
  }));

  let rafId = 0;
  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let alive = false;
    for (const p of parts) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.04;
      p.rot += p.rotV;
      if (p.y < canvas.height + 30) alive = true;
      const fade = p.y > canvas.height - 60 ? Math.max(0, 1 - (p.y - (canvas.height - 60)) / 60) : 1;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = fade;
      if (p.rect) ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.6);
      else {
        ctx.beginPath();
        ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    if (alive) rafId = requestAnimationFrame(tick);
    else ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
  rafId = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(rafId);
}

// ── mount ──────────────────────────────────────────────────────────────────

function mount(root: HTMLElement): () => void {
  // confetti canvas (fixed overlay)
  const confettiCanvas = el('canvas', {
    className: 'fixed inset-0 pointer-events-none z-50',
  }) as HTMLCanvasElement;
  document.body.appendChild(confettiCanvas);
  let cancelConfetti = () => {};

  // clocks — simClock is forward-declared so startClock's onDrag can reference it
  // eslint-disable-next-line prefer-const
  let simClock: ClockWidget;

  const startClock = createClockWidget({
    label: 'Giờ bắt đầu',
    initialMinutes: 20 * 60 + 30,
    interactive: true,
    onDrag: (minutes) => {
      // keep sim clock in sync while the simulation hasn't started yet
      if (!sim.autoRunning && !sim.busy && sim.completed === 0) {
        simClock.totalMinutes = minutes;
        simClock.draw();
      }
    },
  });
  const endClock = createClockWidget({
    label: 'Giờ kết thúc',
    initialMinutes: 22 * 60 + 15,
    interactive: true,
  });
  simClock = createClockWidget({
    label: 'Mô phỏng',
    initialMinutes: 20 * 60 + 30,
    interactive: false,
  });

  // bubble
  const bubble = createBubble('Nhấn <strong>Chạy mô phỏng</strong> để bắt đầu từng bước!');

  // timeline
  const timeline = createTimeline();
  const timelinePanel = createPanel({ title: 'Dòng thời gian Singapore Math', icon: '📊' }, [timeline.root]);

  // calc
  const calc = createCalcPanel();
  const calcPanel = createPanel({ title: 'Tính toán', icon: '🧮' }, [calc.linesRoot, calc.finalRoot]);

  // result box
  const resultSummary = el('div', { className: 'flex flex-wrap justify-center items-center gap-6 mt-4' });
  const resultBox = el(
    'div',
    {
      className:
        'paper-card p-7 text-center opacity-0 translate-y-5 transition-all duration-500 ease-out',
      style: { transform: 'translateY(20px)' },
    },
    [
      el('div', { className: 'text-lg font-bold text-meadow mb-4' }, ['🎉 Làm tốt lắm! Chúng ta đã đếm từng bước theo phương pháp Singapore Math!']),
      resultSummary,
    ],
  );

  // speed slider + label
  let speedValue = 2;
  const speedLabelEl = el('span', { className: 'text-sm font-bold text-[var(--accent)] min-w-[5rem]' }, [
    SPEEDS[2].label,
  ]);
  const speedSlider = createSlider({
    min: 1,
    max: 3,
    value: 2,
    ariaLabel: 'Tốc độ mô phỏng',
    className: 'w-28',
    onInput: (v) => {
      speedValue = v as 1 | 2 | 3;
      speedLabelEl.textContent = SPEEDS[speedValue as 1 | 2 | 3].label;
    },
  });

  const speedRow = el('div', { className: 'mt-3 flex items-center justify-center gap-2 text-sm text-ink-soft' }, [
    el('span', {}, ['🐢']),
    speedSlider.root,
    el('span', {}, ['⚡']),
    speedLabelEl,
  ]);

  // buttons
  const runBtn = createButton({ label: 'Chạy mô phỏng', icon: '▶', variant: 'solid' });
  const prevBtn = createButton({ label: 'Quay lại', icon: '◀', variant: 'outline' });
  const nextBtn = createButton({ label: 'Tiếp theo', icon: '▶', variant: 'outline' });
  prevBtn.disabled = true;
  nextBtn.disabled = true;

  const simCard = el(
    'div',
    { className: 'paper-card p-5 flex flex-col items-center gap-0' },
    [
      el('h2', { className: 'font-display font-bold text-base mb-3 text-ink' }, ['⏱ Mô phỏng']),
      simClock.root,
      el('div', { className: 'mt-4 w-full' }, [runBtn]),
      el('div', { className: 'mt-1 text-xs text-ink-soft text-center' }, ['Tốc độ']),
      speedRow,
      el('div', { className: 'mt-3 flex gap-2 w-full' }, [prevBtn, nextBtn]),
    ],
  );

  // clock section
  const clocksRow = el('div', { className: 'flex flex-wrap gap-4 justify-center' }, [
    el('div', { className: 'paper-card p-5 flex flex-col items-center flex-1 min-w-[200px] max-w-[280px]' }, [
      el('h2', { className: 'font-display font-bold text-base mb-3 text-ink' }, ['🕗 Giờ bắt đầu']),
      startClock.root,
    ]),
    simCard,
    el('div', { className: 'paper-card p-5 flex flex-col items-center flex-1 min-w-[200px] max-w-[280px]' }, [
      el('h2', { className: 'font-display font-bold text-base mb-3 text-ink' }, ['🕙 Giờ kết thúc']),
      endClock.root,
    ]),
  ]);

  // ── simulation state ──────────────────────────────────────────────────────
  const sim = {
    steps: [] as ElapsedStep[],
    startMin: 0,
    endMin: 0,
    total: 0,
    completed: 0,
    busy: false,
    autoRunning: false,
    initialized: false,
    confettiFired: false,
    positionFn: (_i: number) => 5 as number,
  };

  function getSpd() {
    return SPEEDS[speedValue as 1 | 2 | 3];
  }

  function updateBtns() {
    const n = sim.steps.length;
    const any = sim.busy || sim.autoRunning;
    runBtn.disabled = sim.autoRunning;
    prevBtn.disabled = any || sim.completed <= 0;
    nextBtn.disabled = any || sim.completed >= n;
  }

  function animateClockTo(targetMin: number, duration: number, reverse = false): Promise<void> {
    return new Promise((resolve) => {
      const from = simClock.totalMinutes;
      let diff = ((targetMin - from + 1440) % 1440);
      if (reverse && diff > 720) diff -= 1440;
      if (diff === 0) { resolve(); return; }
      const t0 = performance.now();
      function frame(ts: number) {
        const p = Math.min((ts - t0) / duration, 1);
        const ep = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        simClock.totalMinutes = ((from + diff * ep) % 1440 + 1440) % 1440;
        simClock.draw();
        if (p < 1) requestAnimationFrame(frame);
        else {
          simClock.totalMinutes = ((targetMin % 1440) + 1440) % 1440;
          simClock.draw();
          resolve();
        }
      }
      requestAnimationFrame(frame);
    });
  }

  async function applyStep(target: number, reverse = false) {
    sim.busy = true;
    updateBtns();
    const { steps, startMin, total } = sim;
    const n = steps.length;
    const spd = getSpd();
    const dur = reverse ? Math.min(spd.clockMs, 500) : spd.clockMs;

    const clockTarget = target === 0 ? startMin : steps[target - 1].toMinutes;
    await animateClockTo(clockTarget, dur, reverse);

    timeline.applyProgress(target, steps, dur);
    calc.revealLines(target);

    if (target === n) {
      calc.showFinal(total);
      await sleep(150);
      showResult();
      if (!sim.confettiFired) {
        cancelConfetti = launchConfetti(confettiCanvas);
        sim.confettiFired = true;
      }
      bubble.setMessage('🎉 Làm tốt lắm! Chúng ta đã đếm từng bước theo phương pháp Singapore Math!');
    } else {
      calc.hideFinal();
      resultBox.style.opacity = '0';
      resultBox.style.transform = 'translateY(20px)';
      if (target === 0) bubble.setMessage('💡 Hãy đếm thời gian từng bước nhé!');
      else bubble.setMessage('💡 ' + teachingMsg(target - 1, n, steps[target - 1]));
    }

    sim.completed = target;
    sim.busy = false;
    updateBtns();
  }

  function showResult() {
    const { hours, minutes } = splitHoursAndMinutes(sim.total);
    resultSummary.replaceChildren(
      el('div', { className: 'text-center' }, [
        el('div', { className: 'text-xs text-ink-soft mb-1' }, ['Giờ bắt đầu']),
        el('div', { className: 'text-2xl font-bold font-display text-ink' }, [formatClock12(sim.startMin)]),
      ]),
      el('div', { className: 'text-3xl text-ink-soft' }, ['→']),
      el('div', { className: 'text-center' }, [
        el('div', { className: 'text-xs text-ink-soft mb-1' }, ['Giờ kết thúc']),
        el('div', { className: 'text-2xl font-bold font-display text-ink' }, [formatClock12(sim.endMin)]),
      ]),
      el('div', { className: 'text-3xl text-ink-soft' }, ['=']),
      el('div', { className: 'text-center' }, [
        el('div', { className: 'text-xs text-ink-soft mb-1' }, ['Thời gian trôi qua']),
        el('div', { className: 'text-2xl font-bold font-display text-meadow' }, [
          [hours > 0 ? `${hours}h` : '', minutes > 0 ? `${minutes}m` : ''].filter(Boolean).join(' '),
        ]),
      ]),
    );
    void resultBox.offsetWidth;
    resultBox.style.opacity = '1';
    resultBox.style.transform = 'translateY(0)';
  }

  function initSim() {
    sim.startMin = startClock.totalMinutes;
    sim.endMin = endClock.totalMinutes;
    const breakdown = computeElapsedSteps(sim.startMin, sim.endMin);
    sim.steps = breakdown.steps;
    sim.total = breakdown.totalMinutes;
    sim.completed = 0;
    sim.initialized = true;
    sim.confettiFired = false;

    calc.build(sim.steps);
    calc.hideFinal();
    resultBox.style.opacity = '0';
    resultBox.style.transform = 'translateY(20px)';

    if (sim.steps.length > 0) {
      sim.positionFn = timeline.build(sim.steps);
    }
    simClock.totalMinutes = sim.startMin;
    simClock.draw();
    bubble.setMessage('💡 Hãy đếm thời gian từng bước nhé!');
    updateBtns();
  }

  async function runSimulation() {
    if (sim.autoRunning) return;
    initSim();
    if (!sim.steps.length) {
      bubble.setMessage('Giờ bắt đầu và kết thúc giống nhau!');
      return;
    }
    sim.autoRunning = true;
    updateBtns();
    await sleep(600);
    const spd = getSpd();
    for (let i = sim.completed + 1; i <= sim.steps.length; i++) {
      await applyStep(i, false);
      if (i < sim.steps.length) await sleep(spd.teachMs);
    }
    sim.autoRunning = false;
    updateBtns();
  }

  async function nextStep() {
    if (sim.busy || sim.autoRunning) return;
    if (!sim.initialized) {
      initSim();
      if (!sim.steps.length) { bubble.setMessage('Giờ bắt đầu và kết thúc giống nhau!'); return; }
    }
    if (sim.completed >= sim.steps.length) return;
    await applyStep(sim.completed + 1, false);
  }

  async function prevStep() {
    if (sim.busy || sim.autoRunning || sim.completed <= 0) return;
    await applyStep(sim.completed - 1, true);
  }

  runBtn.addEventListener('click', runSimulation);
  nextBtn.addEventListener('click', nextStep);
  prevBtn.addEventListener('click', prevStep);

  // init so Next is immediately usable
  initSim();

  // assemble layout
  const page = el('div', { className: 'mx-auto max-w-5xl space-y-5 px-4 py-6' }, [
    el('h1', { className: 'text-center font-display text-2xl sm:text-3xl font-bold text-ink' }, [
      '⏰ Singapore Math – Thời gian trôi qua',
    ]),
    clocksRow,
    bubble.root,
    timelinePanel,
    calcPanel,
    resultBox,
  ]);

  root.appendChild(page);

  return combineCleanup(
    startClock.cleanup,
    endClock.cleanup,
    simClock.cleanup,
    () => {
      cancelConfetti();
      confettiCanvas.remove();
      page.remove();
    },
  );
}

// ── export ─────────────────────────────────────────────────────────────────

const category: MathCategory = {
  id: 'oclock',
  title: 'Thời gian trôi qua',
  description: 'Học tính khoảng cách thời gian theo phương pháp nhảy chuẩn của Singapore Math.',
  icon: '⏰',
  level: 'Lớp 3',
  accent: '#4f6df5',
  order: 20,
  mount,
};

export default category;
