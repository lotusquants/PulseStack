import { BH, COOL, INK } from './constants';
import type { ShapeId } from './constants';

export type DrawBlockOpts = {
	cx: number;
	y: number;
	w: number;
	h: number;
	hue: number;
	q: number;
};

export type DrawShardOpts = {
	x: number;
	y: number;
	w: number;
	h: number;
	hue: number;
	a: number;
	rot: number;
};

/** Stacked block with top highlight + bottom shadow. */
export function drawBlock(c: CanvasRenderingContext2D, opts: DrawBlockOpts) {
	const { cx, y, w, h, hue, q } = opts;
	const inset = q === 1 ? 0 : q > 0.7 ? 0.5 : 1;
	const bw = Math.max(1, Math.round(w - inset * 2));
	const x = Math.round(cx - bw / 2);
	const light = q === 1 ? 62 : q > 0.7 ? 56 : 44;
	c.fillStyle = `hsl(${hue} 72% ${light}%)`;
	c.fillRect(x, y, bw, h);
	// top edge highlight
	c.fillStyle = `hsla(${hue}, 70%, ${Math.min(78, light + 14)}%, 0.55)`;
	c.fillRect(x, y, bw, Math.max(1, Math.round(h * 0.22)));
	// bottom shadow
	c.fillStyle = `hsla(${hue}, 60%, ${Math.max(22, light - 18)}%, 0.45)`;
	c.fillRect(x, y + h - Math.max(1, Math.round(h * 0.28)), bw, Math.max(1, Math.round(h * 0.28)));
}

/** Debris piece with soft edges and rotation. */
export function drawShard(c: CanvasRenderingContext2D, opts: DrawShardOpts) {
	const { x, y, w, h, hue, a, rot } = opts;
	c.save();
	c.globalAlpha = Math.max(0, a);
	c.translate(x + w / 2, y + h / 2);
	c.rotate(rot);
	c.fillStyle = `hsl(${hue} 58% 42%)`;
	c.fillRect(-w / 2, -h / 2, w, h);
	c.fillStyle = `hsla(${hue}, 55%, 58%, 0.35)`;
	c.fillRect(-w / 2, -h / 2, w, Math.max(1, h * 0.3));
	c.restore();
}

/** Faint vertical light shaft behind the tower. */
export function drawLightShaft(
	c: CanvasRenderingContext2D,
	w: number,
	h: number,
	atRisk: boolean,
	intensity = 1
) {
	const cx = w / 2;
	const shaftW = w * 0.22;
	const g = c.createLinearGradient(cx - shaftW, 0, cx + shaftW, 0);
	const a0 = (atRisk ? 0.045 : 0.055) * intensity;
	const col = atRisk ? '111,175,198' : '242,166,90';
	g.addColorStop(0, `rgba(${col},0)`);
	g.addColorStop(0.45, `rgba(${col},${a0})`);
	g.addColorStop(0.55, `rgba(${col},${a0})`);
	g.addColorStop(1, `rgba(${col},0)`);
	c.fillStyle = g;
	c.fillRect(0, 0, w, h);
}

/** Soft edge vignette. */
export function drawVignette(c: CanvasRenderingContext2D, w: number, h: number, a = 0.22) {
	const g = c.createRadialGradient(w / 2, h * 0.55, h * 0.2, w / 2, h * 0.55, h * 0.85);
	g.addColorStop(0, 'rgba(7,10,18,0)');
	g.addColorStop(1, `rgba(7,10,18,${a})`);
	c.fillStyle = g;
	c.fillRect(0, 0, w, h);
}

/** Ghost outline of previous floor width under the live pulse. */
export function drawFloorGhost(
	c: CanvasRenderingContext2D,
	cx: number,
	y: number,
	floor: number,
	bh: number,
	atRisk?: boolean
) {
	c.strokeStyle = atRisk ? 'rgba(111,175,198,.22)' : INK + '.18)';
	c.lineWidth = 1;
	c.setLineDash([3, 4]);
	c.strokeRect(
		Math.round(cx - floor / 2) + 0.5,
		y + 0.5,
		Math.max(1, Math.round(floor)) - 1,
		bh - 2
	);
	c.setLineDash([]);
}

export function drawPulse(
	c: CanvasRenderingContext2D,
	id: ShapeId,
	w: number,
	h: number,
	p: number,
	t: number,
	floor: number,
	top: number,
	dead: boolean,
	atRisk?: boolean,
	hue = 30,
	beat = 0
) {
	const cx = w / 2,
		hot = p > 0.94;
	// pulse wears the colour of the block about to be placed; brightens at the peak
	const col = dead
		? COOL
		: atRisk
			? hot
				? '#9ED0E0'
				: '#6FAFC6'
			: hot
				? `hsl(${hue} 85% 78%)`
				: `hsl(${hue} 72% 62%)`;
	const bh = BH; // the pulse bar is the same height as the block it becomes
	if (id === 'circle') {
		const cy = h * 0.2,
			rMax = w * 0.09,
			r = rMax * (0.1 + 0.9 * p);
		c.strokeStyle = INK + '.12)';
		c.lineWidth = 1.25;
		c.beginPath();
		c.arc(cx, cy, rMax, 0, 7);
		c.stroke();
		if (hot && !dead) {
			const g = c.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 1.55);
			g.addColorStop(0, 'rgba(255,210,122,.35)');
			g.addColorStop(1, 'rgba(255,210,122,0)');
			c.fillStyle = g;
			c.beginPath();
			c.arc(cx, cy, r * 1.55, 0, 7);
			c.fill();
		}
		c.fillStyle = col;
		c.globalAlpha = dead ? 0.35 : 0.92;
		c.beginPath();
		c.arc(cx, cy, Math.max(2, r), 0, 7);
		c.fill();
		c.globalAlpha = 1;
		c.strokeStyle = hot ? col : INK + '.22)';
		c.lineWidth = hot ? 2.5 : 1.25;
		c.beginPath();
		c.arc(cx, cy, rMax * (0.12 + 0.88 * p), 0, 7);
		c.stroke();
	} else if (id === 'pendulum') {
		const y = h * 0.18,
			A = w * 0.36,
			dir = beat % 2 ? -1 : 1,
			x = cx + A * Math.cos(Math.PI * t) * dir;
		c.strokeStyle = INK + '.16)';
		c.lineWidth = 1;
		c.beginPath();
		c.moveTo(cx - A, y);
		c.lineTo(cx + A, y);
		c.stroke();
		c.strokeStyle = INK + '.5)';
		c.beginPath();
		c.moveTo(cx, y - 12);
		c.lineTo(cx, y + 12);
		c.stroke();
		c.fillStyle = col;
		c.beginPath();
		c.arc(x, y, 7 + 5 * p, 0, 7);
		c.fill();
	} else {
		const y = top - bh;
		// the fill is exactly the cut you'd get: no halo, no outline
		const gw = Math.max(2, floor * p);
		if (hot && !dead) {
			c.fillStyle = 'rgba(255,210,122,.12)';
			c.fillRect(Math.round(cx - floor / 2) - 4, y - 4, Math.round(floor) + 8, bh + 6);
		}
		c.fillStyle = col;
		c.globalAlpha = dead ? 0.25 : 0.45 + 0.4 * p;
		c.fillRect(Math.round(cx - gw / 2), y, Math.round(gw), bh - 1);
		c.globalAlpha = 1;
		if (p > 0.55) {
			c.strokeStyle = col;
			c.lineWidth = hot ? 1.75 : 1;
			c.strokeRect(Math.round(cx - gw / 2) + 0.5, y + 0.5, Math.max(1, Math.round(gw)) - 1, bh - 2);
		}
	}
}
