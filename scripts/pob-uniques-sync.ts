// Brings a game's source's changes to the unique lines into its list (see AGENTS.md, PoB stat data):
//   pnpm pob-uniques [poe1|poe2] [source sha, default master] [--message <file>]
// PoE 1 follows Awakened PoE Trade into scripts/pob-uniques.ndjson, PoE 2 Exiled Exchange 2 into
// scripts/pob-uniques-poe2.ndjson; the game defaults to poe1. It computes the source's unique lines at the last synced
// commit (the game's sha file) and at the new one, and applies only what the source changed in between: a unique we
// edited by hand keeps our version and is reported as a conflict. Without a sha file every line is added. Writes the
// commit message (what changed, which source commits) to --message, else stdout.
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

interface Stat {
  ref: string;
  trade: { ids: Record<string, string[]> | null };
}

interface Item {
  refName?: string;
  namespace: string;
  unique?: { base?: string; fixedStats?: string[] };
}

interface Source {
  lines: Map<string, string>;
  /** Stat number → its text, to show what a `fixed` change means */
  texts: Map<string, string>;
}

// Both keep their data at renderer/public/data/en on master
const GAMES = {
  poe1: {
    label: 'APT',
    game: '',
    repo: 'SnosMe/awakened-poe-trade',
    file: 'pob-uniques.ndjson',
    shaFile: 'pob-uniques.apt-sha',
  },
  poe2: {
    label: 'EE2',
    game: 'PoE 2 ',
    repo: 'Kvan7/Exiled-Exchange-2',
    file: 'pob-uniques-poe2.ndjson',
    shaFile: 'pob-uniques-poe2.ee2-sha',
  },
};
type Game = keyof typeof GAMES;

const fetchText = async (url: string) => {
  const response = await fetch(url, { headers: { 'User-Agent': 'better-trading-pob-uniques-sync' } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.text();
};

const ndjson = <T>(text: string): T[] => text.split('\n').flatMap(line => (line ? [JSON.parse(line) as T] : []));

/**
 * One line per unique that rolls random mods (the source's `fixedStats`: the stats every copy has, by trade stat
 * number) or comes in several bases, keyed by name
 */
const uniqueLines = (stats: Stat[], items: Item[]) => {
  // `explicit.stat_123` and `fractured.stat_123` are one stat number
  const statNumbers = (ids: string[][]) => [...new Set(ids.flat().map(id => id.split('.')[1]!))];
  // EE2 has `ids: null` on "Grants Skill" stats
  const numbers = new Map(stats.map(({ ref, trade }) => [ref, statNumbers(Object.values(trade.ids ?? {}))]));
  const texts = new Map(stats.flatMap(({ ref }) => numbers.get(ref)!.map(n => [n, ref] as const)));
  // EE2 lists a few uniques without a name and repeats some on one base (Berek's Grip): distinct bases count
  const uniques = items.flatMap(({ namespace, refName, unique }) =>
    namespace === 'UNIQUE' && unique && refName ? [{ refName, unique }] : [],
  );
  const bases = new Map<string, Set<string | undefined>>();
  for (const { refName, unique } of uniques) bases.set(refName, (bases.get(refName) ?? new Set()).add(unique.base));
  const lines = new Map<string, string>();
  for (const { refName, unique } of uniques) {
    const fixed = unique.fixedStats?.flatMap(ref => numbers.get(ref) ?? []);
    const multiBase = bases.get(refName)!.size > 1;
    if ((!fixed && !multiBase) || lines.has(refName)) continue;
    lines.set(refName, JSON.stringify({ unique: refName, ...(fixed && { fixed }), ...(multiBase && { multiBase }) }));
  }
  return { lines, texts };
};

const fetchSource = async (game: Game, sha: string): Promise<Source> => {
  const data = `https://raw.githubusercontent.com/${GAMES[game].repo}/${sha}/renderer/public/data/en`;
  const [stats, items] = await Promise.all([fetchText(`${data}/stats.ndjson`), fetchText(`${data}/items.ndjson`)]);
  return uniqueLines(
    ndjson<Stat & { stats?: Stat[] }>(stats).flatMap(entry => entry.stats ?? [entry]),
    ndjson<Item>(items),
  );
};

type Change = { name: string; kind: 'added' | 'updated' | 'removed' | 'conflict'; from?: string; to?: string };

/** Three-way merge by unique name: the source's change from `old` to `next` applies unless `ours` differs from `old` */
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
  const game: Game = args[0] === 'poe1' || args[0] === 'poe2' ? (args.shift() as Game) : 'poe1';
  const { label: source, game: prefix, repo, ...names } = GAMES[game];
  const file = join(import.meta.dirname, names.file);
  const shaFile = join(import.meta.dirname, names.shaFile);
  const sha = (args[0] ?? (await fetchText(`https://api.github.com/repos/${repo}/commits/master`)).trim()).match(
    /[0-9a-f]{40}/,
  )?.[0];
  if (!sha) throw new Error('usage: node scripts/pob-uniques-sync.ts [poe1|poe2] [source sha] [--message <file>]');
  const readOr = (path: string) => readFile(path, 'utf8').catch(() => '');
  const oldSha = (await readOr(shaFile)).trim();
  if (oldSha === sha) return console.error(`already at ${source} ${sha.slice(0, 7)}`);

  const empty: Source = { lines: new Map(), texts: new Map() };
  const [old, next] = await Promise.all([oldSha ? fetchSource(game, oldSha) : empty, fetchSource(game, sha)]);
  const ours = new Map(ndjson<{ unique: string }>(await readOr(file)).map(u => [u.unique, JSON.stringify(u)]));
  const { result, changes } = merge(old.lines, next.lines, ours);
  const range = `${oldSha.slice(0, 7) || 'start'}..${sha.slice(0, 7)}`;
  // ponytail: the synced SHA only moves with a change, so the next run diffs from the same commit (same result)
  if (!changes.length) return console.error(`no unique line changed in ${source} ${range}`);
  await writeFile(file, [...result.values()].join('\n') + '\n');
  await writeFile(shaFile, sha + '\n');

  const commits = oldSha
    ? (
        JSON.parse(await fetchText(`https://api.github.com/repos/${repo}/compare/${oldSha}...${sha}`)) as {
          commits: { sha: string; commit: { message: string } }[];
        }
      ).commits
    : [];
  const texts = new Map([...old.texts, ...next.texts]);
  const message = [
    `chore(pob): sync ${prefix}unique lines with ${source} ${sha.slice(0, 7)}`,
    '',
    'Uniques (fixed stats and several-bases flag):',
    ...changes.flatMap(change => [
      `- ${change.kind}: ${change.name}${change.kind === 'conflict' ? ` (edited here, kept ours; ${source} has + lines)` : ''}`,
      ...describe(change, texts),
    ]),
    ...(oldSha
      ? [
          '',
          `${source} ${range} (https://github.com/${repo}/compare/${oldSha.slice(0, 7)}...${sha.slice(0, 7)}):`,
          ...commits.map(c => `- ${c.sha.slice(0, 7)} ${c.commit.message.split('\n')[0]}`),
        ]
      : []),
  ].join('\n');
  if (messageFile) await writeFile(messageFile, message + '\n');
  else console.log(message);
};

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();

export { fetchSource, merge };
