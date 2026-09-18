import type { PlayMode, ShapeId } from '../core/constants';
import type { LbEntry, ScoreRequest, ScoreResponse, StartResponse } from '../core/lbApi';

export type Unlocks = { skins: Set<string> };

/** Persistent key/value store (localStorage today). */
export type StoragePort = {
	pref: (k: string, d: string) => string;
	save: (k: string, v: string | number) => void;
	loadUnlocks: () => Unlocks;
	saveUnlocks: (unlocks: Unlocks) => void;
	loadBestTower: () => number[];
	ensurePid: () => string;
	utcDay: () => string;
};

/** Web Audio SFX. */
export type AudioPort = {
	unlock: () => void;
	tone: (kind: string, n: number, sound: boolean, feverTier: number) => void;
	tick: (sound: boolean, feverTier: number) => void;
	chordStab: (tier: number, sound: boolean) => void;
	coolCue: (sound: boolean) => void;
};

export type HapticsPort = {
	pulse: (ms: number | number[]) => void | Promise<void>;
};

export type KeepAwakePort = {
	set: (on: boolean) => void | Promise<void>;
};

export type SharePort = {
	shareCard: (opts: {
		lastScore: number;
		lastPerfectPct: number;
		shape: ShapeId;
		who: string;
	}) => Promise<void>;
};

export type LeaderboardPort = {
	getLocal: (mode?: PlayMode) => LbEntry[];
	addLocal: (pid: string, mode: PlayMode, name: string, n: number) => number;
	rank: (l: LbEntry[], pid: string, n: number) => number;
	postStart: (pid: string) => Promise<Partial<StartResponse>>;
	postScore: (body: ScoreRequest) => Promise<Partial<ScoreResponse> & { error?: string }>;
	fetchBoard: (mode: PlayMode) => Promise<LbEntry[] | null>;
	saveBoards: (lifetime: LbEntry[], daily: LbEntry[]) => void;
};

export type SheetsPort = {
	show: (el: HTMLElement | null) => void;
	hide: (el: HTMLElement | null) => Promise<void>;
	setCoach: (el: HTMLElement | null, on: boolean) => void;
	prefersReducedMotion: () => boolean;
};

export type PlatformPort = {
	isNative: boolean;
	lbUrl: string;
	appVersionLabel: () => string;
};

/** All side-effect adapters the engine depends on. */
export type GameAdapters = {
	storage: StoragePort;
	audio: AudioPort;
	haptics: HapticsPort;
	keepAwake: KeepAwakePort;
	share: SharePort;
	leaderboard: LeaderboardPort;
	sheets: SheetsPort;
	platform: PlatformPort;
};
