"use client";

import { BookView } from "@/components/book-view";
import { HomeView } from "@/components/home-view";
import { IssueEditor } from "@/components/issue-editor";
import { IssueView } from "@/components/issue-view";
import { UpdateBanner } from "@/components/pwa";
import { useRoute } from "@/lib/route";
import { ZhengProvider, useZheng } from "@/store/zheng-store";

export function App() {
  return (
    <ZhengProvider>
      <div className="min-h-full bg-background">
        <UpdateBanner />
        <main className="mx-auto max-w-2xl px-5 pb-[max(3rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] sm:pt-12">
          <Screen />
        </main>
      </div>
    </ZhengProvider>
  );
}

function Screen() {
  const route = useRoute();
  const { hydrated, books, issues } = useZheng();
  if (!hydrated) return null;

  const hasBook = route.name !== "home" && books.some((b) => b.key === route.book);
  const issue =
    (route.name === "issue" || route.name === "edit") && route.id
      ? issues.find((i) => i.id === route.id && i.bookKey === route.book)
      : undefined;

  let screen = <HomeView />;
  if (hasBook && route.name === "book") screen = <BookView book={route.book} />;
  else if (hasBook && route.name === "issue" && issue) screen = <IssueView issue={issue} />;
  else if (hasBook && route.name === "issue") screen = <BookView book={route.book} />;
  else if (hasBook && route.name === "edit" && (!route.id || issue)) {
    screen = <IssueEditor key={route.id ?? "new"} book={route.book} issue={issue} />;
  }

  return (
    <div key={route.name === "home" ? "home" : `${route.name}-${route.book}`} className="animate-fade-up">
      {screen}
    </div>
  );
}
