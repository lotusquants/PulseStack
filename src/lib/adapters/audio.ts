/**
 * Musical dopamine SFX — motifs, harmony, call/response, soft FM chimes,
 * reactive ambient bed. All in C major. No samples.
 */

let ac: AudioContext | null = null;
let master: GainNode | null = null;
let ambientGain: GainNode | null = null;
let ambientLp: BiquadFilterNode | null = null;
let ambientLfo: OscillatorNode | null = null;
let ambientLfoGain: GainNode | null = null;
let ambientOscs: OscillatorNode[] = [];
let ambientOn = false;
let enabled = true;
let feverTier = 0;
/** Last perfect streak — keeps peak ticks on the ladder. */
let ladderStreak = 0;

/** C major pentatonic (semitone offsets from C). */
const PENTA = [0, 2, 4, 7, 9] as const;
const ROOT_HZ = 261.63; // C4
const MAX_HZ = 1046.5; // C6
/** Motif note spacing — cascade feel, not full beat. */
const MOTIF_MS = 58;

export function audio(): AudioContext {
	if (!ac)
		ac = new (
			window.AudioContext ||
			(window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
		)();
	if (ac.state === 'suspended') ac.resume();
	if (!master) {
		master = ac.createGain();
		master.gain.value = 0.88;
		master.connect(ac.destination);
	}
	return ac;
}

function bus(): GainNode {
	audio();
	return master!;
}

function clampHz(f: number) {
	return Math.min(MAX_HZ * 1.12, Math.max(40, f));
}

function envGain(a: AudioContext, peak: number, attack: number, release: number, t: number) {
	const g = a.createGain();
	g.gain.setValueAtTime(0.0001, t);
	g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), t + Math.max(0.004, attack));
	g.gain.exponentialRampToValueAtTime(0.0001, t + attack + release);
	return g;
}

function softPartial(
	a: AudioContext,
	t: number,
	freq: number,
	type: OscillatorType,
	peak: number,
	attack: number,
	release: number
) {
	const o = a.createOscillator();
	const g = envGain(a, peak, attack, release, t);
	o.type = type;
	o.frequency.setValueAtTime(clampHz(freq), t);
	o.connect(g).connect(bus());
	o.start(t);
	o.stop(t + attack + release + 0.03);
}

/** Hz from absolute semitones above C4. */
function hzSemi(semi: number): number {
	let hz = ROOT_HZ * Math.pow(2, semi / 12);
	while (hz > MAX_HZ) hz /= 2;
	while (hz < ROOT_HZ / 2) hz *= 2;
	return hz;
}

function degreeSemi(streak: number): number {
	const i = Math.max(0, streak - 1);
	return PENTA[i % PENTA.length] + 12 * Math.floor(i / PENTA.length);
}

function scaleDegree(streak: number): number {
	return hzSemi(degreeSemi(streak));
}

/** Dopamine transient — bandpass sparkle. */
function sparkleClick(a: AudioContext, t: number, bright = 1) {
	const n = Math.max(1, (a.sampleRate * 0.032) | 0);
	const buf = a.createBuffer(1, n, a.sampleRate);
	const d = buf.getChannelData(0);
	for (let i = 0; i < d.length; i++) {
		const e = 1 - i / d.length;
		d[i] = (Math.random() * 2 - 1) * e * e;
	}
	const src = a.createBufferSource();
	const bp = a.createBiquadFilter();
	const g = a.createGain();
	src.buffer = buf;
	bp.type = 'bandpass';
	bp.frequency.value = 2200 + bright * 1100;
	bp.Q.value = 1.6;
	g.gain.setValueAtTime(0.13 * bright, t);
	g.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
	src.connect(bp).connect(g).connect(bus());
	src.start(t);
	src.stop(t + 0.055);

	softPartial(a, t, 2400 + bright * 500, 'sine', 0.05 * bright, 0.003, 0.055);
	softPartial(a, t, 4800 + bright * 300, 'sine', 0.02 * bright, 0.002, 0.04);
}

/**
 * Soft marimba/xylophone chime: detuned unison + gentle FM.
 */
function chime(a: AudioContext, t: number, freq: number, vel: number, len: number) {
	const f = Math.min(MAX_HZ, freq);
	const peak = 0.12 * vel;

	// Detuned pair (±~6 cents) — width without grit
	softPartial(a, t, f * 0.9965, 'sine', peak * 0.55, 0.007, len);
	softPartial(a, t, f * 1.0035, 'sine', peak * 0.55, 0.007, len);

	// Light FM carrier
	const car = a.createOscillator();
	const mod = a.createOscillator();
	const modG = a.createGain();
	const g = envGain(a, peak * 0.7, 0.006, len, t);
	car.type = 'sine';
	mod.type = 'sine';
	car.frequency.setValueAtTime(clampHz(f), t);
	mod.frequency.setValueAtTime(clampHz(f * 2.01), t);
	modG.gain.setValueAtTime(f * 0.012, t); // shallow index
	modG.gain.exponentialRampToValueAtTime(0.0001, t + len * 0.7);
	mod.connect(modG).connect(car.frequency);
	car.connect(g).connect(bus());
	mod.start(t);
	car.start(t);
	mod.stop(t + len + 0.04);
	car.stop(t + len + 0.04);

	softPartial(a, t, f * 1.5, 'triangle', 0.035 * vel, 0.01, len * 0.8);
	softPartial(a, t, f * 2, 'sine', 0.028 * vel, 0.006, len * 0.5);
}

/** Soft held dyad under a hit (harmony bed). */
function harmonyPad(a: AudioContext, t: number, rootHz: number, vel: number, len: number) {
	softPartial(a, t, rootHz * 0.5, 'sine', 0.04 * vel, 0.03, len);
	softPartial(a, t, rootHz * 0.75, 'triangle', 0.028 * vel, 0.04, len * 1.05); // soft 5th below
	softPartial(a, t, rootHz, 'sine', 0.022 * vel, 0.05, len * 0.9);
}

function playNotes(
	a: AudioContext,
	t: number,
	freqs: number[],
	stepMs: number,
	vel: number,
	len: number
) {
	freqs.forEach((f, i) => {
		const ft = t + i * (stepMs / 1000);
		chime(a, ft, f, vel * (1 - i * 0.06), len);
		if (i === 0) sparkleClick(a, ft, 0.7 + vel * 0.3);
	});
}

function arpeggio(
	a: AudioContext,
	t: number,
	root: number,
	intervals: number[],
	stepMs: number,
	vel = 0.12
) {
	intervals.forEach((semi, i) => {
		const ft = t + i * (stepMs / 1000);
		const f = Math.min(MAX_HZ, root * Math.pow(2, semi / 12));
		chime(a, ft, f, vel * (1 - i * 0.07), 0.4);
		if (i === 0) sparkleClick(a, ft, 0.9 + vel);
	});
}

function descend(a: AudioContext, t: number, notes: number[], stepMs = 70, vel = 0.08) {
	notes.forEach((f, i) => {
		const ft = t + i * (stepMs / 1000);
		chime(a, ft, f, vel * (1 - i * 0.1), 0.28);
	});
}

/**
 * Phrase the ladder: most hits = single chime; every 2–4th perfect gets a motif.
 * Motifs stay on the pentatonic relative to the current degree.
 */
function perfectPhrase(a: AudioContext, t: number, streak: number, fever: number) {
	const bright = 1.05 + fever * 0.07;
	const vel = 0.95 + fever * 0.05;
	const semi = degreeSemi(streak);
	const freq = hzSemi(semi);
	const phase = ((streak - 1) % 4) + 1; // 1..4

	harmonyPad(a, t, freq, 0.85 + fever * 0.08, phase >= 3 ? 0.42 : 0.3);

	if (phase === 1) {
		sparkleClick(a, t, bright);
		chime(a, t, freq, vel, 0.26);
	} else if (phase === 2) {
		// neighbor grace → main
		const up = hzSemi(semi + 2);
		sparkleClick(a, t, bright * 0.9);
		chime(a, t, Math.min(MAX_HZ, up), vel * 0.55, 0.1);
		chime(a, t + MOTIF_MS / 1000, freq, vel, 0.24);
	} else if (phase === 3) {
		// ascending two-note within the ladder
		const next = scaleDegree(streak + 1);
		playNotes(a, t, [freq, next], MOTIF_MS, vel, 0.2);
	} else {
		// resolve motif: climb two ladder steps then land (jubilant)
		const a1 = scaleDegree(streak);
		const a2 = scaleDegree(streak + 1);
		const a3 = scaleDegree(streak + 2);
		playNotes(a, t, [a1, a2, a3], MOTIF_MS, vel * 1.05, 0.22);
		harmonyPad(a, t + (MOTIF_MS * 2) / 1000, a3, 0.7, 0.45);
	}

	if (fever >= 2) {
		softPartial(a, t + 0.02, Math.min(MAX_HZ, freq * 2), 'sine', 0.028, 0.008, 0.14);
	}
}

function ambientTargets(tier: number) {
	const gain = 0.036 + tier * 0.009;
	const cutoff = 580 + tier * 100;
	return { gain, cutoff };
}

function applyAmbientFever(tier: number, ramp = 0.5) {
	feverTier = tier;
	if (!ambientOn || !ac || !ambientGain) return;
	const t = ac.currentTime;
	const { gain, cutoff } = ambientTargets(tier);
	ambientGain.gain.cancelScheduledValues(t);
	ambientGain.gain.setValueAtTime(Math.max(0.0001, ambientGain.gain.value), t);
	ambientGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, gain), t + ramp);
	if (ambientLp) {
		ambientLp.frequency.cancelScheduledValues(t);
		const base = Math.max(200, cutoff);
		ambientLp.frequency.setValueAtTime(Math.max(200, ambientLp.frequency.value), t);
		ambientLp.frequency.exponentialRampToValueAtTime(base, t + ramp);
		if (ambientLfoGain) {
			ambientLfoGain.gain.cancelScheduledValues(t);
			ambientLfoGain.gain.setValueAtTime(ambientLfoGain.gain.value, t);
			ambientLfoGain.gain.linearRampToValueAtTime(80 + tier * 35, t + ramp);
		}
	}
}

function stopAmbient() {
	if (!ambientOn || !ac) return;
	const t = ac.currentTime;
	if (ambientGain) {
		ambientGain.gain.cancelScheduledValues(t);
		ambientGain.gain.setValueAtTime(Math.max(0.0001, ambientGain.gain.value), t);
		ambientGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
	}
	const oscs = ambientOscs.slice();
	const lfo = ambientLfo;
	ambientOscs = [];
	ambientOn = false;
	ambientLp = null;
	ambientLfo = null;
	ambientLfoGain = null;
	setTimeout(() => {
		oscs.forEach((o) => {
			try {
				o.stop();
			} catch {
				/* already stopped */
			}
		});
		try {
			lfo?.stop();
		} catch {
			/* */
		}
	}, 900);
}

function startAmbient() {
	if (!enabled || ambientOn) return;
	const a = audio();
	const t = a.currentTime;
	const { gain, cutoff } = ambientTargets(feverTier);

	ambientGain = a.createGain();
	ambientGain.gain.setValueAtTime(0.0001, t);
	ambientGain.gain.exponentialRampToValueAtTime(gain, t + 2.2);
	ambientGain.connect(bus());

	ambientLp = a.createBiquadFilter();
	ambientLp.type = 'lowpass';
	ambientLp.frequency.value = cutoff;
	ambientLp.Q.value = 0.7;
	ambientLp.connect(ambientGain);

	// Slow filter breathe — living bed
	ambientLfo = a.createOscillator();
	ambientLfoGain = a.createGain();
	ambientLfo.type = 'sine';
	ambientLfo.frequency.value = 0.07;
	ambientLfoGain.gain.value = 80 + feverTier * 35;
	ambientLfo.connect(ambientLfoGain).connect(ambientLp.frequency);
	ambientLfo.start(t);

	// I–V drones + soft moving upper fifths (C2–G2–C3–E3–G3)
	const freqs = [65.41, 98.0, 130.81, 164.81, 196.0];
	ambientOscs = freqs.map((f, i) => {
		const o = a.createOscillator();
		const g = a.createGain();
		o.type = i % 2 === 0 ? 'sine' : 'triangle';
		o.frequency.value = f;
		// Slight slow vibrato on upper voices via periodic wave — use detune LFO-ish by scheduling
		g.gain.value = 0.2 - i * 0.028;
		o.connect(g).connect(ambientLp!);
		o.start(t);

		// Gentle pitch drift on upper partials (musical movement)
		if (i >= 2) {
			o.frequency.setValueAtTime(f, t);
			const cycle = 6 + i * 1.5;
			for (let k = 0; k < 8; k++) {
				const tk = t + 2 + k * cycle;
				const up = f * (i % 2 === 0 ? 1.0 : 1.0293); // ~+50¢ neighbor in key-ish
				o.frequency.linearRampToValueAtTime(up, tk + cycle * 0.45);
				o.frequency.linearRampToValueAtTime(f, tk + cycle);
			}
		}
		return o;
	});
	ambientOn = true;
}

export function unlock() {
	audio();
	if (enabled) startAmbient();
}

export function setEnabled(on: boolean) {
	enabled = on;
	if (on) {
		unlock();
	} else {
		stopAmbient();
		ladderStreak = 0;
	}
}

export function setFever(tier: number) {
	feverTier = Math.max(0, Math.min(4, tier | 0));
	if (enabled && ambientOn) applyAmbientFever(feverTier);
	if (tier === 0) ladderStreak = 0;
}

/**
 * Quiet anticipatory cue before the peak — call; tick is the response.
 */
export function anticipate(sound: boolean, fever: number) {
	if (!sound || !enabled) return;
	const a = audio(),
		t = a.currentTime;
	const semi = ladderStreak > 0 ? degreeSemi(ladderStreak) : PENTA[fever % PENTA.length];
	const f = hzSemi(Math.min(semi, 16) + 12); // soft upper register
	softPartial(a, t, f, 'sine', 0.018 + fever * 0.003, 0.02, 0.12);
	softPartial(a, t, f * 1.5, 'sine', 0.008, 0.025, 0.1);
}

export function tone(kind: string, streak: number, sound: boolean, fever: number) {
	if (!sound || !enabled) return;
	const a = audio(),
		t = a.currentTime;

	if (kind === 'bad') {
		ladderStreak = 0;
		descend(a, t, [hzSemi(7), hzSemi(4), hzSemi(0)], 78, 0.065); // G–E–C
		sparkleClick(a, t, 0.28);
		return;
	}

	if (kind === 'ok') {
		ladderStreak = 0;
		sparkleClick(a, t, 0.65);
		chime(a, t, hzSemi(4), 0.68, 0.14); // E4
		harmonyPad(a, t, hzSemi(4), 0.45, 0.22);
		return;
	}

	ladderStreak = Math.max(1, streak);
	perfectPhrase(a, t, ladderStreak, fever);
}

/** Peak response ding — same key as ladder. */
export function tick(sound: boolean, fever: number) {
	if (!sound || !enabled) return;
	const a = audio(),
		t = a.currentTime;
	const semi =
		ladderStreak > 0
			? degreeSemi(ladderStreak) + 12
			: PENTA[Math.min(fever, PENTA.length - 1)] + 12;
	const f = hzSemi(semi);
	softPartial(a, t, f, 'sine', 0.03 + fever * 0.005, 0.004, 0.07);
	softPartial(a, t, f * 1.5, 'sine', 0.012, 0.004, 0.05);
	if (fever >= 2) sparkleClick(a, t, 0.38 + fever * 0.08);
}

/** Fever milestone — I–V–I (and richer) cadences. */
export function chordStab(tier: number, sound: boolean) {
	if (!sound || !enabled) return;
	const a = audio(),
		t = a.currentTime;
	const root = hzSemi(tier >= 3 ? -12 : -5); // C3 / lower
	// Cadences in C: I=0, III=4, IV=5, V=7, I=12
	const intervals =
		tier >= 4
			? [0, 7, 12, 7, 16]
			: tier >= 3
				? [0, 5, 7, 12]
				: tier >= 2
					? [0, 4, 7, 12]
					: [0, 7, 12];
	arpeggio(a, t, root, intervals, 52, 0.11 + tier * 0.015);
	harmonyPad(a, t, root * 2, 0.7, 0.55);
	setFever(tier);
}

export function coolCue(sound: boolean) {
	if (!sound || !enabled) return;
	const a = audio(),
		t = a.currentTime;
	ladderStreak = 0;
	descend(a, t, [hzSemi(12), hzSemi(7), hzSemi(4), hzSemi(0)], 88, 0.06);
	setFever(0);
}
