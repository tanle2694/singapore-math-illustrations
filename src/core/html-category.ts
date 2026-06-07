import { el } from './dom';
import type { MathCategory } from './category';

const FALLBACK_ICON = '🧩';
const FALLBACK_LEVEL = 'Tổng hợp';
const FALLBACK_ACCENT = '#6366f1';
const FALLBACK_DESCRIPTION = 'Một minh họa toán học tương tác.';

function metaContent(doc: Document, name: string): string | undefined {
  return doc.querySelector(`meta[name="${name}"]`)?.getAttribute('content')?.trim() || undefined;
}

/**
 * Wraps a self-contained HTML page — its own `<style>`/`<script>`, the same
 * shape as the legacy standalone illustrations — as a `MathCategory`. Drop an
 * `index.html` into `src/categories/<id>/` and it appears with zero other
 * edits; the page's own `<title>`/`<meta>` tags supply the card metadata so
 * the file stays the single source of truth. Recognised tags (all optional,
 * with fallbacks):
 *
 *   <title>…</title>
 *   <meta name="description" content="…">
 *   <meta name="category-icon" content="🧮">
 *   <meta name="category-level" content="Lớp 3">
 *   <meta name="category-accent" content="#f59e0b">
 *   <meta name="category-order" content="30">
 */
export function wrapHtmlCategory(id: string, html: string): MathCategory {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const title = doc.querySelector('title')?.textContent?.trim() || id;
  const order = metaContent(doc, 'category-order');

  return {
    id,
    title,
    description: metaContent(doc, 'description') ?? FALLBACK_DESCRIPTION,
    icon: metaContent(doc, 'category-icon') ?? FALLBACK_ICON,
    level: metaContent(doc, 'category-level') ?? FALLBACK_LEVEL,
    accent: metaContent(doc, 'category-accent') ?? FALLBACK_ACCENT,
    order: order ? Number(order) : undefined,
    mount(root) {
      return mountStandaloneHtml(root, html, title);
    },
  };
}

/**
 * Renders the page inside an isolated `<iframe srcdoc>` — the only way to host
 * a full HTML document (own `<style>`/inline `<script>`) without it colliding
 * with the shell's styles or globals. Height is synced to the iframe's own
 * content so it reads as part of the page rather than a scrolling embed.
 */
function mountStandaloneHtml(root: HTMLElement, html: string, title: string): () => void {
  const frame = el('iframe', {
    className: 'block w-full overflow-hidden rounded-3xl border-2 border-ink/10 bg-white shadow-[var(--shadow-pop)]',
    attrs: { title, loading: 'lazy' },
    style: { height: '70vh' },
  });

  let observer: ResizeObserver | undefined;

  const syncHeight = (): void => {
    const body = frame.contentDocument?.body;
    if (body) frame.style.height = `${body.scrollHeight}px`;
  };

  const handleLoad = (): void => {
    syncHeight();
    const body = frame.contentDocument?.body;
    if (body) {
      observer = new ResizeObserver(syncHeight);
      observer.observe(body);
    }
  };

  frame.addEventListener('load', handleLoad);
  frame.srcdoc = html;
  root.append(frame);

  return () => {
    observer?.disconnect();
    frame.removeEventListener('load', handleLoad);
    frame.remove();
  };
}
