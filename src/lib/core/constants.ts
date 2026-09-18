export { MIN_PERIOD, REST } from './replay';
export const BH = 16;
export const GROUND = '#05070F';
export const INK = 'rgba(247,244,238,';
export const P = '#FF8A3D';
export const HOT = '#FFE08A';
export const COOL = 'rgba(94,200,224,.55)';
export const TIER_NAME = ['', 'WARM', 'HOT', 'FEVER', 'OVERDRIVE'] as const;
export const SHAPES = [
	{ id: 'ghost' as const, name: 'Ghost' },
	{ id: 'circle' as const, name: 'Circle' },
	{ id: 'pendulum' as const, name: 'Pendulum' },
];
export type ShapeId = (typeof SHAPES)[number]['id'];
export type PlayMode = 'endless' | 'daily';

export const tierOf = (s: number) => (s >= 20 ? 4 : s >= 10 ? 3 : s >= 5 ? 2 : s >= 3 ? 1 : 0);

export const headlineFor = (n: number) =>
	n <= 0
		? 'Nothing held.'
		: n < 10
			? 'A stub of a tower.'
			: n < 25
				? 'The tower is a thread.'
				: n < 50
					? 'Still climbing.'
					: n < 100
						? 'The beat held.'
						: 'A tower of peaks.';
