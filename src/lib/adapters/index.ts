import type {
	AudioPort,
	GameAdapters,
	HapticsPort,
	KeepAwakePort,
	LeaderboardPort,
	PlatformPort,
	SharePort,
	SheetsPort,
	StoragePort,
} from './types';
import * as audioImpl from './audio';
import * as hapticsImpl from './haptics';
import * as keepAwakeImpl from './keepAwake';
import * as lb from './leaderboard';
import { Cap, LB_URL, appVersionLabel } from './platform';
import { shareCard } from './share';
import * as sheetsImpl from './sheets';
import * as storageImpl from './storage';

export type {
	AudioPort,
	GameAdapters,
	HapticsPort,
	KeepAwakePort,
	LeaderboardPort,
	PlatformPort,
	SharePort,
	SheetsPort,
	StoragePort,
	Unlocks,
} from './types';

export function createStorageAdapter(): StoragePort {
	return {
		pref: storageImpl.pref,
		save: storageImpl.save,
		loadUnlocks: storageImpl.loadUnlocks,
		saveUnlocks: storageImpl.saveUnlocks,
		loadBestTower: storageImpl.loadBestTower,
		ensurePid: storageImpl.ensurePid,
		utcDay: storageImpl.utcDay,
	};
}

export function createAudioAdapter(): AudioPort {
	return {
		unlock: () => audioImpl.unlock(),
		setEnabled: (on) => audioImpl.setEnabled(on),
		tone: audioImpl.tone,
		tick: audioImpl.tick,
		chordStab: audioImpl.chordStab,
		coolCue: audioImpl.coolCue,
	};
}

export function createHapticsAdapter(): HapticsPort {
	return { pulse: (ms) => void hapticsImpl.haptic(ms) };
}

export function createKeepAwakeAdapter(): KeepAwakePort {
	return { set: (on) => void keepAwakeImpl.setKeepAwake(on) };
}

export function createShareAdapter(): SharePort {
	return { shareCard };
}

export function createLeaderboardAdapter(): LeaderboardPort {
	return {
		getLocal: lb.lbGet,
		addLocal: lb.lbAddLocal,
		rank: lb.lbRank,
		postStart: lb.postStart,
		postScore: lb.postScore,
		fetchBoard: lb.fetchBoard,
		saveBoards: lb.saveBoards,
	};
}

export function createSheetsAdapter(): SheetsPort {
	return {
		show: sheetsImpl.showSheet,
		hide: sheetsImpl.hideSheet,
		setCoach: sheetsImpl.setCoach,
		prefersReducedMotion: sheetsImpl.prefersReducedMotion,
	};
}

export function createPlatformAdapter(): PlatformPort {
	return {
		get isNative() {
			return Cap.isNative;
		},
		lbUrl: LB_URL,
		appVersionLabel,
	};
}

/** Full browser/Capacitor adapter set. Override individual ports via `createGame({ adapters })`. */
export function createDefaultAdapters(): GameAdapters {
	return {
		storage: createStorageAdapter(),
		audio: createAudioAdapter(),
		haptics: createHapticsAdapter(),
		keepAwake: createKeepAwakeAdapter(),
		share: createShareAdapter(),
		leaderboard: createLeaderboardAdapter(),
		sheets: createSheetsAdapter(),
		platform: createPlatformAdapter(),
	};
}

export { Cap, LB_URL, appVersionLabel } from './platform';
