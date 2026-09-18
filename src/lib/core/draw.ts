import { BH, COOL, INK } from './constants';
import type { ShapeId } from './constants';

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
		c.fillStyle = col;
		c.globalAlpha = dead ? 0.25 : 0.45 + 0.4 * p;
		c.fillRect(Math.round(cx - gw / 2), y, Math.round(gw), bh - 1);
		c.globalAlpha = 1;
	}
}
