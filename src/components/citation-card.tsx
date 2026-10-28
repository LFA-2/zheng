"use client";

import { useEffect, useState } from "react";
import { cn } from "cn";
import { resolveTarget } from "@/lib/citation";
import { loadLawBook } from "@/lib/laws";
import type { Citation } from "@/lib/types";
import { ArrowUpRight, X } from "lucide-react";

type Freshness = { kind: "current" } | { kind: "changed"; next: Citation } | { kind: "missing" };

function useFreshness(citation: Citation): Freshness {
  const [state, setState] = useState<Freshness>({ kind: "current" });
  useEffect(() => {
    let alive = true;
    loadLawBook(citation.bookKey)
      .then((book) => {
        if (!alive) return;
        const resolved = resolveTarget(book, citation);
        if (typeof resolved === "string") setState({ kind: "missing" });
        else if (resolved.text !== citation.text || resolved.fullText !== citation.fullText) {
          setState({ kind: "changed", next: { ...citation, ...resolved } });
        } else setState({ kind: "current" });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [citation]);
  return state;
}

export function CitationCard({
  citation,
  onRemove,
  onUpdate,
  className,
}: {
  citation: Citation;
  onRemove?: () => void;
  onUpdate?: (next: Citation) => void;
  className?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const freshness = useFreshness(citation);
  const partial = citation.fullText !== citation.text;

  return (
    <div className={cn("rounded-lg border border-border bg-white px-4 py-3", className)}>
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-medium leading-snug">{citation.label}</p>
          {citation.path && <p className="mt-0.5 text-xs text-muted-foreground">{citation.path}</p>}
        </div>
        <a
          href={citation.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="-mr-1 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="開啟原始條文"
        >
          <ArrowUpRight className="size-4" />
        </a>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="-mr-2 rounded-md p-1 text-muted-foreground transition-colors hover:text-destructive"
            aria-label={`移除 ${citation.label}`}
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      <p className="mt-2 whitespace-pre-wrap text-[0.94rem] leading-7 text-foreground/90">
        {expanded ? citation.fullText : citation.text}
      </p>

      {partial && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          {expanded ? "只看引用部分" : "看全條"}
        </button>
      )}

      {freshness.kind === "changed" && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <span className="flex-1">這條在現行法規中已修正，上面是你當初存下的版本。</span>
          {onUpdate && (
            <button
              type="button"
              onClick={() => onUpdate(freshness.next)}
              className="font-medium underline underline-offset-4"
            >
              更新為現行條文
            </button>
          )}
        </div>
      )}
      {freshness.kind === "missing" && (
        <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
          現行法規中找不到這一條（可能已刪除或改號），上面是你當初存下的版本。
        </p>
      )}
    </div>
  );
}
