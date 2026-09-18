let ac: AudioContext | null = null;

export function audio(): AudioContext {
	if (!ac)
		ac = new (
			window.AudioContext ||
			(window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
		)();
	if (ac.state === 'suspended') ac.resume();
	return ac;
}

function noiseBurst(a: AudioContext, dur: number, lpHz: number, gain: number, t: number) {
	const buf = a.createBuffer(1, Math.max(1, (a.sampleRate * dur) | 0), a.sampleRate);
	const d = buf.getChannelData(0);
	for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
	const src = a.createBufferSource(),
		lp = a.createBiquadFilter(),
		g = a.createGain();
	src.buffer = buf;
	lp.type = 'lowpass';
	lp.frequency.value = lpHz;
	src.connect(lp).connect(g).connect(a.destination);
	g.gain.setValueAtTime(gain, t);
	g.gain.exponentialRampToValueAtTime(0.001, t + dur);
	src.start(t);
	src.stop(t + dur);
}

function hihat(a: AudioContext, t: number, gain: number) {
	const buf = a.createBuffer(1, (a.sampleRate * 0.04) | 0, a.sampleRate);
	const d = buf.getChannelData(0);
	for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
	const src = a.createBufferSource(),
		hp = a.createBiquadFilter(),
		g = a.createGain();
	src.buffer = buf;
	hp.type = 'highpass';
	hp.frequency.value = 6000;
	src.connect(hp).connect(g).connect(a.destination);
	g.gain.setValueAtTime(gain, t);
	g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
	src.start(t);
	src.stop(t + 0.04);
}

function playKick(a: AudioContext, t: number, gain: number) {
	const o = a.createOscillator(),
		g = a.createGain();
	o.type = 'sine';
	o.frequency.setValueAtTime(140, t);
	o.frequency.exponentialRampToValueAtTime(48, t + 0.12);
	g.gain.setValueAtTime(gain, t);
	g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
	o.connect(g).connect(a.destination);
	o.start(t);
	o.stop(t + 0.14);
	noiseBurst(a, 0.06, 220, gain * 0.45, t);
}

function tonePartial(
	a: AudioContext,
	t: number,
	freq: number,
	type: OscillatorType,
	gain: number,
	len: number
) {
	const o = a.createOscillator(),
		g = a.createGain();
	o.type = type;
	o.frequency.setValueAtTime(freq, t);
	g.gain.setValueAtTime(gain, t);
	g.gain.exponentialRampToValueAtTime(0.001, t + len);
	o.connect(g).connect(a.destination);
	o.start(t);
	o.stop(t + len);
}

/** Distinct signatures: perfect (bright chord), ok (soft tick), bad (grit). */
export function tone(kind: string, n: number, sound: boolean, feverTier: number) {
	if (!sound) return;
	const a = audio(),
		t = a.currentTime;
	if (kind === 'bad') {
		noiseBurst(a, 0.22, 140, 0.55, t);
		tonePartial(a, t, 110, 'sawtooth', 0.12, 0.16);
		tonePartial(a, t + 0.02, 98, 'triangle', 0.08, 0.2);
		return;
	}
	const bias = kind === 'perfect' ? 1 + feverTier * 0.04 : 1;
	const f = 330 * Math.pow(2, n / 24) * bias;
	if (kind === 'perfect') {
		tonePartial(a, t, f, 'sine', 0.32, 0.48);
		tonePartial(a, t, f * 2, 'sine', 0.1, 0.28);
		tonePartial(a, t, f * 3, 'sine', 0.07, 0.2);
		tonePartial(a, t + 0.01, f * 1.5, 'triangle', 0.06, 0.22);
		hihat(a, t + 0.02, 0.05 + feverTier * 0.015);
		return;
	}
	// ok
	tonePartial(a, t, f, 'triangle', 0.2, 0.12);
	hihat(a, t, 0.07 + feverTier * 0.02);
	tonePartial(a, t + 0.03, f * 2, 'sine', 0.04, 0.08);
}

/** Peak tick — clear metronome feel, heavier with fever. */
export function tick(sound: boolean, feverTier: number) {
	if (!sound) return;
	const a = audio(),
		t = a.currentTime,
		tier = feverTier;
	if (tier === 0) {
		tonePartial(a, t, 920, 'sine', 0.055, 0.035);
		tonePartial(a, t, 1840, 'sine', 0.02, 0.025);
		return;
	}
	playKick(a, t, tier === 1 ? 0.2 : tier === 2 ? 0.28 : 0.36);
	if (tier >= 2) hihat(a, t + 0.02, tier === 2 ? 0.055 : 0.1);
	if (tier >= 3) {
		hihat(a, t + 0.08, 0.08);
		tonePartial(a, t + 0.04, 660, 'sine', 0.04, 0.06);
	}
}

export function chordStab(tier: number, sound: boolean) {
	if (!sound) return;
	const a = audio(),
		t = a.currentTime,
		base = 220 * Math.pow(1.2, tier);
	[1, 5 / 4, 3 / 2, 2].forEach((r, i) => {
		tonePartial(a, t, base * r, 'sine', 0.11 - i * 0.018, 0.4);
	});
	hihat(a, t + 0.01, 0.06);
}

export function coolCue(sound: boolean) {
	if (!sound) return;
	const a = audio(),
		t = a.currentTime;
	tonePartial(a, t, 220, 'triangle', 0.1, 0.28);
	tonePartial(a, t + 0.04, 165, 'sine', 0.08, 0.32);
	tonePartial(a, t + 0.08, 110, 'triangle', 0.06, 0.35);
	noiseBurst(a, 0.12, 400, 0.12, t + 0.05);
}
