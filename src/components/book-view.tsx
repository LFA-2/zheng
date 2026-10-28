"use client";

import { useMemo, useState } from "react";
import { BackLink } from "@/components/back-link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { poolEntry } from "@/lib/laws";
import { go, href } from "@/lib/route";
import type { BookKey, Issue } from "@/lib/types";
import { useZheng } from "@/store/zheng-store";
import { Plus, Search } from "lucide-react";

function matches(issue: Issue, q: string) {
  const haystack = [
    issue.title,
    issue.content,
    issue.opinion,
    ...issue.citations.map((c) => c.label),
    ...issue.doctrines.flatMap((d) => [d.name, d.content]),
  ]
    .join("\n")
    .toLowerCase();
  return q
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

export function BookView({ book }: { book: BookKey }) {
  const { issues, removeBook } = useZheng();
  const [query, setQuery] = useState("");
  const entry = poolEntry(book);

  const all = useMemo(
    () =>
      issues
        .filter((i) => i.bookKey === book)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [issues, book],
  );
  const shown = query.trim() ? all.filter((i) => matches(i, query)) : all;

  return (
    <>
      <BackLink to={{ name: "home" }} label="全部法律" />

      <header className="mt-4 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-3xl leading-tight">{entry.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{entry.subtitle}</p>
        </div>
        <Button onClick={() => go({ name: "edit", book })}>
          <Plus className="size-4" />
          新增爭點
        </Button>
      </header>

      {all.length > 0 && (
        <div className="relative mt-8">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜尋爭點、條文、學說"
            className="h-10 bg-white pl-9"
            type="search"
          />
        </div>
      )}

      {all.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-border bg-white/60 px-6 py-14 text-center">
          <p className="font-display text-xl">還沒有爭點</p>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
            新增第一個爭點，輸入「{entry.example}」就能直接帶入條文。
          </p>
        </div>
      ) : shown.length === 0 ? (
        <p className="mt-8 text-center text-sm text-muted-foreground">沒有符合「{query}」的爭點</p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {shown.map((issue) => (
            <li key={issue.id}>
              <IssueRow issue={issue} />
            </li>
          ))}
        </ul>
      )}

      <footer className="mt-16 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
        <span>
          條文來源：
          {book === "us-constitution" ? "U.S. National Archives" : "全國法規資料庫（每週自動更新）"}
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-destructive"
          onClick={() => {
            const warn = all.length > 0 ? `\n裡面的 ${all.length} 個爭點也會一起刪除。` : "";
            if (confirm(`從我的法律移除「${entry.name}」？${warn}`)) {
              removeBook(book);
              go({ name: "home" }, { replace: true });
            }
          }}
        >
          移除這部法律
        </Button>
      </footer>
    </>
  );
}

function IssueRow({ issue }: { issue: Issue }) {
  const labels = issue.citations.map((c) => c.label);
  return (
    <a
      href={href({ name: "issue", book: issue.bookKey, id: issue.id })}
      className="block rounded-xl border border-border bg-white px-5 py-4 transition-colors hover:border-foreground/20 active:bg-muted/40"
    >
      <p className="font-medium leading-snug">{issue.title}</p>
      {issue.content && (
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{issue.content}</p>
      )}
      {(labels.length > 0 || issue.doctrines.length > 0) && (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          {labels.slice(0, 3).map((label) => (
            <span key={label} className="rounded-md bg-muted px-2 py-0.5">
              {label}
            </span>
          ))}
          {labels.length > 3 && <span>+{labels.length - 3}</span>}
          {issue.doctrines.length > 0 && (
            <span className="ml-auto">{issue.doctrines.length} 說</span>
          )}
        </div>
      )}
    </a>
  );
}
