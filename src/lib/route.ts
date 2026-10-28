"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { BookKey } from "@/lib/types";

export type Route =
  | { name: "home" }
  | { name: "book"; book: BookKey }
  | { name: "issue"; book: BookKey; id: string }
  | { name: "edit"; book: BookKey; id?: string };

const BOOK_KEYS: BookKey[] = ["tw-constitution", "civil", "criminal", "us-constitution"];

function parse(hash: string): Route {
  const [, , book, kind, id, edit] = hash.split("/");
  if (!BOOK_KEYS.includes(book as BookKey)) return { name: "home" };
  const key = book as BookKey;
  if (kind === "new") return { name: "edit", book: key };
  if (kind === "issue" && id) {
    return edit === "edit" ? { name: "edit", book: key, id } : { name: "issue", book: key, id };
  }
  return { name: "book", book: key };
}

export function href(route: Route): string {
  switch (route.name) {
    case "home":
      return "#/";
    case "book":
      return `#/law/${route.book}`;
    case "issue":
      return `#/law/${route.book}/issue/${route.id}`;
    case "edit":
      return route.id ? `#/law/${route.book}/issue/${route.id}/edit` : `#/law/${route.book}/new`;
  }
}

/** Hash routing keeps iOS swipe-back and reload working on a static host. */
export function go(route: Route, { replace = false } = {}) {
  if (replace) window.location.replace(href(route));
  else window.location.hash = href(route);
  window.scrollTo(0, 0);
}

function subscribe(listener: () => void) {
  window.addEventListener("hashchange", listener);
  return () => window.removeEventListener("hashchange", listener);
}

export function useRoute(): Route {
  const hash = useSyncExternalStore(
    subscribe,
    () => window.location.hash,
    () => "",
  );
  return useMemo(() => parse(hash), [hash]);
}
