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
| `art/blender/items.py` | `assets/items/<item id>.webp`: a 128×128 icon for **every item** (115). Kite shields are styled after their ore, and blades are sized by type, modeled to look like its name |
| `art/blender/common.py` | Shared helpers: materials, shapes, outlines, lights, auto-framed camera |

To re-render, install Blender's Python module (`pip install bpy==5.3.0`, needs Python 3.13) or use Blender itself:
```
python art/blender/sprites.py               # all sprites
python art/blender/sprites.py nyx wolf      # just these
python art/blender/backgrounds.py camp ch3  # specific backgrounds
blender -b -P art/blender/sprites.py        # same thing with a Blender install
```
### Adding items (including future monster drops)
Every item must look like its name. When you add an item (`addItem_` in `js/skilldata.js`):
1. Add a builder for its id to `ITEMS` in `art/blender/items.py` and render it: `python art/blender/items.py <id>`.
2. Run `node art/check-item-icons.js`. It lists any item still missing an icon and exits with an error if one is.

The game loads `assets/items/<id>.webp` for every item automatically, and shows the item's emoji only if the image is missing.

Rendering uses Cycles on the CPU, so no GPU is needed. Sprites take about 1s each, backgrounds 30–60s each.

## Features
### Home hub
The game opens on **Home**: idle rewards, what you're doing right now, and tiles for **Fight, Skills, Summon Looks, Look Library, Tasks, Quests, Bank, Inventory, Character Sheet, Equipment, Shop**. The sidebar has the same sections.

### One character, Melvor-style
- You play **one character**. Its stats come from four **combat skills**, plus gear and its look:
  - 🎯 **Attack**: hit chance and attack speed
  - 💪 **Strength**: damage per hit
  - 🛡️ **Defence**: damage reduction, and enemies miss more
  - ❤️ **Hitpoints**: max HP (starts at level 10)
- Damage you deal in battle becomes combat XP. Your **attack style** (Accurate, Aggressive or Defensive) picks which skill gets it, and Hitpoints always gets a third.
- **One activity at a time**: fighting stops any running skill action, just like starting another skill would.
- **Unarmed**: with no weapon equipped you fight with your 👊 fists and 🦶 feet, up close, whatever your fighting style.
- **Fighting style** dropdown on the Character Sheet: ⚔️ **Melee** (+10% damage, fights up close), 🏹 **Archery** (+15% attack speed, arrows from the back) or 🔮 **Magic** (specials charge 30% faster, spells from the back).
- **Looks**: open **chests** with 📜 scrolls to unlock looks into your **Look Library** (24 looks, with a dropdown to filter Melee, Archery or Magic looks). Wear any look you own. Each gives a bonus by class and rarity (damage, max HP and defence, attack speed, special power, or HP regen) on top of gear, plus its own special attack. Duplicates add ★ (+15% bonus each, up to ★5).

  | Chest | ×1 | ×6 | Odds |
  |---|---|---|---|
  | 🥉 Bronze | 📜 1 | 📜 5 | Rare 85%, Epic 13%, Legendary 2% |
  | 🥈 Silver | 📜 2 | 📜 10 | Rare 40%, Epic 50%, Legendary 10% |
  | 🥇 Gold | 📜 4 | 📜 20 | Epic 70%, Legendary 30% |

  Scrolls are used only for chests. 💎 Gems are used only to buy scrolls (**1,000 💎 = 1 📜**). Scrolls also drop from dungeon floors, bosses and tasks.
- **Equipment**: a paper doll with 7 slots: ⛑️ Helmet, 👕 Chest, 👖 Legs, 🧤 Gloves, 👢 Boots, 🗡️ Weapon, 🛡️ Shield. Gear comes in 5 metal or wood tiers. Weapons match a fighting style (blade = Melee, bow = Archery, staff = Magic), and a mismatched weapon gives half damage, **food** carried in your inventory, eaten automatically below 45% HP (one tap fills your free slots from the bank), and **potions** for 5 battles.

### Hunting grounds (Fight → Hunting Grounds)
- Each area has its own scene: a flower meadow, a thorn forest, a moonlit graveyard, an ice cave, underwater ruins, and a volcanic lair.
- Melvor-style **1v1 monster hunting** on repeat across 6 areas, from Mistvale Meadows (Lv 2–9) to the Boss Lairs (Lv 70–99). Levels are colored against your combat level.
- HP carries over between kills, and you eat food from your inventory. Each kill gives gold, a chance at area-tier materials, rare gear and gems, plus combat XP.
- Kills count toward quests. Retreating or falling shows a session summary.

### Item tiers and stats
- The five tiers (Copper, Iron, Silver, Mythril, Starmetal, and their wood and herb equivalents) belong to **levels 5, 10, 20, 30 and 40**.
- **Gear** (weapons, armor, shields) unlocks for crafting at its tier's level, and it **needs that level to equip**: 🎯 Attack for weapons, 🛡️ Defence for armor and shields. Gear you can't use yet is marked in red, and it gives no stats if it's already worn.
- **Gear stats scale with the tier's level L**: a short sword gives `4L + 0.12L²` damage, a chestplate `40L + 1.6L²` HP and `2L + 0.065L²` defence. Other pieces are shares of these (helmet 30%/40%, platelegs 60%, dagger 60% damage, 2H sword 185%, and so on).
- Raw materials, bars and consumables unlock at **1, 10, 20, 30, 40** (tier one is available from the start).
- Defence soaks less damage from higher-level attackers, so balance holds at every level. A character at level L with that level's gear clears about Arena stage L.
- Late-game tiers can be added by extending `T_LEVEL` and `GEAR_LEVEL` in `js/skilldata.js`.

### Shop
- **Tools** for every gathering and crafting skill (3 tiers, each 10% faster), **Backpacks** (+4 inventory slots, 5 tiers), and the **Bank Courier** (auto-deposits everything but food when your inventory fills, offline too).
- **Supplies**: bread, cooked food, potions and tier 1–2 materials (sent to the bank), plus gem packs for gold.

### Quests
- 7 story quests that unlock in order: deliver items, defeat monsters, reach levels. Rewards include gold, gems, gear and extra inventory slots.

### XP curve
- Early levels are cheap and each level costs about 7% more than the last (the cost doubles every 10 levels). **87 → 97 costs as much as 1 → 87, and 97 → 99 costs as much as 1 → 97.** Level 10 needs 1,164 XP, 87 needs 520k, 99 needs 2.08M.

### Skills (sidebar)
- **Gathering**: Woodcutting, Mining, Fishing, Herbalism. Each has 5 material tiers, up to level 99.
- **Crafting** group:
  - 🔥 **Smithing**: smelt ore and logs into bars.
  - 🔨 **Metalworking**: bars into gear, with a dropdown for **Weapons**: **Dagger** (+25% attack speed, light hits), **Short Sword**, **Long Sword** (harder hits, −5% speed) and **2H Sword** (huge hits, −20% speed, two-handed so no shield) and **Armor** (helmets, chestplates, platelegs, gauntlets, boots, kite shields).
  - 🪚 **Carpentry**: logs into planks, then **bows** (archery), **staves** (magic, need an orb) and wooden shields.
  - 🫙 **Glassworking**: sand (dug with Mining) into molten glass, then **vials** (every potion needs one) and magic **orbs**.
- **Cooking & Brewing** group: Cooking (food), Alchemy (potions, bottled in vials).
- Skill actions keep running while the game is closed (up to 12h). Skill XP is tuned by `SKILL_XP_MULT` in `js/skilldata.js`.
- **Inventory (28 slots)**: everything you gather or craft goes here, **one item per slot**. Only the **bank** stacks items, except stackable items like 🍖 **Burnt Food** (every dish that burns while cooking turns into it). Skill actions stop when the inventory is full, so deposit in the bank. **Crafting only uses materials in your inventory**, never the bank. Each recipe card has a **📥 Withdraw** button that fills your inventory with exactly the materials for as many crafts as fit. The Bank Courier never deposits the current recipe's materials.
- **Bank**: a container of **50 slots**. Each item type takes one slot and stacks inside it. Buy **+1 slot** at a time in the Shop (1,000 gold, then 10% more each time). When the bank is full, new item types stay in your inventory. Deposit or withdraw, sell, equip gear, choose battle food, drink potions.
- **Cooking can burn**: 40% at a recipe's level, 1.2% less per level above it (minimum 2%). Burnt dishes give no XP.

### Task chain
- 6 tiers of tasks across every system, with a bonus reward for finishing each tier.

### Combat
- **Fighters run around each other**: melee units run at their target, attack only when in reach, and every few seconds swing around to its other side, passing in front or behind. They turn to face their foe and bob as they run. Archers and casters hang back and retreat from melee attackers. Units push apart instead of stacking.
- Side-on arena battles, like Swords & Sandals: fighters stand on the arena floor (crowd and banners behind), you on the right, enemies on the left (melee nearest, casters behind). Ranged attacks arc overhead. Damage numbers linger, and status badges stay up while effects last.
- **Auto ⟳** keeps fighting the next stage after each win. **✕** retreats (XP still counts). Speed 1x/2x/3x, and Skip.
- **Arena** (the campaign): 6 arenas (Mistvale Colosseum → Crystal Abyss Arena), 10 rounds each with a champion in round 10. Arena fighters are 35% stronger than the hunting grounds, with bigger rewards. A character whose combat skills are at about level L, with matching gear, can clear about stage L.

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
