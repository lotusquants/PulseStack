import { describe, expect, it } from 'vitest';
import { MIN_PERIOD, REST, mulberry32, periodFor, replay } from './replay';

/** One tap per beat; optional phase jitter in ms around the peak (0.5). */
const sim = (seed: number, n: number, jitterMs: number) => {
	const rng = mulberry32(seed);
	let blocks = 1;
	let L = periodFor(1, rng);
	const taps: [number, number][] = [];
	for (let k = 0; k < n; k++) {
		const p = Math.min(
			0.9999,
			Math.max(0, 0.5 + (jitterMs ? (Math.random() * 2 - 1) * jitterMs : 0) / L)
		);
		taps.push([k, p]);
		blocks++;
		L = periodFor(blocks, rng);
	}
	return taps;
};

describe('mulberry32', () => {
	it('is deterministic for a seed', () => {
		const a = mulberry32(7);
		const b = mulberry32(7);
		const seqA = [a(), a(), a()];
		const seqB = [b(), b(), b()];
		expect(seqA).toEqual(seqB);
	});

	it('diverges across seeds', () => {
		expect(mulberry32(1)()).not.toEqual(mulberry32(2)());
	});
});

describe('periodFor', () => {
	it('shrinks deterministically before block 30', () => {
		const rng = mulberry32(42);
		const p1 = periodFor(1, rng);
		const p10 = periodFor(10, mulberry32(42));
		expect(p1).toBeCloseTo(REST * Math.pow(0.992, 1), 5);
		expect(p10).toBeLessThan(p1);
		expect(p10).toBeGreaterThanOrEqual(MIN_PERIOD);
	});

	it('uses rng after block 30', () => {
		const a = periodFor(30, mulberry32(1));
		const b = periodFor(30, mulberry32(2));
		expect(a).not.toEqual(b);
	});
});

describe('replay', () => {
	it('accepts human-like jitter and rejects perfect bots', () => {
		const human = replay(7, sim(7, 60, 40));
		const bot = replay(7, sim(7, 60, 0));
		expect(typeof human).toBe('object');
		if (typeof human === 'string') throw new Error(human);
		expect(human.jitter).toBeGreaterThan(6);
		expect(typeof bot).toBe('object');
		if (typeof bot === 'string') throw new Error(bot);
		expect(bot.jitter).toBeLessThan(6);
		expect(human.ms).toBeGreaterThan(30e3);
		expect(human.ms).toBeLessThan(60e3);
	});

	it('replays width: sloppy taps kill the tower, honest ones survive', () => {
		// 60 taps at phase 0.2 keep ~35% each: dead within a few blocks
		const sloppy = replay(
			7,
			sim(7, 60, 0).map(([b]) => [b, 0.2] as [number, number]),
			390
		);
		expect(sloppy).toBe('dead tower');
		const fine = replay(7, sim(7, 60, 40), 390);
		if (typeof fine === 'string') throw new Error(fine);
		expect(fine.w).toBeGreaterThan(7);
		// the fatal tap itself still counts: only taps after death are impossible
		const oneBad = replay(7, [[0, 0.02]], 390);
		expect(typeof oneBad).toBe('object');
	});

	it('rejects bad taps', () => {
		expect(
			replay(7, [
				[0, 0.5],
				[0, 0.5],
			])
		).toBe('bad taps');
		expect(replay(7, [[0, 1]])).toBe('bad taps');
		expect(replay(7, [])).toBe('bad taps');
	});

	it('changes timeline with seed', () => {
		expect(replay(7, sim(7, 40, 0))).not.toEqual(replay(8, sim(7, 40, 0)));
	});
});
