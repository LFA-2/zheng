"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { EMPTY_STATE, isAppState, type AppState, type BookKey, type Issue } from "@/lib/types";
import { uid } from "@/lib/utils";

const STORAGE_KEY = "zheng-v1";

export type IssueDraft = Omit<Issue, "id" | "createdAt" | "updatedAt">;

type ZhengStore = AppState & {
  hydrated: boolean;
  addBook: (key: BookKey) => void;
  removeBook: (key: BookKey) => void;
  saveIssue: (draft: IssueDraft, id?: string) => string;
  removeIssue: (id: string) => void;
  replaceAll: (state: AppState) => void;
};

const ZhengContext = createContext<ZhengStore | null>(null);

let cache: AppState | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

function readStorage(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isAppState(parsed)) return parsed;
    }
  } catch {
    // corrupted or unavailable storage: start empty
  }
  return EMPTY_STATE;
}

function getSnapshot() {
  cache ??= readStorage();
  return cache;
}

function getServerSnapshot() {
  return EMPTY_STATE;
}

function onStorage(event: StorageEvent) {
  if (event.key !== STORAGE_KEY) return;
  cache = null;
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) window.removeEventListener("storage", onStorage);
  };
}

function writeState(next: AppState) {
  cache = next;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  emit();
}

function mutate(updater: (prev: AppState) => AppState) {
  writeState(updater(getSnapshot()));
}

const noopSubscribe = () => () => {};

export function ZhengProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const hydrated = useSyncExternalStore(noopSubscribe, () => true, () => false);

  useEffect(() => {
    // Ask Safari not to evict this origin's storage under pressure.
    navigator.storage?.persist?.().catch(() => {});
  }, []);

  const addBook = useCallback((key: BookKey) => {
    mutate((prev) =>
      prev.books.some((b) => b.key === key)
        ? prev
        : { ...prev, books: [...prev.books, { key, addedAt: new Date().toISOString() }] },
    );
  }, []);

  const removeBook = useCallback((key: BookKey) => {
    mutate((prev) => ({
      books: prev.books.filter((b) => b.key !== key),
      issues: prev.issues.filter((i) => i.bookKey !== key),
    }));
  }, []);

  const saveIssue = useCallback((draft: IssueDraft, id?: string) => {
    const now = new Date().toISOString();
    const issueId = id ?? uid("issue");
    mutate((prev) => {
      const existing = id ? prev.issues.find((i) => i.id === id) : undefined;
      const issue: Issue = {
        ...draft,
        id: issueId,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      return {
        ...prev,
        issues: existing
          ? prev.issues.map((i) => (i.id === id ? issue : i))
          : [...prev.issues, issue],
      };
    });
    return issueId;
  }, []);

  const removeIssue = useCallback((id: string) => {
    mutate((prev) => ({ ...prev, issues: prev.issues.filter((i) => i.id !== id) }));
  }, []);

  const replaceAll = useCallback((next: AppState) => writeState(next), []);

  const value: ZhengStore = {
    ...state,
    hydrated,
    addBook,
    removeBook,
    saveIssue,
    removeIssue,
    replaceAll,
  };

  return <ZhengContext.Provider value={value}>{children}</ZhengContext.Provider>;
}

export function useZheng() {
  const ctx = useContext(ZhengContext);
  if (!ctx) throw new Error("useZheng must be used within ZhengProvider");
  return ctx;
}
