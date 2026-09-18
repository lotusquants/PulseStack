/**
 * Soft ambient bed + dopamine UI clicks.
 * Warm sine/triangle only — no kicks, hats, or grit.
 */

let ac: AudioContext | null = null;
let master: GainNode | null = null;
let ambientGain: GainNode | null = null;
let ambientOscs: OscillatorNode[] = [];
let ambientOn = false;
let enabled = true;

export function audio(): AudioContext {
	if (!ac)
		ac = new (
			window.AudioContext ||
			(window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
		)();
	if (ac.state === 'suspended') ac.resume();
	if (!master) {
		master = ac.createGain();
		master.gain.value = 0.85;
		master.connect(ac.destination);
	}
	return ac;
}

function bus(): GainNode {
	audio();
	return master!;
}

function envGain(a: AudioContext, peak: number, attack: number, release: number, t: number) {
	const g = a.createGain();
	g.gain.setValueAtTime(0.0001, t);
	g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), t + attack);
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
	o.frequency.setValueAtTime(freq, t);
	o.connect(g).connect(bus());
	o.start(t);
	o.stop(t + attack + release + 0.02);
}

/** Soft tactile click — filtered noise + tiny high sine (ASMR / UI pop). */
function dopamineClick(a: AudioContext, t: number, bright = 1) {
	const n = Math.max(1, (a.sampleRate * 0.028) | 0);
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
	bp.frequency.value = 1800 + bright * 900;
	bp.Q.value = 1.4;
	g.gain.setValueAtTime(0.12 * bright, t);
	g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
	src.connect(bp).connect(g).connect(bus());
	src.start(t);
	src.stop(t + 0.05);

	softPartial(a, t, 2100 + bright * 400, 'sine', 0.045 * bright, 0.004, 0.05);
	softPartial(a, t, 4200 + bright * 200, 'sine', 0.018 * bright, 0.003, 0.035);
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
	ambientOscs = [];
	ambientOn = false;
	setTimeout(() => {
		oscs.forEach((o) => {
			try {
				o.stop();
			} catch {
				/* already stopped */
			}
		});
	}, 900);
}

function startAmbient() {
	if (!enabled || ambientOn) return;
	const a = audio();
	const t = a.currentTime;
	ambientGain = a.createGain();
	ambientGain.gain.setValueAtTime(0.0001, t);
	ambientGain.gain.exponentialRampToValueAtTime(0.045, t + 2.2);
	ambientGain.connect(bus());

	// Warm open fifth + soft fifth octave — barely-there pad
	const freqs = [110, 164.81, 220, 329.63];
	ambientOscs = freqs.map((f, i) => {
		const o = a.createOscillator();
		const g = a.createGain();
		const lp = a.createBiquadFilter();
		o.type = i % 2 === 0 ? 'sine' : 'triangle';
		o.frequency.value = f;
		lp.type = 'lowpass';
		lp.frequency.value = 680;
		g.gain.value = 0.22 - i * 0.035;
		o.connect(lp).connect(g).connect(ambientGain!);
		o.start(t);
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
	}
}

/** Tap result: perfect = crystal click, ok = soft pop, bad = soft low wash. */
export function tone(kind: string, n: number, sound: boolean, feverTier: number) {
	if (!sound || !enabled) return;
	const a = audio(),
		t = a.currentTime;
	if (kind === 'bad') {
		softPartial(a, t, 146.8, 'sine', 0.08, 0.02, 0.32);
		softPartial(a, t, 110, 'triangle', 0.05, 0.03, 0.38);
		dopamineClick(a, t, 0.35);
		return;
	}
	const bright = kind === 'perfect' ? 1.15 + feverTier * 0.06 : 0.85;
	const root = 392 * Math.pow(2, (n % 12) / 36); // gentle climb, stay mid register
	dopamineClick(a, t, bright);
	if (kind === 'perfect') {
		softPartial(a, t, root, 'sine', 0.11, 0.01, 0.42);
		softPartial(a, t, root * 1.5, 'sine', 0.05, 0.015, 0.32);
		softPartial(a, t, root * 2, 'sine', 0.035, 0.01, 0.22);
		return;
	}
	softPartial(a, t, root, 'sine', 0.07, 0.008, 0.16);
	softPartial(a, t, root * 2, 'sine', 0.025, 0.006, 0.1);
}

/** Soft peak cue — breathy metronome, never a kick. */
export function tick(sound: boolean, feverTier: number) {
	if (!sound || !enabled) return;
	const a = audio(),
		t = a.currentTime;
	const lift = 1 + feverTier * 0.04;
	softPartial(a, t, 660 * lift, 'sine', 0.028 + feverTier * 0.004, 0.006, 0.07);
	softPartial(a, t, 990 * lift, 'sine', 0.012, 0.005, 0.05);
	if (feverTier >= 2) dopamineClick(a, t, 0.45);
}

/** Fever tier — soft pad bloom, not a stab. */
export function chordStab(tier: number, sound: boolean) {
	if (!sound || !enabled) return;
	const a = audio(),
		t = a.currentTime,
		base = 196 * Math.pow(1.12, Math.min(tier, 4));
	[1, 5 / 4, 3 / 2, 2].forEach((r, i) => {
		softPartial(a, t + i * 0.02, base * r, 'sine', 0.07 - i * 0.012, 0.04, 0.7);
	});
	dopamineClick(a, t, 0.7);
}

/** Streak break — descending warm wash. */
export function coolCue(sound: boolean) {
	if (!sound || !enabled) return;
	const a = audio(),
		t = a.currentTime;
	softPartial(a, t, 329.63, 'sine', 0.07, 0.03, 0.45);
	softPartial(a, t + 0.06, 246.94, 'sine', 0.055, 0.04, 0.5);
	softPartial(a, t + 0.12, 196, 'triangle', 0.04, 0.05, 0.55);
}
