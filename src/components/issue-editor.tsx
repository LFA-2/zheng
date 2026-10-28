"use client";

import { useState, type ReactNode } from "react";
import { CitationCard } from "@/components/citation-card";
import { CitationInput } from "@/components/citation-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { poolEntry } from "@/lib/laws";
import { go } from "@/lib/route";
import type { BookKey, Doctrine, Issue } from "@/lib/types";
import { uid } from "@/lib/utils";
import { useZheng, type IssueDraft } from "@/store/zheng-store";
import { Plus, X } from "lucide-react";

const CN = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九"];
function cnNumber(n: number) {
  if (n < 10) return CN[n];
  const tens = Math.floor(n / 10);
  return `${tens > 1 ? CN[tens] : ""}十${CN[n % 10]}`;
}
const defaultName = (index: number) => `學說${cnNumber(index + 1)}`;
const newDoctrine = (index: number): Doctrine => ({ id: uid("doc"), name: defaultName(index), content: "" });

function initialDraft(book: BookKey, issue?: Issue): IssueDraft {
  if (issue) {
    const { bookKey, title, content, citations, doctrines, opinion } = issue;
    return { bookKey, title, content, citations, doctrines, opinion };
  }
  return {
    bookKey: book,
    title: "",
    content: "",
    citations: [],
    doctrines: [newDoctrine(0), newDoctrine(1)],
    opinion: "",
  };
}

export function IssueEditor({ book, issue }: { book: BookKey; issue?: Issue }) {
  const { saveIssue } = useZheng();
  const [initial] = useState(() => initialDraft(book, issue));
  const [draft, setDraft] = useState(initial);
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const canSave = draft.title.trim().length > 0;

  const set = <K extends keyof IssueDraft>(key: K, value: IssueDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  function updateDoctrine(id: string, patch: Partial<Doctrine>) {
    set(
      "doctrines",
      draft.doctrines.map((d) => (d.id === id ? { ...d, ...patch } : d)),
    );
  }

  function save() {
    if (!canSave) return;
    const doctrines = draft.doctrines
      .map((d, i) => ({ ...d, name: d.name.trim() || defaultName(i), content: d.content.trim() }))
      .filter((d, i) => d.content || d.name !== defaultName(i));
    const id = saveIssue(
      { ...draft, title: draft.title.trim(), content: draft.content.trim(), opinion: draft.opinion.trim(), doctrines },
      issue?.id,
    );
    go({ name: "issue", book, id }, { replace: true });
  }

  function cancel() {
    if (dirty && !confirm("放棄尚未儲存的內容？")) return;
    if (issue) go({ name: "issue", book, id: issue.id }, { replace: true });
    else go({ name: "book", book }, { replace: true });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
    >
      <div className="sticky top-0 z-20 -mx-5 flex items-center justify-between gap-2 border-b border-border bg-background/90 px-5 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
        <Button type="button" variant="ghost" size="sm" onClick={cancel} className="-ml-2 text-muted-foreground">
          取消
        </Button>
        <p className="truncate text-sm font-medium">
          {issue ? "編輯爭點" : "新增爭點"}
          <span className="ml-1.5 font-normal text-muted-foreground">・{poolEntry(book).name}</span>
        </p>
        <Button type="submit" size="sm" disabled={!canSave} className="px-4">
          儲存
        </Button>
      </div>

      <div className="mt-6 grid gap-8">
        <Field label="爭點名稱" htmlFor="title">
          <Input
            id="title"
            value={draft.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="例：侵權行為之權利是否包含純粹經濟上損失"
            className="h-11 bg-white text-base"
            autoFocus={!issue}
          />
        </Field>

        <Field label="爭點內容" htmlFor="content">
          <Textarea
            id="content"
            value={draft.content}
            onChange={(e) => set("content", e.target.value)}
            placeholder="案例事實、問題意識…"
            className="min-h-28 bg-white leading-7"
          />
        </Field>

        <Field label="相關條文">
          <div className="grid gap-2">
            {draft.citations.map((c) => (
              <CitationCard
                key={c.id}
                citation={c}
                onRemove={() => set("citations", draft.citations.filter((x) => x.id !== c.id))}
                onUpdate={(next) => set("citations", draft.citations.map((x) => (x.id === c.id ? next : x)))}
              />
            ))}
            <CitationInput
              book={book}
              existing={draft.citations}
              onAdd={(added) => set("citations", [...draft.citations, ...added])}
            />
          </div>
        </Field>

        <Field label="學說">
          <div className="grid gap-3">
            {draft.doctrines.map((d, i) => (
              <div key={d.id} className="rounded-lg border border-border bg-white p-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={d.name}
                    onChange={(e) => updateDoctrine(d.id, { name: e.target.value })}
                    placeholder={defaultName(i)}
                    aria-label={`第 ${i + 1} 個學說名稱`}
                    className="h-9 border-transparent px-1 font-medium shadow-none focus-visible:border-input"
                  />
                  <button
                    type="button"
                    onClick={() => set("doctrines", draft.doctrines.filter((x) => x.id !== d.id))}
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:text-destructive"
                    aria-label={`移除${d.name || defaultName(i)}`}
                  >
                    <X className="size-4" />
                  </button>
                </div>
                <Textarea
                  value={d.content}
                  onChange={(e) => updateDoctrine(d.id, { content: e.target.value })}
                  placeholder="見解內容、代表學者、理由…"
                  aria-label={`${d.name || defaultName(i)}內容`}
                  className="mt-1 min-h-20 border-transparent px-1 leading-7 shadow-none focus-visible:border-input"
                />
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              className="h-9 justify-self-start"
              onClick={() => set("doctrines", [...draft.doctrines, newDoctrine(draft.doctrines.length)])}
            >
              <Plus className="size-4" />
              新增學說
            </Button>
          </div>
        </Field>

        <Field label="我的觀點" htmlFor="opinion">
          <Textarea
            id="opinion"
            value={draft.opinion}
            onChange={(e) => set("opinion", e.target.value)}
            placeholder="我採哪一說、為什麼…"
            className="min-h-32 border-l-2 border-l-seal bg-white leading-7"
          />
        </Field>

        <Button type="submit" disabled={!canSave} className="h-11 text-base">
          儲存爭點
        </Button>
      </div>
    </form>
  );
}

function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-2 block text-xs font-medium tracking-[0.2em] text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}
