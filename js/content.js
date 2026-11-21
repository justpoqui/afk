// Hunting areas, quests, shop stock and look chests.

// ---- Hunting grounds: fight one monster at a time, on repeat (Melvor-style) ----
// [monster key, level]. Keys match sprite names (mon_<key> / boss_<key>).
const AREAS = [
  { id: 'meadow', name: 'Mistvale Meadows', icon: '🌾', ch: 1, monsters: [['sheep', 1], ['slime', 2], ['boar', 4], ['goblin', 5], ['wolf', 9]] },
  { id: 'thorn',  name: 'Thornwood',        icon: '🌲', ch: 2, monsters: [['spider', 13], ['goblin_archer', 17], ['bear', 21], ['treant', 22]] },
  { id: 'grave',  name: 'Ashen Graveyard',  icon: '⚰️', ch: 3, monsters: [['skeleton', 27], ['hound', 30], ['wraith', 32], ['cultist', 38]] },
  { id: 'peaks',  name: 'Frostpeak Caves',  icon: '🏔️', ch: 4, monsters: [['bat', 43], ['yeti', 46], ['golem', 49]] },
  { id: 'depths', name: 'Sunken Depths',    icon: '🌊', ch: 5, monsters: [['imp', 55], ['fire_sprite', 62]] },
  { id: 'lairs',  name: 'Boss Lairs',       icon: '👑', ch: 6, monsters: [['ogre', 70], ['wyrm', 80], ['lich', 90], ['kraken', 99]] },
];
const monsterTemplate = key => MONSTERS.find(m => m.sprite === 'mon_' + key) || BOSSES.find(b => b.sprite === 'boss_' + key);

// ---- Monster drops: [item, chance, min, max] for each monster (hunting and arena kills) ----
const MOB_DROPS = {
  sheep: [['wool', 1, 1, 3]],
  slime: [['jelly', 0.6, 1, 1]],
  boar: [['hide0', 0.7, 1, 1]],
  wolf: [['hide1', 0.6, 1, 1], ['fang', 0.4, 1, 1]],
  spider: [['silk', 0.6, 1, 2]],
  bear: [['hide2', 0.7, 1, 1]],
  treant: [['sap', 0.5, 1, 1]],
  hound: [['hide3', 0.65, 1, 1]],
  wraith: [['ecto', 0.5, 1, 1]],
  bat: [['batwing', 0.5, 1, 1]],
  yeti: [['hide4', 0.65, 1, 1]],
  imp: [['imphorn', 0.5, 1, 1]],
  fire_sprite: [['fireess', 0.5, 1, 1]],
  ogre: [['hide5', 0.8, 1, 2]],
  wyrm: [['hide6', 0.8, 1, 2]],
  lich: [['lichdust', 0.8, 1, 2]],
  kraken: [['hide7', 0.8, 1, 2]],
};
function rollMobDrops(key, into = {}) {
  for (const [id, chance, lo, hi] of MOB_DROPS[key] || []) if (Math.random() < chance) into[id] = (into[id] || 0) + lo + Math.floor(Math.random() * (hi - lo + 1));
  return into;
}

// ---- Dungeons: a run of waves fought one after another (HP carries over), ending with a boss.
// The boss drops a chest whose tier is rolled when it falls; each chest holds 6-10 random rewards.
// area: which hunting area's background and gem rate to use; tier: the material tier of the loot.
const DUNGEONS = [
  { id: 'warren',  name: 'Goblin Warren',     icon: '🕳️', area: 0, tier: 0, waves: [['slime', 3], ['boar', 4], ['goblin', 5], ['goblin', 6], ['wolf', 8]],
    boss: { key: 'goblin', lvl: 10, name: 'Goblin Warlord' } },
  { id: 'hollow',  name: 'Thornwood Hollow',  icon: '🌳', area: 1, tier: 1, waves: [['spider', 14], ['goblin_archer', 17], ['bear', 20], ['spider', 21], ['treant', 23]],
    boss: { key: 'treant', lvl: 26, name: 'Elder Treant' } },
  { id: 'crypt',   name: 'Sunken Crypt',      icon: '⚰️', area: 2, tier: 2, waves: [['skeleton', 28], ['hound', 30], ['wraith', 33], ['skeleton', 36], ['cultist', 38]],
    boss: { key: 'skeleton', lvl: 42, name: 'Bone Colossus' } },
  { id: 'glacier', name: 'Frozen Depths',     icon: '❄️', area: 3, tier: 3, waves: [['bat', 44], ['yeti', 46], ['bat', 48], ['golem', 50]],
    boss: { key: 'yeti', lvl: 55, name: 'Yeti Matriarch' } },
  { id: 'rift',    name: 'Infernal Rift',     icon: '🔥', area: 4, tier: 4, waves: [['imp', 56], ['fire_sprite', 60], ['imp', 63], ['fire_sprite', 66], ['golem', 68]],
    boss: { key: 'ogre', lvl: 72, name: 'Ogre Chief' } },
  { id: 'abyss',   name: 'Abyssal Sanctum',   icon: '🌀', area: 5, tier: 6, waves: [['cultist', 80], ['fire_sprite', 84], ['golem', 88], ['wyrm', 90]],
    boss: { key: 'kraken', lvl: 100, name: 'Abyssal Kraken' } },
];
// Chest tiers rolled when the boss falls: weight (chance), how much more loot, and better rolls.
const CHEST_TIERS = [
  { id: 'wooden',  name: 'Wooden Chest',  color: '#b07a40', weight: 45, mult: 1,   gear: 0.04, up: 0,    scroll: 0 },
  { id: 'iron',    name: 'Iron Chest',    color: '#9aa7b4', weight: 30, mult: 1.5, gear: 0.07, up: 0.05, scroll: 0 },
  { id: 'silver',  name: 'Silver Chest',  color: '#dfe6ee', weight: 15, mult: 2.2, gear: 0.1,  up: 0.15, scroll: 0 },
  { id: 'golden',  name: 'Golden Chest',  color: '#f2c14e', weight: 8,  mult: 3,   gear: 0.15, up: 0.3,  scroll: 0.1 },
  { id: 'mythic',  name: 'Mythic Chest',  color: '#b48cff', weight: 2,  mult: 4.5, gear: 0.25, up: 0.5,  scroll: 0.35 },
];
CHEST_TIERS.forEach(c => { c.img = `assets/chests/${c.id}.webp`; });
function rollChestTier() {
  let r = Math.random() * CHEST_TIERS.reduce((s, c) => s + c.weight, 0);
  return CHEST_TIERS.find(c => (r -= c.weight) < 0) || CHEST_TIERS[0];
}
// 6-10 different rewards from the dungeon's tier (better chests roll more, and sometimes a tier higher).
function rollChestLoot(d, chest) {
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1)), pick = a => a[Math.floor(Math.random() * a.length)];
  const lvl = d.boss.lvl, loot = { gold: 0, gems: 0, scrolls: 0, items: {} };
  const count = rnd(6, 10);
  const kinds = [['mat', 30], ['drop', 18], ['food', 10], ['pot', 6], ['glyph', 8], ['gold', 10], ['gems', 8], ['remains', 5], ['gear', 100 * chest.gear], ['scroll', 100 * chest.scroll]];
  const total = kinds.reduce((s, k) => s + k[1], 0);
  let rolls = 0;
  for (let got = 0; got < count && rolls < 200; rolls++) {
    let r = Math.random() * total, kind = kinds.find(k => (r -= k[1]) < 0)[0];
    const t = Math.min(TIERS - 1, d.tier + (Math.random() < chest.up ? 1 : 0)), m = chest.mult;
    let id = null, n = 0;
    if (kind === 'gold') { if (loot.gold) continue; loot.gold = Math.round((150 + lvl * 25) * (0.8 + Math.random() * 0.6) * m); got++; continue; }
    if (kind === 'gems') { if (loot.gems) continue; loot.gems = Math.round(rnd(8, 20) * m); got++; continue; }
    if (kind === 'scroll') { if (loot.scrolls) continue; loot.scrolls = chest.id === 'mythic' ? rnd(1, 2) : 1; got++; continue; }
    if (kind === 'mat') { id = pick(['log', 'ore', 'fish', 'herb', 'bar', 'plank']) + t; n = rnd(4, 9); }
    if (kind === 'drop') { id = pick(['hide' + t, ALCH_DROPS[t][0], 'wool', 'silk', 'chipped']); n = rnd(2, 5); }
    if (kind === 'food') { id = 'food' + t; n = rnd(2, 5); }
    if (kind === 'pot') { id = 'pot' + t; n = rnd(1, 2); }
    if (kind === 'glyph') { id = 'glyph_' + GLYPHS[Math.min(t, GLYPHS.length - 1)][0]; n = rnd(10, 25); }
    if (kind === 'remains') { id = pick(['bones', 'bigbones', 'ash']); n = rnd(3, 8); }
    if (kind === 'gear') {
      id = pick(['dagger', 'sword', 'longsword', 'greatsword', 'bow', 'staff', 'helm', 'armor', 'legs', 'gloves', 'boots', 'kite', 'wshield',
        'rhood', 'rbody', 'rlegs', 'rgloves', 'rboots', 'mhood', 'mbody', 'mlegs', 'mgloves', 'mboots']) + t; n = 1;
    }
    if (!ITEMS[id] || loot.items[id]) continue; // every reward in a chest is a different item
    loot.items[id] = kind === 'gear' ? 1 : Math.max(1, Math.round(n * m));
    got++;
  }
  return loot;
}

// ---- Quests: deliver items, slay monsters, reach levels. Story quests unlock in order; skill quests need levels to start. ----
const QUESTS = [
  { id: 'woodsman', name: "The Woodsman's Request", icon: '🪵', desc: 'The camp needs firewood and metal for the winter.',
    steps: [{ t: 'deliver', id: 'log0', n: 30 }, { t: 'deliver', id: 'bar0', n: 10 }], r: { gold: 800, gems: 40 } },
  { id: 'pests', name: 'Pest Control', icon: '🟢', desc: 'Slimes and goblins keep raiding the meadow farms.',
    steps: [{ t: 'kill', id: 'slime', n: 15 }, { t: 'kill', id: 'goblin', n: 10 }], r: { gems: 100 } },
  { id: 'feast', name: 'Feast for the Arena', icon: '🍣', desc: 'The arena crowd is hungry. Bring them a proper feast.',
    steps: [{ t: 'deliver', id: 'food1', n: 25 }, { t: 'lvl', skill: 'cooking', n: 20 }], r: { gold: 2500, slots: 4 } },
  { id: 'wolves', name: 'Wolves at the Gate', icon: '🐺', desc: 'A wolf pack circles the camp every night.',
    steps: [{ t: 'kill', id: 'wolf', n: 25 }, { t: 'lvl', skill: 'defence', n: 20 }], r: { gems: 150, items: { sword1: 1 } } },
  { id: 'apprentice', name: "Alchemist's Apprentice", icon: '🧪', desc: 'Prove your brewing to the old alchemist.',
    steps: [{ t: 'deliver', id: 'pot0', n: 10 }, { t: 'deliver', id: 'pot1', n: 5 }], r: { gems: 200, gold: 3000 } },
  { id: 'dead', name: 'The Restless Dead', icon: '💀', desc: 'Lay the graveyard spirits to rest.',
    steps: [{ t: 'kill', id: 'skeleton', n: 30 }, { t: 'kill', id: 'wraith', n: 20 }], r: { gems: 400, items: { armor2: 1 } } },
  { id: 'dragon', name: 'Dragon Slayer', icon: '🐉', desc: 'The Ancient Wyrm waits in its lair. End it.',
    steps: [{ t: 'kill', id: 'wyrm', n: 1 }, { t: 'lvl', skill: 'strength', n: 70 }], r: { gems: 2000, slots: 4 } },
  { id: 'voidforge', name: 'The Void Forge', icon: '🌀', desc: 'Smiths speak of a metal pulled from between the stars. Prove you can work it.',
    steps: [{ t: 'deliver', id: 'bar7', n: 15 }, { t: 'lvl', skill: 'metalworking', n: 90 }], r: { gems: 4000, items: { armor7: 1 } } },
  { id: 'legends', name: 'A Feast for Legends', icon: '🍱', desc: 'The champions of every arena gather for one last banquet.',
    steps: [{ t: 'deliver', id: 'food7', n: 25 }, { t: 'deliver', id: 'pot7', n: 5 }, { t: 'lvl', skill: 'cooking', n: 90 }], r: { gems: 5000, slots: 8 } },
  // ---- Skill quests: need specific levels to start, and gathered items to turn in ----
  { id: 'lumber', name: "Lumberjack's Contract", icon: '🪵', desc: 'The sawmill is behind on orders and needs a skilled feller.',
    req: [{ skill: 'woodcutting', n: 15 }, { skill: 'carpentry', n: 5 }],
    steps: [{ t: 'deliver', id: 'log1', n: 50 }, { t: 'deliver', id: 'plank0', n: 20 }], r: { gold: 2500, xp: { woodcutting: 2500, carpentry: 1500 } } },
  { id: 'garrison', name: 'Ore for the Garrison', icon: '⛏️', desc: 'The garrison needs iron to rearm before winter.',
    req: [{ skill: 'mining', n: 20 }, { skill: 'metalworking', n: 15 }],
    steps: [{ t: 'deliver', id: 'ore1', n: 40 }, { t: 'deliver', id: 'bar1', n: 15 }], r: { gold: 4000, xp: { metalworking: 4000 }, items: { legs1: 1 } } },
  { id: 'fishmonger', name: "The Fishmonger's Feast", icon: '🐟', desc: 'The harbour festival needs fresh and cooked fish.',
    req: [{ skill: 'fishing', n: 25 }, { skill: 'cooking', n: 20 }],
    steps: [{ t: 'deliver', id: 'fish2', n: 20 }, { t: 'deliver', id: 'food1', n: 30 }], r: { gold: 4500, xp: { cooking: 5000, fishing: 3000 } } },
  { id: 'remedy', name: "The Herbalist's Remedy", icon: '🌸', desc: 'A fever is spreading through the village. Brew the cure.',
    req: [{ skill: 'herbalism', n: 30 }, { skill: 'alchemy', n: 25 }],
    steps: [{ t: 'deliver', id: 'herb2', n: 25 }, { t: 'deliver', id: 'pot2', n: 10 }, { t: 'deliver', id: 'vial', n: 10 }], r: { gold: 6000, xp: { alchemy: 8000 } } },
  { id: 'observatory', name: 'Glass for the Observatory', icon: '🔭', desc: 'The stargazers need lenses and moonlit orbs.',
    req: [{ skill: 'glassworking', n: 35 }],
    steps: [{ t: 'deliver', id: 'glass', n: 50 }, { t: 'deliver', id: 'orb2', n: 5 }], r: { gems: 300, xp: { glassworking: 10000 } } },
  { id: 'fallen', name: 'Rest for the Fallen', icon: '🪦', desc: 'The old battlefield is restless. Bring remains to the chapel.',
    req: [{ skill: 'grace', n: 20 }],
    steps: [{ t: 'deliver', id: 'bones', n: 50 }, { t: 'deliver', id: 'bigbones', n: 15 }], r: { gems: 300, xp: { grace: 6000 } } },
  { id: 'bridge', name: 'The Ironbark Bridge', icon: '🌉', desc: 'Only ironbark and obsidian can span the chasm.',
    req: [{ skill: 'woodcutting', n: 70 }, { skill: 'carpentry', n: 65 }, { skill: 'metalworking', n: 70 }],
    steps: [{ t: 'deliver', id: 'plank5', n: 40 }, { t: 'deliver', id: 'bar5', n: 20 }], r: { gold: 60000, xp: { carpentry: 60000, metalworking: 40000 } } },
  { id: 'abyss', name: 'Cleansing the Abyss', icon: '⚱️', desc: 'Demons crawl out of the depths. Burn them and gather their ash.',
    req: [{ skill: 'grace', n: 60 }, { skill: 'defence', n: 60 }],
    steps: [{ t: 'kill', id: 'imp', n: 20 }, { t: 'deliver', id: 'ash', n: 40 }], r: { gems: 2000, xp: { grace: 80000 } } },
  { id: 'angler', name: 'Master Angler', icon: '🎣', desc: 'Legends speak of a fish that glows in the deepest dark.',
    req: [{ skill: 'fishing', n: 85 }, { skill: 'cooking', n: 80 }],
    steps: [{ t: 'deliver', id: 'fish7', n: 20 }, { t: 'deliver', id: 'food7', n: 10 }], r: { gold: 150000, xp: { fishing: 200000, cooking: 120000 } } },
];
// Story quests (no level requirement) unlock one after another; skill quests open by level instead.
{ let prev = null; for (const q of QUESTS) if (!q.req) { if (prev && !q.after) q.after = prev; prev = q.id; } }

// ---- Shop (gold) ----
const TOOLS = {
  woodcutting: ['Iron Axe', 'Steel Axe', 'Mythril Axe', 'Voidsteel Axe'],
  mining:      ['Iron Pickaxe', 'Steel Pickaxe', 'Mythril Pickaxe', 'Voidsteel Pickaxe'],
  fishing:     ['Sturdy Rod', 'Fiberglass Rod', 'Mythril Rod', 'Voidsteel Rod'],
  herbalism:   ['Iron Sickle', 'Steel Sickle', 'Mythril Sickle', 'Voidsteel Sickle'],
  metalworking:['Iron Hammer', 'Steel Hammer', 'Mythril Hammer', 'Voidsteel Hammer'],
  carpentry:   ['Iron Saw', 'Steel Saw', 'Mythril Saw', 'Voidsteel Saw'],
  glassworking:['Blowpipe', 'Steel Blowpipe', 'Mythril Blowpipe', 'Voidsteel Blowpipe'],
  cooking:     ['Cast-iron Pan', 'Stone Oven', 'Dragonfire Range'],
  alchemy:     ['Glass Vials', 'Copper Still', "Philosopher's Kit"],
};
const TOOL_COST = [1500, 12000, 60000, 400000];
const TOOL_REQ = [10, 30, 55, 75];      // skill level needed to buy each tier
const TOOL_SPEED = 0.1;             // each tool tier makes that skill's actions 10% faster
const BACKPACK_COST = [2000, 7500, 20000, 50000, 120000]; // +4 inventory slots each
const COURIER_COST = 30000;         // auto-deposits to the bank when the inventory is full
const BASE_BANK = 50;               // bank slots (each item type takes one slot and stacks inside it)
const bankSlotCost = bought => Math.round(1000 * Math.pow(1.1, bought)); // +1 slot at a time
const SHOP_STOCK = [
  // [item id, gold price]: bought items go to the bank
  ['bread', 40], ['food0', 30], ['food1', 90], ['pot0', 350], ['pot1', 900],
  ['log0', 10], ['ore0', 10], ['fish0', 10], ['herb0', 10],
  ['log1', 30], ['ore1', 30], ['fish1', 30], ['herb1', 30],
];
const GEM_PACK = { gems: 100, gold: 5000 };
const GEMS_PER_SCROLL = 1000; // gems are only used to buy scrolls; scrolls are only used for look chests

// ---- Look chests: paid with scrolls. Costs double each tier; 6 spins cost 5x one spin. ----
const CHESTS = [
  { id: 'bronze', name: 'Bronze Chest', icon: '🥉', cost1: 1, cost6: 5,  odds: { R: 0.85, E: 0.13, L: 0.02 } },
  { id: 'silver', name: 'Silver Chest', icon: '🥈', cost1: 2, cost6: 10, odds: { R: 0.40, E: 0.50, L: 0.10 } },
  { id: 'gold',   name: 'Gold Chest',   icon: '🥇', cost1: 4, cost6: 20, odds: { R: 0.00, E: 0.70, L: 0.30 } },
];
const MAX_LOOK_STARS = 5;
const LOOK_STAR_BONUS = 0.15; // each duplicate star: +15% of the look's bonus
