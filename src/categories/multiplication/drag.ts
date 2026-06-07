export interface DraggableOptions {
  onDrop: () => void;
  onDragOver?: (isOver: boolean) => void;
}

export function makeDraggable(
  element: HTMLElement,
  dropZone: HTMLElement,
  opts: DraggableOptions,
): () => void {
  let pointerId: number | null = null;
  let clone: HTMLElement | null = null;
  let offsetX = 0;
  let offsetY = 0;

  function isOverZone(x: number, y: number): boolean {
    const r = dropZone.getBoundingClientRect();
    return x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  }

  function removeClone() {
    if (clone) {
      clone.remove();
      clone = null;
    }
    opts.onDragOver?.(false);
    pointerId = null;
  }

  function onPointerDown(e: PointerEvent) {
    if (pointerId !== null) return;
    e.preventDefault();
    pointerId = e.pointerId;
    element.setPointerCapture(e.pointerId);

    const rect = element.getBoundingClientRect();
    offsetX = e.clientX - rect.left;
    offsetY = e.clientY - rect.top;

    clone = element.cloneNode(true) as HTMLElement;
    clone.style.position = 'fixed';
    clone.style.left = `${rect.left}px`;
    clone.style.top = `${rect.top}px`;
    clone.style.width = `${rect.width}px`;
    clone.style.zIndex = '9999';
    clone.style.pointerEvents = 'none';
    clone.style.opacity = '0.9';
    clone.style.transform = 'scale(1.08) rotate(-2deg)';
    clone.style.boxShadow = '0 8px 24px rgba(0,0,0,0.25)';
    clone.style.transition = 'none';
    document.body.appendChild(clone);

    element.style.opacity = '0.3';
  }

  function onPointerMove(e: PointerEvent) {
    if (e.pointerId !== pointerId || !clone) return;
    clone.style.left = `${e.clientX - offsetX}px`;
    clone.style.top = `${e.clientY - offsetY}px`;
    opts.onDragOver?.(isOverZone(e.clientX, e.clientY));
  }

  function onPointerUp(e: PointerEvent) {
    if (e.pointerId !== pointerId) return;
    const over = isOverZone(e.clientX, e.clientY);
    removeClone();
    if (over) {
      opts.onDrop();
    } else {
      element.style.opacity = '1';
    }
  }

  function onPointerCancel(e: PointerEvent) {
    if (e.pointerId !== pointerId) return;
    removeClone();
    element.style.opacity = '1';
  }

  element.addEventListener('pointerdown', onPointerDown);
  element.addEventListener('pointermove', onPointerMove);
  element.addEventListener('pointerup', onPointerUp);
  element.addEventListener('pointercancel', onPointerCancel);

  return () => {
    element.removeEventListener('pointerdown', onPointerDown);
    element.removeEventListener('pointermove', onPointerMove);
    element.removeEventListener('pointerup', onPointerUp);
    element.removeEventListener('pointercancel', onPointerCancel);
    if (clone) {
      clone.remove();
      clone = null;
    }
    element.style.opacity = '';
    pointerId = null;
  };
}
