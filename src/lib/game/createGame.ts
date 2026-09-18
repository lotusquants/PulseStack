import type { GameAdapters } from '../adapters';
import { createDefaultAdapters } from '../adapters';
import { GameEngine, type EngineHooks } from './engine';

export type CreateGameOptions = {
	hooks: EngineHooks;
	/** Override individual adapters (e.g. mute audio in tests). */
	adapters?: Partial<GameAdapters>;
};

/** Wire default adapters, then construct the engine. */
export function createGame(opts: CreateGameOptions): GameEngine {
	const adapters: GameAdapters = { ...createDefaultAdapters(), ...opts.adapters };
	return new GameEngine(opts.hooks, adapters);
}
