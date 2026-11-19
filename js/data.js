// Static game data: factions, classes, heroes, monsters.
const FACTIONS = {
  dawn: { name: 'Dawnguard', color: '#f2c14e' },
  wild: { name: 'Wildroot',  color: '#5cc46a' },
  iron: { name: 'Ironveil',  color: '#6fa8dc' },
  dusk: { name: 'Duskborn',  color: '#a57fd9' },
};

const CLASSES = {
  tank:    { name: 'Tank',    range: 'melee',  hp: 1400, atk: 45, def: 60, spd: 85  },
  warrior: { name: 'Warrior', range: 'melee',  hp: 1000, atk: 75, def: 35, spd: 100 },
  ranger:  { name: 'Ranger',  range: 'ranged', hp: 750,  atk: 80, def: 20, spd: 110 },
  mage:    { name: 'Mage',    range: 'ranged', hp: 700,  atk: 90, def: 18, spd: 90  },
  support: { name: 'Support', range: 'ranged', hp: 800,  atk: 50, def: 25, spd: 95  },
};

const RARITY = {
  R: { name: 'Rare',      mult: 1.0,  color: '#4da3ff', rate: 0.77 },
  E: { name: 'Epic',      mult: 1.35, color: '#c06cff', rate: 0.20 },
  L: { name: 'Legendary', mult: 1.8,  color: '#ffb02e', rate: 0.03 },
};

// Skill types: nuke, aoe, heal, shield, stun, buff, execute, drain
const HEROES = [
  { id: 'seraphine', name: 'Seraphine Vale', emoji: '😇', faction: 'dawn', cls: 'support', rarity: 'L',
    skill: { name: 'Radiant Hymn', type: 'heal', power: 2.6, desc: 'Heals all allies for 260% ATK.' } },
  { id: 'corwin', name: 'Corwin Ashblade', emoji: '🗡️', faction: 'dawn', cls: 'warrior', rarity: 'E',
    skill: { name: 'Sunder', type: 'nuke', power: 3.2, desc: 'Strikes one enemy for 320% ATK.' } },
  { id: 'mira', name: 'Mira Sunshot', emoji: '🏹', faction: 'dawn', cls: 'ranger', rarity: 'R',
    skill: { name: 'Piercing Ray', type: 'nuke', power: 2.6, desc: 'Fires a beam for 260% ATK.' } },
  { id: 'tobin', name: 'Tobin Brightshield', emoji: '🛡️', faction: 'dawn', cls: 'tank', rarity: 'R',
    skill: { name: 'Aegis Wall', type: 'shield', power: 2.0, desc: 'Shields all allies for 200% ATK.' } },

  { id: 'thorne', name: 'Thorne', emoji: '🧝', faction: 'wild', cls: 'ranger', rarity: 'L',
    skill: { name: 'Bramble Volley', type: 'aoe', power: 1.9, desc: 'Hits all enemies for 190% ATK.' } },
  { id: 'wren', name: 'Wren Mossweaver', emoji: '🌿', faction: 'wild', cls: 'support', rarity: 'E',
    skill: { name: 'Bloom', type: 'heal', power: 2.0, desc: 'Heals all allies for 200% ATK.' } },
  { id: 'grukk', name: 'Grukk Barkhide', emoji: '🐻', faction: 'wild', cls: 'tank', rarity: 'R',
    skill: { name: 'Root Slam', type: 'stun', power: 1.8, desc: 'Hits one enemy for 180% ATK and stuns for 2s.' } },
  { id: 'fen', name: 'Fen the Quick', emoji: '🦊', faction: 'wild', cls: 'warrior', rarity: 'R',
    skill: { name: 'Pounce', type: 'execute', power: 2.8, desc: 'Leaps at the weakest enemy for 280% ATK.' } },

  { id: 'valka', name: 'Valka Stormforge', emoji: '⚒️', faction: 'iron', cls: 'warrior', rarity: 'L',
    skill: { name: 'Thunder Anvil', type: 'aoe', power: 2.0, desc: 'Hits all enemies for 200% ATK.' } },
  { id: 'ozzik', name: 'Ozzik Gearwright', emoji: '⚙️', faction: 'iron', cls: 'mage', rarity: 'E',
    skill: { name: 'Shock Coil', type: 'stun', power: 2.4, desc: 'Hits one enemy for 240% ATK and stuns for 2s.' } },
  { id: 'hela', name: 'Hela Rivet', emoji: '🔩', faction: 'iron', cls: 'tank', rarity: 'R',
    skill: { name: 'Plating', type: 'shield', power: 1.8, desc: 'Shields all allies for 180% ATK.' } },
  { id: 'pim', name: 'Pim Sparkfuse', emoji: '💥', faction: 'iron', cls: 'mage', rarity: 'R',
    skill: { name: 'Firecracker', type: 'aoe', power: 1.4, desc: 'Hits all enemies for 140% ATK.' } },

  { id: 'nyx', name: 'Nyx Umbral', emoji: '🌙', faction: 'dusk', cls: 'mage', rarity: 'L',
    skill: { name: 'Eclipse', type: 'execute', power: 4.5, desc: 'Obliterates the weakest enemy for 450% ATK.' } },
  { id: 'lorcan', name: 'Lorcan Grave', emoji: '💀', faction: 'dusk', cls: 'tank', rarity: 'E',
    skill: { name: 'Soul Siphon', type: 'drain', power: 2.4, desc: 'Hits one enemy for 240% ATK and heals self for the damage.' } },
  { id: 'sable', name: 'Sable', emoji: '🦇', faction: 'dusk', cls: 'ranger', rarity: 'E',
    skill: { name: 'Night Bolt', type: 'execute', power: 3.0, desc: 'Shoots the weakest enemy for 300% ATK.' } },
  { id: 'vesper', name: 'Vesper Moth', emoji: '🦋', faction: 'dusk', cls: 'support', rarity: 'R',
    skill: { name: 'Dusk Hymn', type: 'buff', power: 0.3, desc: 'Raises allies\' ATK by 30% for 6s.' } },

  // Back-line archers and wizards
  { id: 'lumen', name: 'Lumen Pyre', emoji: '🔥', faction: 'dawn', cls: 'mage', rarity: 'E', bolt: '#ff8a2a',
    skill: { name: 'Sunfire Rain', type: 'aoe', power: 1.7, desc: 'Rains fire on all enemies for 170% ATK.' } },
  { id: 'kestrel', name: 'Kestrel', emoji: '🎯', faction: 'dawn', cls: 'ranger', rarity: 'R',
    skill: { name: 'Heavy Bolt', type: 'nuke', power: 2.7, desc: 'Fires a crossbow bolt for 270% ATK.' } },
  { id: 'oona', name: 'Oona Bramblewitch', emoji: '🍄', faction: 'wild', cls: 'mage', rarity: 'E', bolt: '#7dff7a',
    skill: { name: 'Vine Snare', type: 'stun', power: 2.2, desc: 'Hits one enemy for 220% ATK and stuns for 2s.' } },
  { id: 'hopper', name: 'Hopper', emoji: '🐰', faction: 'wild', cls: 'ranger', rarity: 'R',
    skill: { name: 'Trick Shot', type: 'execute', power: 2.6, desc: 'Shoots the weakest enemy for 260% ATK.' } },
  { id: 'gunnar', name: 'Gunnar Boltcaster', emoji: '🏹', faction: 'iron', cls: 'ranger', rarity: 'E',
    skill: { name: 'Scatter Bolts', type: 'aoe', power: 1.5, desc: 'Peppers all enemies for 150% ATK.' } },
  { id: 'aurelia', name: 'Aurelia Voltspire', emoji: '⚡', faction: 'iron', cls: 'mage', rarity: 'L', bolt: '#7fd6ff',
    skill: { name: 'Chain Storm', type: 'aoe', power: 2.3, desc: 'Lightning strikes all enemies for 230% ATK.' } },
  { id: 'morwen', name: 'Morwen Hex', emoji: '🧙', faction: 'dusk', cls: 'mage', rarity: 'E', bolt: '#c77dff',
    skill: { name: 'Hex Drain', type: 'drain', power: 2.6, desc: 'Curses one enemy for 260% ATK and heals self for the damage.' } },
  { id: 'vael', name: 'Vael Nightarrow', emoji: '🌘', faction: 'dusk', cls: 'ranger', rarity: 'L',
    skill: { name: 'Umbral Arrow', type: 'execute', power: 4.2, desc: 'Pierces the weakest enemy for 420% ATK.' } },
];
HEROES.forEach(h => { h.sprite = 'hero_' + h.id; });
const HERO_BY_ID = Object.fromEntries(HEROES.map(h => [h.id, h]));

// Rendered Blender art (see art/blender). Emoji stay as alt text / fallback.
// Smoothed renders (art/blender/smooth.py); the originals stay alongside as <key>.webp.
const spriteUrl = key => `assets/sprites/${key}_smooth.webp`;
// What a unit fires: rangers shoot arrows, mages and supports cast glowing bolts.
const projOf = d => d.proj || (d.cls === 'ranger' ? 'arrow' : (d.cls === 'mage' || d.cls === 'support') ? 'bolt' : null);
const boltColor = d => d.bolt || (d.faction ? FACTIONS[d.faction].color : '#ff6b6b');
// side=true: the left-facing battle pose (mirrored by CSS for enemies).
const art = (d, cls = '', side = false) => `<img class="spr ${cls}" src="${spriteUrl(d.sprite + (side ? '_side' : ''))}" alt="${d.emoji}" draggable="false">`;
const battleBg = stage => `assets/bg/battle_ch${((Math.ceil(stage / 10) - 1) % 6) + 1}.webp`;

const MONSTERS = [
  { name: 'Goblin', sprite: 'mon_goblin',   emoji: '👺', range: 'melee'  },
  { name: 'Wolf', sprite: 'mon_wolf',     emoji: '🐺', range: 'melee'  },
  { name: 'Skeleton', sprite: 'mon_skeleton', emoji: '☠️', range: 'melee'  },
  { name: 'Spider', sprite: 'mon_spider',   emoji: '🕷️', range: 'melee'  },
  { name: 'Bat', sprite: 'mon_bat',      emoji: '🦇', range: 'ranged', bolt: '#ff4d6d' },
  { name: 'Wraith', sprite: 'mon_wraith',   emoji: '👻', range: 'ranged', bolt: '#7ffcff' },
  { name: 'Imp', sprite: 'mon_imp',      emoji: '😈', range: 'ranged', bolt: '#ffb02e' },
  { name: 'Slime', sprite: 'mon_slime', emoji: '🟢', range: 'melee' },
  { name: 'Treant', sprite: 'mon_treant', emoji: '🌳', range: 'melee' },
  { name: 'Goblin Archer', sprite: 'mon_goblin_archer', emoji: '🏹', range: 'ranged', proj: 'arrow' },
  { name: 'Cultist', sprite: 'mon_cultist', emoji: '🧙', range: 'ranged', proj: 'bolt', bolt: '#c77dff' },
  { name: 'Fire Sprite', sprite: 'mon_fire_sprite', emoji: '🔥', range: 'ranged', proj: 'bolt', bolt: '#ff8a2a' },
  { name: 'Golem', sprite: 'mon_golem',    emoji: '🗿', range: 'melee'  },
];
const BOSSES = [
  { name: 'Ogre Chief', sprite: 'boss_ogre',   emoji: '👹' },
  { name: 'Ancient Wyrm', sprite: 'boss_wyrm', emoji: '🐉' },
  { name: 'Lich King', sprite: 'boss_lich',    emoji: '🧟' },
  { name: 'Kraken', sprite: 'boss_kraken',       emoji: '🐙' },
];

// The campaign is a chain of arenas, 10 rounds each (round 10 is the champion).
// What each enemy leaves behind: demonic enemies turn to ash, big creatures (and every boss) leave big bones.
const DEMONIC = new Set(['imp', 'fire_sprite']);
const BIG_CREATURES = new Set(['golem', 'treant', 'ogre', 'wyrm', 'lich', 'kraken']);
const remainsOf = (key, boss) => (DEMONIC.has(key) ? 'ash' : boss || BIG_CREATURES.has(key) ? 'bigbones' : 'bones');
const CHAPTER_NAMES = ['Mistvale Colosseum', 'Thornwood Ring', 'Ashfire Pit', 'Frostpeak Coliseum', 'Sunken Amphitheatre', 'Crystal Abyss Arena'];
// Fighting styles. Looks are grouped the same way in the Library.
const COMBAT_TYPES = {
  melee:   { name: 'Melee',   icon: '⚔️', perk: '+10% damage' },
  archery: { name: 'Archery', icon: '🏹', perk: '+15% attack speed' },
  magic:   { name: 'Magic',   icon: '🔮', perk: 'Specials charge 30% faster' },
};
const CLASS_TYPE = { warrior: 'melee', tank: 'melee', ranger: 'archery', mage: 'magic', support: 'magic' };
// Your special attack comes from how you fight, not from your look.
const STYLE_SPECIALS = {
  melee:   { name: 'Power Strike',    type: 'nuke', power: 2.6, desc: 'A heavy blow for 260% damage.' },
  archery: { name: 'Arrow Volley',    type: 'aoe',  power: 1.5, desc: 'Rains arrows on every enemy for 150% damage.' },
  magic:   { name: 'Arcane Burst',    type: 'aoe',  power: 1.8, desc: 'Blasts every enemy with magic for 180% damage.' },
  unarmed: { name: 'Flurry of Blows', type: 'nuke', power: 2.2, desc: 'A rapid string of punches and kicks for 220% damage.' },
};
