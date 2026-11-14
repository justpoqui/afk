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
| `art/blender/sprites.py` | `assets/sprites/*.webp`: 24 heroes, 13 monsters, 4 bosses (256×256, transparent, cartoon outline), each in a portrait pose and a `_side` battle pose |
| `art/blender/backgrounds.py` | `assets/bg/battle_ch1-6.webp`: a side-view arena per chapter (720×1280; stands and crowd, wall and banners, scenery, sky), plus `camp.webp` (1024×512) |
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
### One character, Melvor-style
- You play **one character**. Its stats come from four **combat skills**, plus gear and its look:
  - 🎯 **Attack**: hit chance and attack speed
  - 💪 **Strength**: damage per hit
  - 🛡️ **Defence**: damage reduction, and enemies miss more
  - ❤️ **Hitpoints**: max HP (starts at level 10)
- Damage you deal in battle becomes combat XP. Your **attack style** (Accurate, Aggressive or Defensive) picks which skill gets it, and Hitpoints always gets a third.
- **One activity at a time**: fighting stops any running skill action, just like starting another skill would.
- **Wardrobe**: spend a 📜 scroll (or 💎 150) to **reroll your look**, chosen from 24 designs. Each look gives a bonus by class and rarity (damage, max HP and defence, attack speed, special power, or HP regen) on top of gear, and brings its own special attack. You choose whether to keep the new look, and a Legendary is guaranteed within 30 rerolls.
- **Equipment** slots (weapon, armor; built to take more slots later), **food** carried in your inventory, eaten automatically below 45% HP (one tap fills your free slots from the bank), and **potions** for 5 battles.

### Skills (sidebar)
- **Gathering**: Woodcutting, Mining, Fishing, Herbalism. Each has 5 material tiers, up to level 99.
- **Crafting**: Smithing (bars → blades and plate armor), Cooking (food), Alchemy (potions).
- Skill actions keep running while the game is closed (up to 12h). Skill XP is tuned by `SKILL_XP_MULT` in `js/skilldata.js`.
- **Inventory (28 slots)**: everything you gather or craft goes here, **one item per slot**. Only the **bank** stacks items, except stackable items like 🍖 **Burnt Food** (every dish that burns while cooking turns into it). Skill actions stop when the inventory is full, so deposit in the bank. Crafting takes materials from the inventory first, then the bank.
- **Bank**: deposit or withdraw, sell, equip gear, choose battle food, drink potions.
- **Cooking can burn**: 40% at a recipe's level, 1.2% less per level above it (minimum 2%). Burnt dishes give no XP.

### Task chain
- 6 tiers of tasks across every system, with a bonus reward for finishing each tier.

### Combat
- Side-on arena battles, like Swords & Sandals: fighters stand on the arena floor (crowd and banners behind), you on the right, enemies on the left (melee nearest, casters behind). Ranged attacks arc overhead. Damage numbers linger, and status badges stay up while effects last.
- **Auto ⟳** keeps fighting the next stage after each win. **✕** retreats (XP still counts). Speed 1x/2x/3x, and Skip.
- Campaign chapters with a boss every 10 stages. A character whose combat skills are at about level L, with matching gear, can clear about stage L.

## Code layout
| File | Purpose |
|---|---|
| `js/data.js` | Factions, classes, rarities, heroes, monsters |
| `js/skilldata.js` | Skills, items, recipes (generated from 5 tiers), task tiers |
| `js/skills.js` | Skilling engine (live + offline), XP curve, task progress/claims |
| `js/state.js` | Save/load (with migration from team saves), player stats from combat skills, skins & rerolls, stages, idle economy |
| `js/battle.js` | Auto-battle simulation and battlefield rendering |
| `js/ui.js` | Screens, modals, input handling, battle flow |
| `styles.css` | All styling |

## Ideas for next steps
Item drops from combat, skill mastery/pets, faction bonuses, daily quests, a tower or arena mode, real art and sound, and packaging as an Android app with Capacitor.
