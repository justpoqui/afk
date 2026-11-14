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
];
HEROES.forEach(h => { h.sprite = 'hero_' + h.id; });
const HERO_BY_ID = Object.fromEntries(HEROES.map(h => [h.id, h]));

// Rendered Blender art (see art/blender). Emoji stay as alt text / fallback.
const spriteUrl = key => `assets/sprites/${key}.webp`;
const art = (d, cls = '') => `<img class="spr ${cls}" src="${spriteUrl(d.sprite)}" alt="${d.emoji}" draggable="false">`;
const battleBg = stage => `assets/bg/battle_ch${((Math.ceil(stage / 10) - 1) % 6) + 1}.webp`;

const MONSTERS = [
  { name: 'Goblin', sprite: 'mon_goblin',   emoji: '👺', range: 'melee'  },
  { name: 'Wolf', sprite: 'mon_wolf',     emoji: '🐺', range: 'melee'  },
  { name: 'Skeleton', sprite: 'mon_skeleton', emoji: '☠️', range: 'melee'  },
  { name: 'Spider', sprite: 'mon_spider',   emoji: '🕷️', range: 'melee'  },
  { name: 'Bat', sprite: 'mon_bat',      emoji: '🦇', range: 'ranged' },
  { name: 'Wraith', sprite: 'mon_wraith',   emoji: '👻', range: 'ranged' },
  { name: 'Imp', sprite: 'mon_imp',      emoji: '😈', range: 'ranged' },
  { name: 'Golem', sprite: 'mon_golem',    emoji: '🗿', range: 'melee'  },
];
const BOSSES = [
  { name: 'Ogre Chief', sprite: 'boss_ogre',   emoji: '👹' },
  { name: 'Ancient Wyrm', sprite: 'boss_wyrm', emoji: '🐉' },
  { name: 'Lich King', sprite: 'boss_lich',    emoji: '🧟' },
  { name: 'Kraken', sprite: 'boss_kraken',       emoji: '🐙' },
];

const CHAPTER_NAMES = ['Mistvale Meadows', 'Thornwood', 'Ashen Steppe', 'Frostpeak', 'Sunken Ruins', 'The Hollow Dark'];
