# Idle Realms

An original idle / AFK fantasy RPG prototype that runs in the browser (mobile-first).

## Play
Open `index.html` in a browser. No build step and no dependencies. Progress saves to the browser's localStorage.

For phone testing on a local network, serve the folder, e.g. `python3 -m http.server 8000`.

## Features
- **Idle rewards**: gold, hero EXP and gems pile up over time (up to 12h, offline too), at higher rates as you clear stages.
- **Campaign**: auto-battles across chapters, with a boss every 10 stages and a power comparison before each fight.
- **Real-time auto-battle**: front and back rows, melee vs. ranged targeting, energy-charged ultimates (AoE, heals, shields, stuns, buffs, executes, life drain), crits, 1x/2x/3x speed and skip.
- **16 original heroes** across 4 factions (Dawnguard, Wildroot, Ironveil, Duskborn), 5 classes and 3 rarities.
- **Summoning**: ×1 / ×10 with scrolls or gems, and a guaranteed Legendary within 30 summons. Duplicates add stars (+20% stats, +15 level cap).
- **Team builder**: 5-slot formation and an auto-fill button.

## Code layout
| File | Purpose |
|---|---|
| `js/data.js` | Factions, classes, rarities, heroes, monsters |
| `js/state.js` | Save/load, stat formulas, stages, idle economy, summoning |
| `js/battle.js` | Auto-battle simulation and battlefield rendering |
| `js/ui.js` | Screens, modals, input handling, battle flow |
| `styles.css` | All styling |

## Ideas for next steps
Gear and equipment, faction bonuses, daily quests, a tower or arena mode, real art and sound, and packaging as an Android app with Capacitor.
