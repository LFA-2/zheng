import type { BookKey } from "@/lib/types";

export type LawItem = { text: string; subitems: string[] };
export type LawParagraph = { text: string; items: LawItem[] };
export type LawUnit = {
  no: string;
  label: string;
  path: string;
  paragraphs: LawParagraph[];
  children?: LawUnit[];
};
export type LawCode = {
  code: string;
  lawName: string;
  pcode?: string;
  sourceUrl: string;
  modifiedDate: string | null;
  articles: LawUnit[];
};
export type LawBook = {
  key: BookKey;
  name: string;
  source: string;
  codes: LawCode[];
};

export const LAW_POOL: {
  key: BookKey;
  name: string;
  subtitle: string;
  example: string;
}[] = [
  {
    key: "tw-constitution",
    name: "憲法",
    subtitle: "中華民國憲法・憲法增修條文",
    example: "憲法第8條、增修條文第4條",
  },
  { key: "civil", name: "民法", subtitle: "中華民國民法", example: "民法184條1項前段" },
  { key: "criminal", name: "刑法", subtitle: "中華民國刑法", example: "刑法第10條第2項第1款" },
  {
    key: "us-constitution",
    name: "美國聯邦憲法",
    subtitle: "英美法・U.S. Constitution",
    example: "Amend. XIV § 1、Art. I § 8 cl. 3",
  },
];

export function poolEntry(key: BookKey) {
  return LAW_POOL.find((l) => l.key === key)!;
}

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const cache = new Map<BookKey, Promise<LawBook>>();

export function loadLawBook(key: BookKey): Promise<LawBook> {
  let pending = cache.get(key);
  if (!pending) {
    pending = fetch(`${BASE_PATH}/laws/${key}.json`).then((res) => {
      if (!res.ok) throw new Error(`無法載入條文資料（${res.status}）`);
      return res.json() as Promise<LawBook>;
    });
    pending.catch(() => cache.delete(key));
    cache.set(key, pending);
  }
  return pending;
}

export function formatParagraph(p: LawParagraph) {
  return [p.text, ...p.items.flatMap((i) => [i.text, ...i.subitems])].filter(Boolean).join("\n");
}

export function formatUnit(unit: LawUnit): string {
  const own = unit.paragraphs.map(formatParagraph).join("\n");
  const children = (unit.children ?? []).map((c) => `${c.label}. ${c.paragraphs.map(formatParagraph).join("\n")}`);
  return [own, ...children].filter(Boolean).join("\n");
}
