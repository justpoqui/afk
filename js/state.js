// Save state, the player character, stages, idle economy and skin rerolls.
const SAVE_KEY = 'idle-realms-save-v1';
const IDLE_CAP_MS = 12 * 3600 * 1000;
const GEAR_SLOTS = ['weapon', 'armor']; // more slots (helmet, ring...) can be added here later
const START_HP_LEVEL = 10;

let state;

function newState() {
  return {
    gold: 300, gems: 300, scrolls: 3,
    stage: 1, lastClaim: Date.now(), pity: 0,
    player: { skin: 'tobin', style: 'strength', gear: { weapon: null, armor: null } },
    seenSkins: ['tobin'], pendingSkin: null,
    bank: {}, skills: Object.fromEntries(Object.keys(SKILLS).map(k => [k, { xp: k === 'hitpoints' ? xpForLevel(START_HP_LEVEL) : 0 }])),
    active: null, provision: null, potion: null, tasksClaimed: [], tiersClaimed: [],
    stats: { actions: {}, summons: 0, claims: 0, equips: 0, potions: 0, eaten: 0, kills: 0 },
  };
}

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable */ }
}
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      state = Object.assign(newState(), saved);
      state.skills = Object.assign(newState().skills, saved.skills || {});
      state.stats = Object.assign(newState().stats, saved.stats || {});
      if (!saved.player) migrateTeamSave(saved);
      state.player.gear = Object.assign({ weapon: null, armor: null }, state.player.gear);
      return;
    }
  } catch (e) { /* ignore corrupt save */ }
  state = newState();
}
// Older saves had a team of heroes. Keep the rarest hero as the player's look, unlock every
// owned hero in the collection and return all equipped gear to the bank.
function migrateTeamSave(saved) {
  const heroes = (saved.heroes || []).filter(h => HERO_BY_ID[h.id]);
  const rank = { L: 3, E: 2, R: 1 };
  const best = [...heroes].sort((a, b) => rank[HERO_BY_ID[b.id].rarity] - rank[HERO_BY_ID[a.id].rarity] || b.level - a.level)[0];
  state.player = { skin: best ? best.id : 'tobin', style: 'strength', gear: { weapon: null, armor: null } };
  for (const h of heroes) for (const s of GEAR_SLOTS) if (h[s]) addItem(h[s]);
  state.seenSkins = [...new Set(['tobin', ...heroes.map(h => h.id)])];
  delete state.heroes; delete state.team; delete state.nextUid;
}
function resetSave() { state = newState(); save(); }

// ---- Skins: rerolled with scrolls, each gives a bonus on top of gear ----
const SKIN_BONUS = {
  warrior: { dmg: 0.06 },
  tank:    { hp: 0.08, def: 0.05 },
  ranger:  { spd: 0.06 },
  mage:    { ult: 0.15 },
  support: { regen: 0.004 },
};
const RARITY_BONUS = { R: 1, E: 1.6, L: 2.6 };
const BONUS_LABEL = { dmg: 'damage', hp: 'max HP', def: 'defence', spd: 'attack speed', ult: 'special power', regen: 'HP regen /s' };
function skinBonus(id) {
  const d = HERO_BY_ID[id], m = RARITY_BONUS[d.rarity];
  return Object.fromEntries(Object.entries(SKIN_BONUS[d.cls]).map(([k, v]) => [k, v * m]));
}
const skinBonusText = id => Object.entries(skinBonus(id))
  .map(([k, v]) => `+${(v * 100).toFixed(k === 'regen' ? 1 : 0)}% ${BONUS_LABEL[k]}`).join(', ');

const REROLL_GEMS = 150, PITY_LIMIT = 30;
function rollRarity() {
  state.pity++;
  if (state.pity >= PITY_LIMIT) { state.pity = 0; return 'L'; }
  const r = Math.random();
  if (r < RARITY.L.rate) { state.pity = 0; return 'L'; }
  if (r < RARITY.L.rate + RARITY.E.rate) return 'E';
  return 'R';
}
// Rolls a new look and holds it in pendingSkin until the player keeps it or not.
function rerollSkin() {
  if (state.scrolls >= 1) state.scrolls -= 1;
  else if (state.gems >= REROLL_GEMS) state.gems -= REROLL_GEMS;
  else return null;
  const rar = rollRarity();
  const pool = HEROES.filter(h => h.rarity === rar && h.id !== state.player.skin);
  const id = pool[Math.floor(Math.random() * pool.length)].id;
  state.pendingSkin = id;
  state.stats.summons++;
  if (!state.seenSkins.includes(id)) state.seenSkins.push(id);
  save();
  return id;
}
function resolveReroll(keepNew) {
  if (keepNew && state.pendingSkin) state.player.skin = state.pendingSkin;
  state.pendingSkin = null;
  save();
}

// ---- Player stats come from combat skills + gear + skin ----
// Base stats per combat-skill level (grow faster at high levels so late chapters stay reachable).
const baseHp = l => Math.round(800 + 60 * (l - 1) + 0.6 * (l - 1) ** 2);
const baseAtk = l => Math.round(60 + 6 * (l - 1) + 0.06 * (l - 1) ** 2);
const baseDef = l => Math.round(25 + 3 * (l - 1) + 0.03 * (l - 1) ** 2);
const atkSpeedBonus = l => Math.min(0.3, l * 0.003);
const playerHitChance = (attackLvl, enemyLvl) => Math.min(0.98, Math.max(0.55, 0.82 + (attackLvl - enemyLvl) * 0.008));
const enemyHitChance = (defenceLvl, enemyLvl) => Math.min(0.95, Math.max(0.45, 0.85 - (defenceLvl - enemyLvl) * 0.006));
const gearItem = slot => (state.player.gear[slot] ? ITEMS[state.player.gear[slot]] : null);
function playerStats(withPotion = false) {
  const a = skillLevel('attack'), s = skillLevel('strength'), d = skillLevel('defence'), h = skillLevel('hitpoints');
  const sk = skinBonus(state.player.skin), w = gearItem('weapon'), ar = gearItem('armor');
  const pe = withPotion ? potionEffect() : {};
  const st = {
    hp: (baseHp(h) + (ar ? ar.hp : 0)) * (1 + (sk.hp || 0)) * (1 + (pe.hp || 0)),
    atk: (baseAtk(s) + (w ? w.atk : 0)) * (1 + (sk.dmg || 0)) * (1 + (pe.atk || 0)),
    def: (baseDef(d) + (ar ? ar.def : 0)) * (1 + (sk.def || 0)) * (1 + (pe.def || 0)),
    spd: 100 * (1 + atkSpeedBonus(a)) * (1 + (sk.spd || 0)) * (1 + (pe.spd || 0)),
    accLvl: a, defLvl: d, regen: sk.regen || 0, ult: sk.ult || 0,
  };
  for (const k of ['hp', 'atk', 'def']) st[k] = Math.round(st[k]);
  return st;
}
const power = st => Math.round(st.hp * 0.1 + st.atk * 3 + st.def * 2);
const playerPower = () => power(playerStats());

function playerBattleUnit() {
  const d = HERO_BY_ID[state.player.skin], st = playerStats(true);
  return { ...st, name: 'You', emoji: d.emoji, sprite: d.sprite, range: CLASSES[d.cls].range, cls: d.cls,
    skill: { ...d.skill, power: d.skill.power * (1 + st.ult) }, color: FACTIONS[d.faction].color,
    proj: projOf(d), bolt: boltColor(d) };
}

// ---- Combat XP: damage dealt trains the chosen style; Hitpoints always gets a third ----
const COMBAT_XP_PER_DMG = 0.6;
const STYLES = { attack: 'Accurate', strength: 'Aggressive', defence: 'Defensive' };
function grantCombatXp(dmg) {
  const style = state.player.style, xp = Math.round(dmg * COMBAT_XP_PER_DMG * SKILL_XP_MULT);
  const before = { [style]: skillLevel(style), hitpoints: skillLevel('hitpoints') };
  state.skills[style].xp += xp;
  state.skills.hitpoints.xp += Math.round(xp / 3);
  const ups = Object.keys(before).filter(k => skillLevel(k) > before[k]).map(k => [k, skillLevel(k)]);
  return { style, xp, hpXp: Math.round(xp / 3), ups };
}

// ---- Bank & gear ----
const itemCount = id => state.bank[id] || 0;
function addItem(id, n = 1) { state.bank[id] = (state.bank[id] || 0) + n; }
function removeItem(id, n = 1) {
  state.bank[id] = Math.max(0, (state.bank[id] || 0) - n);
  if (!state.bank[id]) delete state.bank[id];
}
function sellItem(id, n) {
  n = Math.min(n, itemCount(id));
  removeItem(id, n); state.gold += ITEMS[id].sell * n; save();
  return ITEMS[id].sell * n;
}
function equipGear(itemId) {
  const slot = ITEMS[itemId].slot;
  if (!slot || !itemCount(itemId)) return;
  if (state.player.gear[slot]) addItem(state.player.gear[slot]);
  removeItem(itemId); state.player.gear[slot] = itemId; state.stats.equips++; save();
}
function unequipGear(slot) {
  if (state.player.gear[slot]) { addItem(state.player.gear[slot]); state.player.gear[slot] = null; save(); }
}
function drinkPotion(id) {
  if (!itemCount(id)) return false;
  removeItem(id); state.potion = { id, battles: POTION_BATTLES }; state.stats.potions++; save();
  return true;
}
const potionEffect = () => (state.potion ? ITEMS[state.potion.id].effect : {});

// ---- Stages (sized for one fighter) ----
const isBoss = stage => stage % 10 === 0;
const chapterOf = stage => Math.ceil(stage / 10);
const chapterName = stage => CHAPTER_NAMES[(chapterOf(stage) - 1) % CHAPTER_NAMES.length];
const stageLabel = stage => `${chapterOf(stage)}-${((stage - 1) % 10) + 1}`;

function stageEnemies(stage) {
  const n = stage - 1;
  const mult = 1 + 0.15 * n + 0.0012 * n * n;
  const mk = (tpl, boss) => ({
    name: tpl.name, emoji: tpl.emoji, sprite: tpl.sprite, range: tpl.range || 'melee', boss, lvl: stage,
    proj: tpl.range === 'ranged' ? (tpl.proj || 'bolt') : (boss ? 'bolt' : null), bolt: tpl.bolt || (boss ? '#ff5d5d' : null),
    hp: Math.round(520 * mult * (boss ? 3.2 : 1)), atk: Math.round(40 * mult * (boss ? 1.4 : 1)),
    def: Math.round(18 * mult), spd: boss ? 80 : 90,
    skill: boss ? { name: 'Cataclysm', type: 'aoe', power: 1.8 } : { name: 'Frenzy', type: 'nuke', power: 2.0 },
  });
  const rng = mulberry(stage * 7919);
  // Melee monsters stand in front; archers and casters stay behind.
  const melee = MONSTERS.filter(m => m.range !== 'ranged'), ranged = MONSTERS.filter(m => m.range === 'ranged');
  const pickFor = slot => { const pool = slot < 2 ? melee : ranged; return pool[Math.floor(rng() * pool.length)]; };
  const slots = [null, null, null, null, null];
  if (isBoss(stage)) {
    slots[0] = mk(BOSSES[(chapterOf(stage) - 1) % BOSSES.length], true);
    if (stage >= 20) slots[2] = mk(pickFor(2), false);
    return slots;
  }
  const count = stage <= 3 ? 1 : stage <= 12 ? 2 : 3;
  for (const s of [0, 2, 1].slice(0, count)) slots[s] = mk(pickFor(s), false);
  return slots;
}
const stagePower = stage => stageEnemies(stage).reduce((s, e) => s + (e ? power(e) : 0), 0);
function stageReward(stage) {
  return {
    gold: 80 * stage,
    gems: isBoss(stage) ? 150 : 25,
    scrolls: isBoss(stage) ? 2 : (stage % 5 === 0 ? 1 : 0),
  };
}

// ---- Idle rewards ----
function idleRates() {
  const s = state.stage;
  return { gold: 30 + s * 10, gemsPerHour: 6 + Math.floor(s / 3) }; // gold per minute
}
function pendingIdle() {
  const ms = Math.min(IDLE_CAP_MS, Math.max(0, Date.now() - state.lastClaim));
  const min = ms / 60000, r = idleRates();
  return { ms, gold: Math.floor(r.gold * min), gems: Math.floor(r.gemsPerHour * min / 60) };
}
function claimIdle() {
  const p = pendingIdle();
  state.gold += p.gold; state.gems += p.gems;
  state.lastClaim = Date.now();
  if (p.gold > 0) state.stats.claims++;
  save();
  return p;
}

function mulberry(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
