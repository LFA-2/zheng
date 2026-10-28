export type BookKey = "tw-constitution" | "civil" | "criminal" | "us-constitution";

export type Citation = {
  id: string;
  /** What the user typed, kept for re-resolving against newer law data. */
  query: string;
  bookKey: BookKey;
  code: string;
  articleNo: string;
  sectionNo?: string;
  paragraph?: number;
  item?: number;
  subitem?: number;
  qualifier?: string;
  label: string;
  path: string;
  text: string;
  fullText: string;
  sourceUrl: string;
};

export type Doctrine = {
  id: string;
  name: string;
  content: string;
};

export type Issue = {
  id: string;
  bookKey: BookKey;
  title: string;
  content: string;
  citations: Citation[];
  doctrines: Doctrine[];
  opinion: string;
  createdAt: string;
  updatedAt: string;
};

export type AppState = {
  books: { key: BookKey; addedAt: string }[];
  issues: Issue[];
};

export const EMPTY_STATE: AppState = { books: [], issues: [] };

export function isAppState(value: unknown): value is AppState {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return Array.isArray(v.books) && Array.isArray(v.issues);
}
