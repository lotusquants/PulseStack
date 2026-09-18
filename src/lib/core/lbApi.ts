/** Shared leaderboard API contract (client + Worker). */

export type LbEntry = { id: string; name: string; n: number };

export type StartRequest = {
	pid: string;
};

export type StartResponse = {
	tok: string;
	seed: number;
};

export type ScoreRequest = {
	pid: string;
	tok: string;
	name: string;
	n: number;
	taps: [number, number][];
};

export type ScoreResponse = {
	lifetime: LbEntry[];
	daily: LbEntry[];
};

export type LbError = {
	error: string;
};

export type StartResult = StartResponse | LbError;
export type ScoreResult = ScoreResponse | LbError;
