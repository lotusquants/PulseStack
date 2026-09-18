import type { PlayMode } from './constants';
import type { LbEntry, ScoreRequest, ScoreResponse, StartResponse } from './lbApi';
import { LB_URL } from './platform';
import { pref, save } from './storage';

export type { LbEntry };

export const lbKey = (mode: PlayMode) => (mode === 'daily' ? 'lbDaily' : 'lb');

export const lbGet = (mode: PlayMode = 'endless'): LbEntry[] => {
	try {
		const l = JSON.parse(pref(lbKey(mode), '[]'));
		return Array.isArray(l) ? l : [];
	} catch {
		return [];
	}
};

export const lbRank = (l: LbEntry[], pid: string, n: number) =>
	l.findIndex((e) => e.id === pid.slice(0, 4) && e.n === n) + 1;

export async function postStart(pid: string, mode: PlayMode): Promise<Partial<StartResponse>> {
	const r = await fetch(LB_URL + '/start', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ pid, mode }),
	});
	return r.json() as Promise<Partial<StartResponse>>;
}

export async function postScore(
	body: ScoreRequest
): Promise<Partial<ScoreResponse> & { error?: string }> {
	const r = await fetch(LB_URL + '/score', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify(body),
	});
	return r.json() as Promise<Partial<ScoreResponse> & { error?: string }>;
}

export async function fetchBoard(mode: PlayMode): Promise<LbEntry[] | null> {
	const url = mode === 'daily' ? LB_URL + '/daily' : LB_URL;
	try {
		const l = await fetch(url).then((r) => r.json());
		if (!Array.isArray(l)) return null;
		save(lbKey(mode), JSON.stringify(l));
		return l as LbEntry[];
	} catch {
		return null;
	}
}

export function lbAddLocal(pid: string, mode: PlayMode, name: string, n: number): number {
	const l = lbGet(mode).filter((e) => e.id !== pid.slice(0, 4) || e.n >= n);
	if (!l.some((e) => e.id === pid.slice(0, 4))) l.push({ id: pid.slice(0, 4), name, n });
	l.sort((a, b) => b.n - a.n);
	const top = l.slice(0, 10);
	save(lbKey(mode), JSON.stringify(top));
	return lbRank(top, pid, n);
}
