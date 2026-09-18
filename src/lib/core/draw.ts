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

/** Shared candy-brick corner radii: rounder top, tighter bottom. */
export function brickRadii(w: number, h: number): [number, number, number, number] {
	const rr = Math.min(5, Math.max(2, w * 0.12), w / 2, h / 2);
	if (rr <= 0) return [0, 0, 0, 0];
	const bottom = Math.min(2, rr);
	return [rr, rr, bottom, bottom];
}

/** ArcTo path — reliable for both fill and clip (unlike roundRect+clip in some engines). */
function pathBrick(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
	const [tl, tr, br, bl] = brickRadii(w, h);
	if (tl <= 0) {
		c.rect(x, y, w, h);
		return;
	}
	c.moveTo(x + tl, y);
	c.lineTo(x + w - tr, y);
	c.quadraticCurveTo(x + w, y, x + w, y + tr);
	c.lineTo(x + w, y + h - br);
	c.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
	c.lineTo(x + bl, y + h);
	c.quadraticCurveTo(x, y + h, x, y + h - bl);
	c.lineTo(x, y + tl);
	c.quadraticCurveTo(x, y, x + tl, y);
	c.closePath();
}

/** Fill the live-block silhouette (also used for best-run ghosts). */
export function fillBrickShape(
	c: CanvasRenderingContext2D,
	x: number,
	y: number,
	w: number,
	h: number
) {
	c.beginPath();
	pathBrick(c, x, y, w, h);
	c.fill();
}

/** Stacked block with candy bevel + soft contact shadow, clipped to silhouette. */
export function drawBlock(c: CanvasRenderingContext2D, opts: DrawBlockOpts) {
	const { cx, y, w, h, hue, q } = opts;
	const inset = q === 1 ? 0 : q > 0.7 ? 0.5 : 1;
	const bw = Math.max(1, Math.round(w - inset * 2));
	const x = Math.round(cx - bw / 2);
	const sat = q === 1 ? 78 : q > 0.7 ? 72 : 62;
	const light = q === 1 ? 66 : q > 0.7 ? 58 : 46;

	// soft contact shadow under the brick (outside clip)
	c.fillStyle = 'rgba(5,7,15,0.35)';
	c.fillRect(x + 1, y + h - 1, Math.max(1, bw - 2), 3);

	c.fillStyle = `hsl(${hue} ${sat}% ${light}%)`;
	fillBrickShape(c, x, y, bw, h);

	// Clip overlays to the body so highlight/shade cannot square off the corners
	c.save();
	c.beginPath();
	pathBrick(c, x, y, bw, h);
	c.clip();

	const bevelH = Math.max(2, Math.round(h * 0.28));
	c.fillStyle = `hsla(${hue}, 70%, ${Math.min(82, light + 16)}%, 0.65)`;
	c.fillRect(x, y, bw, bevelH);

	const shadeH = Math.max(2, Math.round(h * 0.32));
	c.fillStyle = `hsla(${hue}, 55%, ${Math.max(20, light - 20)}%, 0.5)`;
	c.fillRect(x, y + h - shadeH, bw, shadeH);
	c.restore();
}

/** Debris piece with soft edges and rotation. */
export function drawShard(c: CanvasRenderingContext2D, opts: DrawShardOpts) {
	const { x, y, w, h, hue, a, rot } = opts;
	c.save();
	c.globalAlpha = Math.max(0, a) * 0.92;
	c.translate(x + w / 2, y + h / 2);
	c.rotate(rot);
	const sw = w * 1.15,
		sh = h * 1.1;
	const sx = -sw / 2,
		sy = -sh / 2;
	c.fillStyle = `hsl(${hue} 68% 48%)`;
	c.beginPath();
	pathBrick(c, sx, sy, sw, sh);
	c.fill();

	c.save();
	c.beginPath();
	pathBrick(c, sx, sy, sw, sh);
	c.clip();
	c.fillStyle = `hsla(${hue}, 60%, 68%, 0.4)`;
	c.fillRect(sx, sy, sw, Math.max(1, sh * 0.32));
	c.restore();

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
	const shaftW = w * 0.26;
	const g = c.createLinearGradient(cx - shaftW, 0, cx + shaftW, 0);
	const a0 = (atRisk ? 0.06 : 0.08) * intensity;
	const col = atRisk ? '94,200,224' : '255,138,61';
	g.addColorStop(0, `rgba(${col},0)`);
	g.addColorStop(0.45, `rgba(${col},${a0})`);
	g.addColorStop(0.55, `rgba(${col},${a0})`);
	g.addColorStop(1, `rgba(${col},0)`);
	c.fillStyle = g;
	c.fillRect(0, 0, w, h);
}

/** Soft edge vignette. */
export function drawVignette(c: CanvasRenderingContext2D, w: number, h: number, a = 0.28) {
	const g = c.createRadialGradient(w / 2, h * 0.55, h * 0.18, w / 2, h * 0.55, h * 0.88);
	g.addColorStop(0, 'rgba(5,7,15,0)');
	g.addColorStop(1, `rgba(5,7,15,${a})`);
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
	c.strokeStyle = atRisk ? 'rgba(94,200,224,.28)' : INK + '.22)';
	c.lineWidth = 1.25;
	c.setLineDash([4, 4]);
	const x = Math.round(cx - floor / 2) + 0.5;
	const fw = Math.max(1, Math.round(floor)) - 1;
	const fh = bh - 2;
	c.beginPath();
	pathBrick(c, x, y + 0.5, fw, fh);
	c.stroke();
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
	const col = dead
		? COOL
		: atRisk
			? hot
				? '#A8E4F0'
				: '#5EC8E0'
			: hot
				? `hsl(${hue} 90% 78%)`
				: `hsl(${hue} 78% 62%)`;
	const bh = BH;
	if (id === 'circle') {
		const cy = h * 0.2,
			rMax = w * 0.09,
			r = rMax * (0.1 + 0.9 * p);
		c.strokeStyle = INK + '.14)';
		c.lineWidth = 1.25;
		c.beginPath();
		c.arc(cx, cy, rMax, 0, 7);
		c.stroke();
		c.fillStyle = col;
		c.globalAlpha = dead ? 0.35 : 0.94;
		c.beginPath();
		c.arc(cx, cy, Math.max(2, r), 0, 7);
		c.fill();
		c.globalAlpha = 1;
		c.strokeStyle = hot ? col : INK + '.28)';
		c.lineWidth = hot ? 2.75 : 1.25;
		c.beginPath();
		c.arc(cx, cy, rMax * (0.12 + 0.88 * p), 0, 7);
		c.stroke();
	} else if (id === 'pendulum') {
		const y = h * 0.18,
			A = w * 0.36,
			dir = beat % 2 ? -1 : 1,
			x = cx + A * Math.cos(Math.PI * t) * dir;
		c.strokeStyle = INK + '.18)';
		c.lineWidth = 1.25;
		c.beginPath();
		c.moveTo(cx - A, y);
		c.lineTo(cx + A, y);
		c.stroke();
		c.strokeStyle = INK + '.55)';
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
		const gw = Math.max(2, floor * p);
		c.fillStyle = col;
		c.globalAlpha = dead ? 0.25 : 0.5 + 0.42 * p;
		const px = Math.round(cx - gw / 2);
		const pw = Math.round(gw);
		const ph = bh - 1;
		c.beginPath();
		pathBrick(c, px, y, pw, ph);
		c.fill();
		c.globalAlpha = 1;
		if (p > 0.55) {
			c.strokeStyle = col;
			c.lineWidth = hot ? 2 : 1.25;
			c.beginPath();
			pathBrick(c, px + 0.5, y + 0.5, Math.max(1, pw) - 1, bh - 2);
			c.stroke();
		}
	}
}
