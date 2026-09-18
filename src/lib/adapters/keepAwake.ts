import { Cap } from './platform';

/** Keep the screen on during a run (native only). */
export async function setKeepAwake(on: boolean) {
	try {
		if (!Cap.isNative) return;
		const { KeepAwake } = await import('@capacitor-community/keep-awake');
		if (on) await KeepAwake.keepAwake();
		else await KeepAwake.allowSleep();
	} catch {
		/* web / plugin unavailable */
	}
}
