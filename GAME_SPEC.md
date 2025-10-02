# Ancient War II – Game Specification

## Core loop

Each turn runs the following phases:

1. **Player Action Phase** – Up to `maxActionsPerTurn` (default 3). Actions consume treasury (see `config.json`) or require context such as controlled territories or target nations.
2. **AI Action Phase** – Every non-player nation selects ~2 actions via archetype heuristics (Expansionist, Defensive, Opportunistic).
3. **Combat Resolution** – Any `MoveArmy` actions into hostile territory resolve immediately via the war formula below.
4. **Events & Maintenance** – Treasury upkeep, base stat drift (support decay, crime drift, science growth), random events (harvest, drought, raid, festival, scholar) seeded through the deterministic RNG.
5. **End-of-turn checks** – Revolt chances (high crime + low stability), alliance/war housekeeping, victory/defeat detection (player wins at ≥8 territories or high stability + influence; loses at stability ≤20 or no territories). Turn then increments and the player phase begins again unless victory/defeat triggered.

## Stats and tracks

* **Stability** – Resilience against revolts and collapse. Low stability heightens revolt risk.
* **Military** – Base martial strength feeding the combat formula.
* **Tech / Science** – Tech improves combat throughput; science slowly rises via investments/events.
* **Economy** – Drives passive income and modulates certain perks.
* **Crime** – Higher crime increases revolt probabilities. Suppression lowers it; taxes raise it.
* **Influence** – Narrative measure for victory and diplomacy.
* **Support** – Popular backing; influences combat and attrition losses.
* **Laws** – Legislative rigor; targeted by Pass Law and certain events.
* **Treasury** – Not a stat but tracked per nation for costs and upkeep.

## Actions

| Action | Description | Key Effects |
| ------ | ----------- | ----------- |
| InvestInTech | Spend treasury to raise `tech` & `science`. Traits may add bonuses. | +Tech, +Science, costs coin. |
| RecruitArmy | Increase garrison strength in a owned territory. | +Garrison strength; trait hooks add bonuses or penalties. |
| MoveArmy | Move garrison from a tile to a neighbor or attack enemy territory. | Triggers combat resolution when entering hostile territory. |
| CollectTaxes | Increase treasury and economy at the cost of crime. | +Treasury, +Economy, +Crime (+extras for certain traits). |
| PassLaw | Improve `laws` and `stability`. Some nations add support bonuses or penalties. | +Laws, +Stability; trait side effects. |
| Spy | Lower target stability and raise their crime. | -Stability, +Crime for target. |
| DiplomacyOffer | Improve bilateral relations. | +Relations; trait hooks add economy bonuses. |
| DeclareWar | Toggle war state and apply stability penalties. | War state on, stability hit, special perks (Akkad). |
| FormAlliance | Toggle alliance and improve relations. | Alliance on, some traits reduce stability. |
| Bribe | Raise relations while inflating the target’s crime. | +Relations, target crime +. |
| SuppressCrime | Reduce crime, usually at small support cost. | -Crime, support penalty, trait modifiers. |

## Combat

When `MoveArmy` targets an enemy-controlled tile, combat executes with:

```
baseAttacker = attackingStrength + attacker.stats.military / 5
baseDefender = territory.garrison + defender.stats.military / 5
terrainModifier = TERRAIN_MODIFIERS[territory.terrain]
attackerEffective = baseAttacker * (1 + attacker.tech/200) * (1 + attacker.support/200)
                   * terrainModifier * rand(0.85, 1.15)
defenderEffective = baseDefender * (1 + defender.tech/200) * (1 + defender.support/200)
                   * terrainModifier * rand(0.85, 1.15)
```

* If `attackerEffective > defenderEffective * 1.1`, attacker wins and captures the territory, setting the new garrison to remaining strength.
* If `defenderEffective > attackerEffective * 1.1`, defender holds and the attacker suffers stability/crime penalties.
* Otherwise, stalemate with attrition losses to both sides.
* Loser suffers additional `warStabilityPenalty` and crime rise; winners still lose some stability.
* Casualties are proportional to the opposing effective score share.

## AI heuristics

Each AI nation is assigned an archetype (cycled in alphabetical order, excluding the player). Heuristics evaluate current state and neighbors, with small randomness for variety. Deterministic fallback exists for tests (seeded RNG).

### Expansionist

```
function expansionistActions(state, nation):
    borderTiles = friendly tiles with hostile neighbors
    if borderTiles empty -> recruit in first territory
    enemyTile = random hostile neighbor of a random border tile
    if not at war(enemyTile.owner)
        return [DeclareWar(enemyTile.owner), RecruitArmy(homeTile)]
    else
        return [MoveArmy(source=border tile, target=enemyTile), RecruitArmy(homeTile)]
```

### Defensive / Pragmatic

```
function defensiveActions(state, nation):
    if crime > 60 -> SuppressCrime
    else if stability < 55 -> PassLaw
    else -> InvestInTech
    secondary = random choice of CollectTaxes or InvestInTech
    return [primary, secondary]
```

### Opportunistic

```
function opportunisticActions(state, nation):
    enemies = hostile neighbors sorted by lowest stability
    if weakest enemy exists and friendly neighbor present:
        return [MoveArmy(from friendly neighbor, to weakest enemy), Spy(player)]
    if enemies exist and rng > 0.5 -> DiplomacyOffer(enemies[0])
    else -> CollectTaxes
```

The AI ensures at most two actions each phase. The behaviour is unit-tested (`src/game/__tests__/ai.test.ts`).

## Events & maintenance

After actions:

* Treasury income = controlled territories × `incomePerTerritoryBase` minus army upkeep.
* Support decays (`baseSupportDecay`), science drifts (`baseScienceDrift`), crime adjusts (`baseCrimeGrowth - crimeDecay`).
* Each active war reduces stability by `stabilityDecayPerWar`.
* Random events apply per nation (player always receives one, AI has 45% chance). Events include harvest (+economy +stability), drought (-economy -stability with trait penalties), border raid (garrison hit + unrest), festival (+support +stability), scholar (+science +tech).
* Revolt check: `unrestScore = crime + territory.unrest - stability`; if >60 and RNG >0.6, territory loses garrison and nation loses stability.

## Victory and defeat

* **Victory**: player controls ≥8 territories or reaches influence ≥90 while stability ≥75.
* **Defeat**: player stability ≤20 or zero territories remain.

## Save data format

`quickSaveState` serializes `GameState` with diplomacy sets converted to arrays. `loadStateFromString` rehydrates sets for wars and alliances. Saves are JSON strings suitable for `localStorage`.

## Testing surface

* `combat.test.ts` – deterministic combat outcome with seeded RNG.
* `ai.test.ts` – verifies each archetype chooses expected action categories.
* `turn.test.ts` – ensures turn advancement increments counters, resets actions, and applies maintenance.

