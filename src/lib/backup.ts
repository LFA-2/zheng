import { isAppState, type AppState } from "@/lib/types";

export function serializeBackup(state: AppState) {
  return JSON.stringify(
    { app: "zheng", format: 1, exportedAt: new Date().toISOString(), state },
    null,
    2,
  );
}

export function parseBackup(text: string): AppState | null {
  try {
    const parsed: unknown = JSON.parse(text);
    if (isAppState(parsed)) return parsed;
    if (parsed && typeof parsed === "object" && isAppState((parsed as { state?: unknown }).state)) {
      return (parsed as { state: AppState }).state;
    }
  } catch {
    // not JSON
  }
  return null;
}

function stamp(d: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

export async function shareOrDownloadBackup(state: AppState) {
  const name = `zheng-backup-${stamp(new Date())}.json`;
  const file = new File([serializeBackup(state)], name, { type: "application/json" });

  // iOS standalone apps ignore <a download>; the share sheet offers "Save to Files".
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "爭 備份" });
      return;
    } catch (error) {
      if ((error as DOMException).name === "AbortError") return;
    }
  }

  const url = URL.createObjectURL(file);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
