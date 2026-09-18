/**
 * Shared leaderboard Worker.
 *   GET  /              → top 10 lifetime (best per player)
 *   GET  /daily         → top 10 for today (UTC)
 *   POST /start   {pid, mode?}              → {tok, seed}
 *   POST /score   {tok, pid, name, n, taps} → {lifetime, daily}
 * taps = [[beat, phase], ...] replayed against the seed (anti-cheat).
 */
import { replay } from '../../src/lib/game/replay';
import type {
	LbEntry,
	ScoreRequest,
	ScoreResponse,
	StartRequest,
	StartResponse,
} from '../../src/lib/game/lbApi';

export interface Env {
	DB: D1Database;
}

const H: HeadersInit = {
	'content-type': 'application/json',
	'access-control-allow-origin': '*',
	'access-control-allow-headers': 'content-type',
};

const J = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: H });

const STARTS_PER_MIN = 10;
const TOKEN_TTL = 12 * 3600e3;
const SLACK = 0.9;
const MIN_JITTER_MS = 6;
const JITTER_FROM = 12;

const dayUTC = (ms = Date.now()) => new Date(ms).toISOString().slice(0, 10);

const topEndless = async (db: D1Database): Promise<LbEntry[]> =>
	(
		await db
			.prepare(
				'SELECT substr(pid,1,4) id, name, MAX(n) n, t FROM scores GROUP BY pid ORDER BY n DESC, t ASC LIMIT 10'
			)
			.all()
	).results.map(({ t: _t, ...r }) => r as LbEntry);

const topDaily = async (db: D1Database, day: string): Promise<LbEntry[]> =>
	(
		await db
			.prepare(
				'SELECT substr(pid,1,4) id, name, MAX(n) n, t FROM daily_scores WHERE day = ? GROUP BY pid ORDER BY n DESC, t ASC LIMIT 10'
			)
			.bind(day)
			.all()
	).results.map(({ t: _t, ...r }) => r as LbEntry);

async function ensure(db: D1Database) {
	await db.batch([
		db.prepare(
			'CREATE TABLE IF NOT EXISTS daily_scores (pid TEXT NOT NULL, name TEXT NOT NULL, n INTEGER NOT NULL, day TEXT NOT NULL, t INTEGER NOT NULL)'
		),
		db.prepare('CREATE INDEX IF NOT EXISTS daily_scores_day ON daily_scores (day, n DESC)'),
	]);
}

export default {
	async fetch(req: Request, env: Env): Promise<Response> {
		if (req.method === 'OPTIONS') return new Response(null, { headers: H });
		const db = env.DB;
		const url = new URL(req.url);
		const path = url.pathname;
		const now = Date.now();
		await ensure(db);

		if (req.method === 'GET') {
			if (path === '/daily') return J(await topDaily(db, dayUTC(now)));
			return J(await topEndless(db));
		}

		const b = (await req.json().catch(() => ({}))) as Partial<StartRequest & ScoreRequest>;
		const pid = String(b.pid || '');
		if (!/^[0-9a-f-]{16,40}$/.test(pid)) return J({ error: 'bad pid' }, 400);

		if (path === '/start') {
			const ip = req.headers.get('cf-connecting-ip') || '?';
			const row = await db
				.prepare('SELECT COUNT(*) c FROM tokens WHERE ip = ? AND t0 > ?')
				.bind(ip, now - 60e3)
				.first<{ c: number }>();
			if ((row?.c ?? 0) >= STARTS_PER_MIN) return J({ error: 'slow down' }, 429);
			const tok = crypto.randomUUID();
			const seed = crypto.getRandomValues(new Uint32Array(1))[0];
			await db
				.prepare('INSERT INTO tokens (tok, pid, ip, t0, seed) VALUES (?, ?, ?, ?, ?)')
				.bind(tok, pid, ip, now, seed)
				.run();
			const body: StartResponse = { tok, seed };
			return J(body);
		}

		if (path === '/score') {
			const name = String(b.name || '')
				.trim()
				.slice(0, 12);
			const n = b.n;
			const tok = String(b.tok || '');
			if (!name || !Number.isInteger(n) || n! < 1 || n! > 10000) {
				return J({ error: 'bad score' }, 400);
			}
			const row = await db
				.prepare('SELECT pid, t0, used, seed FROM tokens WHERE tok = ?')
				.bind(tok)
				.first<{ pid: string; t0: number; used: number; seed: number }>();
			if (!row || row.used || row.pid !== pid || now - row.t0 > TOKEN_TTL) {
				return J({ error: 'bad token' }, 403);
			}
			const r = replay(row.seed, b.taps);
			if (typeof r === 'string' || !Array.isArray(b.taps) || b.taps.length !== n) {
				return J({ error: 'bad taps' }, 403);
			}
			if (now - row.t0 < r.ms * SLACK) return J({ error: 'too fast' }, 403);
			if (n >= JITTER_FROM && r.jitter < MIN_JITTER_MS) {
				return J({ error: 'too perfect' }, 403);
			}
			const day = dayUTC(now);
			await db.batch([
				db.prepare('UPDATE tokens SET used = 1 WHERE tok = ?').bind(tok),
				db
					.prepare('INSERT INTO scores (pid, name, n, t) VALUES (?, ?, ?, ?)')
					.bind(pid, name, n, now),
				db
					.prepare('INSERT INTO daily_scores (pid, name, n, day, t) VALUES (?, ?, ?, ?, ?)')
					.bind(pid, name, n, day, now),
			]);
			const body: ScoreResponse = {
				lifetime: await topEndless(db),
				daily: await topDaily(db, day),
			};
			return J(body);
		}
		return J({ error: 'not found' }, 404);
	},
};
