// Save state, the player character, stages, idle economy and skin rerolls.
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
    player: { skin: 'tobin', style: 'strength', ctype: 'melee', gear: emptyGear(), blessings: [], spell: 'auto' },
    looks: { tobin: 0 }, // owned looks -> duplicate stars
    upgrades: { tools: {}, backpack: 0, courier: false, bankSlots: 0 }, bonusSlots: 0, quests: {},
    bank: {}, inv: [], skills: Object.fromEntries(Object.keys(SKILLS).map(k => [k, { xp: k === 'hitpoints' ? xpForLevel(START_HP_LEVEL) : 0 }])),
    active: null, provision: null, potion: null, tasksClaimed: [], tiersClaimed: [],
    stats: { actions: {}, summons: 0, claims: 0, equips: 0, potions: 0, eaten: 0, kills: 0, burnt: 0, mkills: {} },
  };
}

// Saves are signed, backed up and validated by js/security.js.
function save() { writeSave(state); }
function load() {
  const saved = readSave();
  if (saved) {
    try {
      applySaved(saved);
      if (security.source === 'legacy') { save(); store.del(LEGACY_SAVE); } // upgrade old unprotected saves once
      return;
    } catch (e) { security.problem = "Your save couldn't be read, so a new game was started."; }
  }
  state = newState();
}
// Builds the game state from a loaded (already key-cleaned) save: migrations, then strict validation.
function applySaved(saved) {
  state = Object.assign(newState(), saved);
  if (!state.player || typeof state.player !== 'object') state.player = newState().player;
  state.skills = Object.assign(newState().skills, saved.skills || {});
  // Smithing was merged into Metalworking: carry its XP and tool over.
  if (state.skills.smithing && state.skills.metalworking) { state.skills.metalworking.xp += state.skills.smithing.xp; delete state.skills.smithing; }
  state.stats = Object.assign(newState().stats, saved.stats || {});
  if (!saved.player) migrateTeamSave(saved);
  if (!Array.isArray(state.inv)) state.inv = [];
  state.upgrades = Object.assign(newState().upgrades, saved.upgrades || {});
  const tl = state.upgrades.tools || (state.upgrades.tools = {});
  if (tl.smithing) { tl.metalworking = Math.max(tl.metalworking || 0, tl.smithing); delete tl.smithing; }
  if (!saved.looks) { // older saves: every look seen through rerolls is now owned
    state.looks = {};
    for (const id of [...(saved.seenSkins || []), state.player.skin]) if (HERO_BY_ID[id]) state.looks[id] = 0;
  }
  delete state.seenSkins; delete state.pendingSkin; delete state.pity;
  if (!state.player.ctype) state.player.ctype = CLASS_TYPE[(HERO_BY_ID[state.player.skin] || HERO_BY_ID.tobin).cls];
  const g = state.player.gear || {};
  if (g.armor && !g.chest) g.chest = g.armor; // the old 'armor' slot is now 'chest'
  delete g.armor;
  state.player.gear = Object.assign(emptyGear(), g);
  validateState(state);
  security.clockReset = clockGuard(state);
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
// Gear needs a level to use (Attack for weapons, Defence for armor/shields); until then it gives no stats.
const meetsReq = it => !it.req || skillLevel(it.req.skill) >= it.req.level;
// A weapon made for another fighting style (blade / bow / staff) only gives half its damage.
const weaponMatches = it => !it.wtype || it.wtype === state.player.ctype;
// Daggers swing faster, long and 2H swords slower (only when the weapon fits your fighting style).
const weaponSpeed = () => { const w = gearItem('weapon'); return w && w.spd && weaponMatches(w) && meetsReq(w) ? w.spd : 0; };
function gearTotals() {
  const t = { hp: 0, atk: 0, def: 0 };
  for (const slot of GEAR_SLOTS) {
    const it = gearItem(slot);
    if (!it || !meetsReq(it)) continue;
    t.hp += it.hp || 0; t.def += it.def || 0;
    // Ranger armor and mage robes only add damage when you fight in their style.
    if (it.atype && it.atype !== state.player.ctype) continue;
    t.atk += (it.atk || 0) * (slot === 'weapon' && !weaponMatches(it) ? 0.5 : 1);
  }
  return t;
}
// Active Grace blessings, combined: the strongest blessing of each kind counts.
const activeBlessings = () => (state.player.blessings || []).map(id => BLESSING_BY_ID[id]).filter(b => b && skillLevel('grace') >= b.lvl);
function blessingFx() {
  const best = {};
  for (const b of activeBlessings()) for (const [k, v] of Object.entries(b.fx)) best[k] = Math.max(best[k] || 0, v);
  return best;
}
function toggleBlessing(id) {
  const b = BLESSING_BY_ID[id], list = state.player.blessings || (state.player.blessings = []);
  if (!b || skillLevel('grace') < b.lvl) return 'locked';
  const i = list.indexOf(id);
  if (i >= 0) { list.splice(i, 1); save(); return 'off'; }
  if (list.length >= blessingSlots(skillLevel('grace'))) return 'full';
  list.push(id); save(); return 'on';
}
// Which skill powers (and is trained by) your attacks: Archery with a bow, Magic with a staff,
// otherwise the melee attack style you picked (Attack, Strength or Defence).
const rangedStyle = () => state.player.ctype !== 'melee' && !!gearItem('weapon');
const fightSkill = () => (rangedStyle() ? state.player.ctype : state.player.style);

// ---- Spells: Magic picks the chosen spell (or the best one you can cast) and uses its glyphs ----
const knowsSpell = sp => skillLevel('magic') >= sp.lvl;
const canCast = sp => Object.entries(sp.glyphs).every(([id, n]) => invCount(id) >= n);
// Spells to try each cast, best first: just the chosen one, or (auto) every spell you know.
function spellQueue() {
  const pick = SPELL_BY_ID[state.player.spell];
  if (pick && knowsSpell(pick)) return [pick];
  return SPELLS.filter(knowsSpell).reverse();
}
const currentSpell = () => spellQueue().find(canCast) || null;

function playerStats(withPotion = false) {
  const h = skillLevel('hitpoints'), d = skillLevel('defence');
  // Archery / Magic replace Attack (hit chance, speed) and Strength (damage) when you fight with a bow or staff.
  const ranged = rangedStyle(), ct = state.player.ctype;
  const a = ranged ? skillLevel(ct) : skillLevel('attack'), s = ranged ? skillLevel(ct) : skillLevel('strength');
  const sk = skinBonus(state.player.skin), g = gearTotals();
  const pe = withPotion ? potionEffect() : {}, bl = blessingFx();
  const st = {
    hp: (baseHp(h) + g.hp) * (1 + (sk.hp || 0)) * (1 + (pe.hp || 0)) * (1 + (bl.hp || 0)),
    atk: (baseAtk(s) + g.atk) * (1 + (sk.dmg || 0)) * (1 + (pe.atk || 0)) * (1 + (bl.atk || 0)),
    def: (baseDef(d) + g.def) * (1 + (sk.def || 0)) * (1 + (pe.def || 0)) * (1 + (bl.def || 0)),
    spd: 100 * (1 + atkSpeedBonus(a)) * (1 + (sk.spd || 0)) * (1 + (pe.spd || 0)) * (1 + weaponSpeed()) * (1 + (bl.spd || 0)),
    accLvl: a, defLvl: d, regen: (sk.regen || 0) + (bl.regen || 0), ult: (sk.ult || 0) + (bl.ult || 0), energyMult: 1,
    accBonus: bl.acc || 0, ward: bl.ward || 0,
  };
  // A spell adds damage on top of the staff, scaled by the same bonuses as your other damage.
  const sp = ranged && ct === 'magic' ? currentSpell() : null;
  st.spellMult = (1 + (sk.dmg || 0)) * (1 + (pe.atk || 0)) * (1 + (bl.atk || 0));
  st.spellAtk = sp ? spellAtk(sp) * st.spellMult : 0;
  if (ct === 'melee') st.atk *= 1.1;
  if (ct === 'archery') st.spd *= 1.15;
  if (ct === 'magic') st.energyMult = 1.3;
  for (const k of ['hp', 'atk', 'def', 'spellAtk']) st[k] = Math.round(st[k]);
  return st;
}
// Your best offence (Attack + Strength, or twice Archery or Magic) plus Defence and Hitpoints.
const combatLevel = () => Math.floor((Math.max(skillLevel('attack') + skillLevel('strength'), 2 * skillLevel('archery'), 2 * skillLevel('magic'))
  + skillLevel('defence') + skillLevel('hitpoints')) / 4);
const power = st => Math.round(st.hp * 0.1 + (st.atk + (st.spellAtk || 0)) * 3 + st.def * 2);
const playerPower = () => power(playerStats());

function playerBattleUnit() {
  const d = HERO_BY_ID[state.player.skin], st = playerStats(true);
  const ct = state.player.ctype;
  // No weapon equipped: you fight up close with your fists and feet, whatever your style.
  const unarmed = !gearItem('weapon');
  const grace = Math.min(0.6, skillLevel('grace') * GRACE_PER_LEVEL + st.ward); // Grace: less damage taken
  const special = STYLE_SPECIALS[unarmed ? 'unarmed' : ct];
  const magic = !unarmed && ct === 'magic', sp = magic ? currentSpell() : null;
  return { ...st, lvl: combatLevel(), name: 'You', spells: magic ? spellQueue() : null, emoji: d.emoji, sprite: d.sprite, range: ct === 'melee' || unarmed ? 'melee' : 'ranged', cls: d.cls,
    skill: { ...special, power: special.power * (1 + st.ult) }, color: FACTIONS[d.faction].color, unarmed, grace,
    held: GEAR_SLOTS.filter(s => s === 'weapon' || s === 'shield').map(s => gearItem(s)).filter(Boolean),
    proj: unarmed ? null : ct === 'archery' ? 'arrow' : ct === 'magic' ? 'bolt' : null, bolt: sp ? sp.color : d.bolt || (ct === 'magic' ? '#9f7aff' : boltColor(d)) };
}

// ---- Combat XP: damage dealt trains the chosen style; Hitpoints always gets a third ----
const COMBAT_XP_PER_DMG = 0.6;
const STYLES = { attack: 'Accurate', strength: 'Aggressive', defence: 'Defensive' };
function grantCombatXp(dmg) {
  const style = fightSkill(), xp = Math.round(dmg * COMBAT_XP_PER_DMG * SKILL_XP_MULT);
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
// Stackable items share a slot up to their maxStack (e.g. bones: 10), then start a new slot.
function invRoomFor(id, qty = 1) {
  const it = ITEMS[id];
  if (!it) return 0;
  if (!it.stack) return Math.max(0, Math.min(qty, invFree()));
  const cap = it.maxStack || Infinity;
  if (cap === Infinity) return state.inv.some(x => x.id === id) || invFree() > 0 ? qty : 0;
  let room = invFree() * cap;
  for (const x of state.inv) if (x.id === id) room += Math.max(0, cap - x.n);
  return Math.max(0, Math.min(qty, room));
}
function invAdd(id, qty = 1) {
  const room = invRoomFor(id, qty);
  if (!room) return 0;
  if (ITEMS[id].stack) {
    const cap = ITEMS[id].maxStack || Infinity;
    let left = room;
    for (const x of state.inv) if (x.id === id && x.n < cap && left > 0) { const k = Math.min(cap - x.n, left); x.n += k; left -= k; }
    while (left > 0) { const k = Math.min(cap, left); state.inv.push({ id, n: k }); left -= k; }
  } else for (let i = 0; i < room; i++) state.inv.push({ id, n: 1 });
  return room;
}
// Bury (or scatter) one item of remains from the inventory for Grace XP.
function buryOne(id) {
  const it = ITEMS[id];
  if (!it || !it.bury || !invCount(id)) return null;
  const before = skillLevel('grace'), xp = buryXp(it);
  invRemove(id, 1);
  state.skills.grace.xp += xp;
  state.stats.actions['bury_' + id] = (state.stats.actions['bury_' + id] || 0) + 1;
  save();
  return { xp, levelUp: skillLevel('grace') > before ? skillLevel('grace') : 0 };
}
// Remains left by defeated enemies go to the inventory; returns { id: added } and how many were lost.
function collectRemains(units) {
  const got = {}; let lost = 0;
  for (const u of units) {
    if (u.side !== 'enemy' || u.hp > 0 || !u.key) continue;
    const id = remainsOf(u.key, u.boss);
    const k = invAdd(id) || (state.upgrades.courier && (depositAll(true), invAdd(id))) || 0;
    if (k) got[id] = (got[id] || 0) + 1; else lost++;
  }
  return { got, lost };
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
function deposit(id, n = Infinity) {
  if (!bankHasRoom(id)) return 0;
  const k = invRemove(id, Math.min(n, invCount(id))); addItem(id, k); save(); return k;
}
// Deposits everything that fits; items whose type has no free bank slot stay in the inventory.
function depositAll(keepFood = false, keepIds = []) {
  const keep = [];
  for (const x of state.inv) {
    if ((keepFood && ITEMS[x.id].heal) || keepIds.includes(x.id) || !bankHasRoom(x.id)) keep.push(x);
    else addItem(x.id, x.n);
  }
  const skipped = keep.filter(x => !(keepFood && ITEMS[x.id].heal) && !keepIds.includes(x.id)).length;
  state.inv = keep; save();
  return skipped;
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

// ---- Bank: BASE_BANK slots (+ bought), one per item type; items stack inside a slot ----
const bankSize = () => BASE_BANK + (state.upgrades.bankSlots || 0);
const bankUsed = () => Object.keys(state.bank).length;
const bankHasRoom = id => id in state.bank || bankUsed() < bankSize();
function buyBankSlot() {
  const cost = bankSlotCost(state.upgrades.bankSlots || 0);
  if (state.gold < cost) return false;
  state.gold -= cost; state.upgrades.bankSlots = (state.upgrades.bankSlots || 0) + 1; save(); return true;
}

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
  if (!slot || !haveCount(itemId)) return false;
  if (!meetsReq(ITEMS[itemId])) return 'req';
  const old = state.player.gear[slot];
  take(itemId, 1); state.player.gear[slot] = itemId; state.stats.equips++;
  const stash = id => { if (id && !invAdd(id)) addItem(id); }; // to the inventory, or the bank if it's full
  stash(old);
  // A two-handed weapon needs both hands: it takes the shield off, and a shield takes a 2H weapon off.
  if (ITEMS[itemId].twoHanded && state.player.gear.shield) { stash(state.player.gear.shield); state.player.gear.shield = null; }
  if (slot === 'shield' && gearItem('weapon') && gearItem('weapon').twoHanded) { stash(state.player.gear.weapon); state.player.gear.weapon = null; }
  save();
  return true;
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

// Enemy strength by level (n = level - 1). Past level 40 enemies grow faster so the 70-90 gear
// tiers face a matching challenge.
const enemyMult = n => (1 + 0.15 * n + 0.0012 * n * n) * (1 + LATE_ENEMY_GROWTH * Math.max(0, n - 40));
const LATE_ENEMY_GROWTH = 0.012;
const ARENA_POWER = 1.35; // arena fighters are tougher than the hunting grounds
const floorOf = stage => ((stage - 1) % 10) + 1;
function stageEnemies(stage) {
  const n = stage - 1;
  const mult = enemyMult(n);
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
  const mult = enemyMult(n);
  return {
    key, name: tpl.name, emoji: tpl.emoji, sprite: tpl.sprite, range: tpl.range || 'melee', boss, lvl,
    proj: tpl.range === 'ranged' ? (tpl.proj || 'bolt') : (boss ? 'bolt' : null), bolt: tpl.bolt || (boss ? '#ff5d5d' : null),
    hp: Math.round(520 * mult * (boss ? 1.0 : 0.38)), atk: Math.round(40 * mult * (boss ? 3.2 : 1.75)),
    def: Math.round(18 * mult), spd: boss ? 80 : 90,
    skill: boss ? { name: 'Cataclysm', type: 'nuke', power: 2.6 } : { name: 'Frenzy', type: 'nuke', power: 2.0 },
  };
}
// Gold and item drops for a hunting kill: materials of the area's tier, rare gear, the odd gem.
function rollLoot(areaIdx, lvl, key) {
  // Drops come from the highest tier at or below the monster's level.
  const t = Math.max(0, T_LEVEL.filter(l => l <= lvl).length - 1), loot = { gold: Math.round(lvl * (3 + Math.random() * 3)), items: {}, gems: 0 };
  if (Math.random() < 0.35) { const id = ['log', 'ore', 'fish', 'herb'][Math.floor(Math.random() * 4)] + t; loot.items[id] = 1 + Math.floor(Math.random() * 2); }
  if (Math.random() < 0.02) { // a rare piece of gear of the area's tier
    const kinds = ['dagger', 'sword', 'longsword', 'greatsword', 'bow', 'staff', 'helm', 'armor', 'legs', 'gloves', 'boots', 'kite', 'wshield'];
    loot.items[kinds[Math.floor(Math.random() * kinds.length)] + t] = 1;
  }
  if (Math.random() < 0.08) loot.gems = 1 + Math.floor(areaIdx / 2);
  if (key) { const r = remainsOf(key, !!(monsterTemplate(key) || {}).sprite?.startsWith('boss_')); loot.items[r] = (loot.items[r] || 0) + 1; } // every kill leaves remains
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
  if (t >= TOOLS[skill].length || skillLevel(skill) < TOOL_REQ[t] || state.gold < TOOL_COST[t]) return false;
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
  if (state.gold < price || !bankHasRoom(id)) return false;
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
// A quest opens when its skill requirements are met and the quest it follows (if any) is done.
const questReqsMet = q => (q.req || []).every(r => skillLevel(r.skill) >= r.n);
const questUnlocked = q => questReqsMet(q) && (!q.after || questDone(QUESTS.find(x => x.id === q.after)));
const questReady = q => !questDone(q) && questUnlocked(q) && q.steps.every(st => { const [c, n] = questStep(st); return c >= n; });
function completeQuest(q) {
  if (!questReady(q)) return false;
  for (const st of q.steps) if (st.t === 'deliver') take(st.id, st.n);
  state.gold += q.r.gold || 0; state.gems += q.r.gems || 0;
  if (q.r.slots) state.bonusSlots = (state.bonusSlots || 0) + q.r.slots;
  for (const [sk, xp] of Object.entries(q.r.xp || {})) if (state.skills[sk]) state.skills[sk].xp += xp;
  for (const [id, n] of Object.entries(q.r.items || {})) if (!(bankHasRoom(id) && (addItem(id, n), true))) { const k = invAdd(id, n); if (k < n) addItem(id, n - k); }
  state.quests[q.id] = 'done'; save();
  return true;
}
const questRewardText = r => [r.gold && `🪙 ${fmt(r.gold)}`, r.gems && `💎 ${r.gems}`, r.slots && `🎒 +${r.slots} slots`,
  ...Object.entries(r.xp || {}).map(([sk, xp]) => `${SKILLS[sk].icon} ${fmt(xp)} ${SKILLS[sk].name} XP`),
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
