/**
 * Voice check for blog posts. Measures a draft against the voice of the
 * published corpus and flags the tics that make writing read as generated.
 *
 *   node scripts/check-voice.mjs src/content/blog/YYYY-MM-DD-slug.md
 *   npm run voice -- src/content/blog/YYYY-MM-DD-slug.md
 *
 * Every threshold is derived from the published posts at runtime, not
 * hardcoded, so the baseline stays true as the corpus grows. Drafts are
 * excluded from the baseline so a work-in-progress can't move its own target.
 *
 * ERRORs are things the corpus does zero of, or that carry no information.
 * WARNs are distribution drift: worth a look, not automatically wrong.
 */

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BLOG = fileURLToPath(new URL('../src/content/blog/', import.meta.url));

/** Sentences that announce a point instead of making it. */
const SCAFFOLDING = [
  /\bOne more thing\b/i,
  /\bhere'?s the (part|thing|kicker|rub|catch)\b/i,
  /\bThis is where it gets\b/i,
  /\bthe telling (artifact|detail|part)\b/i,
  /\bcaught me out\b/i,
  /\bHere'?s the thing\b/i,
  /\bThe thing is\b/i,
  /\bWhat'?s (interesting|telling|striking) (is|here)\b/i,
  /\bMake no mistake\b/i,
  /\bIt'?s (important|worth) (to note|noting) that\b/i,
  /\bLet'?s be clear\b/i,
  /\bBut here'?s\b/i,
  /\bstay with me\b/i,
];

/** Main clause + comma + short withholding teaser. */
const TEASER = /,\s+and it'?s (recent|new|worse|subtle|important|deliberate|not)\b[^.]*\./i;

/** A heading that ends in a bare pronoun only resolves from its neighbour. */
const DANGLING_HEAD = /\b(one|it|this|that|these|those|them|they)\s*[?.!]?\s*$/i;

const frontmatter = (raw) => {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return m ? m[1] : '';
};

const isDraft = (raw) => /^draft:\s*true\s*$/m.test(frontmatter(raw));

/** Prose only: no frontmatter, html, code, tables or list scaffolding. */
function prose(raw) {
  let t = raw.replace(/^---[\s\S]*?\n---\n/, '');
  t = t.replace(/```[\s\S]*?```/g, ' ');
  t = t.replace(/^\s*\|.*\|\s*$/gm, ' ');
  t = t.replace(/<[^>]+>/g, ' ');
  t = t.replace(/^\s*[-*]\s.*$/gm, ' ');
  t = t.replace(/^\s*>.*$/gm, ' ');           // block quotes are other people's words
  t = t.replace(/`[^`]*`/g, 'X');
  t = t.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1');
  return t;
}

const sentences = (t) =>
  t.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.split(/\s+/).length > 1);

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
};

function metrics(text) {
  const sents = sentences(text);
  const lens = sents.map((s) => s.split(/\s+/).length);
  const words = Math.max(text.split(/\s+/).length, 1);
  const per1k = (n) => (n / words) * 1000;
  return {
    words,
    medianSentence: lens.length ? median(lens) : 0,
    fragmentPct: lens.length ? (lens.filter((n) => n <= 6).length / lens.length) * 100 : 0,
    emDashPer1k: per1k((text.match(/—/g) || []).length),
    youPer1k: per1k((text.match(/\b(you|your|you're|yourself)\b/gi) || []).length),
    questionPer1k: per1k((text.match(/\?/g) || []).length),
  };
}

async function baseline() {
  const files = (await readdir(BLOG)).filter((f) => /\.(md|markdown)$/.test(f));
  const all = [];
  for (const f of files) {
    const raw = await readFile(path.join(BLOG, f), 'utf8');
    if (isDraft(raw)) continue;
    const m = metrics(prose(raw));
    if (m.words > 250) all.push(m);
  }
  const pick = (k) => median(all.map((m) => m[k]));
  return {
    posts: all.length,
    medianSentence: pick('medianSentence'),
    fragmentPct: pick('fragmentPct'),
    youPer1k: pick('youPer1k'),
    questionPer1k: pick('questionPer1k'),
    emDashTotal: all.reduce((n, m) => n + m.emDashPer1k, 0),
  };
}

const target = process.argv[2];
if (!target) {
  console.error('usage: node scripts/check-voice.mjs <post.md>');
  process.exit(2);
}

const raw = await readFile(target, 'utf8');
const text = prose(raw);
const base = await baseline();
const m = metrics(text);
const lines = raw.split('\n');

const errors = [];
const warns = [];

// --- ERROR: em-dashes. The corpus contains zero. ---------------------------
lines.forEach((l, i) => {
  if (l.includes('—')) errors.push(`${target}:${i + 1}  em-dash — (corpus uses " - "): ${l.trim().slice(0, 90)}`);
});

// --- ERROR: scaffolding sentences ------------------------------------------
for (const s of sentences(text)) {
  const hit = SCAFFOLDING.find((re) => re.test(s));
  if (hit) {
    const n = lines.findIndex((l) => l.includes(s.slice(0, 40)));
    errors.push(`${target}:${n > -1 ? n + 1 : '?'}  announces a point instead of making it: "${s.slice(0, 90)}"`);
  }
}
if (TEASER.test(text)) {
  const s = sentences(text).find((x) => TEASER.test(x)) ?? '';
  errors.push(`${target}  withholding teaser clause: "${s.slice(0, 90)}"`);
}

// --- ERROR: headings that don't stand alone --------------------------------
lines.forEach((l, i) => {
  if (/^#{2,4}\s/.test(l)) {
    const t = l.replace(/^#+\s*/, '').trim();
    if (DANGLING_HEAD.test(t)) {
      errors.push(`${target}:${i + 1}  heading ends in a bare pronoun, so it only resolves from its neighbour: "${t}"`);
    }
  }
});

// --- WARN: rhythm and reader address ---------------------------------------
const drift = (label, got, want, tol, unit = '') => {
  if (Math.abs(got - want) > tol) {
    warns.push(`${label}: ${got.toFixed(1)}${unit} vs corpus ${want.toFixed(1)}${unit}`);
  }
};
drift('median sentence length', m.medianSentence, base.medianSentence, 3, ' words');
drift('fragments (<=6 words)', m.fragmentPct, base.fragmentPct, 6, '%');
if (m.youPer1k < base.youPer1k * 0.6) {
  warns.push(`reader address low: "you" ${m.youPer1k.toFixed(1)}/1k vs corpus ${base.youPer1k.toFixed(1)}/1k`);
}
if (m.questionPer1k < base.questionPer1k * 0.5) {
  warns.push(`few questions to the reader: ${m.questionPer1k.toFixed(1)}/1k vs corpus ${base.questionPer1k.toFixed(1)}/1k`);
}

console.log(`baseline: ${base.posts} published posts`);
console.log(`checked:  ${target} (${m.words} words of prose)\n`);
for (const w of warns) console.log(`WARN  ${w}`);
for (const e of errors) console.log(`ERROR ${e}`);
if (!warns.length && !errors.length) console.log('clean');
console.log(`\n${errors.length} error(s), ${warns.length} warning(s)`);
process.exit(errors.length ? 1 : 0);
