// Downloads statute text into public/laws/*.json.
// - ROC laws: 全國法規資料庫 open data (https://law.moj.gov.tw/api/Ch/Law/JSON)
// - U.S. Constitution: National Archives transcripts
// If a source is unreachable, the previously committed file is kept so builds still succeed.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { strFromU8, unzipSync } from "fflate";

const OUT_DIR = path.resolve("public/laws");
const UA = { "User-Agent": "Mozilla/5.0 (zheng law fetcher)" };

const TW_BOOKS = [
  {
    key: "tw-constitution",
    name: "憲法",
    codes: [
      { code: "中華民國憲法", lawName: "中華民國憲法" },
      { code: "憲法增修條文", lawName: "中華民國憲法增修條文" },
    ],
  },
  { key: "civil", name: "民法", codes: [{ code: "民法", lawName: "民法" }] },
  { key: "criminal", name: "刑法", codes: [{ code: "刑法", lawName: "中華民國刑法" }] },
];

const LEVELS = { 編: 0, 章: 1, 節: 2, 款: 3, 目: 4 };
const ITEM_RE = /^[一二三四五六七八九十百]+、/;
const SUBITEM_RE = /^[（(][一二三四五六七八九十]+[）)]/;

function splitParagraphs(content) {
  const paragraphs = [];
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (SUBITEM_RE.test(line) && paragraphs.at(-1)?.items.length) {
      paragraphs.at(-1).items.at(-1).subitems.push(line);
    } else if (ITEM_RE.test(line)) {
      if (!paragraphs.length) paragraphs.push({ text: "", items: [] });
      paragraphs.at(-1).items.push({ text: line, subitems: [] });
    } else {
      paragraphs.push({ text: line, items: [] });
    }
  }
  return paragraphs;
}

function convertTwLaw(law) {
  const heads = [];
  const articles = [];
  for (const entry of law.LawArticles) {
    if (entry.ArticleType === "C") {
      const title = entry.ArticleContent.trim().replace(/\s+/g, " ").replace(/^第 (\S+) (\S)/, "第$1$2");
      const level = LEVELS[title.match(/^第\S+?(編|章|節|款|目)/)?.[1]] ?? heads.length;
      heads.length = level;
      heads[level] = title;
      continue;
    }
    const no = entry.ArticleNo.match(/第\s*([\d-]+)\s*條/)?.[1];
    if (!no) continue;
    articles.push({
      no,
      label: entry.ArticleNo.replace(/\s+/g, " ").trim(),
      path: heads.filter(Boolean).join(" › "),
      paragraphs: splitParagraphs(entry.ArticleContent),
    });
  }
  const pcode = new URL(law.LawURL).searchParams.get("pcode");
  return { pcode, sourceUrl: law.LawURL, modifiedDate: law.LawModifiedDate, articles };
}

async function fetchTw() {
  const res = await fetch("https://law.moj.gov.tw/api/Ch/Law/JSON", { headers: UA });
  if (!res.ok) throw new Error(`MOJ ${res.status}`);
  const files = unzipSync(new Uint8Array(await res.arrayBuffer()));
  const json = JSON.parse(strFromU8(files["ChLaw.json"]).replace(/^\uFEFF/, ""));
  const byName = new Map(json.Laws.map((l) => [l.LawName, l]));

  return TW_BOOKS.map((book) => ({
    key: book.key,
    name: book.name,
    source: "全國法規資料庫",
    codes: book.codes.map(({ code, lawName }) => {
      const law = byName.get(lawName);
      if (!law) throw new Error(`law not found: ${lawName}`);
      return { code, lawName, ...convertTwLaw(law) };
    }),
  }));
}

const ROMAN = { I: 1, V: 5, X: 10, L: 50 };
function romanToInt(s) {
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const v = ROMAN[s[i]];
    total += v < (ROMAN[s[i + 1]] ?? 0) ? -v : v;
  }
  return total;
}

function decode(html) {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&rsquo;|&lsquo;/g, "'")
    .replace(/&rdquo;|&ldquo;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(html) {
  return [...html.matchAll(/<(h[23])[^>]*>([\s\S]*?)<\/\1>|<p([^>]*)>([\s\S]*?)<\/p>/g)].map((m) =>
    m[1] ? { type: "h", text: decode(m[2]) } : { type: "p", attrs: m[3], text: decode(m[4]) },
  );
}

async function fetchPage(slug) {
  const res = await fetch(`https://www.archives.gov/founding-docs/${slug}`, { headers: UA });
  if (!res.ok) throw new Error(`archives ${slug} ${res.status}`);
  return res.text();
}

function unit(no, label) {
  return { no, label, path: "", paragraphs: [], children: [] };
}

function addParagraph(target, text) {
  target.paragraphs.push({ text, items: [] });
}

async function fetchUs() {
  const units = [];

  // Preamble + Articles I–VII
  let current = null;
  let section = null;
  for (const t of tokens(await fetchPage("constitution-transcript"))) {
    if (t.type === "p" && t.text.startsWith("We the People") && !units.length) {
      const preamble = unit("preamble", "Preamble");
      addParagraph(preamble, t.text);
      units.push(preamble);
      continue;
    }
    if (!units.length) continue;
    const art = t.type === "h" && t.text.match(/^Article\.?\s+([IVX]+)\.?$/);
    if (art) {
      const n = romanToInt(art[1]);
      current = unit(`art-${n}`, `Article ${art[1]}`);
      section = null;
      units.push(current);
      continue;
    }
    const sec = t.type === "h" && current && t.text.match(/^Section\.?\s+(\d+)\.?$/);
    if (sec) {
      section = unit(sec[1], `Section ${sec[1]}`);
      current.children.push(section);
      continue;
    }
    if (t.type === "p" && current) {
      if (current.no === "art-7" && current.paragraphs.length) break;
      addParagraph(section ?? current, t.text);
    }
  }

  // Amendments I–X
  let amendment = null;
  for (const t of tokens(await fetchPage("bill-of-rights-transcript"))) {
    const am = t.type === "h" && t.text.match(/^Amendment\s+([IVX]+)$/);
    if (am) {
      const n = romanToInt(am[1]);
      amendment = unit(`amend-${n}`, `Amendment ${am[1]}`);
      units.push(amendment);
      continue;
    }
    if (t.type === "h" && amendment) break;
    if (t.type === "p" && amendment && !amendment.paragraphs.length) addParagraph(amendment, t.text);
  }

  // Amendments XI–XXVII
  amendment = null;
  section = null;
  for (const t of tokens(await fetchPage("amendments-11-27"))) {
    const am = t.type === "h" && t.text.match(/^AMENDMENT\s+([IVX]+)$/i);
    if (am) {
      const n = romanToInt(am[1].toUpperCase());
      amendment = unit(`amend-${n}`, `Amendment ${am[1].toUpperCase()}`);
      section = null;
      units.push(amendment);
      continue;
    }
    if (!amendment) continue;
    const sec = t.type === "h" && t.text.match(/^Section\s+(\d+)\.?$/);
    if (sec) {
      section = unit(sec[1], `Section ${sec[1]}`);
      amendment.children.push(section);
      continue;
    }
    if (t.type === "h") break;
    if (t.type !== "p") continue;
    if (/class="smaller"/.test(t.attrs) || /^(Note:|\*|Passed by Congress)/.test(t.text)) continue;
    addParagraph(section ?? amendment, t.text);
  }

  const articles = units.filter((u) => u.no.startsWith("art-")).length;
  const amendments = units.filter((u) => u.no.startsWith("amend-")).length;
  if (articles !== 7 || amendments !== 27) {
    throw new Error(`unexpected structure: ${articles} articles, ${amendments} amendments`);
  }

  return {
    key: "us-constitution",
    name: "美國聯邦憲法",
    source: "U.S. National Archives",
    codes: [
      {
        code: "美國聯邦憲法",
        lawName: "Constitution of the United States",
        sourceUrl: "https://www.archives.gov/founding-docs/constitution-transcript",
        modifiedDate: null,
        articles: units,
      },
    ],
  };
}

function save(book) {
  writeFileSync(path.join(OUT_DIR, `${book.key}.json`), JSON.stringify(book));
  const counts = book.codes.map((c) => `${c.code} ${c.articles.length}`).join(", ");
  console.log(`✓ ${book.key}: ${counts}`);
}

mkdirSync(OUT_DIR, { recursive: true });
let failed = false;

for (const [label, job] of [
  ["ROC laws", fetchTw],
  ["U.S. Constitution", fetchUs],
]) {
  try {
    const result = await job();
    for (const book of [result].flat()) save(book);
  } catch (error) {
    failed = true;
    console.warn(`⚠ ${label}: ${error.message} — keeping existing files`);
  }
}

const missing = [...TW_BOOKS.map((b) => b.key), "us-constitution"].filter(
  (key) => !existsSync(path.join(OUT_DIR, `${key}.json`)),
);
if (missing.length) {
  console.error(`✗ missing law data: ${missing.join(", ")}`);
  process.exit(1);
}
if (failed) console.warn("Some sources failed; using previously saved data.");
