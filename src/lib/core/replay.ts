/** Shared by client + Worker — single source of truth for anti-cheat. */

export const MIN_PERIOD = 430;
export const REST = 1200;

export const mulberry32 = (a: number) => () => {
	a = (a + 0x6d2b79f5) | 0;
	let t = Math.imul(a ^ (a >>> 15), 1 | a);
	t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
	return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

export type Rng = () => number;

/** Captured at load so a patched Math.random can't make the beat predictable. */
export const makeCryptoRng = (): Rng => {
	const u = new Uint32Array(1);
	return () => {
		crypto.getRandomValues(u);
		return u[0] / 4294967296;
	};
};

/** Anchor beat shaves ~0.8% per block down to MIN_PERIOD. From 30 on, every beat is random in 55%..145% of the anchor. */
export const periodFor = (n: number, rng: Rng, minPeriod = MIN_PERIOD, rest = REST) => {
	const b = Math.max(minPeriod, rest * Math.pow(0.992, n));
	return n >= 30 ? b * (0.55 + 0.9 * rng()) : b;
};

export type Tap = [beat: number, phase: number];

/** First block is this fraction of the canvas; a block under DEAD_PX ends the run. */
export const FIRST_W = 0.62;
export const DEAD_PX = 7;
export const MIN_Q = 0.04;
/** Above this pulse fraction a tap snaps to perfect; streak earns a little slack. */
export const snapThresh = (n: number, streak: number) => {
	const bonus = Math.min(streak, 8) * 0.008 * (n >= 30 ? 0.5 : 1);
	return Math.max(0.85, 0.94 - bonus);
};
/** Width fraction kept by a tap at this phase: pulse height, snapped to 1 near the peak. */
export const cutFor = (phase: number, n: number, streak: number) => {
	let q = 0.5 - 0.5 * Math.cos(2 * Math.PI * phase);
	if (q > snapThresh(n, streak)) q = 1;
	return Math.max(q, MIN_Q);
};

export type ReplayOk = { ms: number; jitter: number; w: number };

/** `string` = rejection reason; object = accepted timeline metrics. */
export type ReplayResult = ReplayOk | string;

/**
 * `canvasW` lets the server replay the tower's width too: a run whose tower died before its
 * last tap can't have happened. Client pulse lags the tap by up to a frame, so death is
 * judged at half DEAD_PX. ponytail: fixed slack; widen if honest runs get 'dead tower'.
 */
export function replay(seed: number, taps: unknown, canvasW = 0): ReplayResult {
	if (!Array.isArray(taps) || taps.length < 1 || taps.length > 10001) return 'bad taps';
	const rng = mulberry32(seed);
	let blocks = 1;
	let beat = 0;
	let L = periodFor(1, rng);
	let ms = 0;
	let last = -1;
	let w = FIRST_W * canvasW;
	let streak = 0;
	const dev: number[] = [];
	for (const t of taps) {
		if (
			!Array.isArray(t) ||
			!Number.isInteger(t[0]) ||
			t[0] <= last ||
			typeof t[1] !== 'number' ||
			!(t[1] >= 0 && t[1] < 1)
		) {
			return 'bad taps';
		}
		while (beat < t[0]) {
			ms += L;
			beat++;
			L = periodFor(blocks, rng);
		}
		dev.push((t[1] - 0.5) * L);
		if (canvasW) {
			if (w < DEAD_PX / 2) return 'dead tower';
			const q = cutFor(t[1], blocks, streak);
			streak = q === 1 ? streak + 1 : 0;
			w *= q;
		}
		blocks++;
		last = t[0];
	}
	ms += taps[taps.length - 1][1] * L;
	const m = dev.reduce((a, b) => a + b, 0) / dev.length;
	const jitter = Math.sqrt(dev.reduce((a, b) => a + (b - m) ** 2, 0) / dev.length);
	return { ms, jitter, w };
}
