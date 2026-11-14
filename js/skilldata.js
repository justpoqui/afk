// Skills, items, crafting recipes and the task chain.
// All gather/production data is generated from 5 material tiers.
const TIER_TINT = ['#c9844a', '#9aa7b4', '#dfe6ee', '#4fd6c4', '#b48cff'];
const T_LEVEL = [1, 15, 30, 45, 65];
const T_DUR = [3, 4, 5, 6.5, 8];
const T_XP = [10, 28, 58, 105, 185];
const T_SELL = [2, 6, 14, 30, 65];
const METALS = ['Copper', 'Iron', 'Silver', 'Mythril', 'Starmetal'];

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
  smithing:    { name: 'Smithing',    icon: '🔨', type: 'craft',  verb: 'Smith' },
  cooking:     { name: 'Cooking',     icon: '🍳', type: 'craft',  verb: 'Cook' },
  alchemy:     { name: 'Alchemy',     icon: '⚗️', type: 'craft',  verb: 'Brew' },
};

const ITEMS = {};
const ACTIONS = {}; // keyed by output item id (each item has exactly one recipe)
const CATEGORY_ORDER = ['Logs', 'Ores', 'Fish', 'Herbs', 'Bars', 'Weapons', 'Armor', 'Food', 'Potions', 'Misc'];

function addItem_(id, d) { ITEMS[id] = { id, ...d }; }
const SKILL_XP_MULT = 0.7; // global skill XP tuning (-30%)
function addAction_(skill, outId, d) {
  ACTIONS[outId] = { id: outId, skill, inputs: {}, qty: 1, group: '', ...d, name: ITEMS[outId].name, icon: ITEMS[outId].icon, tint: ITEMS[outId].tint };
  ACTIONS[outId].xp = Math.max(1, Math.round(d.xp * SKILL_XP_MULT));
}

const gatherDefs = [
  ['woodcutting', 'log',  'Logs',  ['Pine Log', 'Birch Log', 'Emberwood Log', 'Silverbark Log', 'Elderheart Log'], ['🪵', '🪵', '🪵', '🪵', '🪵']],
  ['mining',      'ore',  'Ores',  METALS.map(m => m + ' Ore'), ['🪨', '🪨', '🪨', '🪨', '🪨']],
  ['fishing',     'fish', 'Fish',  ['Raw Minnow', 'Raw Trout', 'Raw Spinefin', 'Raw Reef Shark', 'Raw Leviathan Eel'], ['🐟', '🐠', '🐡', '🦈', '🐍']],
  ['herbalism',   'herb', 'Herbs', ['Mintleaf', 'Sunpetal', 'Moonbloom', 'Dragonroot', 'Starmoss'], ['🌿', '🌼', '🌸', '🌶️', '🍀']],
];
for (const [skill, p, cat, names, icons] of gatherDefs) {
  for (let i = 0; i < 5; i++) {
    addItem_(p + i, { name: names[i], icon: icons[i], tint: TIER_TINT[i], cat, tier: i, sell: T_SELL[i] });
    addAction_(skill, p + i, { level: T_LEVEL[i], dur: T_DUR[i], xp: T_XP[i] });
  }
}

const FOOD = [['Grilled Minnow', '🍢'], ['Baked Trout', '🍣'], ['Spinefin Stew', '🍲'], ['Shark Steak', '🥩'], ['Eel Feast', '🍱']];
const FOOD_HEAL = [150, 380, 850, 1800, 3600];
const POTIONS = [
  ['Potion of Might', { atk: 0.15 }, 'ATK +15%'],
  ['Ironskin Draught', { def: 0.3 }, 'DEF +30%'],
  ['Vitality Tonic', { hp: 0.2 }, 'HP +20%'],
  ['Swiftness Brew', { spd: 0.15 }, 'SPD +15%'],
  ['Elixir of Heroes', { atk: 0.15, def: 0.15, hp: 0.15, spd: 0.1 }, 'All stats +10-15%'],
];
const POTION_SECOND = [{}, { ore1: 1 }, { food1: 1 }, { log3: 1 }, { bar4: 1 }];
const SWORD_ATK = [20, 50, 110, 220, 420];
const ARMOR_HP = [200, 500, 1100, 2200, 4200];
const ARMOR_DEF = [10, 25, 55, 110, 210];
const POTION_BATTLES = 5;

for (let i = 0; i < 5; i++) {
  const t = TIER_TINT[i], cx = Math.round(T_XP[i] * 1.5);
  addItem_('bar' + i, { name: METALS[i] + ' Bar', icon: '🧱', tint: t, cat: 'Bars', tier: i, sell: T_SELL[i] * 3 + 2 });
  addAction_('smithing', 'bar' + i, { level: T_LEVEL[i], dur: 3, xp: cx, inputs: { ['ore' + i]: 2, ['log' + i]: 1 }, group: 'Bars' });

  addItem_('sword' + i, { name: METALS[i] + ' Blade', icon: '🗡️', tint: t, cat: 'Weapons', tier: i, slot: 'weapon', atk: SWORD_ATK[i], sell: (T_SELL[i] * 3 + 2) * 4 });
  addAction_('smithing', 'sword' + i, { level: T_LEVEL[i] + 5, dur: 5, xp: cx * 3, inputs: { ['bar' + i]: 3 }, group: 'Weapons' });

  addItem_('armor' + i, { name: METALS[i] + ' Plate', icon: '🛡️', tint: t, cat: 'Armor', tier: i, slot: 'armor', hp: ARMOR_HP[i], def: ARMOR_DEF[i], sell: (T_SELL[i] * 3 + 2) * 6 });
  addAction_('smithing', 'armor' + i, { level: T_LEVEL[i] + 8, dur: 6, xp: cx * 5, inputs: { ['bar' + i]: 5 }, group: 'Armor' });

  addItem_('food' + i, { name: FOOD[i][0], icon: FOOD[i][1], tint: t, cat: 'Food', tier: i, heal: FOOD_HEAL[i], sell: Math.round(T_SELL[i] * 1.6) });
  addAction_('cooking', 'food' + i, { level: T_LEVEL[i], dur: 2.5, xp: Math.round(T_XP[i] * 1.2), inputs: { ['fish' + i]: 1 } });

  addItem_('pot' + i, { name: POTIONS[i][0], icon: '🧪', tint: t, cat: 'Potions', tier: i, effect: POTIONS[i][1], effectText: POTIONS[i][2], sell: T_SELL[i] * 6 });
  addAction_('alchemy', 'pot' + i, { level: T_LEVEL[i], dur: 4, xp: T_XP[i] * 2, inputs: { ['herb' + i]: 3, ...POTION_SECOND[i] } });
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
    { t: 'lvl', skill: 'smithing', n: 30, r: { scrolls: 2 } },
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
];
TASK_TIERS.forEach((tier, ti) => tier.tasks.forEach((t, i) => { t.key = ti + '.' + i; }));
