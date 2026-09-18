<script lang="ts">
	import { onMount } from 'svelte';
	import { base } from '$app/paths';
	import { createGame, type HudState } from '$lib/game';
	import { appVersionLabel, Cap } from '$lib/adapters';
	import { env } from '$env/dynamic/public';

	let stageEl: HTMLElement;
	let canvasEl: HTMLCanvasElement;
	let nameInput = '';
	let engine: ReturnType<typeof createGame> | null = null;

	let hud: HudState = {
		score: 0,
		best: 0,
		streakText: '',
		dayStreak: '',
		coachOn: false,
		sheet: 'start',
		name: '',
		shape: 'ghost',
		sound: true,
		vers: 'web',
		over: {
			final: 0,
			headline: 'The tower is a thread.',
			delta: '',
			peakPct: 0,
			maxStreak: 0,
			feverLabel: '—',
			unlockNote: '',
			board: '',
			shareOn: false,
		},
		lb: { title: 'All-time', modeLabel: 'Today', entries: [], pidShort: '' },
	};

	function mergeHud(patch: Partial<HudState>) {
		hud = {
			...hud,
			...patch,
			over: patch.over ? { ...hud.over, ...patch.over } : hud.over,
			lb: patch.lb ? { ...hud.lb, ...patch.lb } : hud.lb,
		};
		if (patch.name !== undefined) nameInput = patch.name;
	}

	onMount(() => {
		engine = createGame({
			hooks: {
				getCanvas: () => canvasEl,
				getStage: () => stageEl,
				getEl: (id) => document.getElementById(id),
				onHud: mergeHud,
				getName: () => nameInput,
			},
		});
		engine.init();
		mergeHud({
			vers: Cap.isNative ? 'v' + (env.PUBLIC_APP_VERSION || '1.0.0') : appVersionLabel(),
		});

		const onKey = (e: KeyboardEvent) => {
			if (!e.isTrusted || !engine) return;
			if (e.code === 'Escape') {
				engine.isPaused ? engine.resume() : engine.pause();
				return;
			}
			if (e.code !== 'Space' || (e.target as HTMLElement).tagName === 'INPUT') return;
			e.preventDefault();
			if (!engine.startHidden) engine.begin();
			else if (!engine.overHidden) engine.again();
			else if (!engine.isPaused) engine.tap();
		};
		addEventListener('keydown', onKey);
		window.onBack = () => engine?.onBack() ?? false;

		let removeBack: (() => void) | undefined;
		(async () => {
			if (!Cap.isNative) return;
			try {
				const { App } = await import('@capacitor/app');
				const { StatusBar, Style } = await import('@capacitor/status-bar');
				await StatusBar.setStyle({ style: Style.Dark });
				await StatusBar.setBackgroundColor({ color: '#05070F' });
				const sub = await App.addListener('backButton', ({ canGoBack }) => {
					if (engine?.onBack()) return;
					if (!canGoBack) App.exitApp();
				});
				removeBack = () => sub.remove();
			} catch {
				/* web preview */
			}
		})();

		if (location.protocol.startsWith('http') && 'serviceWorker' in navigator) {
			navigator.serviceWorker.register(`${base}/sw.js`).catch(() => {});
		}

		return () => {
			removeEventListener('keydown', onKey);
			removeBack?.();
			engine?.destroy();
			window.onBack = undefined;
		};
	});
</script>

<div id="stage" bind:this={stageEl}>
	<canvas
		id="c"
		bind:this={canvasEl}
		onpointerdown={(e) => {
			e.preventDefault();
			if (e.isTrusted) engine?.tap();
		}}
	></canvas>

	<div class="hud" class:hud-hidden={hud.sheet !== null}>
		<div class="hud-chip">
			<div class="n">{hud.score}</div>
			<small>Height</small>
			{#if hud.streakText}
				<span class="streak chip">{hud.streakText}</span>
			{/if}
		</div>
		<div class="hud-right">
			<div class="hud-chip hud-chip-best">
				<div class="best">{hud.best}</div>
				<small>Best</small>
			</div>
			<button
				type="button"
				id="menuBtn"
				class="icon-btn"
				aria-label="Pause"
				onclick={() => engine?.pause()}
			>
				<span class="pause-icon" aria-hidden="true"></span>
			</button>
		</div>
	</div>

	<div class="coach" id="coach">Tap at the peak</div>

	<div class="overlay home" id="start">
		<div class="homeBrand">
			<h1>Pulse<span>Stack</span></h1>
			<p class="tag">Tap the peak. Stack thinner with every miss.</p>
			<div class="chip dayStreak" id="dayStreak" class:empty={!hud.dayStreak}>{hud.dayStreak}</div>
		</div>
		<div class="dock">
			<input
				id="name"
				placeholder="Your name"
				maxlength="12"
				autocomplete="off"
				bind:value={nameInput}
				oninput={() => engine?.setName(nameInput)}
			/>
			<button type="button" id="go" onclick={() => engine?.begin()}>Play</button>
			<div class="dockNav">
				<button type="button" class="link-btn" id="lbBtn" onclick={() => engine?.showLb('start')}
					>Board</button
				>
				<button type="button" class="link-btn" id="optBtn" onclick={() => engine?.showOptions()}
					>Pulse</button
				>
				<span class="vers" id="vers">{hud.vers}</span>
			</div>
		</div>
	</div>

	<div class="overlay sheet-host" id="options">
		<div class="sheet-scrim" role="presentation"></div>
		<div class="sheet">
			<div class="sheet-handle" aria-hidden="true"></div>
			<h2>The pulse</h2>
			<p>Pick how you read the beat.</p>
			<div class="opts" id="opts"></div>
			<label class="toggle">
				<input
					type="checkbox"
					id="snd"
					checked={hud.sound}
					onchange={(e) => engine?.setSound((e.currentTarget as HTMLInputElement).checked)}
				/>
				<span>Sound <b id="sndV">{hud.sound ? 'on' : 'off'}</b></span>
			</label>
			<button type="button" id="optDone" onclick={() => engine?.hideOptions()}>Done</button>
		</div>
	</div>

	<div class="overlay sheet-host sheet-tall" id="over">
		<div class="sheet-scrim" role="presentation"></div>
		<div class="sheet">
			<div class="sheet-handle" aria-hidden="true"></div>
			<div class="big" id="final">{hud.over.final}</div>
			<h2 id="headline">{hud.over.headline}</h2>
			<p class="delta" id="delta">{hud.over.delta}</p>
			<div class="stats" id="stats">
				<div class="stat-pill">Peak<b>{hud.over.peakPct}%</b></div>
				<div class="stat-pill">Max streak<b>×{hud.over.maxStreak}</b></div>
				<div class="stat-pill">Fever<b>{hud.over.feverLabel}</b></div>
			</div>
			<p class="unlockNote" id="unlockNote">{hud.over.unlockNote}</p>
			<p class="board" id="board">{hud.over.board}</p>
			<button type="button" id="again" onclick={() => engine?.again()}>Again</button>
			<div class="overBar">
				<button
					type="button"
					class="link-btn"
					id="share"
					class:on={hud.over.shareOn}
					onclick={() => engine?.share()}>Share</button
				>
				<button type="button" class="link-btn" id="lbBtn2" onclick={() => engine?.showLb('over')}
					>Board</button
				>
				<button type="button" class="link-btn" id="optBtn2" onclick={() => engine?.showOptions()}
					>Pulse</button
				>
			</div>
		</div>
	</div>

	<div class="overlay sheet-host" id="lb">
		<div class="sheet-scrim" role="presentation"></div>
		<div class="sheet">
			<div class="sheet-handle" aria-hidden="true"></div>
			<h2 id="lbTitle">{hud.lb.title}</h2>
			<button type="button" class="seg" id="lbMode" onclick={() => engine?.toggleLbMode()}
				>{hud.lb.modeLabel}</button
			>
			<ol id="lbList">
				{#if hud.lb.entries.length === 0}
					<li><span>No runs yet</span></li>
				{:else}
					{#each hud.lb.entries as e, i}
						<li class:me={e.id === hud.lb.pidShort}>
							<span>{i + 1}. {e.name.replace(/[<>&]/g, '')} <small>#{e.id}</small></span>
							<b>{e.n}</b>
						</li>
					{/each}
				{/if}
			</ol>
			<button type="button" id="lbDone" onclick={() => engine?.hideLb()}>Close</button>
		</div>
	</div>

	<div class="overlay sheet-host" id="menu">
		<div class="sheet-scrim" role="presentation"></div>
		<div class="sheet">
			<div class="sheet-handle" aria-hidden="true"></div>
			<h2>Paused</h2>
			<button type="button" id="resume" onclick={() => engine?.resume()}>Resume</button>
			<div class="row">
				<button type="button" class="ghost" id="restart" onclick={() => engine?.restart()}
					>Restart</button
				>
				<button type="button" class="ghost" id="optBtn3" onclick={() => engine?.showOptions()}
					>Pulse</button
				>
				<button type="button" class="ghost" id="quit" onclick={() => engine?.quit()}>Quit</button>
			</div>
		</div>
	</div>
</div>
