// Brings APT's changes to the unique lines into scripts/pob-uniques.ndjson (see AGENTS.md, PoB stat data):
//   pnpm pob-uniques [apt sha, default master] [--message <file>]
// It computes the unique lines of Awakened PoE Trade at the last synced commit (scripts/pob-uniques.apt-sha) and at
// the new one, and applies only what APT changed in between: a unique we edited by hand keeps our version and is
// reported as a conflict. Writes the commit message (what changed, which APT commits) to --message, else stdout.
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

interface Stat {
  ref: string;
  trade: { ids: Record<string, string[]> };
}

interface Item {
  refName: string;
  namespace: string;
  unique?: { fixedStats?: string[] };
}

interface Apt {
  lines: Map<string, string>;
  /** Stat number → its text, to show what a `fixed` change means */
  texts: Map<string, string>;
}

const REPO = 'SnosMe/awakened-poe-trade';
const FILE = join(import.meta.dirname, 'pob-uniques.ndjson');
const SHA_FILE = join(import.meta.dirname, 'pob-uniques.apt-sha');

const fetchText = async (url: string) => {
  const response = await fetch(url, { headers: { 'User-Agent': 'better-trading-pob-uniques-sync' } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.text();
};

const ndjson = <T>(text: string): T[] => text.split('\n').flatMap(line => (line ? [JSON.parse(line) as T] : []));

/**
 * One line per unique that rolls random mods (APT's `fixedStats`: the stats every copy has, by trade stat number) or
 * comes in several bases, keyed by name
 */
const uniqueLines = (stats: Stat[], items: Item[]) => {
  // `explicit.stat_123` and `fractured.stat_123` are one stat number
  const statNumbers = (ids: string[][]) => [...new Set(ids.flat().map(id => id.split('.')[1]!))];
  const numbers = new Map(stats.map(({ ref, trade }) => [ref, statNumbers(Object.values(trade.ids))]));
  const texts = new Map(stats.flatMap(({ ref }) => numbers.get(ref)!.map(n => [n, ref] as const)));
  const uniques = items.filter(item => item.namespace === 'UNIQUE' && item.unique);
  const bases = new Map<string, number>();
  for (const { refName } of uniques) bases.set(refName, (bases.get(refName) ?? 0) + 1);
  const lines = new Map<string, string>();
  for (const { refName, unique } of uniques) {
    const fixed = unique!.fixedStats?.flatMap(ref => numbers.get(ref) ?? []);
    const multiBase = bases.get(refName)! > 1;
    if ((!fixed && !multiBase) || lines.has(refName)) continue;
    lines.set(refName, JSON.stringify({ unique: refName, ...(fixed && { fixed }), ...(multiBase && { multiBase }) }));
  }
  return { lines, texts };
};

const fetchApt = async (sha: string): Promise<Apt> => {
  const data = `https://raw.githubusercontent.com/${REPO}/${sha}/renderer/public/data/en`;
  const [stats, items] = await Promise.all([fetchText(`${data}/stats.ndjson`), fetchText(`${data}/items.ndjson`)]);
  return uniqueLines(
    ndjson<Stat & { stats?: Stat[] }>(stats).flatMap(entry => entry.stats ?? [entry]),
    ndjson<Item>(items),
  );
};

type Change = { name: string; kind: 'added' | 'updated' | 'removed' | 'conflict'; from?: string; to?: string };

/** Three-way merge by unique name: APT's change from `old` to `next` is applied unless `ours` differs from `old` */
const merge = (old: Map<string, string>, next: Map<string, string>, ours: Map<string, string>) => {
  const result = new Map(ours);
  const changes: Change[] = [];
  for (const name of new Set([...old.keys(), ...next.keys()])) {
    const [from, to, mine] = [old.get(name), next.get(name), ours.get(name)];
    if (from === to || mine === to) continue;
    if (mine !== from) {
      changes.push({ name, kind: 'conflict', from: mine, to });
      continue;
    }
    if (to) result.set(name, to);
    else result.delete(name);
    changes.push({ name, kind: !from ? 'added' : !to ? 'removed' : 'updated', from, to });
  }
  return { result, changes };
};

/** `+ text` / `- text` for each `fixed` stat and `multiBase` that differs between two lines of one unique */
const describe = ({ from, to }: Change, texts: Map<string, string>) => {
  const parse = (line?: string) => (line ? (JSON.parse(line) as { fixed?: string[]; multiBase?: boolean }) : {});
  const [a, b] = [parse(from), parse(to)];
  const facts = (u: typeof a) => [
    ...(u.fixed ?? []).map(n => (texts.get(n) ?? n).replaceAll('\n', ' / ')),
    ...(u.multiBase ? ['(several bases)'] : []),
  ];
  const [before, after] = [facts(a), facts(b)];
  return [
    ...after.filter(f => !before.includes(f)).map(f => `    + ${f}`),
    ...before.filter(f => !after.includes(f)).map(f => `    - ${f}`),
  ];
};

const main = async () => {
  const args = process.argv.slice(2);
  const messageAt = args.indexOf('--message');
  const messageFile = messageAt >= 0 ? args.splice(messageAt, 2)[1] : undefined;
  const sha = (args[0] ?? (await fetchText(`https://api.github.com/repos/${REPO}/commits/master`)).trim()).match(
    /[0-9a-f]{40}/,
  )?.[0];
  if (!sha) throw new Error('usage: node scripts/pob-uniques-sync.ts [apt sha] [--message <file>]');
  const oldSha = (await readFile(SHA_FILE, 'utf8')).trim();
  if (oldSha === sha) return console.error(`already at APT ${sha.slice(0, 7)}`);

  const [old, next] = await Promise.all([fetchApt(oldSha), fetchApt(sha)]);
  const ours = new Map(
    ndjson<{ unique: string }>(await readFile(FILE, 'utf8')).map(u => [u.unique, JSON.stringify(u)]),
  );
  const { result, changes } = merge(old.lines, next.lines, ours);
  // ponytail: the synced SHA only moves with a change, so the next run diffs from the same commit (same result)
  if (!changes.length) return console.error(`no unique line changed in APT ${oldSha.slice(0, 7)}..${sha.slice(0, 7)}`);
  await writeFile(FILE, [...result.values()].join('\n') + '\n');
  await writeFile(SHA_FILE, sha + '\n');

  const compare = JSON.parse(await fetchText(`https://api.github.com/repos/${REPO}/compare/${oldSha}...${sha}`)) as {
    commits: { sha: string; commit: { message: string } }[];
  };
  const texts = new Map([...old.texts, ...next.texts]);
  const message = [
    `chore(pob): sync unique lines with APT ${sha.slice(0, 7)}`,
    '',
    'Uniques (fixed stats and several-bases flag):',
    ...changes.flatMap(change => [
      `- ${change.kind}: ${change.name}${change.kind === 'conflict' ? ' (edited here, kept ours; APT has the + lines)' : ''}`,
      ...describe(change, texts),
    ]),
    '',
    `APT ${oldSha.slice(0, 7)}..${sha.slice(0, 7)} (https://github.com/${REPO}/compare/${oldSha.slice(0, 7)}...${sha.slice(0, 7)}):`,
    ...compare.commits.map(c => `- ${c.sha.slice(0, 7)} ${c.commit.message.split('\n')[0]}`),
  ].join('\n');
  if (messageFile) await writeFile(messageFile, message + '\n');
  else console.log(message);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();

export { merge };
