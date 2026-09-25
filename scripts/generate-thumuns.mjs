#!/usr/bin/env node
/**
 * Generates the app's Qur'an division data (480 أثمان) from the verified
 * Maghrebi/Muhammadi mushaf dataset (Warsh 'an Nafi').
 *
 * Upstream: ma-mushaf-muhammadi-data (Noureddine El-Ahmadi), CC BY 4.0.
 * Ground truth: المصحف المحمدي — Ministry of Habous and Islamic Affairs,
 * Kingdom of Morocco (mushaf.ma). Every one of the 480 eighth boundaries
 * was cross-checked against the printed page images.
 *
 * Expected inputs (place in data/upstream/):
 *   - eighths.json      (480 ثمن boundaries)
 *   - surahs.json       (114 surahs metadata)
 *   - audio_sources.json (Warsh reciters)
 *
 * Outputs (committed, shipped in the app bundle):
 *   - src/lib/quran-thumuns.json
 *   - src/lib/quran-surahs.json
 *   - src/lib/audio-reciters.json
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const upstream = path.join(root, "data", "upstream");
const outDir = path.join(root, "src", "lib");

const read = (f) => JSON.parse(fs.readFileSync(path.join(upstream, f), "utf8"));

const eighths = read("eighths.json");
const surahs = read("surahs.json");
const audio = read("audio_sources.json");

if (eighths.length !== 480) {
  throw new Error(`Expected 480 eighths, got ${eighths.length}`);
}

/** Build a start snippet from the full first-verse text (respecting mid-ayah starts). */
function buildPreview(verseText, charOffset = 0, maxWords = 11) {
  if (!verseText) return "";
  let t = String(verseText);
  // char offsets in the upstream dataset refer to the raw verse text
  if (charOffset > 0) t = t.slice(charOffset);
  t = t
    .replace(/﴿[^﴾]*﴾?/g, "")
    .replace(/\s+/g, " ")
    .trim();
  let words = t.split(" ");
  if (charOffset > 0 && words.length > 1) words = words.slice(1); // drop cut word
  return words.length > maxWords ? words.slice(0, maxWords).join(" ") : words.join(" ");
}

const verseByRef = new Map(
  read("quran_muhammadi.json").map((v) => [`${v.sura}:${v.aya}`, v.text]),
);

const verseCounts = new Map(surahs.map((s) => [s.number, s.verse_count]));

let prev = null;
const thumuns = eighths.map((e, i) => {
  const id = i + 1;
  if (e.eighth_id !== id) throw new Error(`eighth_id mismatch at ${id}`);
  if (prev) {
    const okJoin = prev.end.partial_verse
      ? // mid-ayah split: next eighth re-enters the same ayah at the next char
        e.start.sura === prev.end.sura &&
        e.start.aya === prev.end.aya &&
        (e.start.char_offset ?? 0) === (prev.end.char_offset ?? 0) + 1
      : // clean join: next eighth starts at the following ayah
        (() => {
          let ns = prev.end.sura;
          let na = prev.end.aya + 1;
          if (na > (verseCounts.get(ns) ?? 0)) {
            ns += 1;
            na = 1;
          }
          return (
            e.start.sura === ns && e.start.aya === na && (e.start.char_offset ?? 0) === 0
          );
        })();
    if (!okJoin) {
      throw new Error(
        `Coverage gap before eighth ${id}: prev end ${prev.end.sura}:${prev.end.aya}` +
          `${prev.end.partial_verse ? "@" + prev.end.char_offset : ""}, got start ${e.start.sura}:${e.start.aya}@${e.start.char_offset ?? 0}`,
      );
    }
  }
  prev = e;

  return {
    id,
    juz: e.juz,
    hizb: e.hizb,
    pos: e.pos_in_hizb,
    name: e.name_ar,
    startSura: e.start.sura,
    startAya: e.start.aya,
    endSura: e.end.sura,
    endAya: e.end.aya,
    partialStart: !!e.start.partial_verse,
    partialEnd: !!e.end.partial_verse,
    verses: e.verse_count,
    words: e.word_count,
    isSuraStart: !!e.is_surah_start,
    text: buildPreview(
      verseByRef.get(`${e.start.sura}:${e.start.aya}`) ?? e.text_preview,
      e.start.char_offset ?? 0,
    ),
    pages: [e.start.mushafma_page, e.end.mushafma_page],
  };
});

const last = eighths[eighths.length - 1].end;
if (last.sura !== 114) throw new Error(`Qur'an must end at sura 114, got ${last.sura}`);

const surahsOut = surahs.map((s) => ({
  number: s.number,
  name: s.name_ar,
  nameTranslit: s.name_transliteration,
  revelation: s.revelation,
  verses: s.verse_count,
  words: s.word_count,
  firstEighth: s.first_eighth_id,
  lastEighth: s.last_eighth_id,
}));

const reciters = audio.warsh_per_surah.reciters.map((r) => ({
  id: r.id,
  name: r.name_ar,
  nameEn: r.name_en,
  country: r.country,
  server: r.server,
  recommended: !!r.recommended,
}));

const meta = {
  riwaya: "Warsh 'an Nafi (رواية ورش عن نافع)",
  division: "Maghrebi — 480 أثمان (60 حزباً × 8)، وفق المصاحف المغاربية",
  groundTruth: "المصحف المحمدي (المملكة المغربية) — mushaf.ma",
  upstream: "https://github.com/ELAHMADI/ma-mushaf-muhammadi-data (CC BY 4.0 — Noureddine El-Ahmadi)",
  generatedAt: new Date().toISOString(),
};

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "quran-thumuns.json"), JSON.stringify({ meta, thumuns }));
fs.writeFileSync(path.join(outDir, "quran-surahs.json"), JSON.stringify({ meta, surahs: surahsOut }));
fs.writeFileSync(
  path.join(outDir, "audio-reciters.json"),
  JSON.stringify({ meta, urlPattern: audio.warsh_per_surah.url_pattern, reciters }),
);

const partials = thumuns.filter((t) => t.partialStart || t.partialEnd).length;
console.log(`✓ 480 أثمان generated (${partials} with mid-ayah boundaries)`);
console.log(`✓ ${surahsOut.length} surahs, ${reciters.length} Warsh reciters`);
