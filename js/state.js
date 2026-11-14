// Save state, progression formulas and economy.
const SAVE_KEY = 'idle-realms-save-v1';
const IDLE_CAP_MS = 12 * 3600 * 1000;
const TEAM_SIZE = 5; // slots 0-1 front row, 2-4 back row

let state;

function newState() {
  const s = {
    gold: 600, exp: 400, gems: 600, scrolls: 10,
    stage: 1, lastClaim: Date.now(), pity: 0, nextUid: 1,
    heroes: [], team: [null, null, null, null, null],
    bank: {}, skills: Object.fromEntries(Object.keys(SKILLS).map(k => [k, { xp: 0 }])),
    active: null, provision: null, potion: null, tasksClaimed: [], tiersClaimed: [],
    stats: { actions: {}, summons: 0, claims: 0, equips: 0, potions: 0, eaten: 0 },
  };
  for (const id of ['tobin', 'mira', 'pim']) s.heroes.push({ uid: s.nextUid++, id, level: 1, stars: 0 });
  s.team = [s.heroes[0].uid, null, s.heroes[1].uid, s.heroes[2].uid, null];
  return s;
}

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* storage unavailable */ }
}
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const base = newState(), saved = JSON.parse(raw);
      state = Object.assign(base, saved);
      state.skills = Object.assign(newState().skills, saved.skills || {});
      state.stats = Object.assign(newState().stats, saved.stats || {});
      return;
    }
  } catch (e) { /* ignore corrupt save */ }
  state = newState();
}
function resetSave() { state = newState(); save(); }

// ---- Hero math ----
const maxLevel = stars => 40 + stars * 15;
function levelCost(level) {
  const f = Math.pow(level, 1.5);
  return { gold: Math.floor(30 * f), exp: Math.floor(25 * f) };
}
function heroStats(h) {
  const def = HERO_BY_ID[h.id], c = CLASSES[def.cls];
  const m = RARITY[def.rarity].mult * (1 + 0.1 * (h.level - 1)) * (1 + 0.2 * h.stars);
  const w = h.weapon ? ITEMS[h.weapon] : null, a = h.armor ? ITEMS[h.armor] : null;
  return {
    hp: Math.round(c.hp * m) + (a ? a.hp : 0), atk: Math.round(c.atk * m) + (w ? w.atk : 0),
    def: Math.round(c.def * m) + (a ? a.def : 0), spd: c.spd,
  };
}

// ---- Bank ----
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
function equipItem(uid, itemId) {
  const h = getHero(uid), slot = ITEMS[itemId].slot;
  if (!itemCount(itemId)) return;
  if (h[slot]) addItem(h[slot]);
  removeItem(itemId); h[slot] = itemId; state.stats.equips++; save();
}
function unequip(uid, slot) {
  const h = getHero(uid);
  if (h[slot]) { addItem(h[slot]); h[slot] = null; save(); }
}
function drinkPotion(id) {
  if (!itemCount(id)) return false;
  removeItem(id); state.potion = { id, battles: POTION_BATTLES }; state.stats.potions++; save();
  return true;
}
const potionEffect = () => (state.potion ? ITEMS[state.potion.id].effect : {});
const power = st => Math.round(st.hp * 0.1 + st.atk * 3 + st.def * 2);
const heroPower = h => power(heroStats(h));
const getHero = uid => state.heroes.find(h => h.uid === uid);
const teamHeroes = () => state.team.map(u => (u == null ? null : getHero(u)));
const teamPower = () => teamHeroes().reduce((s, h) => s + (h ? heroPower(h) : 0), 0);

// ---- Stages ----
const isBoss = stage => stage % 10 === 0;
const chapterOf = stage => Math.ceil(stage / 10);
const chapterName = stage => CHAPTER_NAMES[(chapterOf(stage) - 1) % CHAPTER_NAMES.length];
const stageLabel = stage => `${chapterOf(stage)}-${((stage - 1) % 10) + 1}`;

function stageEnemies(stage) {
  const n = stage - 1;
  const mult = 1 + 0.14 * n + 0.002 * n * n;
  const mk = (tpl, boss) => ({
    name: tpl.name, emoji: tpl.emoji, sprite: tpl.sprite, range: tpl.range || 'melee', boss,
    hp: Math.round(600 * mult * (boss ? 4 : 1)), atk: Math.round(45 * mult * (boss ? 1.6 : 1)),
    def: Math.round(20 * mult), spd: boss ? 80 : 90,
    skill: boss ? { name: 'Cataclysm', type: 'aoe', power: 1.5 } : { name: 'Frenzy', type: 'nuke', power: 2.0 },
  });
  const rng = mulberry(stage * 7919);
  const pick = () => MONSTERS[Math.floor(rng() * MONSTERS.length)];
  if (isBoss(stage)) {
    const boss = BOSSES[(chapterOf(stage) - 1) % BOSSES.length];
    return [mk(pick(), false), mk(boss, true), mk(pick(), false), null, null];
  }
  const count = Math.min(5, 3 + Math.floor(n / 4));
  const slots = [null, null, null, null, null];
  const order = [0, 2, 3, 1, 4];
  for (let i = 0; i < count; i++) slots[order[i]] = mk(pick(), false);
  return slots;
}
const stagePower = stage => stageEnemies(stage).reduce((s, e) => s + (e ? power(e) : 0), 0);
function stageReward(stage) {
  return {
    gold: 100 * stage, exp: 70 * stage,
    gems: isBoss(stage) ? 150 : 30,
    scrolls: isBoss(stage) ? 2 : (stage % 5 === 0 ? 1 : 0),
  };
}

// ---- Idle rewards ----
function idleRates() {
  const s = state.stage;
  return { gold: 30 + s * 10, exp: 25 + s * 8, gemsPerHour: 6 + Math.floor(s / 3) }; // gold/exp per minute
}
function pendingIdle() {
  const ms = Math.min(IDLE_CAP_MS, Math.max(0, Date.now() - state.lastClaim));
  const min = ms / 60000, r = idleRates();
  return {
    ms, gold: Math.floor(r.gold * min), exp: Math.floor(r.exp * min),
    gems: Math.floor(r.gemsPerHour * min / 60),
  };
}
function claimIdle() {
  const p = pendingIdle();
  state.gold += p.gold; state.exp += p.exp; state.gems += p.gems;
  state.lastClaim = Date.now();
  if (p.gold > 0) state.stats.claims++;
  save();
  return p;
}

// ---- Summoning ----
const SUMMON_GEMS = 150, PITY_LIMIT = 30;
function rollRarity() {
  state.pity++;
  if (state.pity >= PITY_LIMIT) { state.pity = 0; return 'L'; }
  const r = Math.random();
  if (r < RARITY.L.rate) { state.pity = 0; return 'L'; }
  if (r < RARITY.L.rate + RARITY.E.rate) return 'E';
  return 'R';
}
function summon(count) {
  if (state.scrolls >= count) state.scrolls -= count;
  else {
    const cost = SUMMON_GEMS * count * (count === 10 ? 0.9 : 1);
    if (state.gems < cost) return null;
    state.gems -= cost;
  }
  const results = [];
  state.stats.summons += count;
  for (let i = 0; i < count; i++) {
    const rar = rollRarity();
    const pool = HEROES.filter(h => h.rarity === rar);
    const def = pool[Math.floor(Math.random() * pool.length)];
    const owned = state.heroes.find(h => h.id === def.id);
    let note = 'NEW';
    if (!owned) state.heroes.push({ uid: state.nextUid++, id: def.id, level: 1, stars: 0 });
    else if (owned.stars < 5) { owned.stars++; note = `★${owned.stars}`; }
    else { const g = { R: 20, E: 60, L: 200 }[rar]; state.gems += g; note = `+${g}💎`; }
    results.push({ def, note });
  }
  save();
  return results;
}

function mulberry(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
