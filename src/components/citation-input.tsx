"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { lookupCitations, type Resolved } from "@/lib/citation";
import { poolEntry } from "@/lib/laws";
import type { BookKey, Citation } from "@/lib/types";
import { uid } from "@/lib/utils";
import { Loader2, Plus } from "lucide-react";

type Preview = { citations: (Resolved & { query: string })[]; errors: string[] };

export function CitationInput({
  book,
  existing,
  onAdd,
}: {
  book: BookKey;
  existing: Citation[];
  onAdd: (citations: Citation[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);

  async function lookup() {
    if (!query.trim()) return;
    setBusy(true);
    try {
      const result = await lookupCitations(query, book);
      setPreview({
        citations: result.citations.map((c, i) => ({ ...c, query: result.queries[i] })),
        errors: result.errors,
      });
    } catch (error) {
      setPreview({ citations: [], errors: [(error as Error).message || "條文資料載入失敗"] });
    } finally {
      setBusy(false);
    }
  }

  const fresh = preview?.citations.filter((c) => !existing.some((e) => e.label === c.label)) ?? [];

  function addAll() {
    onAdd(fresh.map((c) => ({ ...c, id: uid("cite") })));
    setPreview(null);
    setQuery("");
  }

  return (
    <div className="rounded-lg border border-border bg-muted/40 p-3">
      <div className="flex gap-2">
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPreview(null);
          }}
          placeholder={`例：${poolEntry(book).example}`}
          aria-label="輸入條文關鍵字"
          className="h-10 flex-1 bg-white"
          enterKeyHint="search"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          onKeyDown={(e) => {
            if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
            e.preventDefault();
            if (fresh.length > 0 && preview?.citations.length) addAll();
            else lookup();
          }}
        />
        <Button type="button" variant="outline" className="h-10 px-4" disabled={busy || !query.trim()} onClick={lookup}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : "查條文"}
        </Button>
      </div>
      <p className="mt-2 px-0.5 text-xs leading-relaxed text-muted-foreground">
        打法名與條號即可，可一次輸入多條（用、或，分隔），也可寫到項、款、目、前段／但書。
      </p>

      {preview && (
        <div className="mt-3 grid gap-2">
          {preview.errors.map((error) => (
            <p key={error} className="rounded-md bg-red-50 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ))}
          {preview.citations.map((c) => {
            const dup = existing.some((e) => e.label === c.label);
            return (
              <div key={c.label} className="rounded-md border border-border bg-white px-3 py-2.5">
                <p className="text-sm font-medium">
                  {c.label}
                  {dup && <span className="ml-2 text-xs font-normal text-muted-foreground">已在清單中</span>}
                </p>
                {c.path && <p className="text-xs text-muted-foreground">{c.path}</p>}
                <p className="mt-1.5 line-clamp-6 whitespace-pre-wrap text-sm leading-6 text-foreground/80">
                  {c.text}
                </p>
              </div>
            );
          })}
          {fresh.length > 0 && (
            <Button type="button" onClick={addAll} className="h-9 justify-self-start">
              <Plus className="size-4" />
              加入{fresh.length > 1 ? ` ${fresh.length} 條` : ""}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
