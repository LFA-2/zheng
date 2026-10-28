"use client";

import type { ReactNode } from "react";
import { BackLink } from "@/components/back-link";
import { CitationCard } from "@/components/citation-card";
import { Button } from "@/components/ui/button";
import { poolEntry } from "@/lib/laws";
import { go } from "@/lib/route";
import type { Issue } from "@/lib/types";
import { useZheng } from "@/store/zheng-store";
import { Pencil, Trash2 } from "lucide-react";

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()}`;
}

export function IssueView({ issue }: { issue: Issue }) {
  const { saveIssue, removeIssue } = useZheng();
  const book = issue.bookKey;
  const { id, createdAt, updatedAt, ...draft } = issue;

  return (
    <>
      <div className="flex items-center justify-between gap-2">
        <BackLink to={{ name: "book", book }} label={poolEntry(book).name} />
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => go({ name: "edit", book, id })}>
            <Pencil className="size-3.5" />
            編輯
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground hover:text-destructive"
            aria-label="刪除爭點"
            onClick={() => {
              if (confirm(`刪除爭點「${issue.title}」？`)) {
                removeIssue(id);
                go({ name: "book", book }, { replace: true });
              }
            }}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <article className="mt-6">
        <h1 className="font-display text-[1.7rem] leading-snug">{issue.title}</h1>
        <p className="mt-2 text-xs text-muted-foreground">
          {updatedAt !== createdAt ? `更新於 ${formatDate(updatedAt)}` : `建立於 ${formatDate(createdAt)}`}
        </p>

        {issue.content && (
          <Section title="爭點內容">
            <p className="whitespace-pre-wrap leading-7">{issue.content}</p>
          </Section>
        )}

        {issue.citations.length > 0 && (
          <Section title="相關條文">
            <div className="grid gap-2">
              {issue.citations.map((c) => (
                <CitationCard
                  key={c.id}
                  citation={c}
                  onUpdate={(next) =>
                    saveIssue(
                      { ...draft, citations: issue.citations.map((x) => (x.id === c.id ? next : x)) },
                      id,
                    )
                  }
                />
              ))}
            </div>
          </Section>
        )}

        {issue.doctrines.length > 0 && (
          <Section title="學說">
            <div className="grid gap-5">
              {issue.doctrines.map((d) => (
                <div key={d.id} className="border-l-2 border-border pl-4">
                  <p className="font-medium">{d.name}</p>
                  {d.content && <p className="mt-1 whitespace-pre-wrap leading-7 text-foreground/90">{d.content}</p>}
                </div>
              ))}
            </div>
          </Section>
        )}

        {issue.opinion && (
          <Section title="我的觀點">
            <p className="whitespace-pre-wrap border-l-2 border-seal pl-4 leading-7">{issue.opinion}</p>
          </Section>
        )}
      </article>
    </>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-9">
      <h2 className="mb-3 text-xs font-medium tracking-[0.2em] text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}
