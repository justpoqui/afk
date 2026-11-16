// Skills, items, crafting recipes and the task chain.
// All gather/production data is generated from 5 material tiers.
const TIER_TINT = ['#c9844a', '#9aa7b4', '#dfe6ee', '#4fd6c4', '#b48cff', '#ff6a4a', '#ffc84a', '#7a5aff'];
// ---- Tier levels: the level each of the five tiers belongs to ----
// Raw materials, bars and consumables unlock at T_LEVEL; gear (weapons, armor, shields) at GEAR_LEVEL,
// which is also the level needed to equip it (Attack for weapons, Defence for armor and shields).
// Late-game tiers can be added by extending these lists.
// Late-game tiers at 70 / 80 / 90 (index 5-7).
const T_LEVEL = [1, 10, 20, 30, 40, 70, 80, 90];
const GEAR_LEVEL = [5, 10, 20, 30, 40, 70, 80, 90];
const TIERS = T_LEVEL.length;
const T_DUR = [3, 4, 5, 6.5, 8, 9.5, 11, 12.5];
const T_XP = [10, 28, 58, 105, 185, 330, 520, 780];
const T_SELL = [2, 6, 14, 30, 65, 120, 210, 350];
const METALS = ['Copper', 'Iron', 'Silver', 'Mythril', 'Starmetal', 'Obsidian', 'Sunsteel', 'Voidsteel'];

const SKILLS = {
  // Combat skills: trained by fighting. The attack style picks which one gets the XP.
  attack:      { name: 'Attack',      icon: '🎯', type: 'combat', desc: 'Raises your hit chance and attack speed.' },
  strength:    { name: 'Strength',    icon: '💪', type: 'combat', desc: 'Raises the damage of every hit.' },
  defence:     { name: 'Defence',     icon: '🛡️', type: 'combat', desc: 'Reduces damage taken and makes enemies miss more.' },
  hitpoints:   { name: 'Hitpoints',   icon: '❤️', type: 'combat', desc: 'Raises your maximum health. Always gains a third of combat XP.' },
  woodcutting: { name: 'Woodcutting', icon: '🪓', type: 'gather', verb: 'Chop' },
  mining:      { name: 'Mining',      icon: '⛏️', type: 'gather', verb: 'Mine' },
  fishing:     { name: 'Fishing',     icon: '🎣', type: 'gather', verb: 'Catch' },
  herbalism:   { name: 'Herbalism',   icon: '🌿', type: 'gather', verb: 'Gather' },
  // Crafting: turn raw materials into gear
  metalworking:{ name: 'Metalworking', icon: '🔨', type: 'craft', group: 'crafting', verb: 'Forge' },
  carpentry:   { name: 'Carpentry',    icon: '🪚', type: 'craft', group: 'crafting', verb: 'Craft' },
  glassworking:{ name: 'Glassworking', icon: '🫙', type: 'craft', group: 'crafting', verb: 'Blow' },
  // Cooking & brewing: consumables
  cooking:     { name: 'Cooking',     icon: '🍳', type: 'craft', group: 'kitchen', verb: 'Cook' },
  alchemy:     { name: 'Alchemy',     icon: '⚗️', type: 'craft', group: 'kitchen', verb: 'Brew' },
};

const ITEMS = {};
const ACTIONS = {}; // keyed by output item id (each item has exactly one recipe)
const CATEGORY_ORDER = ['Logs', 'Ores', 'Fish', 'Herbs', 'Bars', 'Planks', 'Glass', 'Orbs', 'Weapons', 'Armor', 'Shields', 'Food', 'Potions', 'Misc'];

// Every item has a Blender-rendered icon at assets/items/<id>.webp (see art/blender/items.py).
// New items, including future monster drops, need a model there too; run `node art/check-item-icons.js`.
function addItem_(id, d) { ITEMS[id] = { id, img: `assets/items/${id}.webp`, ...d }; }
const SKILL_XP_MULT = 0.7; // global skill XP tuning (-30%)
function addAction_(skill, outId, d) {
  ACTIONS[outId] = { id: outId, skill, inputs: {}, qty: 1, group: '', ...d, name: ITEMS[outId].name, icon: ITEMS[outId].icon, tint: ITEMS[outId].tint };
  ACTIONS[outId].xp = Math.max(1, Math.round(d.xp * SKILL_XP_MULT));
}

const gatherDefs = [
  ['woodcutting', 'log',  'Logs',  ['Pine Log', 'Birch Log', 'Emberwood Log', 'Silverbark Log', 'Elderheart Log', 'Ironbark Log', 'Dragonwood Log', 'Worldtree Log'], Array(8).fill('🪵')],
  ['mining',      'ore',  'Ores',  METALS.map(m => m + ' Ore'), Array(8).fill('🪨')],
  ['fishing',     'fish', 'Fish',  ['Raw Minnow', 'Raw Trout', 'Raw Spinefin', 'Raw Reef Shark', 'Raw Leviathan Eel', 'Raw Glowfin Ray', 'Raw Stormmarlin', 'Raw Abyssal Angler'], ['🐟', '🐠', '🐡', '🦈', '🐍', '🐟', '🐟', '🐡']],
  ['herbalism',   'herb', 'Herbs', ['Mintleaf', 'Sunpetal', 'Moonbloom', 'Dragonroot', 'Starmoss', 'Embervine', 'Frostlotus', 'Voidbloom'], ['🌿', '🌼', '🌸', '🌶️', '🍀', '🌿', '🪷', '🥀']],
];
for (const [skill, p, cat, names, icons] of gatherDefs) {
  for (let i = 0; i < TIERS; i++) {
    addItem_(p + i, { name: names[i], icon: icons[i], tint: TIER_TINT[i], cat, tier: i, sell: T_SELL[i] });
    addAction_(skill, p + i, { level: T_LEVEL[i], dur: T_DUR[i], xp: T_XP[i] });
  }
}

const FOOD = [['Grilled Minnow', '🍢'], ['Baked Trout', '🍣'], ['Spinefin Stew', '🍲'], ['Shark Steak', '🥩'], ['Eel Feast', '🍱'],
  ['Seared Glowfin', '🍤'], ['Stormmarlin Steak', '🍖'], ['Angler Banquet', '🍱']];
const FOOD_HEAL = [150, 380, 850, 1800, 3600, 6000, 9500, 14000];
const POTIONS = [
  ['Potion of Might', { atk: 0.15 }, 'ATK +15%'],
  ['Ironskin Draught', { def: 0.3 }, 'DEF +30%'],
  ['Vitality Tonic', { hp: 0.2 }, 'HP +20%'],
  ['Swiftness Brew', { spd: 0.15 }, 'SPD +15%'],
  ['Elixir of Heroes', { atk: 0.15, def: 0.15, hp: 0.15, spd: 0.1 }, 'All stats +10-15%'],
  ['Titan Draught', { atk: 0.25 }, 'ATK +25%'],
  ['Aegis Elixir', { def: 0.35, hp: 0.15 }, 'DEF +35%, HP +15%'],
  ['Phoenix Tonic', { atk: 0.2, def: 0.2, hp: 0.2, spd: 0.15 }, 'All stats +15-20%'],
];
const POTION_SECOND = [{}, { ore1: 1 }, { food1: 1 }, { log3: 1 }, { bar4: 1 }, { ore5: 1 }, { log6: 1 }, { bar7: 1 }];
// Gear stats scale with the tier's level L: a short sword gives the damage, a chestplate the HP and defence.
const gearAtk = L => Math.round(4 * L + 0.12 * L * L);
const gearHp = L => Math.round(40 * L + 1.6 * L * L);
const gearDef = L => Math.round(2 * L + 0.065 * L * L);
const SWORD_ATK = GEAR_LEVEL.map(gearAtk);
const ARMOR_HP = GEAR_LEVEL.map(gearHp);
const ARMOR_DEF = GEAR_LEVEL.map(gearDef);
// Requirement to wear gear of tier i, and where a piece's crafting level sits inside its tier.
const gearReq = (slot, i) => ({ skill: slot === 'weapon' ? 'attack' : 'defence', level: GEAR_LEVEL[i] });
const gearCraftLevel = (i, offset) => GEAR_LEVEL[i] + Math.round(offset / 2);
const POTION_BATTLES = 5;

// ---- Gear: seven equipment slots. Stats per tier scale off a chestplate / blade of that tier. ----
const GEAR_SLOT_INFO = {
  helmet: { name: 'Helmet', icon: '⛑️' }, chest: { name: 'Chest', icon: '👕' }, legs: { name: 'Legs', icon: '👖' },
  gloves: { name: 'Gloves', icon: '🧤' }, boots: { name: 'Boots', icon: '👢' }, weapon: { name: 'Weapon', icon: '🗡️' },
  shield: { name: 'Shield', icon: '🛡️' },
};
const WOODS = ['Pine', 'Birch', 'Emberwood', 'Silverbark', 'Elderheart', 'Ironbark', 'Dragonwood', 'Worldtree'];
const BOWS = ['Pine Shortbow', 'Birch Longbow', 'Emberwood Bow', 'Silverbark Bow', 'Elderheart Greatbow', 'Ironbark Warbow', 'Dragonwood Longbow', 'Worldtree Greatbow'];
const ORBS = ['Verdant Orb', 'Sunfire Orb', 'Moonlight Orb', 'Dragonfire Orb', 'Starlight Orb', 'Ember Orb', 'Frost Orb', 'Void Orb'];
// Metal armor pieces: [id prefix, name, slot, bars, level offset, hp share, def share, atk share of a blade]
const METAL_PIECES = [
  ['helm',   'Helmet',     'helmet', 2, 0, 0.3, 0.4, 0],
  ['gloves', 'Gauntlets',  'gloves', 2, 3, 0,   0.2, 0.15],
  ['boots',  'Boots',      'boots',  2, 4, 0.2, 0.3, 0],
  ['kite',   'Kite Shield','shield', 4, 5, 0.2, 0.8, 0],
  ['legs',   'Platelegs',  'legs',   4, 6, 0.6, 0.6, 0],
  ['armor',  'Chestplate', 'chest',  5, 8, 1,   1,   0],
];

// Melee weapons: [id prefix, name, bars, level offset, damage vs a short sword, attack speed bonus, two-handed]
const MELEE_WEAPONS = [
  ['dagger',     'Dagger',      1, 0, 0.6,  0.25,  false],
  ['sword',      'Short Sword', 3, 2, 1,    0,     false],
  ['longsword',  'Long Sword',  4, 5, 1.3,  -0.05, false],
  ['greatsword', '2H Sword',    6, 9, 1.85, -0.2,  true],   // two-handed: no shield
];

// Metalworking smelts ore into bars (the 'Smelt Bars' dropdown), then forges bars into gear.
const smelt = i => addAction_('metalworking', 'bar' + i, { level: T_LEVEL[i], dur: 3, xp: Math.round(T_XP[i] * 1.5), inputs: { ['ore' + i]: 2, ['log' + i]: 1 }, group: 'Smelt Bars', verb: 'Smelt' });

// Glassworking basics (sand is dug up with Mining)
addItem_('sand', { name: 'Sand', icon: '⏳', tint: '#e2cf9a', cat: 'Glass', tier: 0, sell: 1 });
addAction_('mining', 'sand', { level: 1, dur: 2.5, xp: 6 });
addItem_('glass', { name: 'Molten Glass', icon: '🫧', tint: '#9fdcff', cat: 'Glass', tier: 0, sell: 6 });
addAction_('glassworking', 'glass', { level: 1, dur: 3, xp: 12, inputs: { sand: 2, log0: 1 }, group: 'Glass' });
addItem_('vial', { name: 'Glass Vial', icon: '🧪', tint: '#cfe8ff', cat: 'Glass', tier: 0, sell: 8 });
addAction_('glassworking', 'vial', { level: 3, dur: 2.5, xp: 14, inputs: { glass: 1 }, group: 'Vials' });

for (let i = 0; i < TIERS; i++) {
  const t = TIER_TINT[i], cx = Math.round(T_XP[i] * 1.5), barSell = T_SELL[i] * 3 + 2;
  addItem_('bar' + i, { name: METALS[i] + ' Bar', icon: '🧱', tint: t, cat: 'Bars', tier: i, sell: barSell });
  smelt(i);

  // Metalworking: four melee weapons per metal
  for (const [pre, name, bars, lo, atkS, spd, twoHanded] of MELEE_WEAPONS) {
    addItem_(pre + i, { name: `${METALS[i]} ${name}`, icon: '🗡️', tint: t, cat: 'Weapons', tier: i, slot: 'weapon', wtype: 'melee',
      atk: Math.round(SWORD_ATK[i] * atkS), spd, twoHanded, req: gearReq('weapon', i), sell: barSell * (bars + 1) });
    addAction_('metalworking', pre + i, { level: gearCraftLevel(i, lo), dur: 3 + bars * 0.6, xp: cx * bars, inputs: { ['bar' + i]: bars }, group: 'Weapons' });
  }
  // Metalworking: armor pieces
  for (const [pre, name, slot, bars, lo, hpS, defS, atkS] of METAL_PIECES) {
    const it = { name: `${METALS[i]} ${name}`, icon: GEAR_SLOT_INFO[slot].icon, tint: t, cat: slot === 'shield' ? 'Shields' : 'Armor', tier: i, slot, req: gearReq(slot, i), sell: barSell * (bars + 1) };
    if (hpS) it.hp = Math.round(ARMOR_HP[i] * hpS);
    if (defS) it.def = Math.round(ARMOR_DEF[i] * defS);
    if (atkS) it.atk = Math.round(SWORD_ATK[i] * atkS);
    addItem_(pre + i, it);
    addAction_('metalworking', pre + i, { level: gearCraftLevel(i, lo), dur: 3 + bars * 0.6, xp: cx * bars, inputs: { ['bar' + i]: bars }, group: 'Armor' });
  }

  // Carpentry: planks, bows (archery), staves (magic), wooden shields
  addItem_('plank' + i, { name: WOODS[i] + ' Plank', icon: '🪵', tint: t, cat: 'Planks', tier: i, sell: T_SELL[i] * 3 });
  addAction_('carpentry', 'plank' + i, { level: T_LEVEL[i], dur: 2.5, xp: Math.round(T_XP[i] * 1.2), inputs: { ['log' + i]: 2 }, group: 'Planks' });
  addItem_('bow' + i, { name: BOWS[i], icon: '🏹', tint: t, cat: 'Weapons', tier: i, slot: 'weapon', wtype: 'archery', atk: Math.round(SWORD_ATK[i] * 0.95), req: gearReq('weapon', i), sell: T_SELL[i] * 12 });
  addAction_('carpentry', 'bow' + i, { level: gearCraftLevel(i, 3), dur: 4.5, xp: Math.round(T_XP[i] * 3.6), inputs: { ['plank' + i]: 3 }, group: 'Weapons' });
  addItem_('staff' + i, { name: WOODS[i] + ' Staff', icon: '🪄', tint: t, cat: 'Weapons', tier: i, slot: 'weapon', wtype: 'magic', atk: Math.round(SWORD_ATK[i] * 0.95), req: gearReq('weapon', i), sell: T_SELL[i] * 16 });
  addAction_('carpentry', 'staff' + i, { level: gearCraftLevel(i, 6), dur: 5, xp: Math.round(T_XP[i] * 4.2), inputs: { ['plank' + i]: 2, ['orb' + i]: 1 }, group: 'Weapons' });
  addItem_('wshield' + i, { name: WOODS[i] + ' Shield', icon: '🛡️', tint: t, cat: 'Shields', tier: i, slot: 'shield', hp: Math.round(ARMOR_HP[i] * 0.3), def: Math.round(ARMOR_DEF[i] * 0.5), req: gearReq('shield', i), sell: T_SELL[i] * 14 });
  addAction_('carpentry', 'wshield' + i, { level: gearCraftLevel(i, 4), dur: 5, xp: Math.round(T_XP[i] * 4.4), inputs: { ['plank' + i]: 4 }, group: 'Shields' });

  // Glassworking: magic orbs (glass infused with herbs), used for staves
  addItem_('orb' + i, { name: ORBS[i], icon: '🔮', tint: t, cat: 'Orbs', tier: i, sell: T_SELL[i] * 8 });
  addAction_('glassworking', 'orb' + i, { level: T_LEVEL[i] + 2, dur: 4, xp: Math.round(T_XP[i] * 2.6), inputs: { glass: 2, ['herb' + i]: 2 }, group: 'Orbs' });

  addItem_('food' + i, { name: FOOD[i][0], icon: FOOD[i][1], tint: t, cat: 'Food', tier: i, heal: FOOD_HEAL[i], sell: Math.round(T_SELL[i] * 1.6) });
  addAction_('cooking', 'food' + i, { level: T_LEVEL[i], dur: 2.5, xp: Math.round(T_XP[i] * 1.2), inputs: { ['fish' + i]: 1 } });

  // Potions are bottled in a Glass Vial from Glassworking
  addItem_('pot' + i, { name: POTIONS[i][0], icon: '🧪', tint: t, cat: 'Potions', tier: i, effect: POTIONS[i][1], effectText: POTIONS[i][2], sell: T_SELL[i] * 6 + 8 });
  addAction_('alchemy', 'pot' + i, { level: T_LEVEL[i], dur: 4, xp: T_XP[i] * 2, inputs: { ['herb' + i]: 3, vial: 1, ...POTION_SECOND[i] } });
}

// Stackable items share one inventory slot (everything else takes one slot per item).
// Every dish that burns while cooking turns into this.
addItem_('bread', { name: 'Bread', icon: '🍞', tint: '#d9a35a', cat: 'Food', tier: 0, heal: 220, sell: 8 });
addItem_('burnt', { name: 'Burnt Food', icon: '🍖', tint: '#3a2a22', cat: 'Misc', tier: 0, sell: 1, stack: true, burnt: true });

// ---- Task chain: complete every task in a tier to unlock the next ----
const TASK_TIERS = [
  { name: 'First Steps', reward: { gems: 100, scrolls: 2 }, tasks: [
    { t: 'act', id: 'log0', n: 20, r: { gold: 200 } },
    { t: 'act', id: 'ore0', n: 20, r: { gold: 200 } },
    { t: 'act', id: 'bar0', n: 5, r: { gold: 300 } },
    { t: 'stage', n: 3, r: { gems: 50 } },
    { t: 'lvl', skill: 'strength', n: 5, r: { scrolls: 1 } },
    { t: 'claim', n: 1, r: { gems: 30 } },
    { t: 'lvl', skill: 'woodcutting', n: 5, r: { scrolls: 1 } },
  ] },
  { name: 'Settling In', reward: { gems: 200, scrolls: 3 }, tasks: [
    { t: 'act', id: 'sword0', n: 1, r: { gems: 50 } },
    { t: 'equip', n: 1, r: { gold: 500 } },
    { t: 'act', id: 'food0', n: 20, r: { gems: 50 } },
    { t: 'lvl', skill: 'fishing', n: 10, r: { scrolls: 1 } },
    { t: 'stage', n: 10, r: { gems: 150 } },
    { t: 'summon', n: 5, r: { gems: 100 } },
  ] },
  { name: 'Rising Adventurer', reward: { gems: 300, scrolls: 5 }, tasks: [
    { t: 'act', id: 'pot0', n: 5, r: { gold: 1000 } },
    { t: 'potion', n: 1, r: { gems: 50 } },
    { t: 'lvl', skill: 'strength', n: 15, r: { gems: 100 } },
    { t: 'act', id: 'fish1', n: 50, r: { gold: 1500 } },
    { t: 'lvl', skill: 'mining', n: 20, r: { scrolls: 1 } },
    { t: 'total', n: 75, r: { gems: 150 } },
    { t: 'stage', n: 15, r: { gems: 100 } },
  ] },
  { name: 'Seasoned Hero', reward: { gems: 500, scrolls: 8 }, tasks: [
    { t: 'act', id: 'armor1', n: 1, r: { gems: 100 } },
    { t: 'lvl', skill: 'metalworking', n: 30, r: { scrolls: 2 } },
    { t: 'stage', n: 30, r: { gems: 200 } },
    { t: 'act', id: 'food2', n: 50, r: { gold: 4000 } },
    { t: 'lvl', skill: 'herbalism', n: 30, r: { scrolls: 2 } },
    { t: 'summon', n: 20, r: { gems: 200 } },
    { t: 'eat', n: 25, r: { gems: 100 } },
  ] },
  { name: 'Realm Champion', reward: { gems: 1000, scrolls: 12 }, tasks: [
    { t: 'act', id: 'sword2', n: 1, r: { gems: 150 } },
    { t: 'act', id: 'armor2', n: 1, r: { gems: 150 } },
    { t: 'total', n: 250, r: { scrolls: 3 } },
    { t: 'stage', n: 50, r: { gems: 300 } },
    { t: 'lvl', skill: 'attack', n: 40, r: { gems: 200 } },
    { t: 'lvl', skill: 'alchemy', n: 45, r: { scrolls: 3 } },
    { t: 'act', id: 'pot3', n: 10, r: { gold: 15000 } },
  ] },
  { name: 'Legend of the Realms', reward: { gems: 2000, scrolls: 20 }, tasks: [
    { t: 'act', id: 'sword4', n: 1, r: { gems: 400 } },
    { t: 'act', id: 'armor4', n: 1, r: { gems: 400 } },
    { t: 'total', n: 450, r: { scrolls: 5 } },
    { t: 'stage', n: 80, r: { gems: 500 } },
    { t: 'lvl', skill: 'woodcutting', n: 80, r: { scrolls: 3 } },
    { t: 'lvl', skill: 'defence', n: 70, r: { gems: 500 } },
  ] },
  { name: 'Mythic Artisan', reward: { gems: 5000, scrolls: 30 }, tasks: [
    { t: 'lvl', skill: 'woodcutting', n: 85, r: { scrolls: 4 } },
    { t: 'lvl', skill: 'mining', n: 85, r: { scrolls: 4 } },
    { t: 'lvl', skill: 'fishing', n: 85, r: { scrolls: 4 } },
    { t: 'act', id: 'greatsword7', n: 1, r: { gems: 1000 } },
    { t: 'act', id: 'staff7', n: 1, r: { gems: 1000 } },
    { t: 'act', id: 'food7', n: 50, r: { gems: 800 } },
    { t: 'act', id: 'pot7', n: 10, r: { gems: 800 } },
    { t: 'lvl', skill: 'metalworking', n: 90, r: { scrolls: 5 } },
  ] },
];
TASK_TIERS.forEach((tier, ti) => tier.tasks.forEach((t, i) => { t.key = ti + '.' + i; }));
