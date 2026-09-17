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
  // Headings are signposts, not prose. Leaving them in lets a post with nine
  // question-shaped headings pass the "asks the reader things" check without
  // asking the reader anything in the writing itself.
  t = t.replace(/^#{1,6}\s.*$/gm, ' ');
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
    // Contractions are the loudest single tell of generated prose. A hand-written
    // post runs about 15 per 1k; drafts that have never been contracted run 0.
    contractionPer1k: per1k((text.match(/\b\w+['\u2019](t|s|ve|ll|re|d|m)\b/gi) || []).length),
    // Sentence-initial "But" is how the corpus turns a point. Too few reads like a
    // report; too many reads like a tic, and the draft that prompted this rule had
    // one every 200 words where the corpus averages one every 580.
    butInitialPer1k: per1k((text.match(/(?:^|(?<=[.!?]\s))But\s/gm) || []).length),
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
    contractionPer1k: pick('contractionPer1k'),
    // 88 of 136 posts open no sentence with "But", so the median is 0 and useless
    // as a comparator. The mean is the honest baseline here.
    butInitialPer1k: all.reduce((n, x) => n + x.butInitialPer1k, 0) / Math.max(all.length, 1),
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
const notes = [];

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

// --- WARN: sentence-case title ---------------------------------------------
// Every post since 2014 uses Title Case; everything before it is sentence
// case, so running this over the early archive flags real history rather than
// false positives. Worth catching because the title is the one line that never
// appears in the body you are proofreading.
const MINOR = new Set([
  'a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'from', 'in', 'is', 'isn\'t',
  'nor', 'of', 'on', 'or', 'the', 'to', 'up', 'v', 'via', 'vs', 'with', 'be',
]);
const titleLine = lines.find((l) => /^title:\s/.test(l));
if (titleLine) {
  const title = titleLine.replace(/^title:\s*/, '').replace(/^["']|["']$/g, '').trim();
  const words = title.split(/\s+/).filter(Boolean);
  // Skip the first word, which is capitalised either way, and anything that
  // isn't a plain alphabetic word: acronyms, code, numbers and bracketed asides.
  const significant = words
    .slice(1)
    .filter((w) => /^[A-Za-z][a-z'-]*[?!:,]?$/.test(w))
    .map((w) => w.replace(/[?!:,]$/, ''));
  const lower = significant.filter((w) => !MINOR.has(w.toLowerCase()) && w[0] === w[0].toLowerCase());
  if (lower.length >= 2) {
    warns.push(`title looks like sentence case, posts since 2014 use Title Case: "${title}" (lowercase: ${lower.join(', ')})`);
  }
}

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

// --- WARN: contractions ----------------------------------------------------
// "do not"/"it is"/"cannot" throughout is the single clearest sign that prose was
// generated and never spoken aloud. Only flags low, never high.
if (m.contractionPer1k < base.contractionPer1k * 0.5) {
  warns.push(`few contractions: ${m.contractionPer1k.toFixed(1)}/1k vs corpus ${base.contractionPer1k.toFixed(1)}/1k (it's, isn't, we've, you'll)`);
}

// --- WARN: sentence-initial "But", in both directions ----------------------
// Most posts never do it, so only the high side is a fault.
if (m.butInitialPer1k > base.butInitialPer1k * 2) {
  warns.push(`"But" opens too many sentences: ${m.butInitialPer1k.toFixed(1)}/1k vs corpus mean ${base.butInitialPer1k.toFixed(1)}/1k`);
}

// --- WARN: ", which is X" tails --------------------------------------------
// The corpus almost never re-labels a sentence it has just finished. Generated
// prose does it constantly. The corpus equivalent is a full stop and a fresh
// short sentence.
const whichTails = (text.match(/,\s+which\s+(is|was|are|means)\b/gi) || []).length;
if (whichTails > 2) {
  warns.push(`${whichTails} ", which is ..." tails: the corpus ends the sentence and starts a new one instead`);
}

// --- WARN: "rather than" ---------------------------------------------------
const ratherThan = (text.match(/\brather than\b/gi) || []).length;
if (ratherThan > 3) {
  warns.push(`"rather than" used ${ratherThan} times: the corpus prefers "instead", or a negation and a fresh sentence`);
}

// --- Four checks a cold read turned up ---------------------------------------
// These read the raw document, not the prose extract, because they are about
// structure and reference rather than style.

const bodyStart = raw.replace(/^---[\s\S]*?\n---\n/, '');
const paras = bodyStart.split(/\n\n+/).map((b) => b.trim()).filter(Boolean);

// 1. Glossary obligation. Defining a term means the reader is entitled to meet it
// defined before they meet it used, so adding an entry retroactively breaks any
// earlier use. Only text ABOVE the glossary counts: terms leaning on each other
// inside the list are fine, and so are ordinary English words used as verbs.
const glossary = [...bodyStart.matchAll(/^-\s+\*\*([^*]+)\*\*\s*[:.]/gm)];
const ORDINARY = new Set(['run', 'agent', 'skills', 'harness']); // also plain English; check by hand
if (glossary.length >= 3) {
  const glossaryStart = glossary[0].index;
  const above = bodyStart.slice(0, glossaryStart).replace(/^#.*$/gm, ' ');
  for (const g of glossary) {
    const term = g[1].trim();
    if (term.split(/\s+/).length > 3) continue;
    if (ORDINARY.has(term.toLowerCase())) continue;
    const re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}s?\\b`, 'i');
    const used = re.exec(above);
    if (used) {
      const snippet = above.slice(Math.max(0, used.index - 45), used.index + 45).replace(/\s+/g, ' ').trim();
      warns.push(`glossary term "${term}" is used before the glossary: "...${snippet}..."`);
    }
  }
}

// 2. Pronouns lose their referent across a paragraph break. A pronoun that names
// what it refers to within a few words ("These are nine guidelines") is fine.
const BARE = /^(It|This|That|They|Those|These)\s+(is|are|was|were|does|do|did|has|have|had|will|would|can|could|should)\s+(.{0,40})/;
for (const para of paras) {
  if (/^[#\-*|>0-9]/.test(para)) continue;
  const m = BARE.exec(para);
  if (!m) continue;
  // a noun or number right after the verb means the sentence names its own subject
  if (/\b(a|an|the|\d|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|twenty)\b/i.test(m[3])) continue;
  warns.push(`paragraph opens with a bare "${m[1]}", which loses its referent across the break: "${para.slice(0, 70)}..."`);
}

// 2b. A pro-form pointing at something the reader has not met yet. Two shapes,
// both of which read as unambiguous while you are writing them because the
// referent is live in your own head:
//
//   "If you're building one"   - "one" stands in for a noun last named paragraphs
//                                ago, often across a heading.
//   "this is the list"         - a definite article on first mention, pointing
//                                forward at something not yet introduced.
//
// Check 2 above only inspects paragraph openers, so both survive it when they sit
// in a second clause. Transitions are where these cluster: they get written last,
// quickly, to bridge two blocks whose content is already settled.
// "one of two responses" is excluded: the partitive names its noun on the spot,
// so there is nothing for the reader to hunt for.
const PROFORM_ONE = /\b(building|running|reading|writing|publishing|shipping|doing|adopting|maintaining|want|wants|need|needs)\s+one\b(?!\s+of\b)/i;
const DEFINITE_FIRST = /\b(this|that|these|those|it)\s+(?:is|are|'s|was|were)\s+the\s+([a-z]{3,})\b/gi;
const stemFor = (w) => w.toLowerCase().replace(/(ies|es|s)$/, '');
// "This is the end", "it was the highest", "this is the second" are idiom or a
// superlative, not a noun being smuggled in on first mention. Measured against the
// published corpus: without these exclusions the check fires 12 times across 186
// posts and every one of them is one of these shapes.
const NOT_A_HEAD_NOUN = new Set([
  'end', 'point', 'start', 'beginning', 'case', 'way', 'time', 'day', 'moment',
  'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth',
  'ninth', 'tenth', 'last', 'next', 'other', 'same', 'only', 'real', 'main',
  'right', 'wrong',
]);
for (const para of paras) {
  if (/^[#\-*|>0-9]/.test(para)) continue;
  const one = PROFORM_ONE.exec(para);
  if (one) {
    warns.push(`bare "one" stands in for a noun the reader may have to hunt for: "${one[0]}" in "${para.slice(0, 70)}..."`);
  }
  for (const d of para.matchAll(DEFINITE_FIRST)) {
    const at = bodyStart.indexOf(para) + d.index;
    const before = bodyStart.slice(0, at).toLowerCase();
    const st = stemFor(d[2]);
    if (st.length < 3) continue;
    if (NOT_A_HEAD_NOUN.has(d[2].toLowerCase()) || /(est|er)$/.test(d[2])) continue;
    if (!new RegExp(`\\b${st}`).test(before)) {
      warns.push(`"${d[0]}" puts a definite article on a first mention, so "the ${d[2]}" points forward at something not yet introduced: "${para.slice(0, 70)}..."`);
    }
  }
}

// 2c. "N publishers using N different definitions" claims that the count of things
// and the count of *distinct* things are equal. That is a separate claim from either
// count, it is usually made by accident because the phrasing is neat, and it is
// nearly always the one that turns out to be unsupported. Zero hits across 186
// published posts, so a warn here is cheap.
// The bare "and" branch was dropped: it matched "three configurations and three
// attempts" (a multiplication) and "eleven scenarios to a hundred and eleven" (a
// range). The real catch, "seven publishers using seven definitions", uses a verb.
const N_FOR_N = /\b(two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|\d+)\s+\w+(?:\s+\w+){0,3}?\s+(?:using|with|giving|offering)\s+\1\b/i;
for (const para of paras) {
  if (/^[#\-*|>]/.test(para)) continue;
  const m = N_FOR_N.exec(para);
  // "from eleven scenarios to a hundred and eleven" is a range and a compound
  // number, not a distinctness claim. Matched one on a draft.
  if (m && !/ to | hundred | thousand /.test(m[0])) {
    warns.push(`"${m[0]}" claims the count of things equals the count of distinct things, which is a third claim on top of the two counts: "${para.slice(0, 70)}..."`);
  }
}

// 2d. British spelling. Measured: posts from 2024 onward run 21 British forms to 0
// American, while the pre-2018 archive is mixed at 49%, so an old post is not licence
// for an American form. Proper nouns keep their own spelling (MIT License, an
// organisation's registered name), so link text and inline code are excluded above.
const AMERICAN = [
  ['behavior', 'behaviour'], ['color', 'colour'], ['artifact', 'artefact'],
  ['center', 'centre'], ['analyze', 'analyse'], ['organize', 'organise'],
  ['recognize', 'recognise'], ['optimize', 'optimise'], ['summarize', 'summarise'],
  ['equalize', 'equalise'], ['normalize', 'normalise'], ['prioritize', 'prioritise'],
  ['categorize', 'categorise'], ['minimize', 'minimise'], ['maximize', 'maximise'],
  ['favor', 'favour'], ['labor', 'labour'], ['defense', 'defence'],
];
const spellingText = prose(raw).toLowerCase();
const found = [];
for (const [us, uk] of AMERICAN) {
  // The stem must start a word or follow a real prefix. Without this, "labor" matches
  // inside "elaborate" and "collaborate", which it did on a published post.
  const n = (spellingText.match(new RegExp(`\\b(?:re|un|mis|dis|over|under|pre|non)?${us}\\w*\\b`, 'g')) || []).length;
  if (n) found.push(`${us} (${n}) -> ${uk}`);
}
if (found.length) {
  errors.push(`${target}  American spelling in a British-spelling corpus: ${found.join(', ')}`);
}

// 2e. Per-draft banned words. A draft can declare its own kill-list in a comment:
//   <!-- banned: arm, cell, treatment -->
// Words struck from a piece for being confusing come back during later rewrites,
// because nothing re-runs the decision. On one post a banned term returned three
// times, undefined, in a piece whose glossary defined eleven other terms.
const banDecl = raw.match(/<!--[\s\S]*?\bbanned:\s*([^\n>]+?)\s*(?:-->|\n)/i);
if (banDecl) {
  const words = banDecl[1].split(',').map((w) => w.trim()).filter(Boolean);
  const hay = prose(raw);
  const hits = words
    .map((w) => [w, (hay.match(new RegExp(`\\b${w}s?\\b`, 'gi')) || []).length])
    .filter(([, n]) => n > 0);
  if (hits.length) {
    errors.push(`${target}  banned for this draft: ${hits.map(([w, n]) => `${w} (${n})`).join(', ')}`);
  }
}

// 2f. Saying a number instead of stating it, and other approximations reached for
// when the specific thing was available. The voice skill has said "name the thing"
// since the start and nothing ran it, so it caught nothing while three violations
// shipped in two days. A rule nobody executes is a note to self.
//
// Measured: "that large/big/..." inside a paragraph that already contains a digit
// occurs 3 times in 125,000 words of the corpus, two of them markup artefacts.
// "in your/their head" occurs once.
const MAGNITUDE = /\b(that|this)\s+(large|big|small|high|low|wide|long|short|expensive|cheap)\b/gi;
const IN_HEAD = /\b(in|into)\s+(your|their|his|her|my)\s+head\b/i;
for (const para of paras) {
  if (/^[#\-*|>]/.test(para)) continue;
  const head = IN_HEAD.exec(para);
  if (head) {
    warns.push(`"${head[0]}" stands in for what the reader actually has to do: "${para.slice(0, 60)}..."`);
  }
  if (!/\d/.test(para)) continue;           // no figure available, so no approximation
  for (const m of para.matchAll(MAGNITUDE)) {
    warns.push(`"${m[0]}" describes a quantity in a paragraph that already carries the number. State it: "${para.slice(0, 60)}..."`);
  }
}

// 3. A heading should say what its section says. Heuristic: one content word from
// the heading should survive into the section under it. Catches headings rewritten
// in a batch without re-reading what sits beneath them.
const STOP = new Set(['the','a','an','and','or','but','of','in','to','for','your','you','with','is','are','was','were','be','it','its','on','at','by','not','more','than','every','all','out','what','when','how','why','who','do','does','did','if','can','should','from','into','their','them','this','that','these','those','one','two','up','as','so','just','only','place','same','most','some','over','here']);
const stem = (w) => w.replace(/(ations?|ing|ed|es|s)$/, '');
const headBlocks = [...bodyStart.matchAll(/^(#{2,4})\s+(.+)$/gm)];
headBlocks.forEach((h, i) => {
  const title = h[2].replace(/^\d+\.\s*/, '');
  const next = i + 1 < headBlocks.length ? headBlocks[i + 1].index : bodyStart.length;
  const body = bodyStart.slice(h.index + h[0].length, next);
  const prose = body.replace(/^[-*|\d].*$/gm, ' ');       // a list-only section has no prose to match
  if (prose.split(/\s+/).filter(Boolean).length < 60) return;

  const content = (title.toLowerCase().match(/[a-z']{4,}/g) || []).filter((w) => !STOP.has(w));
  if (!content.length) return;
  if (!content.some((w) => prose.toLowerCase().includes(stem(w)))) {
    warns.push(`heading "${title}" shares no content word with its section, so check it still describes what is there`);
  }
});

// 4. If you state a count, count it. The arithmetic cannot be verified, so collect
// the claims in one place and let a human read them together.
const NUMWORD = /\b(two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/i;
const counted = sentences(bodyStart.replace(/^#.*$/gm, ' '))
  .filter((x) => NUMWORD.test(x))
  .map((x) => `    ${x.replace(/\s+/g, ' ').slice(0, 92)}`);
if (counted.length > 3) {
  notes.push(`${counted.length} sentences assert a count. Read them together and check they agree:\n${counted.slice(0, 14).join('\n')}${counted.length > 14 ? `\n    ... and ${counted.length - 14} more` : ''}`);
}

console.log(`baseline: ${base.posts} published posts`);
console.log(`checked:  ${target} (${m.words} words of prose)\n`);
for (const n of notes) console.log(`NOTE  ${n}`);
for (const w of warns) console.log(`WARN  ${w}`);
for (const e of errors) console.log(`ERROR ${e}`);
if (!warns.length && !errors.length) console.log('clean');
console.log(`\n${errors.length} error(s), ${warns.length} warning(s)`);
process.exit(errors.length ? 1 : 0);
