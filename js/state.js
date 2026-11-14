// Save state, the player character, stages, idle economy and skin rerolls.
const SAVE_KEY = 'idle-realms-save-v1';
const IDLE_CAP_MS = 12 * 3600 * 1000;
// Equipment slots, in paper-doll order. Add a slot here + GEAR_SLOT_INFO (skilldata.js) to extend.
const GEAR_SLOTS = ['helmet', 'chest', 'legs', 'gloves', 'boots', 'weapon', 'shield'];
const emptyGear = () => Object.fromEntries(GEAR_SLOTS.map(s => [s, null]));
const START_HP_LEVEL = 10;

let state;

function newState() {
  return {
    gold: 300, gems: 120, scrolls: 3,
    stage: 1, lastClaim: Date.now(),
    player: { skin: 'tobin', style: 'strength', ctype: 'melee', gear: emptyGear() },
    looks: { tobin: 0 }, // owned looks -> duplicate stars
    upgrades: { tools: {}, backpack: 0, courier: false }, bonusSlots: 0, quests: {},
    bank: {}, inv: [], skills: Object.fromEntries(Object.keys(SKILLS).map(k => [k, { xp: k === 'hitpoints' ? xpForLevel(START_HP_LEVEL) : 0 }])),
    active: null, provision: null, potion: null, tasksClaimed: [], tiersClaimed: [],
    stats: { actions: {}, summons: 0, claims: 0, equips: 0, potions: 0, eaten: 0, kills: 0, burnt: 0, mkills: {} },
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
      if (!Array.isArray(state.inv)) state.inv = [];
      state.upgrades = Object.assign(newState().upgrades, saved.upgrades || {});
      if (!saved.looks) { // older saves: every look seen through rerolls is now owned
        state.looks = {};
        for (const id of [...(saved.seenSkins || []), state.player.skin]) if (HERO_BY_ID[id]) state.looks[id] = 0;
      }
      delete state.seenSkins; delete state.pendingSkin; delete state.pity;
      if (!state.player.ctype) state.player.ctype = CLASS_TYPE[HERO_BY_ID[state.player.skin].cls];
      const g = state.player.gear || {};
      if (g.armor && !g.chest) g.chest = g.armor; // the old 'armor' slot is now 'chest'
      delete g.armor;
      state.player.gear = Object.assign(emptyGear(), g);
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
  state.player = { skin: best ? best.id : 'tobin', style: 'strength', gear: emptyGear() };
  for (const h of heroes) for (const s of ['weapon', 'armor']) if (h[s]) addItem(h[s]);
  state.looks = Object.fromEntries([...new Set(['tobin', ...heroes.map(h => h.id)])].map(id => [id, 0]));
  delete state.heroes; delete state.team; delete state.nextUid;
}
function resetSave() { state = newState(); save(); }

// ---- Looks: owned in a library, unlocked from chests; each gives a bonus on top of gear ----
const SKIN_BONUS = {
  warrior: { dmg: 0.06 },
  tank:    { hp: 0.08, def: 0.05 },
  ranger:  { spd: 0.06 },
  mage:    { ult: 0.15 },
  support: { regen: 0.004 },
};
const RARITY_BONUS = { R: 1, E: 1.6, L: 2.6 };
const BONUS_LABEL = { dmg: 'damage', hp: 'max HP', def: 'defence', spd: 'attack speed', ult: 'special power', regen: 'HP regen /s' };
const lookStars = id => state.looks[id] || 0;
const ownsLook = id => id in state.looks;
function skinBonus(id) {
  const d = HERO_BY_ID[id], m = RARITY_BONUS[d.rarity] * (1 + LOOK_STAR_BONUS * lookStars(id));
  return Object.fromEntries(Object.entries(SKIN_BONUS[d.cls]).map(([k, v]) => [k, v * m]));
}
const skinBonusText = id => Object.entries(skinBonus(id))
  .map(([k, v]) => `+${(v * 100).toFixed(k === 'regen' ? 1 : 0)}% ${BONUS_LABEL[k]}`).join(', ');
function wearLook(id) { if (ownsLook(id)) { state.player.skin = id; save(); } }

function exchangeGems(n) {
  if (state.gems < GEMS_PER_SCROLL * n) return false;
  state.gems -= GEMS_PER_SCROLL * n; state.scrolls += n; save(); return true;
}
// Open `count` spins of a chest, paid with 📜 scrolls.
function spinChest(chestId, count) {
  const c = CHESTS.find(x => x.id === chestId);
  const cost = count === 6 ? c.cost6 : c.cost1 * count;
  if (state.scrolls < cost) return null;
  state.scrolls -= cost;
  const results = [];
  for (let i = 0; i < count; i++) {
    const r = Math.random();
    const rar = r < c.odds.L ? 'L' : r < c.odds.L + c.odds.E ? 'E' : 'R';
    const pool = HEROES.filter(h => h.rarity === rar);
    const id = pool[Math.floor(Math.random() * pool.length)].id;
    let note;
    if (!ownsLook(id)) { state.looks[id] = 0; note = 'NEW'; }
    else if (state.looks[id] < MAX_LOOK_STARS) { state.looks[id]++; note = '★' + state.looks[id]; }
    else { const g = 300 * c.cost1; state.gems += g; note = `+${g}💎`; }
    results.push({ id, note });
  }
  state.stats.summons += count;
  save();
  return results;
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
// A weapon made for another fighting style (blade / bow / staff) only gives half its damage.
const weaponMatches = it => !it.wtype || it.wtype === state.player.ctype;
function gearTotals() {
  const t = { hp: 0, atk: 0, def: 0 };
  for (const slot of GEAR_SLOTS) {
    const it = gearItem(slot);
    if (!it) continue;
    t.hp += it.hp || 0; t.def += it.def || 0;
    t.atk += (it.atk || 0) * (slot === 'weapon' && !weaponMatches(it) ? 0.5 : 1);
  }
  return t;
}
function playerStats(withPotion = false) {
  const a = skillLevel('attack'), s = skillLevel('strength'), d = skillLevel('defence'), h = skillLevel('hitpoints');
  const sk = skinBonus(state.player.skin), g = gearTotals();
  const pe = withPotion ? potionEffect() : {};
  const st = {
    hp: (baseHp(h) + g.hp) * (1 + (sk.hp || 0)) * (1 + (pe.hp || 0)),
    atk: (baseAtk(s) + g.atk) * (1 + (sk.dmg || 0)) * (1 + (pe.atk || 0)),
    def: (baseDef(d) + g.def) * (1 + (sk.def || 0)) * (1 + (pe.def || 0)),
    spd: 100 * (1 + atkSpeedBonus(a)) * (1 + (sk.spd || 0)) * (1 + (pe.spd || 0)),
    accLvl: a, defLvl: d, regen: sk.regen || 0, ult: sk.ult || 0, energyMult: 1,
  };
  const ct = state.player.ctype;
  if (ct === 'melee') st.atk *= 1.1;
  if (ct === 'archery') st.spd *= 1.15;
  if (ct === 'magic') st.energyMult = 1.3;
  for (const k of ['hp', 'atk', 'def']) st[k] = Math.round(st[k]);
  return st;
}
const combatLevel = () => Math.floor((skillLevel('attack') + skillLevel('strength') + skillLevel('defence') + skillLevel('hitpoints')) / 4);
const power = st => Math.round(st.hp * 0.1 + st.atk * 3 + st.def * 2);
const playerPower = () => power(playerStats());

function playerBattleUnit() {
  const d = HERO_BY_ID[state.player.skin], st = playerStats(true);
  const ct = state.player.ctype;
  return { ...st, name: 'You', emoji: d.emoji, sprite: d.sprite, range: ct === 'melee' ? 'melee' : 'ranged', cls: d.cls,
    skill: { ...d.skill, power: d.skill.power * (1 + st.ult) }, color: FACTIONS[d.faction].color,
    proj: ct === 'archery' ? 'arrow' : ct === 'magic' ? 'bolt' : null, bolt: d.bolt || (ct === 'magic' ? '#9f7aff' : boltColor(d)) };
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

// ---- Inventory: INV_SIZE slots, one item per slot unless the item stacks ----
const BASE_INV = 28;
const invSize = () => BASE_INV + 4 * state.upgrades.backpack + (state.bonusSlots || 0);
const invCount = id => state.inv.reduce((s, x) => (x.id === id ? s + x.n : s), 0);
const invUsed = () => state.inv.length;
const invFree = () => invSize() - state.inv.length;
const invFull = () => invFree() <= 0;
function invRoomFor(id, qty = 1) {
  if (ITEMS[id].stack) return state.inv.some(x => x.id === id) || invFree() > 0 ? qty : 0;
  return Math.max(0, Math.min(qty, invFree()));
}
function invAdd(id, qty = 1) {
  const room = invRoomFor(id, qty);
  if (!room) return 0;
  if (ITEMS[id].stack) {
    let slot = state.inv.find(x => x.id === id);
    if (!slot) { slot = { id, n: 0 }; state.inv.push(slot); }
    slot.n += room;
  } else for (let i = 0; i < room; i++) state.inv.push({ id, n: 1 });
  return room;
}
function invRemove(id, qty = 1) {
  let left = qty;
  for (let i = state.inv.length - 1; i >= 0 && left > 0; i--) {
    const x = state.inv[i];
    if (x.id !== id) continue;
    const k = Math.min(left, x.n);
    x.n -= k; left -= k;
    if (!x.n) state.inv.splice(i, 1);
  }
  return qty - left;
}
// Materials can come from the inventory or the bank (inventory first).
const haveCount = id => invCount(id) + itemCount(id);
function take(id, n) { const got = invRemove(id, n); if (got < n) removeItem(id, n - got); }
function deposit(id, n = Infinity) { const k = invRemove(id, Math.min(n, invCount(id))); addItem(id, k); save(); return k; }
function depositAll(keepFood = false) {
  const keep = [];
  for (const x of state.inv) { if (keepFood && ITEMS[x.id].heal) keep.push(x); else addItem(x.id, x.n); }
  state.inv = keep; save();
}
function withdraw(id, n) {
  const k = invAdd(id, Math.min(n, itemCount(id)));
  removeItem(id, k); save();
  return k;
}
// Battle food is eaten from the inventory: the chosen food first, otherwise the best food carried.
function nextFood() {
  if (state.provision && invCount(state.provision)) return state.provision;
  const foods = state.inv.filter(x => ITEMS[x.id].heal).map(x => x.id);
  return foods.sort((a, b) => ITEMS[b].heal - ITEMS[a].heal)[0] || null;
}
const foodCarried = () => state.inv.filter(x => ITEMS[x.id].heal).length;

// ---- Bank & gear ----
const itemCount = id => state.bank[id] || 0;
function addItem(id, n = 1) { state.bank[id] = (state.bank[id] || 0) + n; }
function removeItem(id, n = 1) {
  state.bank[id] = Math.max(0, (state.bank[id] || 0) - n);
  if (!state.bank[id]) delete state.bank[id];
}
function sellItem(id, n, fromInv = false) {
  n = Math.min(n, fromInv ? invCount(id) : itemCount(id));
  if (fromInv) invRemove(id, n); else removeItem(id, n);
  state.gold += ITEMS[id].sell * n; save();
  return ITEMS[id].sell * n;
}
function equipGear(itemId) {
  const slot = ITEMS[itemId].slot;
  if (!slot || !haveCount(itemId)) return;
  const old = state.player.gear[slot];
  take(itemId, 1); state.player.gear[slot] = itemId; state.stats.equips++;
  if (old && !invAdd(old)) addItem(old); // the old piece goes to the inventory, or the bank if it's full
  save();
}
function unequipGear(slot) {
  const old = state.player.gear[slot];
  if (old) { if (!invAdd(old)) addItem(old); state.player.gear[slot] = null; save(); }
}
function drinkPotion(id) {
  if (!haveCount(id)) return false;
  take(id, 1); state.potion = { id, battles: POTION_BATTLES }; state.stats.potions++; save();
  return true;
}
const potionEffect = () => (state.potion ? ITEMS[state.potion.id].effect : {});

// ---- Stages (sized for one fighter) ----
const isBoss = stage => stage % 10 === 0;
const chapterOf = stage => Math.ceil(stage / 10);
const chapterName = stage => CHAPTER_NAMES[(chapterOf(stage) - 1) % CHAPTER_NAMES.length];
const stageLabel = stage => `${chapterOf(stage)}-${((stage - 1) % 10) + 1}`;

const ARENA_POWER = 1.35; // arena fighters are tougher than the hunting grounds
const floorOf = stage => ((stage - 1) % 10) + 1;
function stageEnemies(stage) {
  const n = stage - 1;
  const mult = 1 + 0.15 * n + 0.0012 * n * n;
  const mk = (tpl, boss) => ({
    key: tpl.sprite.replace(/^(mon|boss)_/, ''), name: tpl.name, emoji: tpl.emoji, sprite: tpl.sprite, range: tpl.range || 'melee', boss, lvl: stage,
    proj: tpl.range === 'ranged' ? (tpl.proj || 'bolt') : (boss ? 'bolt' : null), bolt: tpl.bolt || (boss ? '#ff5d5d' : null),
    hp: Math.round(520 * mult * ARENA_POWER * (boss ? 3.2 : 1)), atk: Math.round(40 * mult * ARENA_POWER * (boss ? 1.4 : 1)),
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
// One monster for the hunting grounds, sized for a 1v1 fight at its level.
function monsterUnit(areaIdx, monIdx) {
  const [key, lvl] = AREAS[areaIdx].monsters[monIdx];
  const tpl = monsterTemplate(key), boss = tpl.sprite.startsWith('boss_'), n = lvl - 1;
  const mult = 1 + 0.15 * n + 0.0012 * n * n;
  return {
    key, name: tpl.name, emoji: tpl.emoji, sprite: tpl.sprite, range: tpl.range || 'melee', boss, lvl,
    proj: tpl.range === 'ranged' ? (tpl.proj || 'bolt') : (boss ? 'bolt' : null), bolt: tpl.bolt || (boss ? '#ff5d5d' : null),
    hp: Math.round(520 * mult * (boss ? 0.9 : 0.33)), atk: Math.round(40 * mult * (boss ? 2.6 : 1.25)),
    def: Math.round(18 * mult), spd: boss ? 80 : 90,
    skill: boss ? { name: 'Cataclysm', type: 'nuke', power: 2.6 } : { name: 'Frenzy', type: 'nuke', power: 2.0 },
  };
}
// Gold and item drops for a hunting kill: materials of the area's tier, rare gear, the odd gem.
function rollLoot(areaIdx, lvl) {
  const t = Math.min(4, areaIdx), loot = { gold: Math.round(lvl * (3 + Math.random() * 3)), items: {}, gems: 0 };
  if (Math.random() < 0.35) { const id = ['log', 'ore', 'fish', 'herb'][Math.floor(Math.random() * 4)] + t; loot.items[id] = 1 + Math.floor(Math.random() * 2); }
  if (Math.random() < 0.02) { // a rare piece of gear of the area's tier
    const kinds = ['sword', 'bow', 'staff', 'helm', 'armor', 'legs', 'gloves', 'boots', 'kite', 'wshield'];
    loot.items[kinds[Math.floor(Math.random() * kinds.length)] + t] = 1;
  }
  if (Math.random() < 0.08) loot.gems = 1 + Math.floor(areaIdx / 2);
  return loot;
}
const stagePower = stage => stageEnemies(stage).reduce((s, e) => s + (e ? power(e) : 0), 0);
function stageReward(stage) {
  return {
    gold: 120 * stage,
    gems: isBoss(stage) ? 300 : 50,
    scrolls: isBoss(stage) ? 2 : (stage % 5 === 0 ? 1 : 0),
  };
}

// ---- Shop ----
const toolTier = skill => state.upgrades.tools[skill] || 0;
function buyTool(skill) {
  const t = toolTier(skill);
  if (t >= 3 || skillLevel(skill) < TOOL_REQ[t] || state.gold < TOOL_COST[t]) return false;
  state.gold -= TOOL_COST[t]; state.upgrades.tools[skill] = t + 1; save(); return true;
}
function buyBackpack() {
  const t = state.upgrades.backpack;
  if (t >= BACKPACK_COST.length || state.gold < BACKPACK_COST[t]) return false;
  state.gold -= BACKPACK_COST[t]; state.upgrades.backpack++; save(); return true;
}
function buyCourier() {
  if (state.upgrades.courier || state.gold < COURIER_COST) return false;
  state.gold -= COURIER_COST; state.upgrades.courier = true; save(); return true;
}
function buyItem(id, qty) {
  const price = SHOP_STOCK.find(x => x[0] === id)[1] * qty;
  if (state.gold < price) return false;
  state.gold -= price; addItem(id, qty); save(); return true;
}
function buyGems() {
  if (state.gold < GEM_PACK.gold) return false;
  state.gold -= GEM_PACK.gold; state.gems += GEM_PACK.gems; save(); return true;
}

// ---- Quests ----
function questStep(step) {
  if (step.t === 'deliver') return [Math.min(step.n, haveCount(step.id)), step.n];
  if (step.t === 'kill') return [Math.min(step.n, state.stats.mkills[step.id] || 0), step.n];
  if (step.t === 'lvl') return [Math.min(step.n, skillLevel(step.skill)), step.n];
  return [0, 1];
}
const questDone = q => state.quests[q.id] === 'done';
const questUnlocked = q => { const i = QUESTS.indexOf(q); return i === 0 || questDone(QUESTS[i - 1]); };
const questReady = q => !questDone(q) && questUnlocked(q) && q.steps.every(st => { const [c, n] = questStep(st); return c >= n; });
function completeQuest(q) {
  if (!questReady(q)) return false;
  for (const st of q.steps) if (st.t === 'deliver') take(st.id, st.n);
  state.gold += q.r.gold || 0; state.gems += q.r.gems || 0;
  if (q.r.slots) state.bonusSlots = (state.bonusSlots || 0) + q.r.slots;
  for (const [id, n] of Object.entries(q.r.items || {})) addItem(id, n);
  state.quests[q.id] = 'done'; save();
  return true;
}
const questRewardText = r => [r.gold && `🪙 ${r.gold}`, r.gems && `💎 ${r.gems}`, r.slots && `🎒 +${r.slots} slots`,
  ...Object.entries(r.items || {}).map(([id, n]) => `${ITEMS[id].icon} ${ITEMS[id].name}${n > 1 ? ' ×' + n : ''}`)].filter(Boolean).join('  ');

// ---- Idle rewards ----
function idleRates() {
  const s = state.stage;
  return { gold: 30 + s * 10, gemsPerHour: 12 + s }; // gold per minute
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
