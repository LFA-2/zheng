import { formatParagraph, formatUnit, loadLawBook, type LawBook, type LawUnit } from "@/lib/laws";
import type { BookKey, Citation } from "@/lib/types";

const US = "美國聯邦憲法";

const CODE_BOOK: Record<string, BookKey> = {
  中華民國憲法: "tw-constitution",
  憲法增修條文: "tw-constitution",
  民法: "civil",
  刑法: "criminal",
  [US]: "us-constitution",
};

const DEFAULT_CODE: Record<BookKey, string> = {
  "tw-constitution": "中華民國憲法",
  civil: "民法",
  criminal: "刑法",
  "us-constitution": US,
};

/** Longest aliases first so 憲法增修條文 wins over 憲法. */
const ALIASES: [RegExp, string][] = [
  [/^(中華民國)?憲法增修條文/, "憲法增修條文"],
  [/^增修條文/, "憲法增修條文"],
  [/^憲增/, "憲法增修條文"],
  [/^美國(聯邦)?憲法/, US],
  [/^u\.?s\.?(const(itution)?\.?)?/, US],
  [/^(the)?constitution(oftheunitedstates)?/, US],
  [/^(中華民國)?憲法/, "中華民國憲法"],
  [/^民法/, "民法"],
  [/^(中華民國)?刑法/, "刑法"],
  [/^憲(?=第|§|\d)/, "中華民國憲法"],
  [/^民(?=第|§|\d)/, "民法"],
  [/^刑(?=第|§|\d)/, "刑法"],
];

const CN_DIGITS: Record<string, number> = {
  零: 0, 〇: 0, "○": 0, 一: 1, 二: 2, 兩: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9,
};
const CN_UNITS: Record<string, number> = { 十: 10, 百: 100, 千: 1000 };

function cnToNumber(s: string): number {
  if (![...s].some((c) => c in CN_UNITS)) {
    return Number([...s].map((c) => CN_DIGITS[c]).join(""));
  }
  let total = 0;
  let digit = 0;
  for (const c of s) {
    if (c in CN_DIGITS) digit = CN_DIGITS[c];
    else {
      total += (digit || 1) * CN_UNITS[c];
      digit = 0;
    }
  }
  return total + digit;
}

const ROMAN: Record<string, number> = { i: 1, v: 5, x: 10, l: 50 };
function romanToNumber(s: string): number {
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const cur = ROMAN[s[i]];
    const next = ROMAN[s[i + 1]] ?? 0;
    total += cur < next ? -cur : cur;
  }
  return total;
}
function toRoman(n: number): string {
  const table: [number, string][] = [
    [50, "L"], [40, "XL"], [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let out = "";
  for (const [v, r] of table) while (n >= v) { out += r; n -= v; }
  return out;
}
function parseNum(s: string): number {
  return /^\d+$/.test(s) ? Number(s) : romanToNumber(s);
}

const UNICODE_ROMAN = "ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩⅪⅫ";

function normalize(input: string): string {
  return input
    .replace(/[\uFF01-\uFF5E]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/\u3000/g, " ")
    .toLowerCase()
    .replace(/[零〇○一二兩三四五六七八九十百千]+/g, (m) => String(cnToNumber(m)))
    .replace(/\s+/g, "");
}

export type CitationTarget = Pick<
  Citation,
  "code" | "articleNo" | "sectionNo" | "paragraph" | "item" | "subitem" | "qualifier"
>;

type ParsedRef = CitationTarget & { query: string };

export type ParseResult = { refs: ParsedRef[]; errors: string[] };

const TW_RE =
  /^(?:第)?(\d+)(?:條之(\d+)|-(\d+)條?|條)?(?:之(\d+))?([ⅰ-ⅻⅠ-Ⅻ])?(?:第?(\d+)項)?(?:第?(\d+)款)?(?:第?(\d+)目)?(前段|中段|後段|但書|本文|前|中|後|但)?$/;
const TW_TAIL_RE =
  /^(?:第?(\d+)項)?(?:第?(\d+)款)?(?:第?(\d+)目)?(前段|中段|後段|但書|本文|前|中|後|但)?$/;

const SHORT_QUALIFIER: Record<string, string> = { 前: "前段", 中: "中段", 後: "後段", 但: "但書" };
function fullQualifier(q: string | undefined) {
  return q ? (SHORT_QUALIFIER[q] ?? q) : undefined;
}

function parseTw(code: string, rest: string, prev: ParsedRef | undefined, query: string): ParsedRef | string {
  rest = rest.replace(/^§+/, "").replace(/§/g, "");
  const m = TW_RE.exec(rest);
  if (m && m[1]) {
    const sub = m[2] ?? m[3] ?? m[4];
    const roman = m[5] ? UNICODE_ROMAN.indexOf(m[5].toUpperCase()) + 1 || undefined : undefined;
    return {
      query,
      code,
      articleNo: sub ? `${m[1]}-${sub}` : m[1],
      paragraph: m[6] ? Number(m[6]) : roman,
      item: m[7] ? Number(m[7]) : undefined,
      subitem: m[8] ? Number(m[8]) : undefined,
      qualifier: fullQualifier(m[9]),
    };
  }
  const t = TW_TAIL_RE.exec(rest);
  if (t && rest && prev && prev.code === code) {
    return {
      query,
      code,
      articleNo: prev.articleNo,
      paragraph: t[1] ? Number(t[1]) : prev.paragraph,
      item: t[2] ? Number(t[2]) : t[1] ? undefined : prev.item,
      subitem: t[3] ? Number(t[3]) : undefined,
      qualifier: fullQualifier(t[4]),
    };
  }
  return `看不懂「${query}」，可以試試「${code}第184條第1項前段」這種寫法`;
}

function parseUs(rest: string, query: string): ParsedRef | string {
  if (/^(preamble|pmbl\.?|前言)$/.test(rest)) return { query, code: US, articleNo: "preamble" };

  const amend =
    /amend(?:ment)?s?\.?([ivxl]+|\d+)/.exec(rest) ??
    /^([ivxl]+|\d+)(?:st|nd|rd|th)?amend(?:ment)?/.exec(rest) ??
    /第?(\d+)修正案/.exec(rest);
  const article = amend ? null : /art(?:icle)?\.?([ivx]+|\d+)/.exec(rest) ?? /^第?(\d+)條/.exec(rest);
  const section = /(?:§|sec(?:tion)?\.?|第)(\d+)(?:項|節)?(?!\d|條|修正案|款)/.exec(
    rest.replace(amend?.[0] ?? article?.[0] ?? "", ""),
  );
  const clause = /(?:cl(?:ause)?\.?|第)(\d+)款/.exec(rest) ?? /cl(?:ause)?\.?(\d+)/.exec(rest);

  if (!amend && !article) {
    return `看不懂「${query}」，可以試試「Amend. XIV § 1」或「Art. I § 8 cl. 3」`;
  }
  const n = parseNum((amend ?? article)![1]);
  return {
    query,
    code: US,
    articleNo: `${amend ? "amend" : "art"}-${n}`,
    sectionNo: section ? section[1] : undefined,
    paragraph: clause ? Number(clause[1]) : undefined,
  };
}

const US_CITATION_RE = /^(amend|art\.?[ivx\d]|article[ivx\d]|preamble|pmbl|\d+(st|nd|rd|th)amend)|修正案/;

/**
 * Which book an input cites, if it reads as a citation rather than a keyword:
 * a law name followed by an article number, or a U.S. Constitution form.
 * With a `fallback` book, bare article numbers such as「184條」also count.
 */
export function citationBook(input: string, fallback?: BookKey): BookKey | null {
  const s = normalize(input);
  if (US_CITATION_RE.test(s)) return "us-constitution";
  for (const [re, name] of ALIASES) {
    const m = re.exec(s);
    if (m) return /^第?[§\d]|[\dⅰ-ⅻⅠ-Ⅻ]/.test(s.slice(m[0].length)) ? CODE_BOOK[name] : null;
  }
  if (fallback && /^(第|§)?\d+(條|-\d|$)/.test(s)) return fallback;
  return null;
}

/** Law name typed in front of keywords, e.g.「刑法 公務員」or「刑法公務員」. */
export function leadingLawName(query: string): { book: BookKey; rest: string } | null {
  const s = query
    .trim()
    .replace(/[\uFF01-\uFF5E]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .toLowerCase();
  for (const [re, name] of ALIASES) {
    const m = re.exec(s);
    if (m) return { book: CODE_BOOK[name], rest: query.trim().slice(m[0].length).trim() };
  }
  return null;
}

/**
 * Parse free-form citation text such as「民法184條1項前段、第2項」or
 * 「刑法第10條第2項第1款；憲法增修條文第4條」into structured targets.
 */
export function parseCitations(input: string, defaultBook: BookKey): ParseResult {
  const refs: ParsedRef[] = [];
  const errors: string[] = [];
  let code = DEFAULT_CODE[defaultBook];

  const segments = input
    .replace(/[,，]\s*(?=(§|sec|cl))/gi, " ")
    .split(/[、,，;；\n]|及|與|和|暨/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const raw of segments) {
    let rest = normalize(raw);
    for (const [re, name] of ALIASES) {
      const m = re.exec(rest);
      if (m) {
        code = name;
        rest = rest.slice(m[0].length);
        break;
      }
    }
    if (code !== US && /^(amend|art\.|article|preamble|\d+(st|nd|rd|th)amend)|修正案/.test(rest)) code = US;
    if (!rest) {
      errors.push(`「${raw}」少了條號`);
      continue;
    }
    const prev = refs[refs.length - 1];
    const ref = code === US ? parseUs(rest, raw) : parseTw(code, rest, prev, raw);
    if (typeof ref === "string") errors.push(ref);
    else refs.push(ref);
  }
  return { refs, errors };
}

function twLabel(t: CitationTarget) {
  const [main, sub] = t.articleNo.split("-");
  return [
    `${t.code}第${main}條${sub ? `之${sub}` : ""}`,
    t.paragraph ? `第${t.paragraph}項` : "",
    t.item ? `第${t.item}款` : "",
    t.subitem ? `第${t.subitem}目` : "",
    t.qualifier ?? "",
  ].join("");
}

function usLabel(t: CitationTarget) {
  if (t.articleNo === "preamble") return "U.S. Const. pmbl.";
  const [kind, n] = t.articleNo.split("-");
  return [
    `U.S. Const. ${kind === "amend" ? "amend." : "art."} ${toRoman(Number(n))}`,
    t.sectionNo ? `, § ${t.sectionNo}` : "",
    t.paragraph ? `, cl. ${t.paragraph}` : "",
  ].join("");
}

function usSourceUrl(articleNo: string) {
  const m = /^amend-(\d+)$/.exec(articleNo);
  if (!m) return "https://www.archives.gov/founding-docs/constitution-transcript";
  return Number(m[1]) <= 10
    ? "https://www.archives.gov/founding-docs/bill-of-rights-transcript"
    : "https://www.archives.gov/founding-docs/amendments-11-27";
}

export type Resolved = Omit<Citation, "id" | "query">;

export function resolveTarget(book: LawBook, t: CitationTarget): Resolved | string {
  const code = book.codes.find((c) => c.code === t.code);
  if (!code) return `條文資料裡沒有${t.code}`;
  const isUs = t.code === US;
  const label = isUs ? usLabel(t) : twLabel(t);
  const article = code.articles.find((a) => a.no === t.articleNo);
  if (!article) return `找不到 ${isUs ? usLabel({ ...t, sectionNo: undefined, paragraph: undefined }) : twLabel({ code: t.code, articleNo: t.articleNo })}`;

  let unit: LawUnit = article;
  if (t.sectionNo) {
    const section = article.children?.find((c) => c.no === t.sectionNo);
    if (!section) return `${article.label} 沒有 Section ${t.sectionNo}`;
    unit = section;
  } else if (isUs && article.paragraphs.length === 0 && t.paragraph) {
    return `${article.label} 分成數個 Section，請加上 § 編號`;
  }

  const fullText = formatUnit(unit);
  let text = fullText;
  const where = isUs ? `${article.label}${t.sectionNo ? ` § ${t.sectionNo}` : ""}` : twLabel({ code: t.code, articleNo: t.articleNo });

  const qualifyParagraph = t.qualifier && !t.paragraph && !t.item && unit.paragraphs.length > 1;
  if (t.paragraph || t.item || qualifyParagraph) {
    const paragraphs = unit.paragraphs;
    let pIndex = (t.paragraph ?? 1) - 1;
    if (!t.paragraph && t.item && paragraphs.length > 1) {
      pIndex = paragraphs.findIndex((p) => p.items.length > 0);
      if (pIndex < 0) return `${where}沒有分款`;
    }
    const p = paragraphs[pIndex];
    if (!p) return `${where}只有 ${paragraphs.length} ${isUs ? "clause" : "項"}`;
    text = formatParagraph(p);

    if (t.item) {
      const item = p.items[t.item - 1];
      if (!item) return `${where}${t.paragraph ? `第${t.paragraph}項` : ""}只有 ${p.items.length} 款`;
      text = [p.text, item.text, ...item.subitems].filter(Boolean).join("\n");
      if (t.subitem) {
        const s = item.subitems[t.subitem - 1];
        if (!s) {
          return `${where}${t.paragraph ? `第${t.paragraph}項` : ""}第${t.item}款${item.subitems.length ? `只有 ${item.subitems.length} 目` : "沒有分目"}`;
        }
        text = [p.text, item.text, s].filter(Boolean).join("\n");
      }
    }
  }

  if (t.qualifier && !t.item) {
    const q = qualify(text, t.qualifier);
    if (q === null) {
      const base = label.replace(t.qualifier, "");
      return t.qualifier === "但書" || t.qualifier === "本文" ? `${base}沒有但書` : `${base}只有一句，沒有${t.qualifier}`;
    }
    text = q;
  }

  return {
    bookKey: CODE_BOOK[t.code],
    code: t.code,
    articleNo: t.articleNo,
    sectionNo: t.sectionNo,
    paragraph: t.paragraph,
    item: t.item,
    subitem: t.subitem,
    qualifier: t.qualifier,
    label,
    path: article.path,
    text,
    fullText,
    sourceUrl: isUs
      ? usSourceUrl(t.articleNo)
      : `https://law.moj.gov.tw/LawClass/LawSingle.aspx?pcode=${code.pcode}&flno=${t.articleNo}`,
  };
}

/** 前段/後段 split on the first full stop; 但書 is the sentence beginning with「但」. */
function qualify(text: string, qualifier: string): string | null {
  const butIndex = text.search(/[。；]但/);
  if (qualifier === "但書") return butIndex >= 0 ? text.slice(butIndex + 1) : null;
  if (qualifier === "本文") return butIndex >= 0 ? text.slice(0, butIndex + 1) : null;
  const sentences = text.match(/[^。]+。?/g) ?? [text];
  if (sentences.length < 2) return null;
  if (qualifier === "前段") return sentences[0];
  if (qualifier === "後段") return sentences.slice(1).join("");
  if (qualifier === "中段") return sentences.length >= 3 ? sentences.slice(1, -1).join("") : null;
  return text;
}

export type LookupResult = { citations: Resolved[]; queries: string[]; errors: string[] };

export async function lookupCitations(input: string, defaultBook: BookKey): Promise<LookupResult> {
  const { refs, errors } = parseCitations(input, defaultBook);
  const citations: Resolved[] = [];
  const queries: string[] = [];
  for (const ref of refs) {
    const book = await loadLawBook(CODE_BOOK[ref.code]);
    const resolved = resolveTarget(book, ref);
    if (typeof resolved === "string") errors.push(resolved);
    else {
      citations.push(resolved);
      queries.push(ref.query);
    }
  }
  return { citations, queries, errors };
}
