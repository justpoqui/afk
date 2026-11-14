# Idle Realms

An original idle fantasy RPG for the browser, built mobile-first. It combines an auto-battler hero campaign with a skilling game: gather, craft and work through a task chain.

## Play
Open `index.html` in a browser. No build step and no dependencies. Progress saves to the browser's localStorage.

For phone testing on a local network, serve the folder, e.g. `python3 -m http.server 8000`.

## Android APK
The `android/` folder is a small native app that runs the game full-screen in a WebView. The game files are copied in from the repo root at build time, so there's only one copy of the game code.

- **Download**: every push rebuilds the APK through GitHub Actions and attaches it as `IdleRealms.apk` to the **android-latest** release (Releases page). Open it on your phone and install it. Android will ask you to allow installs from your browser or file manager.
- **Build locally**: `cd android && ./gradlew assembleRelease` (needs JDK 17+ and the Android SDK, with `sdk.dir` in `android/local.properties`). The output is `android/app/build/outputs/apk/release/app-release.apk`.
- Every build is signed with the same test key (`android/app/idlerealms-test.keystore`), so new builds install over old ones and **your save is kept**. Use a private key before publishing to a store.
- The Android back button closes popups and menus, then returns to Camp, then exits.

## Art (Blender)
Every sprite and background is modeled and rendered by code in Blender. Nothing is hand-drawn, so it's easy to tweak and re-render.

| Script | Output |
|---|---|
| `art/blender/sprites.py` | `assets/sprites/*.webp`: 16 heroes, 8 monsters, 4 bosses (256×256, transparent, cartoon outline) |
| `art/blender/backgrounds.py` | `assets/bg/battle_ch1-6.webp`: one arena per chapter (720×1280), plus `camp.webp` (1024×512) |
| `art/blender/common.py` | Shared helpers: materials, shapes, outlines, lights, auto-framed camera |

To re-render, install Blender's Python module (`pip install bpy==5.3.0`, needs Python 3.13) or use Blender itself:
```
python art/blender/sprites.py               # all sprites
python art/blender/sprites.py nyx wolf      # just these
python art/blender/backgrounds.py camp ch3  # specific backgrounds
blender -b -P art/blender/sprites.py        # same thing with a Blender install
```
Rendering uses Cycles on the CPU, so no GPU is needed. Sprites take about 1s each, backgrounds 30–60s each.

## Features
### Skills (sidebar)
- **Gathering**: Woodcutting, Mining, Fishing, Herbalism. Each has 5 material tiers unlocked by level, up to level 99. Higher levels raise the chance of getting double items.
- **Crafting**: Smithing (ore + logs → bars → blades and plate armor), Cooking (fish → battle food), Alchemy (herbs → potions). Higher levels raise the chance of keeping the materials.
- One action runs at a time with a progress bar. It **keeps running while the game is closed** (up to 12h) and shows a "welcome back" summary.
- **Bank**: every item you own, sorted by category. Sell for gold, equip gear, set food as provisions, or drink potions.

### Skills feed into combat
- Forged **weapons and armor** equip onto heroes for flat ATK, HP and DEF.
- Cooked **provisions** are eaten automatically by heroes below 45% HP in battle.
- **Potions** give stat buffs for 5 battles.

### Task chain
- 6 tiers of tasks across every system (gather X, reach skill level Y, forge your first blade, clear stage Z, summon, equip gear…). Each task gives a reward, and finishing a tier gives a bonus and unlocks the next tier.

### Combat
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
| `js/skilldata.js` | Skills, items, recipes (generated from 5 tiers), task tiers |
| `js/skills.js` | Skilling engine (live + offline), XP curve, task progress/claims |
| `js/state.js` | Save/load, stat formulas, stages, idle economy, summoning |
| `js/battle.js` | Auto-battle simulation and battlefield rendering |
| `js/ui.js` | Screens, modals, input handling, battle flow |
| `styles.css` | All styling |

## Ideas for next steps
Item drops from combat, skill mastery/pets, faction bonuses, daily quests, a tower or arena mode, real art and sound, and packaging as an Android app with Capacitor.
