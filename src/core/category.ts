export interface MathCategoryMeta {
  /** URL-safe unique id, also the route segment: #/category/<id> */
  id: string;
  /** Display title shown on the card and the category page header */
  title: string;
  /** One-line description for the home grid */
  description: string;
  /** Emoji shown on the card badge (keeps things zero-asset) */
  icon: string;
  /** Grade band / level label, e.g. "Lớp 1", "Lớp 3" */
  level: string;
  /** Accent color (CSS color) used for theming the card + page */
  accent: string;
  /** Optional ordering hint for the home grid (lower = earlier) */
  order?: number;
}

export interface MathCategory extends MathCategoryMeta {
  /**
   * Render the illustration into `root`.
   * Returns a cleanup function that cancels timers/RAF/listeners; the
   * router calls it when the user navigates away from this category.
   */
  mount(root: HTMLElement): () => void;
}
