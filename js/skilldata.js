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
  // Archery and Magic: trained by fighting with a bow or a staff. They set your hit chance and damage in that style.
  archery:     { name: 'Archery',     icon: '🏹', type: 'combat', desc: 'Bow hit chance, speed and damage.' },
  magic:       { name: 'Magic',       icon: '🔮', type: 'combat', desc: 'Staff hit chance and damage. Unlocks spells.' },
  // Grace: trained by burying the remains of defeated enemies. Each level blesses you in battle.
  grace:       { name: 'Grace',       icon: '🙏', type: 'combat', verb: 'Bury', desc: 'Bury bones and scatter ashes from defeated enemies. Unlocks blessings that buff you in battle.' },
  woodcutting: { name: 'Woodcutting', icon: '🪓', type: 'gather', verb: 'Chop' },
  mining:      { name: 'Mining',      icon: '⛏️', type: 'gather', verb: 'Mine' },
  fishing:     { name: 'Fishing',     icon: '🎣', type: 'gather', verb: 'Catch' },
  herbalism:   { name: 'Herbalism',   icon: '🌿', type: 'gather', verb: 'Gather' },
  // Crafting: turn raw materials into gear
  metalworking:{ name: 'Metalworking', icon: '🔨', type: 'craft', group: 'crafting', verb: 'Forge' },
  carpentry:   { name: 'Carpentry',    icon: '🪚', type: 'craft', group: 'crafting', verb: 'Craft' },
  glassworking:{ name: 'Glassworking', icon: '🫙', type: 'craft', group: 'crafting', verb: 'Blow' },
  glyphmaking: { name: 'Glyph Making', icon: '🔣', type: 'craft', group: 'crafting', verb: 'Inscribe' },
  tanning:     { name: 'Tanning',      icon: '🪣', type: 'craft', group: 'crafting', verb: 'Tan' },
  weaving:     { name: 'Weaving',      icon: '🧶', type: 'craft', group: 'crafting', verb: 'Weave' },
  // Cooking & brewing: consumables
  cooking:     { name: 'Cooking',     icon: '🍳', type: 'craft', group: 'kitchen', verb: 'Cook' },
  alchemy:     { name: 'Alchemy',     icon: '⚗️', type: 'craft', group: 'kitchen', verb: 'Brew' },
};

const ITEMS = {};
const ACTIONS = {}; // keyed by output item id (each item has exactly one recipe)
const CATEGORY_ORDER = ['Logs', 'Ores', 'Fish', 'Herbs', 'Bars', 'Planks', 'Glass', 'Orbs', 'Glyphs', 'Mob Drops', 'Leather', 'Cloth', 'Weapons', 'Armor', 'Shields', 'Food', 'Potions', 'Remains', 'Misc'];

// Every item has a Blender-rendered icon at assets/items/<id>.webp (see art/blender/items.py).
// New items, including future monster drops, need a model there too; run `node art/check-item-icons.js`.
function addItem_(id, d) { ITEMS[id] = { id, img: `assets/items/${id}.webp`, ...d }; }
const SKILL_XP_MULT = 0.7; // global skill XP tuning (-30%)
function addAction_(skill, outId, d) {
  ACTIONS[outId] = { id: outId, skill, inputs: {}, qty: 1, group: '', ...d, name: ITEMS[outId].name, icon: ITEMS[outId].icon, tint: ITEMS[outId].tint };
  ACTIONS[outId].xp = Math.max(1, Math.round(d.xp * SKILL_XP_MULT));
}

// Mining specials, listed first on the Mining page: Sand (for glass) and Enchanted Stone (for glyphs).
addItem_('sand', { name: 'Sand', icon: '⏳', tint: '#e2cf9a', cat: 'Glass', tier: 0, sell: 1 });
addAction_('mining', 'sand', { level: 1, dur: 2.5, xp: 6 });
addItem_('chipped', { name: 'Chipped Stone', icon: '🪨', tint: '#8fa8ff', cat: 'Glyphs', tier: 0, sell: 4, stack: true, maxStack: 15 });
// The action is the rock you mine (Enchanted Stone); it gives Chipped Stone.
addAction_('mining', 'chipped', { level: 5, dur: 3.2, xp: 16, node: 'Enchanted Stone', nodeImg: 'assets/items/enchstone.webp' });
ACTIONS.chipped.name = 'Enchanted Stone';

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
// Gear stats scale with the tier's level L: a short sword gives the damage, a chestplate the HP and defence.
const gearAtk = L => Math.round(4 * L + 0.12 * L * L);
const gearHp = L => Math.round(40 * L + 1.6 * L * L);
const gearDef = L => Math.round(2 * L + 0.065 * L * L);
const SWORD_ATK = GEAR_LEVEL.map(gearAtk);
const ARMOR_HP = GEAR_LEVEL.map(gearHp);
const ARMOR_DEF = GEAR_LEVEL.map(gearDef);
// Requirement to wear gear of tier i, and where a piece's crafting level sits inside its tier.
const gearReq = (slot, i, skill) => ({ skill: skill || (slot === 'weapon' ? 'attack' : 'defence'), level: GEAR_LEVEL[i] });
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
  addItem_('bow' + i, { name: BOWS[i], icon: '🏹', tint: t, cat: 'Weapons', tier: i, slot: 'weapon', wtype: 'archery', atk: Math.round(SWORD_ATK[i] * 0.95), req: gearReq('weapon', i, 'archery'), sell: T_SELL[i] * 12 });
  addAction_('carpentry', 'bow' + i, { level: gearCraftLevel(i, 3), dur: 4.5, xp: Math.round(T_XP[i] * 3.6), inputs: { ['plank' + i]: 3 }, group: 'Weapons' });
  addItem_('staff' + i, { name: WOODS[i] + ' Staff', icon: '🪄', tint: t, cat: 'Weapons', tier: i, slot: 'weapon', wtype: 'magic', atk: Math.round(SWORD_ATK[i] * 0.95), req: gearReq('weapon', i, 'magic'), sell: T_SELL[i] * 16 });
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
  addAction_('alchemy', 'pot' + i, { level: T_LEVEL[i], dur: 4, xp: T_XP[i] * 2, inputs: { ['herb' + i]: 3, vial: 1 } }); // + a monster drop (set below)
}

// The first bow and staff need no level, so Archery and Magic can be trained from level 1.
ITEMS.bow0.req = { skill: 'archery', level: 1 };
ITEMS.staff0.req = { skill: 'magic', level: 1 };

// ---- Glyphs (Glyph Making): Chipped Stone inscribed with a glyph. Spells in battle use them up. ----
// [key, name, colour, Glyph Making level, chipped stone per craft]. Each craft makes GLYPHS_PER_CRAFT glyphs.
const GLYPHS = [
  ['spark',   'Spark Glyph',   '#ffe14a', 1,  1],
  ['tide',    'Tide Glyph',    '#4fb3ff', 8,  1],
  ['root',    'Root Glyph',    '#5fd068', 16, 1],
  ['gale',    'Gale Glyph',    '#cfeeff', 25, 2],
  ['ember',   'Ember Glyph',   '#ff7a2a', 35, 2],
  ['frost',   'Frost Glyph',   '#9ff0ff', 50, 3],
  ['radiant', 'Radiant Glyph', '#ffe9a0', 70, 4],
  ['void',    'Void Glyph',    '#a06bff', 85, 5],
];
const GLYPHS_PER_CRAFT = 10;
const GLYPH_XP = [9, 16, 26, 42, 66, 110, 190, 300];
GLYPHS.forEach(([k, name, c, lvl, stones], i) => {
  addItem_('glyph_' + k, { name, icon: '🔣', tint: c, cat: 'Glyphs', tier: i, sell: 2 + i * 3, stack: true, glyph: true });
  addAction_('glyphmaking', 'glyph_' + k, { level: lvl, dur: 2.5 + i * 0.3, xp: GLYPH_XP[i], inputs: { chipped: stones }, qty: GLYPHS_PER_CRAFT, group: 'Glyphs' });
});

// ---- Spells (Magic): each cast uses its glyphs from your inventory. Early spells need one glyph,
// later ones combine several kinds. L is the spell's power level (bonus damage like a weapon of that level).
const SPELLS = [
  { id: 'sparkbolt',  name: 'Spark Bolt',  lvl: 1,  L: 5,  color: '#ffe14a', glyphs: { glyph_spark: 1 } },
  { id: 'tidebolt',   name: 'Tide Bolt',   lvl: 8,  L: 10, color: '#4fb3ff', glyphs: { glyph_tide: 1 } },
  { id: 'rootlash',   name: 'Root Lash',   lvl: 16, L: 16, color: '#5fd068', glyphs: { glyph_root: 1 } },
  { id: 'galestrike', name: 'Gale Strike', lvl: 25, L: 25, color: '#cfeeff', glyphs: { glyph_gale: 1 } },
  { id: 'emberblast', name: 'Ember Blast', lvl: 35, L: 35, color: '#ff7a2a', glyphs: { glyph_ember: 1, glyph_spark: 1 } },
  { id: 'frostlance', name: 'Frost Lance', lvl: 45, L: 45, color: '#9ff0ff', glyphs: { glyph_frost: 1, glyph_tide: 2 } },
  { id: 'thornstorm', name: 'Thornstorm',  lvl: 55, L: 55, color: '#7fe07a', glyphs: { glyph_root: 2, glyph_gale: 2, glyph_frost: 1 } },
  { id: 'sunflare',   name: 'Sunflare',    lvl: 70, L: 70, color: '#ffd84a', glyphs: { glyph_radiant: 1, glyph_ember: 2, glyph_spark: 2 } },
  { id: 'voidrend',   name: 'Void Rend',   lvl: 85, L: 85, color: '#a06bff', glyphs: { glyph_void: 1, glyph_frost: 2, glyph_gale: 2 } },
  { id: 'cataclysm',  name: 'Cataclysm',   lvl: 95, L: 95, color: '#ff4a8a', glyphs: { glyph_void: 2, glyph_radiant: 2, glyph_ember: 2, glyph_tide: 2 } },
];
SPELLS.forEach(sp => { sp.img = `assets/spells/${sp.id}.webp`; });
const SPELL_BY_ID = Object.fromEntries(SPELLS.map(s => [s.id, s]));
const SPELL_POWER = 0.6; // a spell adds this share of a same-level weapon's damage
const spellAtk = sp => Math.round(gearAtk(sp.L) * SPELL_POWER);

// ---- Ranger armor (Carpentry) and mage robes (Glyph Making): lighter than metal, but each piece adds
// damage when you fight in its style. Wearing any tier needs the same Defence level as metal armor.
// [id suffix, ranger name, mage name, slot, materials, level offset, hp share, def share, damage share]
const STYLE_ARMOR = [
  ['hood',  'Ranger Hood',    'Wizard Hat',   'helmet', 2, 0, 0.25, 0.25, 0.06],
  ['gloves','Ranger Bracers', 'Spell Gloves', 'gloves', 2, 3, 0,    0.15, 0.08],
  ['boots', 'Ranger Boots',   'Mage Boots',   'boots',  2, 4, 0.15, 0.2,  0.05],
  ['legs',  'Ranger Chaps',   'Robe Bottoms', 'legs',   4, 6, 0.5,  0.4,  0.08],
  ['body',  'Ranger Vest',    'Robe Top',     'chest',  5, 8, 0.8,  0.6,  0.12],
];
for (let i = 0; i < TIERS; i++) {
  const [gk, gname, gc] = GLYPHS[i], glyphWord = gname.replace(' Glyph', '');
  for (const [suf, rName, mName, slot, n, lo, hpS, defS, atkS] of STYLE_ARMOR) {
    const base = { icon: GEAR_SLOT_INFO[slot].icon, cat: 'Armor', tier: i, slot, req: gearReq(slot, i) };
    const stat = (k, v) => (v ? Math.round(v) : undefined);
    addItem_('r' + suf + i, { ...base, name: `${WOODS[i]} ${rName}`, tint: TIER_TINT[i], atype: 'archery', sell: T_SELL[i] * (n + 2) * 2,
      hp: stat('hp', ARMOR_HP[i] * hpS * 0.8), def: stat('def', ARMOR_DEF[i] * defS * 0.8), atk: stat('atk', SWORD_ATK[i] * atkS) });
    addAction_('carpentry', 'r' + suf + i, { level: gearCraftLevel(i, lo), dur: 3 + n * 0.6, xp: Math.round(T_XP[i] * 1.3 * n), inputs: { ['plank' + i]: n, ['herb' + i]: 1 }, group: 'Ranger Armor' });
    addItem_('m' + suf + i, { ...base, name: `${glyphWord} ${mName}`, tint: gc, atype: 'magic', sell: T_SELL[i] * (n + 2) * 2,
      hp: stat('hp', ARMOR_HP[i] * hpS * 0.7), def: stat('def', ARMOR_DEF[i] * defS * 0.65), atk: stat('atk', SWORD_ATK[i] * atkS * 1.15) });
    addAction_('glyphmaking', 'm' + suf + i, { level: Math.max(GLYPHS[i][3], gearCraftLevel(i, lo)), dur: 3 + n * 0.6, xp: Math.round(T_XP[i] * 1.3 * n),
      inputs: { ['herb' + i]: n, ['glyph_' + gk]: n * 3 }, group: 'Robes' });
  }
}
for (const it of Object.values(ITEMS)) for (const k of ['hp', 'def', 'atk']) if (it[k] === undefined) delete it[k];
// ---- Monster drops for Weaving, Tanning and Alchemy (which monster drops what: MOB_DROPS in content.js) ----
// They stack in the inventory like remains.
const mobDrop_ = (id, name, icon, tint, tier, sell, maxStack = 10) => addItem_(id, { name, icon, tint, cat: 'Mob Drops', tier, sell, stack: true, maxStack });
mobDrop_('wool', 'Wool', '🐑', '#f4f0e6', 0, 4);
mobDrop_('silk', 'Spider Silk', '🕸️', '#e8e4f4', 1, 12);
// Raw hides, one per tier, from beasts of that level. Tanning turns them into leather.
const HIDES = [['Boar Hide', 'Boar'], ['Wolf Pelt', 'Wolf'], ['Bear Hide', 'Bear'], ['Hound Hide', 'Hound'], ['Yeti Hide', 'Yeti'], ['Ogre Hide', 'Ogre'], ['Dragon Hide', 'Dragon'], ['Kraken Hide', 'Kraken']];
const HIDE_TINT = ['#9a6a45', '#8a8e98', '#6a4a30', '#4a4450', '#e8eef4', '#7a8a4a', '#a83a2a', '#5a4a8a'];
HIDES.forEach(([name, beast], i) => {
  mobDrop_('hide' + i, name, '🟫', HIDE_TINT[i], i, T_SELL[i] * 3, 5);
  addItem_('leather' + i, { name: beast + ' Leather', icon: '🟫', tint: HIDE_TINT[i], cat: 'Leather', tier: i, sell: T_SELL[i] * 5 });
  addAction_('tanning', 'leather' + i, { level: T_LEVEL[i], dur: 3 + i * 0.4, xp: Math.round(T_XP[i] * 1.2), inputs: { ['hide' + i]: 1 } });
});
// Alchemy ingredients: every potion now needs one, from the monster listed in MOB_DROPS.
const ALCH_DROPS = [['jelly', 'Slime Jelly', '🟢', '#7fe07a'], ['fang', 'Wolf Fang', '🦷', '#f2eee0'], ['sap', 'Treant Sap', '🍯', '#e0a030'], ['ecto', 'Ectoplasm', '👻', '#9ff0e0'],
  ['batwing', 'Bat Wing', '🦇', '#5a3a5a'], ['imphorn', 'Imp Horn', '😈', '#c8402a'], ['fireess', 'Fire Essence', '🔥', '#ff8a2a'], ['lichdust', 'Lich Dust', '💀', '#b8e8a0']];
ALCH_DROPS.forEach(([id, name, icon, tint], i) => {
  mobDrop_(id, name, icon, tint, i, T_SELL[i] * 2 + 2);
  ACTIONS['pot' + i].inputs = { ['herb' + i]: 3, vial: 1, [id]: 1 };
});

// ---- Weaving: Wool becomes Cloth; ranger armor and mage robes are woven ----
// Ranger armor: leather (Tanning) + cloth + an herb for lacing (Herbalism).
// Mage robes: cloth + spider silk (from spiders) + an herb for dye + glyphs.
addItem_('cloth', { name: 'Cloth', icon: '🧵', tint: '#efe8da', cat: 'Cloth', tier: 0, sell: 10 });
addAction_('weaving', 'cloth', { level: 1, dur: 2.5, xp: 10, inputs: { wool: 2 }, group: 'Cloth' });
for (let i = 0; i < TIERS; i++) {
  for (const [suf, , , , n] of STYLE_ARMOR) {
    Object.assign(ACTIONS['r' + suf + i], { skill: 'weaving', inputs: { ['leather' + i]: n, cloth: 1, ['herb' + i]: 1 } });
    ITEMS['r' + suf + i].name = ACTIONS['r' + suf + i].name = ITEMS['r' + suf + i].name.replace(WOODS[i], HIDES[i][1]); // named after the hide
    Object.assign(ACTIONS['m' + suf + i], { skill: 'weaving', level: ACTIONS['r' + suf + i].level,
      inputs: { cloth: n, silk: Math.max(1, Math.ceil(n / 2)), ['herb' + i]: 1, ['glyph_' + GLYPHS[i][0]]: n } });
  }
}


// Stackable items share one inventory slot (everything else takes one slot per item).
// Every dish that burns while cooking turns into this.
addItem_('bread', { name: 'Bread', icon: '🍞', tint: '#d9a35a', cat: 'Food', tier: 0, heal: 220, sell: 8 });
addItem_('burnt', { name: 'Burnt Food', icon: '🍖', tint: '#3a2a22', cat: 'Misc', tier: 0, sell: 1, stack: true, burnt: true });

// ---- Remains: every enemy drops one; burying (or scattering) one trains Grace. Stack limits per slot vary. ----
const GRACE_PER_LEVEL = 0.0015; // damage taken -0.15% per Grace level
// bury: [min, max] Grace XP per burial (a random whole number in that range).
addItem_('bones', { name: 'Bones', icon: '🦴', tint: '#e8e0cc', cat: 'Remains', tier: 0, sell: 3, stack: true, maxStack: 10, bury: [4, 5] });
addItem_('bigbones', { name: 'Big Bones', icon: '🦴', tint: '#d8c8a8', cat: 'Remains', tier: 1, sell: 15, stack: true, maxStack: 5, bury: [15, 20] });
addItem_('ash', { name: 'Demonic Ash', icon: '⚱️', tint: '#8a5a7a', cat: 'Remains', tier: 2, sell: 25, stack: true, maxStack: 15, bury: [25, 30], scatter: true });
const buryXp = it => it.bury[0] + Math.floor(Math.random() * (it.bury[1] - it.bury[0] + 1));
const buryXpText = it => `${it.bury[0]}–${it.bury[1]}`;
for (const id of ['bones', 'bigbones', 'ash']) {
  const it = ITEMS[id], verb = it.scatter ? 'Scatter' : 'Bury';
  // Bury actions consume one item and produce nothing (noOutput); XP is exact, not scaled.
  ACTIONS['bury_' + id] = { id: 'bury_' + id, skill: 'grace', item: id, noOutput: true, name: `${verb} ${it.name}`, icon: it.icon, tint: it.tint,
    level: 1, dur: 1.8, xp: it.bury[0], xpMax: it.bury[1], inputs: { [id]: 1 }, qty: 0, group: 'Bury', verb };
}

// ---- Bonecraft (Grace page dropdown): gear carved from a mix of Bones and Big Bones ----
// One set with level-25 stats (between Silver and Mythril). Crafting XP matches burying the bones it uses.
const BONE_L = 25, BONE_TINT = '#e8dcc0';
const BONE_GEAR = [
  // [id, name, slot, wtype, Grace level, bones, big bones, stats as shares of a level-25 blade / chestplate, extra]
  ['bonedagger', 'Bone Dagger',     'weapon', 'melee',   15, 6, 1, { atk: 0.6 },  { spd: 0.25 }],
  ['bonesword',  'Bone Sword',      'weapon', 'melee',   20, 8, 3, { atk: 1 },    { spd: 0 }],
  ['bonebow',    'Bone Bow',        'weapon', 'archery', 22, 6, 3, { atk: 0.95 }, {}],
  ['bonestaff',  'Bone Staff',      'weapon', 'magic',   26, 5, 4, { atk: 0.95 }, {}],
  ['bonehelm',   'Bone Helm',       'helmet', null,      16, 5, 2, { hp: 0.3, def: 0.4 }, {}],
  ['bonegloves', 'Bone Gauntlets',  'gloves', null,      18, 6, 1, { def: 0.2, atk: 0.15 }, {}],
  ['boneboots',  'Bone Boots',      'boots',  null,      19, 6, 1, { hp: 0.2, def: 0.3 }, {}],
  ['boneshield', 'Bone Shield',     'shield', null,      24, 4, 4, { hp: 0.2, def: 0.8 }, {}],
  ['bonelegs',   'Bone Greaves',    'legs',   null,      27, 8, 3, { hp: 0.6, def: 0.6 }, {}],
  ['bonechest',  'Bone Chestplate', 'chest',  null,      30, 10, 5, { hp: 1, def: 1 }, {}],
];
for (const [id, name, slot, wtype, lvl, b, bb, sh, extra] of BONE_GEAR) {
  const it = { name, icon: GEAR_SLOT_INFO[slot].icon, tint: BONE_TINT, cat: slot === 'weapon' ? 'Weapons' : slot === 'shield' ? 'Shields' : 'Armor',
    tier: 2, slot, req: { skill: slot === 'weapon' ? 'attack' : 'defence', level: BONE_L }, sell: b * 3 + bb * 15 + 40, bone: true, ...extra };
  if (wtype) it.wtype = wtype;
  if (sh.atk) it.atk = Math.round(gearAtk(BONE_L) * sh.atk);
  if (sh.hp) it.hp = Math.round(gearHp(BONE_L) * sh.hp);
  if (sh.def) it.def = Math.round(gearDef(BONE_L) * sh.def);
  addItem_(id, it);
  addAction_('grace', id, { level: lvl, dur: 3 + (b + bb) * 0.25, xp: Math.round(b * 4.5 + bb * 17.5), inputs: { bones: b, bigbones: bb }, group: 'Bonecraft', verb: 'Carve' });
  ACTIONS[id].xp = Math.round(b * 4.5 + bb * 17.5); // not scaled: same as burying those bones
}

// ---- Every piece of gear has an item level, and damage, HP and defence based on that level ----
// Pieces that only had one or two stats get a little of the others, so every piece helps in combat.
const STAT_AT = { atk: gearAtk, hp: gearHp, def: gearDef };
const SLOT_EXTRA = {
  weapon: { hp: 0.06, def: 0.06 }, shield: { atk: 0.04 }, helmet: { atk: 0.03 }, chest: { atk: 0.04 },
  legs: { atk: 0.03 }, gloves: { hp: 0.1 }, boots: { atk: 0.03 },
};
for (const it of Object.values(ITEMS)) {
  if (!it.slot) continue;
  it.ilvl = it.bone ? BONE_L : GEAR_LEVEL[it.tier];
  for (const [k, share] of Object.entries(SLOT_EXTRA[it.slot])) if (!it[k]) it[k] = Math.max(1, Math.round(STAT_AT[k](it.ilvl) * share));
}

// ---- Armor sets: wearing all five armor pieces of one set (helmet, chest, legs, gloves, boots) adds a bonus ----
// Ranger and mage set bonuses only count when you fight in their style.
const SETS = {};
function addSet_(id, name, pieces, fx, desc, atype) {
  SETS[id] = { id, name, pieces, fx, desc, atype };
  for (const p of pieces) ITEMS[p].set = id;
}
for (let i = 0; i < TIERS; i++) {
  const gw = GLYPHS[i][1].replace(' Glyph', '');
  addSet_('metal' + i, `${METALS[i]} Set`, ['helm', 'armor', 'legs', 'gloves', 'boots'].map(p => p + i), { hp: 0.08, def: 0.12 }, '+8% max HP, +12% defence');
  addSet_('ranger' + i, `${HIDES[i][1]} Ranger Set`, ['rhood', 'rbody', 'rlegs', 'rgloves', 'rboots'].map(p => p + i), { atk: 0.1, spd: 0.08 }, '+10% damage, +8% attack speed with Archery', 'archery');
  addSet_('mage' + i, `${gw} Mage Set`, ['mhood', 'mbody', 'mlegs', 'mgloves', 'mboots'].map(p => p + i), { atk: 0.1, ult: 0.2 }, '+10% damage, +20% special power with Magic', 'magic');
}
addSet_('bone', 'Bone Set', ['bonehelm', 'bonechest', 'bonelegs', 'bonegloves', 'boneboots'], { hp: 0.1, ward: 0.05 }, '+10% max HP, 5% less damage taken');

// ---- Grace blessings: switched on from the Grace page; unlock by Grace level ----
// cat: only the strongest active blessing of each kind counts. Effects: def/atk/hp/spd/ult are multipliers,
// acc adds hit chance, regen heals that share of max HP per second, ward cuts damage taken.
const BLESSINGS = [
  { id: 'stoneskin',  lvl: 1,  cat: 'def',   icon: '🪨', name: 'Stoneskin',      fx: { def: 0.05 },  desc: '+5% defence' },
  { id: 'might',      lvl: 5,  cat: 'atk',   icon: '💪', name: 'Might',          fx: { atk: 0.05 },  desc: '+5% damage' },
  { id: 'keeneye',    lvl: 10, cat: 'acc',   icon: '👁️', name: 'Keen Eye',       fx: { acc: 0.04 },  desc: '+4% hit chance' },
  { id: 'vigor',      lvl: 15, cat: 'hp',    icon: '❤️', name: 'Vigor',          fx: { hp: 0.05 },   desc: '+5% max HP' },
  { id: 'haste',      lvl: 20, cat: 'spd',   icon: '💨', name: 'Haste',          fx: { spd: 0.05 },  desc: '+5% attack speed' },
  { id: 'ironskin',   lvl: 25, cat: 'def',   icon: '🛡️', name: 'Ironskin',       fx: { def: 0.10 },  desc: '+10% defence' },
  { id: 'fury',       lvl: 30, cat: 'atk',   icon: '🔥', name: 'Fury',           fx: { atk: 0.10 },  desc: '+10% damage' },
  { id: 'hawkeye',    lvl: 40, cat: 'acc',   icon: '🦅', name: 'Hawk Eye',       fx: { acc: 0.08 },  desc: '+8% hit chance' },
  { id: 'renewal',    lvl: 45, cat: 'regen', icon: '🌱', name: 'Renewal',        fx: { regen: 0.005 }, desc: 'Heal 0.5% max HP per second' },
  { id: 'vitality',   lvl: 50, cat: 'hp',    icon: '💖', name: 'Vitality',       fx: { hp: 0.10 },   desc: '+10% max HP' },
  { id: 'smite',      lvl: 55, cat: 'ult',   icon: '⚡', name: 'Smite',          fx: { ult: 0.25 },  desc: '+25% special attack power' },
  { id: 'diamond',    lvl: 60, cat: 'def',   icon: '💎', name: 'Diamondskin',    fx: { def: 0.15 },  desc: '+15% defence' },
  { id: 'wrath',      lvl: 70, cat: 'atk',   icon: '⚔️', name: 'Wrath',          fx: { atk: 0.15 },  desc: '+15% damage' },
  { id: 'celerity',   lvl: 80, cat: 'spd',   icon: '🌪️', name: 'Celerity',       fx: { spd: 0.10 },  desc: '+10% attack speed' },
  { id: 'ward',       lvl: 85, cat: 'ward',  icon: '✨', name: 'Holy Ward',      fx: { ward: 0.10 }, desc: '-10% damage taken' },
  { id: 'divine',     lvl: 90, cat: 'regen', icon: '🌟', name: 'Divine Renewal', fx: { regen: 0.012 }, desc: 'Heal 1.2% max HP per second' },
];
const BLESSING_BY_ID = Object.fromEntries(BLESSINGS.map(b => [b.id, b]));
const blessingSlots = graceLvl => 1 + Math.floor(graceLvl / 25); // 1 slot, +1 at Grace 25, 50 and 75

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
    { t: 'lvl', skill: 'grace', n: 10, r: { gems: 100 } },
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
