# Pair endless leaderboard title with Daily board

Written against: `571fe1ea4e193a496316912ce3d549ea62338448`

## Evidence chain

- Surface: `#lb` overlay on the mobile game shell (`src/lib/components/Game.svelte` ← `createGame` / `GameEngine`)
- Problem: When `lbView` is endless, `#lbTitle` reads `Leaderboard` while the peer daily mode reads `Daily board`, and the mode toggle already names the peers `Endless` / `Daily`
- Design evidence: Internal copy contradiction in the same sheet — `showLb` title strings vs `modeLabel` pair (`Endless` ↔ `Daily`)
- Owner: `src/lib/game/engine.ts` (`showLb`); initial HUD default at engine `init` and `Game.svelte` default `hud.lb`
- Scope and affected surfaces: `#lbTitle` only when endless is active; `#lbMode` labels unchanged
- Uncertainty: none

## Design decision

Replace the endless-mode sheet title `Leaderboard` with `Endless board` everywhere it is set, so both modes use the parallel pattern `<Mode> board` that already matches the Endless/Daily toggle. Do not rename the Board chrome buttons or change toggle behavior.

## Reuse

- Existing title pattern: `'Daily board'` in `showLb`
- Existing toggle labels: `'Endless'` / `'Daily'` (unchanged)
- Exemplar: `src/lib/game/engine.ts` — `title: this.lbView === 'daily' ? 'Daily board' : …`

No new primitive.

## Changes

1. `src/lib/game/engine.ts` — `showLb` (local HUD patch and remote HUD patch)
   - Change: When `lbView !== 'daily'`, set `title` to `'Endless board'` instead of `'Leaderboard'` (both `patchHud` call sites in `showLb`).
   - Preserve: `'Daily board'`; `modeLabel` (`Endless` / `Daily`); fetch/list behavior; `#lbMode` / Back layout.
   - Verify: Opening Board in endless shows **Endless board**; toggling to Daily shows **Daily board**; toggling back shows **Endless board** again.

2. `src/lib/game/engine.ts` — `init` default `lb.title`
   - Change: Default `lb.title` from `'Leaderboard'` to `'Endless board'` (default `lbView` is endless).
   - Preserve: `modeLabel: 'Daily'` (switch target while on endless).
   - Verify: First open of `#lb` before/without remote still shows **Endless board**.

3. `src/lib/components/Game.svelte` — initial `hud.lb.title`
   - Change: Default `title: 'Endless board'` to match engine default before first `onHud`.
   - Preserve: Markup, `#lbTitle` binding, button labels (`Board`, mode toggle).
   - Verify: No flash of `Leaderboard` on first paint if `#lb` were visible; SSR/hydration default matches engine.

## Scope

- Inherit: Any consumer of `HudState.lb.title` (currently only `#lbTitle`)
- Verify: Start → Board; Over → Board; `#lbMode` toggle both directions; empty and non-empty lists
- Exclude: README/DEPLOY “Leaderboard” product wording; worker/API; `homeBar`/`overBar` “Board” buttons; canvas; other overlays

## Validation

- Product: Open the board from home and from game over; confirm endless title is **Endless board** and daily remains **Daily board**; mode toggle still switches boards and updates the opposite-mode button label.
- Interface: `#lb` with zero entries and with entries; toggle Endless ↔ Daily twice; Back returns to prior sheet.
- System: No second title owner introduced; strings only in engine + matching Game.svelte default.
- Repository: `rg "Leaderboard" src/lib/game/engine.ts src/lib/components/Game.svelte` → no remaining user-facing `lb.title` / HUD default uses of `Leaderboard` (docs outside this surface may still say Leaderboard).

## Stop conditions

- Stop if product intent is that endless must stay branded “Leaderboard” (then titles must stay asymmetric and this plan is void).
- Stop if `HudState.lb.title` gains another owner outside `showLb` / these defaults.

## Design documentation

- After acceptance and validation: none (no DESIGN.md; optional later note that board sheet titles are `Endless board` / `Daily board`).
