// Skilling engine (real-time + offline), XP curve and the task chain.
const MAX_SKILL = 99;
const xpForLevel = L => (L <= 1 ? 0 : Math.floor(60 * Math.pow(L - 1, 2.3) + 40 * (L - 1)));
function levelFromXp(xp) { let L = 1; while (L < MAX_SKILL && xp >= xpForLevel(L + 1)) L++; return L; }
const skillLevel = id => levelFromXp(state.skills[id].xp);
const totalSkillLevel = () => Object.keys(SKILLS).reduce((s, k) => s + skillLevel(k), 0);
// Gathering: chance to get double items. Crafting: chance to keep the materials.
const bonusChance = id => Math.min(SKILLS[id].type === 'gather' ? 0.25 : 0.2, skillLevel(id) * (SKILLS[id].type === 'gather' ? 0.0025 : 0.002));
const bonusLabel = id => (SKILLS[id].type === 'gather' ? 'Double-item chance' : 'Keep-materials chance');

const hasInputs = act => Object.entries(act.inputs).every(([id, n]) => itemCount(id) >= n);
const canDo = act => skillLevel(act.skill) >= act.level && hasInputs(act);

function toggleAction(id) {
  if (state.active && state.active.action === id) { state.active = null; save(); return 'stopped'; }
  const act = ACTIONS[id];
  if (skillLevel(act.skill) < act.level) return 'level';
  if (!hasInputs(act)) return 'inputs';
  state.active = { action: id, start: Date.now() };
  save();
  return 'started';
}

function doAction(act, sum) {
  const before = skillLevel(act.skill);
  const lucky = Math.random() < bonusChance(act.skill);
  if (!(lucky && SKILLS[act.skill].type === 'craft')) {
    for (const [id, n] of Object.entries(act.inputs)) removeItem(id, n);
  }
  const qty = act.qty * (lucky && SKILLS[act.skill].type === 'gather' ? 2 : 1);
  addItem(act.id, qty);
  state.skills[act.skill].xp += act.xp;
  state.stats.actions[act.id] = (state.stats.actions[act.id] || 0) + 1;
  sum.items[act.id] = (sum.items[act.id] || 0) + qty;
  sum.xp += act.xp; sum.count++;
  const after = skillLevel(act.skill);
  if (after > before) sum.levelUp = after;
}

// Resolve every action that finished since the last check (works for offline time too).
function processSkilling(now = Date.now()) {
  const a = state.active;
  if (!a) return null;
  const act = ACTIONS[a.action], dur = act.dur * 1000;
  let elapsed = Math.min(now - a.start, IDLE_CAP_MS);
  if (elapsed < dur) return null;
  const n = Math.floor(elapsed / dur);
  const sum = { skill: act.skill, items: {}, xp: 0, count: 0, levelUp: 0, stopped: false, ms: now - a.start };
  for (let i = 0; i < n; i++) {
    if (!canDo(act)) { sum.stopped = true; break; }
    doAction(act, sum);
  }
  if (sum.stopped || !canDo(act)) { state.active = null; sum.stopped = true; }
  else a.start = now - ((now - a.start) % dur);
  save();
  return sum;
}
const activeProgress = () => {
  if (!state.active) return 0;
  return Math.min(1, (Date.now() - state.active.start) / (ACTIONS[state.active.action].dur * 1000));
};

// ---- Tasks ----
function taskProgress(t) {
  const cur = {
    act: () => state.stats.actions[t.id] || 0,
    lvl: () => skillLevel(t.skill),
    total: () => totalSkillLevel(),
    stage: () => state.stage - 1,
    summon: () => state.stats.summons,
    hero: () => Math.max(0, ...state.heroes.map(h => h.level)),
    equip: () => state.stats.equips,
    claim: () => state.stats.claims,
    potion: () => state.stats.potions,
    eat: () => state.stats.eaten,
  }[t.t]();
  return [Math.min(cur, t.n), t.n];
}
function taskText(t) {
  switch (t.t) {
    case 'act': return `${SKILLS[ACTIONS[t.id].skill].verb} ${t.n} × ${ITEMS[t.id].name}`;
    case 'lvl': return `Reach ${SKILLS[t.skill].name} level ${t.n}`;
    case 'total': return `Reach a total skill level of ${t.n}`;
    case 'stage': return `Clear campaign stage ${stageLabel(t.n)}`;
    case 'summon': return `Summon ${t.n} heroes`;
    case 'hero': return `Raise any hero to level ${t.n}`;
    case 'equip': return `Equip gear on a hero`;
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
