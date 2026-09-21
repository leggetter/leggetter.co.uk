#!/usr/bin/env node
/**
 * What the shootouts say.
 *
 * Reads the `deadball_matches` dataset and prints the handful of questions the
 * per-game and per-kick rows were kept to answer - several of which have been
 * sitting in the spec's open questions since Phase 1, unanswerable because
 * nobody was writing anything down.
 *
 * ## Running it
 *
 *   node scripts/deadball-stats.mjs            # production, real games only
 *   node scripts/deadball-stats.mjs --dev      # the dev dataset
 *   node scripts/deadball-stats.mjs --all      # include smoke tests
 *   node scripts/deadball-stats.mjs --sql "SELECT ..."   # anything else
 *
 * ## What it needs, and where that lives
 *
 * An API token with **Account → Account Analytics → Read**, and the account
 * id. Neither goes in this repository, which is public. Both are read from
 * the environment, or from `~/.config/deadball/`:
 *
 *   ~/.config/deadball/analytics-token
 *   ~/.config/deadball/account-id
 *
 * The token grants read access to every analytics dataset on the account, so
 * it is worth keeping to the narrowest permission that works - which is the
 * one above, and notably not "Account Settings".
 */

import { readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const CONFIG = join(homedir(), '.config', 'deadball');

/** Env first, then the file, then a message somebody can act on. */
function secret(envName, fileName, what) {
  const fromEnv = process.env[envName];
  if (fromEnv) return fromEnv.trim();
  try {
    const fromFile = readFileSync(join(CONFIG, fileName), 'utf8').trim();
    if (fromFile) return fromFile;
  } catch {
    /* falls through to the message below */
  }
  console.error(
    `Missing ${what}.\n\n` +
      `  Put it in ${join(CONFIG, fileName)}, or set ${envName}.\n\n` +
      (fileName === 'analytics-token'
        ? `  Create the token at My Profile -> API Tokens -> Create Token ->\n` +
          `  Custom token, with Account | Account Analytics | Read, scoped to\n` +
          `  this account and nothing else.\n`
        : `  It is the Account ID shown by \`npx wrangler whoami\`.\n`)
  );
  process.exit(1);
}

const TOKEN = secret('DEADBALL_ANALYTICS_TOKEN', 'analytics-token', 'the analytics API token');
const ACCOUNT = secret('CLOUDFLARE_ACCOUNT_ID', 'account-id', 'the Cloudflare account id');

const args = process.argv.slice(2);
const dataset = args.includes('--dev') ? 'deadball_matches_dev' : 'deadball_matches';

/**
 * Real games only, unless asked otherwise.
 *
 * `blob3` is the tag: empty for anything played by a person, `smoke` for a
 * test against production. Rows written before the tag existed have a winner
 * or an outcome sitting in that column, so this discards those too - which is
 * correct, because all of them came from a robot taking the same three shots.
 */
const REAL = args.includes('--all') ? '1 = 1' : "blob3 = ''";

async function sql(query) {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT}/analytics_engine/sql`,
    { method: 'POST', headers: { Authorization: `Bearer ${TOKEN}` }, body: query }
  );
  const text = await response.text();
  if (!response.ok) throw new Error(`${response.status}: ${text.slice(0, 400)}`);
  try {
    return JSON.parse(text).data ?? [];
  } catch {
    throw new Error(`Not JSON back: ${text.slice(0, 400)}`);
  }
}

/** Print rows as a small table, or say plainly that there are none. */
function show(title, note, rows) {
  console.log(`\n\x1b[1m${title}\x1b[0m`);
  if (note) console.log(`\x1b[2m${note}\x1b[0m`);
  if (rows.length === 0) {
    console.log('  (no rows yet)');
    return;
  }
  const columns = Object.keys(rows[0]);
  const width = (c) => Math.max(c.length, ...rows.map((r) => String(r[c] ?? '').length));
  const widths = Object.fromEntries(columns.map((c) => [c, width(c)]));
  const line = (cells) => '  ' + columns.map((c) => String(cells[c] ?? '').padEnd(widths[c])).join('  ');
  console.log('\x1b[2m' + line(Object.fromEntries(columns.map((c) => [c, c]))) + '\x1b[0m');
  for (const row of rows) console.log(line(row));
}

/**
 * Counts use `sum(_sample_interval)`, not `count()`.
 *
 * Analytics Engine downsamples a busy index and each surviving row then stands
 * for several. At this volume the interval is 1 and the two agree, which is
 * exactly why it is worth writing correctly now: the day they disagree is the
 * day somebody is reading a graph rather than writing this file.
 */
const N = 'sum(_sample_interval)';

const QUERIES = [
  {
    title: 'Shootouts, and who won',
    note: 'The coin flip decides who shoots first. Does shooting first win?',
    sql: `SELECT blob4 AS winner, ${N} AS games,
                 round(avg(double1)) AS avg_kicks,
                 round(avg(double6)) AS avg_seconds
          FROM ${dataset}
          WHERE blob2 = 'result' AND ${REAL}
          GROUP BY winner ORDER BY games DESC`,
  },
  {
    title: 'How many get finished',
    note: 'An abandoned row means the room hit its hour. Seats says whether anybody ever joined.',
    sql: `SELECT blob4 AS ending, double7 AS seats, ${N} AS games
          FROM ${dataset}
          WHERE blob2 = 'result' AND ${REAL}
          GROUP BY ending, seats ORDER BY games DESC`,
  },
  {
    title: 'Where people actually shoot',
    note: "Open question 5, unanswered since Phase 1: both early testers found one spot and stayed there.",
    sql: `SELECT CASE
                   WHEN double2 < -0.55 THEN 'far left'
                   WHEN double2 < -0.2  THEN 'left'
                   WHEN double2 <= 0.2  THEN 'middle'
                   WHEN double2 <= 0.55 THEN 'right'
                   ELSE 'far right' END AS aimed,
                 ${N} AS kicks,
                 round(100 * sum(if(blob4 = 'goal', _sample_interval, 0)) / ${N}) AS scored_pct
          FROM ${dataset}
          WHERE blob2 = 'kick' AND ${REAL}
          GROUP BY aimed ORDER BY kicks DESC`,
  },
  {
    title: 'Are the three shot styles used',
    note: 'Built in Phase 8. If everyone leaves it on finesse, the button is decoration.',
    sql: `SELECT blob6 AS style, ${N} AS kicks,
                 round(100 * sum(if(blob4 = 'goal', _sample_interval, 0)) / ${N}) AS scored_pct
          FROM ${dataset}
          WHERE blob2 = 'kick' AND ${REAL}
          GROUP BY style ORDER BY kicks DESC`,
  },
  {
    title: 'Is the wall beatable by people',
    note: 'Tuned against a simulation. This is the same question asked of humans.',
    sql: `SELECT blob5 AS spot, double7 AS wall, ${N} AS kicks,
                 round(100 * sum(if(blob4 = 'goal', _sample_interval, 0)) / ${N}) AS scored_pct,
                 round(100 * sum(if(blob4 = 'blocked', _sample_interval, 0)) / ${N}) AS blocked_pct
          FROM ${dataset}
          WHERE blob2 = 'kick' AND ${REAL}
          GROUP BY spot, wall ORDER BY spot, wall`,
  },
  {
    title: 'What happens to a kick',
    note: null,
    sql: `SELECT blob4 AS outcome, ${N} AS kicks
          FROM ${dataset}
          WHERE blob2 = 'kick' AND ${REAL}
          GROUP BY outcome ORDER BY kicks DESC`,
  },
  {
    title: 'Did the two clients ever disagree',
    note: 'Open question 3: cross-client determinism. Anything but zero means a stale bundle.',
    sql: `SELECT ${N} AS games, sum(double5) AS total_divergences, max(double5) AS worst_game
          FROM ${dataset}
          WHERE blob2 = 'result' AND ${REAL}`,
  },
];

const custom = args.indexOf('--sql');
if (custom !== -1) {
  const query = args[custom + 1];
  if (!query) {
    console.error('--sql needs a query after it.');
    process.exit(1);
  }
  console.log(JSON.stringify(await sql(query), null, 2));
  process.exit(0);
}

console.log(
  `\x1b[2mdataset ${dataset}, ${args.includes('--all') ? 'every row' : 'real games only'}\x1b[0m`
);

let failed = 0;
for (const q of QUERIES) {
  try {
    show(q.title, q.note, await sql(q.sql));
  } catch (error) {
    failed++;
    console.log(`\n\x1b[1m${q.title}\x1b[0m\n  \x1b[31m${error.message}\x1b[0m`);
  }
}
console.log('');
if (failed) process.exit(1);
