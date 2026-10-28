"use client";

import { useState } from "react";
import { DataTools } from "@/components/data-tools";
import { LawSearch } from "@/components/law-search";
import { InstallHint } from "@/components/pwa";
import { Seal } from "@/components/seal";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { LAW_POOL, poolEntry } from "@/lib/laws";
import { go, href } from "@/lib/route";
import { useZheng } from "@/store/zheng-store";
import { Check, ChevronRight, Plus } from "lucide-react";

export function HomeView() {
  const { books, issues } = useZheng();
  const [poolOpen, setPoolOpen] = useState(false);

  return (
    <>
      <header className="flex items-center gap-3">
        <Seal />
        <div>
          <h1 className="font-display text-2xl leading-tight">爭</h1>
          <p className="text-sm text-muted-foreground">法律爭點整理</p>
        </div>
      </header>
      <InstallHint />

      <LawSearch />

      <section className="mt-10">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-xs font-medium tracking-[0.2em] text-muted-foreground">我的法律</h2>
          {books.length > 0 && books.length < LAW_POOL.length && (
            <Button variant="outline" size="sm" onClick={() => setPoolOpen(true)}>
              <Plus className="size-3.5" />
              新增法律
            </Button>
          )}
        </div>

        {books.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-border bg-white/60 px-6 py-14 text-center">
            <p className="font-display text-xl">從法律池開始</p>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
              選一部法律，就可以在裡面整理爭點、條文、學說與自己的觀點。
            </p>
            <Button className="mt-6" onClick={() => setPoolOpen(true)}>
              <Plus className="size-4" />
              新增法律
            </Button>
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-white">
            {books.map(({ key }) => {
              const entry = poolEntry(key);
              const count = issues.filter((i) => i.bookKey === key).length;
              return (
                <li key={key}>
                  <a
                    href={href({ name: "book", book: key })}
                    className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-muted/50 active:bg-muted"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-lg">{entry.name}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{entry.subtitle}</p>
                    </div>
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {count > 0 ? `${count} 個爭點` : "尚無爭點"}
                    </span>
                    <ChevronRight className="size-4 text-muted-foreground/60" />
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <footer className="mt-16 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
        <span>資料只存在這台裝置上，記得定期匯出備份。</span>
        <DataTools />
      </footer>

      <LawPoolDialog open={poolOpen} onOpenChange={setPoolOpen} />
    </>
  );
}

function LawPoolDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { books, addBook } = useZheng();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">法律池</DialogTitle>
          <DialogDescription>選擇要整理爭點的法律。</DialogDescription>
        </DialogHeader>
        <ul className="-mx-1 grid gap-1">
          {LAW_POOL.map((law) => {
            const added = books.some((b) => b.key === law.key);
            return (
              <li key={law.key}>
                <button
                  type="button"
                  disabled={added}
                  onClick={() => {
                    addBook(law.key);
                    onOpenChange(false);
                    go({ name: "book", book: law.key });
                  }}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors hover:bg-muted disabled:cursor-default disabled:hover:bg-transparent"
                >
                  <div className="min-w-0 flex-1">
                    <p className={`font-display text-base ${added ? "text-muted-foreground" : ""}`}>{law.name}</p>
                    <p className="text-xs text-muted-foreground">{law.subtitle}</p>
                  </div>
                  {added ? (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Check className="size-3.5" />
                      已加入
                    </span>
                  ) : (
                    <Plus className="size-4 text-muted-foreground" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
