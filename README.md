# Map option: Interactive block-based grid — chosen to enable readable territory control and click-to-move armies while keeping implementation tractable.

## Ancient War II

Ancient War II is a polished turn-based grand-strategy prototype featuring eleven early civilizations, a stylised tactical map of Eurasia and North Africa, and a deterministic rules engine built for testing. The project ships with a React + TypeScript front end, complete JSON data, and automated Vitest coverage for combat, AI, and end-of-turn maintenance.

### Getting started

1. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```
2. **Run the development server**
   ```bash
   npm run dev
   ```
   The app serves on the printed Vite URL (usually <http://localhost:5173>). Keyboard shortcuts are available in-app (A – open quick action, D – jump to diplomacy, M – toggle map mode, E – end turn).
3. **Run tests**
   ```bash
   npm test
   ```
   This executes the combat, AI, and end-of-turn logic suites via Vitest.

### Repository layout

```
frontend/
  src/
    components/        → polished UI widgets (HUD, map, action modal, diplomacy, log)
    config/config.json → balance & tuning knobs
    data/              → eleven nations + tiled map definitions
    game/              → core rules engine, AI heuristics, RNG, events
    hooks/             → React hook connecting UI to game state
    styles/            → shared theming helpers
  vite.config.ts       → Vite + Vitest configuration
GAME_SPEC.md           → mechanical breakdown and AI pseudocode
README.md              → you are here
```

### Save / load

The **Save** and **Load** buttons in the map header persist the serialized game state into `localStorage` under the key `ancient-war-save`. The load button retrieves it; the last autosave is restored on refresh.

### Expanded systems

Ancient War II now simulates a broader grand-strategy toolkit:

* **Diplomacy depth** – Bilateral relations track treaty portfolios, reputation drift, casus belli triggers, and the penalties for breaking agreements, all surfaced in the revamped diplomacy table view.
* **Technology & traditions** – A moddable tech graph with culture-specific bonuses feeds into a parallel tradition tree; both respect prerequisites, configurable focus, and adoption flows.
* **Missions, scenarios, and achievements** – Progression logic evaluates mission steps, scenario objectives, and long-term achievement conditions, with UI trackers reflecting completion state.
* **Game modes & persistence** – Ironman toggles, scenario selection, custom seeds, hotkey editing, and replay recording/loading are all persisted between sessions.
* **Mod support** – Drop JSON mods into the `mods/` directory (or load them via the options panel) to extend techs, traditions, missions, scenarios, or achievements; schema validation and merging happen at runtime.

### Example Rome JSON entry

```json
{
  "id": "rome",
  "name": "Rome",
  "description": "Ambitious republic leveraging disciplined legions, civic roads, and resilient citizenry.",
  "territories": ["rome_etruria", "rome_latium", "rome_campania"],
  "stats": {
    "stability": 74,
    "military": 80,
    "tech": 66,
    "economy": 72,
    "crime": 32,
    "influence": 76,
    "support": 78,
    "science": 64,
    "laws": 70
  },
  "advantages": [
    "Legion Logistics: Move Army costs 1 less strength when marching on roads.",
    "Civic Virtue: Pass Law also grants +1 support if stability >=70."
  ],
  "disadvantages": [
    "Class Tensions: Collect Taxes adds +2 crime if support <65.",
    "Senate Debates: Diplomacy Offer effectiveness reduced by 1 relation."
  ]
}
```

### Sample 6-turn chronicle

| Turn | Highlight |
| ---- | --------- |
| 1    | Rome invests in technology, boosts science, and raises legion strength near Latium. Carthage seizes the initiative and declares war on Rome. |
| 2    | A Roman counter-offensive moves from Latium into Carthage after a successful amphibious assault, capturing the Punic capital. Egypt signs a defensive alliance with Harappa. |
| 3    | Diplomatic overture toward Minoa succeeds; relations improve while Medes spy on Assyria, pushing their crime upward. |
| 4    | Festivals bless Rome (event), lifting stability. Rome passes civic reforms and retains high support. Opportunistic Scythia probes Median borders but stalls. |
| 5    | Alliance request from Rome to Egypt is rebuffed; instead, Rome suppresses crime after taxation raises unrest. Akkad’s siege masters gain temporary military from declaring war on Harappa. |
| 6    | Harappa canal artisans funnel extra economy from tax collection, keeping their treasuries solvent despite dual wars. Revolt sparks in Maghrib, forcing Carthage (now AI-controlled) into defensive posture. |

### Tuning the simulation

The balancing file `frontend/src/config/config.json` exposes combat variance, per-action gains, upkeep costs, and systemic drifts (support, crime, science). Adjust values and restart the dev server to retune the experience. For example, increasing `techGainPerInvest` accelerates the tech race, while raising `stabilityDecayPerWar` makes protracted conflicts riskier. The engine reads this file at runtime, so no code changes are needed.

### Extending nations or the map

* Add new nation definitions to `frontend/src/data/nations.json`. Keep the stat keys (0–100) consistent.
* Extend territory coverage in `frontend/src/data/territories.json` by defining coordinates, neighbors, owner IDs, and terrain tags.
* Hook new perks or penalties by extending the trait hooks inside `frontend/src/game/engine.ts`.

### Simplifications

* Army logistics abstract to garrison strength per tile; there are no individual unit stacks.
* Trade and population systems are condensed into the single `economy` stat and the treasury.
* Random events are curated but light-weight (no cinematic sequences). They run deterministically from the seeded RNG for testing.

