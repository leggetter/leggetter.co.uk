#!/usr/bin/env node
// Voice metrics per section, against the published corpus.
//
// `npm run voice` averages over a whole post, and an average hides drift that
// sits in one part of it. On the agent-evals post the document looked clean
// while two newly written sections had zero hedging against a corpus rate near
// four per thousand words, and no questions at all. Both were flat, asserting
// prose, which is the loudest tell that something other than Phil wrote it.
//
//   node scripts/voice-by-section.mjs src/content/blog/<post>.md
//
// Reports each section's z-like deviation from the corpus and prints the
// outliers first. A section is only worth reading if a number says so.

import { readFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';

const BLOG = 'src/content/blog';
const target = process.argv[2];
if (!target) {
  console.error('usage: node scripts/voice-by-section.mjs <post.md>');
  process.exit(1);
}

/** Prose only: no frontmatter, code, tables, headings, link targets or images. */
function prose(raw) {
  let t = raw.replace(/^---[\s\S]*?\n---\n/, '');
  t = t.replace(/<!--[\s\S]*?-->/g, ' ');
  t = t.replace(/```[\s\S]*?```/g, ' ');
  t = t.replace(/^\s*\|.*\|\s*$/gm, ' ');
  t = t.replace(/!\[[^\]]*\]\([^)]*\)/g, ' ');
  t = t.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
  t = t.replace(/`[^`]*`/g, ' ');
  t = t.replace(/^#{1,6} .*$/gm, ' ');
  return t;
}

const sentences = (t) => t.split(/(?<=[.!?])\s+/).filter((s) => s.trim());
const median = (a) => {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

const HEDGE = /\b(may|might|likely|often|probably|usually|sometimes|tend to|I think|I'd)\b/gi;
const CONTR = /\b\w+['’](s|t|re|ve|ll|d|m)\b/g;
const YOU = /\byou(r|rs)?\b/gi;
const BUT = /(?:^|(?<=[.!?]\s))But\b/g;

function metrics(text) {
  const p = prose(text);
  const words = p.split(/\s+/).filter(Boolean).length;
  if (words < 40) return null;                    // too small to say anything
  const lens = sentences(p).map((s) => s.split(/\s+/).filter(Boolean).length);
  const per1k = (re) => ((p.match(re) || []).length * 1000) / words;
  return {
    words,
    median: median(lens),
    hedge: per1k(HEDGE),
    contractions: per1k(CONTR),
    you: per1k(YOU),
    questions: ((p.match(/\?/g) || []).length * 1000) / words,
    butInitial: per1k(BUT),
    parens: per1k(/\(/g),
    fragments: (100 * lens.filter((n) => n <= 6).length) / (lens.length || 1),
  };
}

// --- corpus baseline -------------------------------------------------------
// Aggregate per post. Concatenating them first runs the end of one post into
// the start of the next, which inflated the median sentence from 20 to 28.
function corpusBaseline() {
  const lens = [];
  let words = 0;
  const counts = { hedge: 0, contractions: 0, you: 0, questions: 0, butInitial: 0, parens: 0 };
  for (const f of readdirSync(BLOG)) {
    if (!f.endsWith('.md') || f === basename(target)) continue;
    const p = prose(readFileSync(join(BLOG, f), 'utf8'));
    const w = p.split(/\s+/).filter(Boolean).length;
    if (w < 40) continue;
    words += w;
    for (const s of sentences(p)) lens.push(s.split(/\s+/).filter(Boolean).length);
    counts.hedge += (p.match(HEDGE) || []).length;
    counts.contractions += (p.match(CONTR) || []).length;
    counts.you += (p.match(YOU) || []).length;
    counts.questions += (p.match(/\?/g) || []).length;
    counts.butInitial += (p.match(BUT) || []).length;
    counts.parens += (p.match(/\(/g) || []).length;
  }
  const k = 1000 / words;
  return {
    words, median: median(lens),
    hedge: counts.hedge * k, contractions: counts.contractions * k,
    you: counts.you * k, questions: counts.questions * k,
    butInitial: counts.butInitial * k, parens: counts.parens * k,
    fragments: (100 * lens.filter((n) => n <= 6).length) / lens.length,
  };
}
const base = corpusBaseline();

// --- sections --------------------------------------------------------------
const raw = readFileSync(target, 'utf8');
const body = raw.replace(/^---[\s\S]*?\n---\n/, '');
const heads = [...body.matchAll(/^(#{2,3})\s+(.+)$/gm)];

const rows = [];
heads.forEach((h, i) => {
  const end = i + 1 < heads.length ? heads[i + 1].index : body.length;
  const m = metrics(body.slice(h.index + h[0].length, end));
  if (m) rows.push({ title: h[2].trim(), ...m });
});

// Deviation: how far each section sits from the corpus, summed across the
// measures that matter most for "does this sound like a person".
// A section can only be an outlier on a measure if the corpus rate predicts
// enough of them to notice. Zero questions in 200 words is ordinary; zero in
// 700 is a choice. Score each measure as a deviation in units of its own
// expected count, and ignore measures the section is too small to test.
const KEYS = ['hedge', 'questions', 'contractions', 'you'];
function zScore(r, k) {
  const expected = (base[k] * r.words) / 1000;
  if (expected < 3) return null;                 // too small to say anything
  const observed = (r[k] * r.words) / 1000;
  return (observed - expected) / Math.sqrt(expected);
}
for (const r of rows) {
  r.z = {};
  let worst = 0;
  for (const k of KEYS) {
    const z = zScore(r, k);
    if (z === null) continue;
    r.z[k] = z;
    if (Math.abs(z) > Math.abs(worst)) worst = z;
  }
  // a short section is allowed a short median; only flag a long flat one
  r.medianOff = r.words > 300 && r.median < base.median * 0.6;
  r.dev = Math.abs(worst);
  r.worstKey = Object.keys(r.z).find((k) => r.z[k] === worst) || '';
}
rows.sort((a, b) => b.dev - a.dev);

const fmt = (n) => (n >= 100 ? n.toFixed(0) : n.toFixed(1));
const cols = [
  ['words', 'words'], ['median', 'med sent'], ['hedge', 'hedge'],
  ['questions', 'quest'], ['contractions', 'contr'], ['you', 'you'],
  ['parens', 'parens'], ['fragments', 'frag %'],
];

console.log(`\n${target}`);
console.log('per 1,000 words unless noted. sorted by distance from the corpus.\n');
console.log('  ' + 'section'.padEnd(42) + cols.map(([, l]) => l.padStart(9)).join(''));
console.log('  ' + 'CORPUS (185 posts)'.padEnd(42) +
  cols.map(([k]) => (k === 'words' ? String(base.words) : fmt(base[k])).padStart(9)).join(''));
console.log('  ' + '-'.repeat(42 + cols.length * 9));

for (const r of rows) {
  const flag = r.dev > 2 || r.medianOff ? '!' : ' ';
  console.log(flag + ' ' + r.title.slice(0, 41).padEnd(42) +
    cols.map(([k]) => (k === 'words' ? String(r.words) : fmt(r[k])).padStart(9)).join(''));
}

const worst = rows.filter((r) => r.dev > 2 || r.medianOff);
console.log(`\n${worst.length} of ${rows.length} sections marked.`);
for (const r of worst) {
  const why = r.dev > 2
    ? `${r.worstKey} is ${r.z[r.worstKey] > 0 ? 'high' : 'low'} (z ${r.z[r.worstKey].toFixed(1)})`
    : `median sentence ${r.median} against a corpus ${base.median}`;
  console.log(`  ${r.title.slice(0, 44).padEnd(46)} ${why}`);
}
console.log('\nThe table is for reading, not gating. A marked section is worth a look;');
console.log('an unmarked one can still be wrong in ways no count reaches.\n');
