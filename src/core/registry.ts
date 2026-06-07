import type { MathCategory } from './category';
import { wrapHtmlCategory } from './html-category';

/**
 * Auto-discovers every `categories/<id>/index.ts` at build time — drop a new
 * folder in `src/categories/` exporting a `MathCategory` and it appears here
 * with zero edits to this file.
 */
const tsModules = import.meta.glob<{ default: MathCategory }>('../categories/*/index.ts', {
  eager: true,
});

/**
 * Also discovers every `categories/<id>/index.html` — a self-contained,
 * standalone illustration page (its own `<style>`/`<script>`, no TypeScript
 * required) gets wrapped into a `MathCategory` automatically. See
 * `wrapHtmlCategory` for the `<title>`/`<meta>` metadata convention.
 */
const htmlModules = import.meta.glob<string>('../categories/*/index.html', {
  eager: true,
  query: '?raw',
  import: 'default',
});

const HTML_PATH = /\/categories\/([^/]+)\/index\.html$/;

function idFromHtmlPath(path: string): string {
  const match = HTML_PATH.exec(path);
  if (!match) throw new Error(`registry: cannot derive a category id from "${path}"`);
  return match[1];
}

export const categories: MathCategory[] = [
  ...Object.values(tsModules).map((m) => m.default),
  ...Object.entries(htmlModules).map(([path, html]) => wrapHtmlCategory(idFromHtmlPath(path), html)),
].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));

export function getCategory(id: string): MathCategory | undefined {
  return categories.find((c) => c.id === id);
}
