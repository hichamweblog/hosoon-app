#!/usr/bin/env node
/**
 * Data integrity checks for the 480-thumun Qur'an division.
 * Run: npm test
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lib = path.join(root, "src", "lib");

const { thumuns } = JSON.parse(fs.readFileSync(path.join(lib, "quran-thumuns.json"), "utf8"));
const { surahs } = JSON.parse(fs.readFileSync(path.join(lib, "quran-surahs.json"), "utf8"));

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log(`  ✓ ${msg}`);
  else {
    failures++;
    console.error(`  ✗ ${msg}`);
  }
};

console.log("480-thumun division integrity:");

ok(thumuns.length === 480, "480 thumuns present");

// identity & formulas
ok(thumuns.every((t, i) => t.id === i + 1), "ids are 1..480 in order");
ok(thumuns.every((t) => t.hizb === Math.floor((t.id - 1) / 8) + 1), "hizb = ceil(id/8)");
ok(thumuns.every((t) => t.juz === Math.floor((t.hizb - 1) / 2) + 1), "juz derived from hizb (2 per juz)");
ok(thumuns.every((t) => t.pos === ((t.id - 1) % 8) + 1), "pos_in_hizb = 1..8");

const byRef = new Map();
for (const s of surahs) byRef.set(s.number, s.verses);
const firstT = thumuns[0];
const lastT = thumuns[thumuns.length - 1];
ok(firstT.startSura === 1 && firstT.startAya === 1, "starts at الفاتحة آية 1");
ok(lastT.endSura === 114 && lastT.endAya === byRef.get(114), "ends at end of الناس");

// full, gap-free, overlap-free coverage of the mushaf text
let contiguous = true;
let prev = null;
for (const t of thumuns) {
  const s0 = `${t.startSura}:${t.startAya}@${t.partialStart ? 1 : 0}`;
  if (prev !== null && s0 !== prev) {
    contiguous = false;
    console.error(`    gap/overlap before thumun ${t.id}: expected ${prev}, got ${s0}`);
  }
  // join point for the next thumun at ayah level
  if (t.partialEnd) prev = `${t.endSura}:${t.endAya}@1`;
  else {
    let ns = t.endSura;
    let na = t.endAya + 1;
    if (na > (byRef.get(ns) ?? 0)) {
      ns += 1;
      na = 1;
    }
    prev = `${ns}:${na}@0`;
  }
}
ok(contiguous, "char/ayah-level continuity (no gaps, no overlaps)");

// every ayah of every surah is covered at least once (allowing mid-ayah splits)
const covered = new Set();
for (const t of thumuns) {
  let [s, a] = [t.startSura, t.startAya];
  while (s < t.endSura || (s === t.endSura && a <= t.endAya)) {
    covered.add(`${s}:${a}`);
    a++;
    if (a > byRef.get(s)) {
      s++;
      a = 1;
    }
  }
}
let missing = 0;
for (const s of surahs) {
  for (let a = 1; a <= s.verses; a++) if (!covered.has(`${s.number}:${a}`)) missing++;
}
ok(missing === 0, `all ${[...covered].length} ayahs covered (missing: ${missing})`);

// continuity at ayah level (each thumun starts where previous ended, modulo splits)
let ayahContiguous = true;
for (let i = 1; i < thumuns.length; i++) {
  const p = thumuns[i - 1];
  const t = thumuns[i];
  const sameAyahSplit =
    t.startSura === p.endSura && t.startAya === p.endAya && (p.partialEnd || t.partialStart);
  let nextS = p.endSura;
  let nextA = p.endAya + 1;
  if (nextA > byRef.get(nextS)) {
    nextS += 1;
    nextA = 1;
  }
  const cleanJoin = t.startSura === nextS && t.startAya === nextA;
  if (!sameAyahSplit && !cleanJoin) {
    ayahContiguous = false;
    console.error(
      `    discontinuity at thumun ${t.id}: prev ends ${p.endSura}:${p.endAya}${p.partialEnd ? " (partial)" : ""}, starts ${t.startSura}:${t.startAya}`,
    );
  }
}
ok(ayahContiguous, "thumuns join without gaps or overlaps");

// hygiene
ok(thumuns.every((t) => t.text && !t.text.includes("﴿")), "snippets clean (no ayah markers)");
ok(thumuns.every((t) => !t.text.includes("..")), "snippets have no baked ellipses");
ok(surahs.length === 114 && surahs[0].name === "الفاتحة", "114 surahs with names");
ok(
  thumuns.every((t) => byRef.has(t.startSura) && byRef.has(t.endSura)),
  "all sura refs resolve",
);

if (failures) {
  console.error(`\n${failures} check(s) FAILED`);
  process.exit(1);
}
console.log("\nAll data checks passed.");
