import { Cap } from './platform';
import { SHAPES, type ShapeId } from '../core/constants';

export async function shareCard(opts: {
	lastScore: number;
	lastPerfectPct: number;
	shape: ShapeId;
	who: string;
}) {
	const { lastScore, lastPerfectPct, shape, who } = opts;
	const c = document.createElement('canvas');
	c.width = 720;
	c.height = 900;
	const g = c.getContext('2d')!;
	g.fillStyle = '#05070F';
	g.fillRect(0, 0, 720, 900);
	const rg = g.createRadialGradient(360, 720, 20, 360, 720, 440);
	rg.addColorStop(0, 'rgba(255,138,61,.28)');
	rg.addColorStop(1, 'rgba(255,138,61,0)');
	g.fillStyle = rg;
	g.fillRect(0, 0, 720, 900);
	const cool = g.createRadialGradient(360, 120, 10, 360, 120, 280);
	cool.addColorStop(0, 'rgba(94,200,224,.1)');
	cool.addColorStop(1, 'rgba(94,200,224,0)');
	g.fillStyle = cool;
	g.fillRect(0, 0, 720, 900);

	g.fillStyle = '#F7F4EE';
	g.font = '800 52px system-ui,-apple-system,sans-serif';
	g.textAlign = 'center';
	g.fillText('Pulse', 300, 118);
	g.fillStyle = '#FF8A3D';
	g.fillText('Stack', 448, 118);

	g.fillStyle = '#FF8A3D';
	g.font = '800 168px system-ui,-apple-system,sans-serif';
	g.fillText(String(lastScore), 360, 390);
	g.fillStyle = '#9AA3B8';
	g.font = '600 13px system-ui,-apple-system,sans-serif';
	g.fillText('HEIGHT', 360, 430);

	g.fillStyle = '#F7F4EE';
	g.font = '600 28px system-ui,-apple-system,sans-serif';
	g.fillText(lastPerfectPct + '% on the peak', 360, 510);

	const sn = SHAPES.find((s) => s.id === shape);
	g.fillStyle = '#9AA3B8';
	g.font = '500 15px system-ui,-apple-system,sans-serif';
	g.fillText((sn ? sn.name : shape) + ' · ' + who, 360, 570);

	g.fillStyle = '#9AA3B8';
	g.font = '500 13px system-ui,-apple-system,sans-serif';
	g.fillText('pulsestack', 360, 820);

	const blob = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/png'));
	if (!blob) return;
	const file = new File([blob], 'pulsestack.png', { type: 'image/png' });
	const text = `PulseStack ${lastScore} · ${lastPerfectPct}% peak`;

	if (Cap.isNative) {
		try {
			const { Share } = await import('@capacitor/share');
			const dataUrl = await new Promise<string>((resolve) => {
				const r = new FileReader();
				r.onload = () => resolve(String(r.result));
				r.readAsDataURL(blob);
			});
			await Share.share({ title: 'PulseStack', text, url: dataUrl, dialogTitle: 'Share run' });
			return;
		} catch {
			/* fall through */
		}
	}

	try {
		if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
			await navigator.share({ files: [file], title: 'PulseStack', text });
			return;
		}
	} catch {
		/* fall through */
	}
	const a = document.createElement('a');
	a.href = URL.createObjectURL(blob);
	a.download = 'pulsestack.png';
	a.click();
	URL.revokeObjectURL(a.href);
}
