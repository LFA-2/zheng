"use client";

import { useEffect, useState } from "react";
import { cn } from "cn";
import { Input } from "@/components/ui/input";
import type { Resolved } from "@/lib/citation";
import { LAW_POOL, poolEntry } from "@/lib/laws";
import { normalizeText, searchLaws, type SearchResult } from "@/lib/search";
import type { BookKey } from "@/lib/types";
import { ArrowUpRight, Loader2, Search, X } from "lucide-react";

const PAGE = 20;

type Scope = BookKey | "all";

export function LawSearch() {
  const [query, setQuery] = useState("");
  const [scope, setScope] = useState<Scope>("all");
  const [result, setResult] = useState<{ key: string; value: SearchResult | { error: string } } | null>(null);
  const [limit, setLimit] = useState(PAGE);

  const key = `${scope}|${query.trim()}`;
  const busy = query.trim() !== "" && result?.key !== key;

  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    let alive = true;
    const timer = setTimeout(() => {
      searchLaws(q, scope)
        .then((value) => alive && setResult({ key: `${scope}|${q}`, value }))
        .catch((e: Error) => alive && setResult({ key: `${scope}|${q}`, value: { error: e.message } }));
      setLimit(PAGE);
    }, 200);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [query, scope]);

  const shown = query.trim() && result ? result.value : null;

  return (
    <section className="mt-10">
      <h2 className="text-xs font-medium tracking-[0.2em] text-muted-foreground">查詢法條</h2>

      <div className="relative mt-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="條號或關鍵字，例：民法184條、侵權行為"
          aria-label="查詢法條"
          className="h-11 bg-white pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden"
          type="search"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        {busy ? (
          <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : (
          query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
              aria-label="清除"
            >
              <X className="size-4" />
            </button>
          )
        )}
      </div>

      <div className="-mx-5 mt-3 flex gap-1.5 overflow-x-auto px-5 pb-1 [scrollbar-width:none]">
        {(["all", ...LAW_POOL.map((l) => l.key)] as Scope[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setScope(s)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1 text-xs transition-colors",
              scope === s
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-white text-muted-foreground hover:text-foreground",
            )}
          >
            {s === "all" ? "全部" : poolEntry(s).name}
          </button>
        ))}
      </div>

      {shown && <Results result={shown} query={query.trim()} scope={scope} limit={limit} onMore={() => setLimit((n) => n + PAGE)} />}
    </section>
  );
}

function Results({
  result,
  query,
  scope,
  limit,
  onMore,
}: {
  result: SearchResult | { error: string };
  query: string;
  scope: Scope;
  limit: number;
  onMore: () => void;
}) {
  if ("error" in result) {
    return <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-destructive">{result.error}</p>;
  }

  if (result.mode === "citation") {
    return (
      <div className="mt-4 grid gap-2">
        {result.errors.map((e) => (
          <p key={e} className="rounded-md bg-red-50 px-3 py-2 text-sm text-destructive">
            {e}
          </p>
        ))}
        {result.hits.map((hit) => (
          <ResultCard key={hit.label} hit={hit} terms={[]} />
        ))}
      </div>
    );
  }

  const where = result.scope === "all" ? "法律池" : poolEntry(result.scope).name;
  if (result.hits.length === 0) {
    const bareNumber = scope === "all" && /^第?[\d一二三四五六七八九十百千]+條?$/.test(query);
    return (
      <p className="mt-6 text-center text-sm text-muted-foreground">
        {bareNumber
          ? "要查條號，請加上法律名稱（例如「民法184條」），或先在上方選一部法律。"
          : `${where}中沒有含「${query}」的條文`}
      </p>
    );
  }

  return (
    <div className="mt-4">
      <p className="mb-2 text-xs text-muted-foreground">
        {result.terms.length ? `${where}中找到 ${result.hits.length} 條` : `${where}，共 ${result.hits.length} 條`}
      </p>
      <div className="grid gap-2">
        {result.hits.slice(0, limit).map((hit) => (
          <ResultCard key={hit.label} hit={hit} terms={result.terms} />
        ))}
      </div>
      {result.hits.length > limit && (
        <button
          type="button"
          onClick={onMore}
          className="mt-3 w-full rounded-lg border border-border bg-white py-2.5 text-sm text-muted-foreground hover:text-foreground"
        >
          顯示更多（還有 {result.hits.length - limit} 條）
        </button>
      )}
    </div>
  );
}

function ResultCard({ hit, terms }: { hit: Resolved; terms: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const lines = hit.text.split("\n");
  const matching = terms.length
    ? lines.map((line, i) => (terms.some((t) => normalizeText(line).includes(t)) ? i : -1)).filter((i) => i >= 0)
    : [];
  const excerpt = !expanded && matching.length > 0 && matching.length < lines.length;

  return (
    <div className="rounded-lg border border-border bg-white px-4 py-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium leading-snug">
            <Highlight text={hit.label} terms={[]} />
          </p>
          {hit.path && (
            <p className="mt-0.5 text-xs text-muted-foreground">
              <Highlight text={hit.path} terms={terms} />
            </p>
          )}
        </div>
        <a
          href={hit.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="-mr-1 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="開啟原始條文"
        >
          <ArrowUpRight className="size-4" />
        </a>
      </div>
      <div className="mt-2 whitespace-pre-wrap text-[0.94rem] leading-7 text-foreground/90">
        {excerpt
          ? matching.map((i, n) => (
              <p key={i}>
                {n === 0 && i > 0 && <span className="text-muted-foreground">⋯ </span>}
                {n > 0 && matching[n - 1] !== i - 1 && <span className="text-muted-foreground">⋯ </span>}
                <Highlight text={lines[i]} terms={terms} />
              </p>
            ))
          : <Highlight text={hit.text} terms={terms} />}
      </div>
      {(excerpt || expanded) && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          {expanded ? "只看相關段落" : "看全條"}
        </button>
      )}
    </div>
  );
}

function Highlight({ text, terms }: { text: string; terms: string[] }) {
  if (!terms.length) return <>{text}</>;
  const norm = normalizeText(text);
  const marks = new Array<boolean>(text.length).fill(false);
  for (const t of terms) {
    for (let i = norm.indexOf(t); i >= 0; i = norm.indexOf(t, i + 1)) {
      marks.fill(true, i, i + t.length);
    }
  }
  const parts: { text: string; mark: boolean }[] = [];
  for (let i = 0; i < text.length; i++) {
    const last = parts[parts.length - 1];
    if (last && last.mark === marks[i]) last.text += text[i];
    else parts.push({ text: text[i], mark: marks[i] });
  }
  return (
    <>
      {parts.map((p, i) =>
        p.mark ? (
          <mark key={i} className="rounded-sm bg-amber-100 px-px text-inherit">
            {p.text}
          </mark>
        ) : (
          p.text
        ),
      )}
    </>
  );
}
