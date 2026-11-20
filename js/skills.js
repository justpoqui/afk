// Skilling engine (real-time + offline), XP curve and the task chain.
const MAX_SKILL = 99;
// XP curve: cheap early levels that gather momentum (each level ~7% pricier than the last, so the
// cost doubles every 10 levels). 87 → 97 costs as much as 1 → 87, and 97 → 99 costs as much as 1 → 97.
const XP_BASE = 90, XP_GROWTH = Math.pow(2, 0.1);
const XP_TABLE = (() => {
  const t = [0, 0];
  for (let L = 2; L <= 97; L++) t[L] = Math.round(XP_BASE * XP_GROWTH * (Math.pow(XP_GROWTH, L - 1) - 1) / (XP_GROWTH - 1));
  t[98] = Math.round(t[97] * 1.5);
  t[99] = t[97] * 2;
  return t;
})();
const xpForLevel = L => XP_TABLE[Math.max(1, Math.min(MAX_SKILL, L))];
function levelFromXp(xp) { let L = 1; while (L < MAX_SKILL && xp >= XP_TABLE[L + 1]) L++; return L; }
const skillLevel = id => levelFromXp(state.skills[id].xp);
const totalSkillLevel = () => Object.keys(SKILLS).reduce((s, k) => s + skillLevel(k), 0);
// Gathering: chance to get double items. Crafting: chance to keep the materials.
const bonusChance = id => Math.min(SKILLS[id].type === 'gather' ? 0.25 : 0.2, skillLevel(id) * (SKILLS[id].type === 'gather' ? 0.0025 : 0.002));
const bonusLabel = id => (SKILLS[id].type === 'gather' ? 'Double-item chance' : 'Keep-materials chance');

// Shop tools make actions faster (10% per tier).
const actionDur = act => +(act.dur * (1 - TOOL_SPEED * toolTier(act.skill))).toFixed(2);
// The Bank Courier (shop) empties the inventory into the bank when it fills up, keeping food and
// the materials the current recipe still needs.
function courierCheck(act) {
  if (act.noOutput) return false; // burying frees space, it never needs room
  // Skilling sends everything but the recipe's materials (cooked food too: it's what Cooking makes).
  if (state.upgrades.courier && invRoomFor(act.id, 1) <= 0) { depositAll(false, Object.keys(act.inputs)); return invRoomFor(act.id, 1) > 0; }
  return false;
}
// Crafting only uses materials carried in the inventory (withdraw them from the bank first).
const hasInputs = act => Object.entries(act.inputs).every(([id, n]) => invCount(id) >= n);
// How many crafts of `act` the inventory can be filled for, using inventory + bank stock.
function craftsToFill(act) {
  const ins = Object.entries(act.inputs);
  if (!ins.length) return 0;
  const perCraft = ins.reduce((s, [id, n]) => s + (ITEMS[id].stack ? 0 : n), 0);
  const carried = ins.reduce((s, [id]) => s + (ITEMS[id].stack ? 0 : invCount(id)), 0);
  const bySlots = perCraft ? Math.floor((invFree() + carried) / perCraft) : Infinity;
  const byStock = Math.min(...ins.map(([id, n]) => Math.floor(haveCount(id) / n)));
  return Math.max(0, Math.min(bySlots, byStock));
}
// Withdraw exactly the materials for as many crafts as fit.
function withdrawFor(act) {
  const k = craftsToFill(act);
  for (const [id, n] of Object.entries(act.inputs)) { const need = n * k - invCount(id); if (need > 0) withdraw(id, need); }
  save();
  return k;
}
// Every finished item needs a free inventory slot (cooking can also produce stackable Burnt Food).
// Using up a non-stacking material frees its slot, so a full inventory of materials can still be crafted.
const freesSlot = act => Object.keys(act.inputs).some(id => !ITEMS[id].stack && invCount(id) > 0);
const hasRoom = act => act.noOutput || invRoomFor(act.id, 1) > 0 || freesSlot(act);
const canDo = act => skillLevel(act.skill) >= act.level && hasInputs(act) && hasRoom(act);
// Cooking burns sometimes: 40% at the recipe's level, 1.2% less per level above it, never below 2%.
const burnChance = act => (act.skill === 'cooking' ? Math.max(0.02, 0.4 - (skillLevel('cooking') - act.level) * 0.012) : 0);

function toggleAction(id) {
  if (state.active && state.active.action === id) { state.active = null; save(); return 'stopped'; }
  const act = ACTIONS[id];
  if (skillLevel(act.skill) < act.level) return 'level';
  if (!hasInputs(act)) return 'inputs';
  courierCheck(act);
  if (!hasRoom(act)) return state.upgrades.courier && bankUsed() >= bankSize() ? 'bankfull' : 'full';
  if (afkFull()) state.afkCollected = claimIdle(); // starting a skill with a full AFK clock collects it first
  state.active = { action: id, start: Date.now() };
  save();
  return 'started';
}

function doAction(act, sum) {
  const before = skillLevel(act.skill);
  // Keep-materials luck only when the result fits without using up a material's slot.
  const lucky = Math.random() < bonusChance(act.skill) && (act.noOutput || invRoomFor(act.id, 1) > 0);
  if (!(lucky && SKILLS[act.skill].type === 'craft')) {
    for (const [id, n] of Object.entries(act.inputs)) invRemove(id, n);
  }
  sum.count++;
  if (act.noOutput) { // burying: XP only (a random amount in the item's range)
    const xp = act.item ? buryXp(ITEMS[act.item]) : act.xp;
    state.skills[act.skill].xp += xp;
    state.stats.actions[act.id] = (state.stats.actions[act.id] || 0) + 1;
    sum.xp += xp;
    const now = skillLevel(act.skill);
    if (now > before) sum.levelUp = now;
    return;
  }
  if (Math.random() < burnChance(act)) { // burnt: no XP, the dish becomes Burnt Food
    invAdd('burnt');
    state.stats.burnt++;
    sum.items.burnt = (sum.items.burnt || 0) + 1;
    return;
  }
  const qty = invAdd(act.id, act.qty * (lucky && SKILLS[act.skill].type === 'gather' ? 2 : 1));
  state.skills[act.skill].xp += act.xp;
  state.stats.actions[act.id] = (state.stats.actions[act.id] || 0) + 1; // burnt dishes don't count
  sum.items[act.id] = (sum.items[act.id] || 0) + qty;
  sum.xp += act.xp;
  const after = skillLevel(act.skill);
  if (after > before) sum.levelUp = after;
}

// Resolve every action that finished since the last check (works for offline time too).
function processSkilling(now = Date.now()) {
  const a = state.active;
  if (!a) return null;
  const act = ACTIONS[a.action], dur = actionDur(act) * 1000;
  // Skills share the Idle Rewards AFK clock: no progress past 12h after the last collect.
  const until = Math.min(now, afkLimit());
  const elapsed = until - a.start;
  if (elapsed < dur) return null;
  const n = Math.floor(elapsed / dur);
  const sum = { skill: act.skill, items: {}, xp: 0, count: 0, levelUp: 0, stopped: false, ms: now - a.start };
  for (let i = 0; i < n; i++) {
    if (courierCheck(act)) sum.couriered = true;
    if (!canDo(act)) { sum.stopped = true; sum.full = !hasRoom(act); break; }
    doAction(act, sum);
    // The courier empties the inventory as soon as it fills, keeping the recipe's materials.
    if (state.upgrades.courier && invFull()) { depositAll(false, Object.keys(act.inputs)); sum.couriered = true; }
  }
  if (sum.stopped || !canDo(act)) { state.active = null; sum.stopped = true; sum.full = sum.full || !hasRoom(act); }
  else a.start += n * dur; // keeps partial progress; stays put while the AFK clock is full
  sum.bankFull = sum.full && !!state.upgrades.courier && bankUsed() >= bankSize(); // the courier had nowhere to put new item types
  save();
  return sum;
}
const activeProgress = () => {
  if (!state.active) return 0;
  return Math.min(1, (Date.now() - state.active.start) / (actionDur(ACTIONS[state.active.action]) * 1000));
};

// ---- Tasks ----
function taskProgress(t) {
  const cur = {
    act: () => state.stats.actions[t.id] || 0,
    lvl: () => skillLevel(t.skill),
    total: () => totalSkillLevel(),
    stage: () => state.stage - 1,
    summon: () => state.stats.summons,
    equip: () => state.stats.equips,
    claim: () => state.stats.claims,
    potion: () => state.stats.potions,
    eat: () => state.stats.eaten,
  }[t.t]();
  return [Math.min(cur, t.n), t.n];
}
function taskText(t) {
  switch (t.t) {
    case 'act': return `${ACTIONS[t.id].verb || SKILLS[ACTIONS[t.id].skill].verb} ${t.n} × ${ITEMS[ACTIONS[t.id].item || t.id].name}`;
    case 'lvl': return `Reach ${SKILLS[t.skill].name} level ${t.n}`;
    case 'total': return `Reach a total skill level of ${t.n}`;
    case 'stage': return `Clear campaign stage ${stageLabel(t.n)}`;
    case 'summon': return `Reroll your look ${t.n} times`;
    case 'equip': return `Equip a weapon or armor`;
    case 'claim': return `Collect your idle rewards`;
    case 'potion': return `Drink a potion before battle`;
    case 'eat': return `Heroes eat ${t.n} provisions in battle`;
  }
}
const taskDone = t => { const [c, n] = taskProgress(t); return c >= n; };
const taskClaimed = t => state.tasksClaimed.includes(t.key);
function currentTierIndex() {
  const i = TASK_TIERS.findIndex((_, ti) => !state.tiersClaimed.includes(ti));
  return i === -1 ? TASK_TIERS.length : i;
}
function grant(r) {
  state.gold += r.gold || 0; state.gems += r.gems || 0; state.scrolls += r.scrolls || 0;
}
function claimTask(t) {
  if (!taskDone(t) || taskClaimed(t)) return false;
  state.tasksClaimed.push(t.key); grant(t.r); save(); return true;
}
function claimTier(ti) {
  const tier = TASK_TIERS[ti];
  if (state.tiersClaimed.includes(ti) || !tier.tasks.every(taskClaimed)) return false;
  state.tiersClaimed.push(ti); grant(tier.reward); save(); return true;
}
function claimableCount() {
  const ti = currentTierIndex();
  if (ti >= TASK_TIERS.length) return 0;
  const tier = TASK_TIERS[ti];
  const n = tier.tasks.filter(t => taskDone(t) && !taskClaimed(t)).length;
  return n + (tier.tasks.every(taskClaimed) ? 1 : 0);
}
const rewardText = r => [r.gold && `🪙 ${r.gold}`, r.gems && `💎 ${r.gems}`, r.scrolls && `📜 ${r.scrolls}`].filter(Boolean).join('  ');
