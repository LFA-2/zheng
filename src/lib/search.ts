import { citationBook, leadingLawName, lookupCitations, resolveTarget, type Resolved } from "@/lib/citation";
import { LAW_POOL, loadLawBook, type LawBook } from "@/lib/laws";
import type { BookKey } from "@/lib/types";

/** Length-preserving, so match offsets can be mapped back onto the original text. */
export function normalizeText(s: string) {
  return s
    .replace(/[\uFF01-\uFF5E]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/台/g, "臺")
    .toLowerCase();
}

type Entry = { resolved: Resolved; haystack: string };

const indexes = new Map<BookKey, Promise<Entry[]>>();

function buildIndex(book: LawBook): Entry[] {
  const entries: Entry[] = [];
  for (const code of book.codes) {
    for (const article of code.articles) {
      const targets = article.children?.length
        ? article.children.map((c) => ({ sectionNo: c.no }))
        : [{ sectionNo: undefined }];
      for (const { sectionNo } of targets) {
        const resolved = resolveTarget(book, { code: code.code, articleNo: article.no, sectionNo });
        if (typeof resolved === "string") continue;
        entries.push({ resolved, haystack: normalizeText(`${resolved.path}\n${resolved.text}`) });
      }
    }
  }
  return entries;
}

function loadIndex(key: BookKey) {
  let pending = indexes.get(key);
  if (!pending) {
    pending = loadLawBook(key).then(buildIndex);
    pending.catch(() => indexes.delete(key));
    indexes.set(key, pending);
  }
  return pending;
}

export type SearchResult =
  | { mode: "citation"; hits: Resolved[]; errors: string[] }
  | { mode: "keyword"; hits: Resolved[]; terms: string[]; scope: BookKey | "all" };

/**
 * Article numbers (「民法184條」「Amend. XIV」) are looked up directly; anything else is a
 * keyword search over article text and chapter headings, within `scope`.
 */
export async function searchLaws(query: string, scope: BookKey | "all"): Promise<SearchResult> {
  const fallback = scope === "all" ? undefined : scope;
  const cited = citationBook(query, fallback);
  if (cited) {
    const { citations, errors } = await lookupCitations(query, cited);
    return { mode: "citation", hits: citations, errors };
  }

  let text = query;
  let effectiveScope = scope;
  const named = leadingLawName(query);
  if (named) {
    effectiveScope = named.book;
    text = named.rest;
  }

  const terms = text.split(/\s+/).filter(Boolean).map(normalizeText);
  const keys = effectiveScope === "all" ? LAW_POOL.map((l) => l.key) : [effectiveScope];
  const books = await Promise.all(keys.map(loadIndex));
  const hits = books
    .flat()
    .filter((e) => terms.every((t) => e.haystack.includes(t)))
    .map((e) => e.resolved);
  return { mode: "keyword", hits, terms, scope: effectiveScope };
}
