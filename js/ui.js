// Pages, navigation, modals and battle flow.
let page = 'camp';
let battle = null;
let autoTimer = null;

const $ = s => document.querySelector(s);
const fmt = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'K' : String(Math.floor(n));
const fmtTime = ms => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 3600)}h ${String(Math.floor(s / 60) % 60).padStart(2, '0')}m ${String(s % 60).padStart(2, '0')}s`; };
const icon = (id, extra = '') => `<span class="ico ${extra}" style="--t:${ITEMS[id].tint}">${ITEMS[id].icon}</span>`;
const skin = () => HERO_BY_ID[state.player.skin];

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.add('hidden'), 2200);
}
function openModal(html) { $('#modal-card').innerHTML = html; $('#modal').classList.remove('hidden'); }
function closeModal() { $('#modal').classList.add('hidden'); }
const modalOpen = () => !$('#modal').classList.contains('hidden');

// ---------------- Chrome: sidebar, top bar, active strip ----------------
const skillNav = type => Object.entries(SKILLS).filter(([, s]) => s.type === type).map(([k, s]) => ['skill:' + k, s.icon, s.name]);
const NAV = [
  ['Adventure', [['camp', '🏕️', 'Camp'], ['character', '🧍', 'Character'], ['wardrobe', '🎲', 'Wardrobe']]],
  ['Combat', skillNav('combat')],
  ['Gathering', skillNav('gather')],
  ['Crafting', skillNav('craft')],
  ['General', [['bank', '🏦', 'Bank'], ['tasks', '📋', 'Tasks']]],
];
const pageTitle = () => {
  for (const [, items] of NAV) for (const [id, ic, name] of items) if (id === page) return `${ic} ${name}`;
  return '';
};

function renderNav() {
  const activeSkill = state.active ? ACTIONS[state.active.action].skill : null;
  const claim = claimableCount();
  $('#nav').innerHTML = NAV.map(([sec, items]) => `
    <div class="nav-sec">${sec}</div>
    ${items.map(([id, ic, name]) => {
      let right = '';
      if (id.startsWith('skill:')) right = `<span class="lvl">${skillLevel(id.slice(6))}<small>/${MAX_SKILL}</small></span>`;
      if (id === 'tasks' && claim) right = `<span class="badge">${claim}</span>`;
      if (id === 'camp') right = `<span class="lvl">${stageLabel(state.stage)}</span>`;
      if (id === 'character') right = `<span class="lvl">⚡${fmt(playerPower())}</span>`;
      if (id === 'wardrobe' && state.scrolls) right = `<span class="lvl">📜${state.scrolls}</span>`;
      if (id === 'bank') right = `<span class="lvl">${Object.keys(state.bank).length}</span>`;
      const running = id === 'skill:' + activeSkill;
      return `<button class="nav-item ${page === id ? 'on' : ''} ${running ? 'running' : ''}" data-page="${id}">
        <span class="ni">${ic}</span><span class="nn">${name}</span>${right}
        ${running ? '<i class="nav-prog"></i>' : ''}</button>`;
    }).join('')}`).join('');
}

function renderTop() {
  $('#r-gold').textContent = fmt(state.gold);
  $('#r-gems').textContent = fmt(state.gems);
  $('#r-scrolls').textContent = fmt(state.scrolls);
  $('#total-level').textContent = `Σ ${totalSkillLevel()}`;
  $('#page-title').textContent = pageTitle();
  const strip = $('#active-strip');
  if (state.active && page !== 'skill:' + ACTIONS[state.active.action].skill) {
    const a = ACTIONS[state.active.action];
    strip.classList.remove('hidden');
    strip.dataset.page = 'skill:' + a.skill;
    strip.innerHTML = `<span>${SKILLS[a.skill].icon} ${a.name}</span><span class="muted">${fmt(itemCount(a.id))} in bank</span><i class="strip-prog"></i>`;
  } else strip.classList.add('hidden');
}

// Called often; updates progress bars without re-rendering.
function tickBars() {
  const p = (activeProgress() * 100) + '%';
  document.querySelectorAll('.act-card.active .prog i, .nav-prog, .strip-prog').forEach(el => { el.style.width = p; });
}

function xpBar(id) {
  const lv = skillLevel(id), xp = state.skills[id].xp, cur = xpForLevel(lv), next = xpForLevel(lv + 1);
  const pct = lv >= MAX_SKILL ? 100 : 100 * (xp - cur) / (next - cur);
  return { lv, xp, next, pct };
}

function lookCard(id, extra = '') {
  const d = HERO_BY_ID[id];
  return `<div class="look r-${d.rarity} ${extra}" style="--c:${FACTIONS[d.faction].color}">
    <div class="look-art">${art(d)}</div>
    <div class="look-info"><b>${d.name}</b>
      <div class="tags"><span class="tag rar">${RARITY[d.rarity].name}</span><span class="tag">${CLASSES[d.cls].name}</span></div>
      <div class="look-bonus">✨ ${skinBonusText(id)}</div>
      <div class="look-skill"><b>${d.skill.name}</b>: ${d.skill.desc}</div></div>
  </div>`;
}

// ---------------- Pages ----------------
const pages = {
  camp() {
    const p = pendingIdle(), r = idleRates();
    const tp = playerPower(), sp = stagePower(state.stage);
    const ratio = tp / sp;
    const diff = ratio > 1.15 ? ['Easy', 'easy'] : ratio > 0.85 ? ['Even', 'even'] : ['Hard', 'hard'];
    const rw = stageReward(state.stage);
    const ti = currentTierIndex();
    const nextTask = ti < TASK_TIERS.length ? TASK_TIERS[ti].tasks.find(t => !taskClaimed(t)) : null;
    const busy = state.active ? SKILLS[ACTIONS[state.active.action].skill] : null;
    return `
      ${nextTask ? `<button class="panel next-task" data-page="tasks">
        <span class="nt-label">📋 Next task</span><span>${taskText(nextTask)}</span>
        <span class="muted">${taskProgress(nextTask).map(fmt).join(' / ')}</span></button>` : ''}
      <section class="panel">
        <div class="chapter">Chapter ${chapterOf(state.stage)} · ${chapterName(state.stage)}</div>
        <img class="camp-banner" src="assets/bg/camp.webp" alt="Your camp" draggable="false">
        <div class="idle-box">
          <div class="idle-title">Idle Rewards <small>${fmtTime(p.ms)} / 12h</small></div>
          <div class="bar-track"><i style="width:${100 * p.ms / IDLE_CAP_MS}%"></i></div>
          <div class="idle-loot">🪙 ${fmt(p.gold)} &nbsp; 💎 ${fmt(p.gems)}</div>
          <div class="idle-rate">${r.gold} 🪙/min · ${r.gemsPerHour} 💎/h</div>
          <button class="btn gold" data-act="claim">Collect</button>
        </div>
      </section>
      <section class="panel stage-box">
        <div class="stage-title">${isBoss(state.stage) ? '👑 Boss ' : ''}Stage ${stageLabel(state.stage)}</div>
        <div class="vs-preview">
          <div class="enemy-preview">${stageEnemies(state.stage).filter(Boolean).map(e => `<span class="${e.boss ? 'big' : ''}">${art(e, 'flip', true)}</span>`).join('')}</div>
          <span class="vs">VS</span>
          <div class="enemy-preview"><span class="big">${art(skin(), '', true)}</span></div>
        </div>
        <div class="power-cmp">
          <div>Enemy power<b>${fmt(sp)}</b></div>
          <div class="diff ${diff[1]}">${diff[0]}</div>
          <div>Your power<b>${fmt(tp)}</b></div>
        </div>
        <div class="prep-line">Training: <b>${SKILLS[state.player.style].icon} ${SKILLS[state.player.style].name}</b> + ❤️ Hitpoints</div>
        ${prepLine()}
        <div class="reward-line">Rewards: 🪙 ${fmt(rw.gold)} 💎 ${rw.gems}${rw.scrolls ? ' 📜 ' + rw.scrolls : ''} + combat XP</div>
        ${busy ? `<p class="warn">⚠️ Fighting stops ${busy.icon} ${busy.name}. You can do one thing at a time.</p>` : ''}
        <button class="btn big" data-act="fight">⚔️ Battle</button>
      </section>
      <div class="footer-links"><button class="link" data-act="reset">Reset save</button></div>`;
  },

  character() {
    const st = playerStats(), d = skin();
    const interval = 120 / st.spd;
    const gearSlot = slot => {
      const it = gearItem(slot);
      return `<button class="gear-slot" data-act="pickgear" data-slot="${slot}">
        ${it ? icon(it.id, 'lg') : `<span class="ico lg empty">${slot === 'weapon' ? '🗡️' : '🛡️'}</span>`}
        <div><b>${it ? it.name : slot === 'weapon' ? 'No weapon' : 'No armor'}</b><small>${it ? describeItem(it.id) : 'Tap to equip'}</small></div></button>`;
    };
    return `
      <section class="panel">
        ${lookCard(d.id, 'big')}
        <button class="btn ghost" data-page="wardrobe">🎲 Change look in the Wardrobe</button>
      </section>
      <section class="panel">
        <div class="panel-title">Combat stats <span class="muted">· Power ${fmt(power(st))}</span></div>
        <div class="stats">
          <div>❤️ Max HP<b>${fmt(st.hp)}</b></div><div>⚔️ Damage<b>${fmt(st.atk)}</b></div>
          <div>🛡️ Defence<b>${fmt(st.def)}</b></div><div>💨 Attacks/s<b>${(1 / interval).toFixed(2)}</b></div>
        </div>
      </section>
      <section class="panel">
        <div class="panel-title">Attack style <span class="muted">· decides which skill your damage trains</span></div>
        <div class="styles">${Object.entries(STYLES).map(([k, label]) => `
          <button class="style-btn ${state.player.style === k ? 'on' : ''}" data-act="style" data-style="${k}">
            <span>${SKILLS[k].icon}</span><b>${label}</b><small>${SKILLS[k].name} XP</small></button>`).join('')}</div>
        <p class="hint">❤️ Hitpoints always gets a third of your combat XP.</p>
        <div class="cskills">${['attack', 'strength', 'defence', 'hitpoints'].map(k => {
          const b = xpBar(k);
          return `<button class="cskill" data-page="skill:${k}"><span>${SKILLS[k].icon}</span>
            <div><div class="cs-top"><b>${SKILLS[k].name}</b><span>${b.lv}</span></div>
            <div class="bar-track sm xp"><i style="width:${b.pct}%"></i></div></div></button>`;
        }).join('')}</div>
      </section>
      <section class="panel">
        <div class="panel-title">Equipment</div>
        <div class="gear">${GEAR_SLOTS.map(gearSlot).join('')}</div>
      </section>
      <section class="panel">
        <div class="panel-title">Battle preparation</div>
        ${prepPanel()}
      </section>`;
  },

  wardrobe() {
    const cost = state.scrolls >= 1 ? '📜 1 scroll' : `💎 ${REROLL_GEMS}`;
    return `
      <section class="panel">
        <div class="panel-title">Your look</div>
        ${lookCard(state.player.skin, 'big')}
      </section>
      <section class="panel summon">
        <div class="portal">🎲</div>
        <h2>Reroll your look</h2>
        <p class="muted">Each look gives its own bonus and special attack, on top of your weapon and armor.</p>
        <p class="muted">Legendary ${RARITY.L.rate * 100}% · Epic ${RARITY.E.rate * 100}% · Rare ${RARITY.R.rate * 100}% · bonus ×${RARITY_BONUS.E} Epic, ×${RARITY_BONUS.L} Legendary</p>
        <p class="pity">Legendary guaranteed within <b>${PITY_LIMIT - state.pity}</b> rerolls</p>
        <button class="btn gold big" data-act="reroll">Reroll<small>${cost}</small></button>
        <p class="hint">After each roll you choose whether to keep the new look or your current one.</p>
      </section>
      <div class="sub">Looks seen ${state.seenSkins.length} / ${HEROES.length}</div>
      <div class="codex">${HEROES.map(d => {
        const seen = state.seenSkins.includes(d.id);
        return `<div class="codex-item r-${d.rarity} ${seen ? '' : 'locked'} ${d.id === state.player.skin ? 'current' : ''}" style="--c:${FACTIONS[d.faction].color}">${art(d)}</div>`;
      }).join('')}</div>`;
  },

  skill(id) {
    const sk = SKILLS[id], b = xpBar(id);
    const head = `
      <section class="panel skill-head">
        <div class="sh-icon">${sk.icon}</div>
        <div class="sh-body">
          <div class="sh-top"><b>${sk.name}</b><span>Level <b>${b.lv}</b> / ${MAX_SKILL}</span></div>
          <div class="bar-track xp"><i style="width:${b.pct}%"></i></div>
          <div class="sh-meta"><span>${fmt(b.xp)} / ${b.lv >= MAX_SKILL ? 'MAX' : fmt(b.next)} XP</span>
            <span>${sk.type === 'combat' ? sk.desc : `${bonusLabel(id)} ${(bonusChance(id) * 100).toFixed(1)}%`}</span></div>
        </div>
      </section>`;
    if (sk.type === 'combat') {
      const st = playerStats();
      const effect = {
        attack: `Hit chance vs. a level-${state.stage} enemy: <b>${Math.round(playerHitChance(b.lv, state.stage) * 100)}%</b> · attack speed +${Math.round(atkSpeedBonus(b.lv) * 100)}%`,
        strength: `Base damage per hit: <b>${fmt(baseAtk(b.lv))}</b> (total with gear and look: ${fmt(st.atk)})`,
        defence: `Base defence: <b>${fmt(baseDef(b.lv))}</b> (total ${fmt(st.def)}) · enemies hit you ${Math.round(enemyHitChance(b.lv, state.stage) * 100)}% of the time`,
        hitpoints: `Base max HP: <b>${fmt(baseHp(b.lv))}</b> (total ${fmt(st.hp)})`,
      }[id];
      return `${head}
        <section class="panel"><p>${effect}</p>
          ${id === 'hitpoints' ? '<p class="muted">Trained automatically by every fight.</p>'
            : state.player.style === id ? `<p class="good">✓ You are training ${sk.name} (${STYLES[id]} style).</p>`
            : `<button class="btn" data-act="style" data-style="${id}">Train ${sk.name} (${STYLES[id]} style)</button>`}
          <button class="btn ghost" data-page="camp">⚔️ Go fight</button></section>`;
    }
    const acts = Object.values(ACTIONS).filter(a => a.skill === id);
    const groups = [...new Set(acts.map(a => a.group))];
    return `${head}
      ${groups.map(g => `${g ? `<div class="sub">${g}</div>` : ''}
        <div class="act-grid">${acts.filter(a => a.group === g).map(actCard).join('')}</div>`).join('')}
      <p class="hint">You can do one thing at a time: one skill action, or fighting. Skills keep going while the game is closed (up to 12h).</p>`;
  },

  bank() {
    const ids = Object.keys(state.bank);
    const value = ids.reduce((s, id) => s + ITEMS[id].sell * state.bank[id], 0);
    if (!ids.length) return `<section class="panel center"><div class="big-emoji">🏦</div><p class="muted">Your bank is empty. Train a gathering skill to collect materials.</p></section>`;
    return `
      <div class="sub">${ids.length} item types · total value 🪙 ${fmt(value)} · tap an item to sell or use it</div>
      ${CATEGORY_ORDER.map(cat => {
        const list = ids.filter(id => ITEMS[id].cat === cat).sort((a, b) => ITEMS[a].tier - ITEMS[b].tier);
        if (!list.length) return '';
        return `<div class="sub">${cat}</div><div class="bank-grid">${list.map(id =>
          `<button class="bank-item" data-item="${id}" style="--t:${ITEMS[id].tint}">${ITEMS[id].icon}<span class="qty">${fmt(state.bank[id])}</span></button>`).join('')}</div>`;
      }).join('')}`;
  },

  tasks() {
    const ti = currentTierIndex();
    const done = TASK_TIERS.slice(0, ti).map(t => `<div class="tier-done">✓ ${t.name}</div>`).join('');
    if (ti >= TASK_TIERS.length) return `${done}<section class="panel center"><div class="big-emoji">👑</div><h2>All tasks complete!</h2><p class="muted">You are a legend of the realms.</p></section>`;
    const tier = TASK_TIERS[ti];
    const claimed = tier.tasks.filter(taskClaimed).length;
    return `
      <section class="panel">
        <div class="tier-head"><div><small class="muted">Tier ${ti + 1} of ${TASK_TIERS.length}</small><h2>${tier.name}</h2></div>
          <div class="tier-count">${claimed}/${tier.tasks.length}</div></div>
        <div class="bar-track"><i style="width:${100 * claimed / tier.tasks.length}%"></i></div>
        <div class="tier-reward">Tier reward: ${rewardText(tier.reward)}
          ${claimed === tier.tasks.length ? `<button class="btn gold" data-act="claimtier" data-tier="${ti}">Claim tier reward & unlock next</button>` : ''}</div>
      </section>
      ${tier.tasks.map(t => {
        const [c, n] = taskProgress(t), isDone = c >= n, isClaimed = taskClaimed(t);
        return `<div class="task ${isClaimed ? 'claimed' : isDone ? 'ready' : ''}">
          <div class="task-main"><div class="task-text">${isClaimed ? '✓ ' : ''}${taskText(t)}</div>
            <div class="bar-track sm"><i style="width:${100 * c / n}%"></i></div>
            <div class="task-meta"><span>${fmt(c)} / ${fmt(n)}</span><span>${rewardText(t.r)}</span></div></div>
          ${isDone && !isClaimed ? `<button class="btn gold sm" data-act="claimtask" data-key="${t.key}">Claim</button>` : ''}
        </div>`;
      }).join('')}
      ${done ? `<div class="sub">Completed tiers</div>${done}` : ''}`;
  },
};

function actCard(a) {
  const lv = skillLevel(a.skill), locked = lv < a.level;
  const active = state.active && state.active.action === a.id;
  const inputs = Object.entries(a.inputs);
  return `<button class="act-card ${locked ? 'locked' : ''} ${active ? 'active' : ''}" data-action="${a.id}">
    <div class="ac-top">${icon(a.id, 'lg')}<div><div class="ac-name">${a.name}</div>
      <div class="ac-meta">⏱ ${a.dur}s · +${a.xp} XP</div></div></div>
    ${inputs.length ? `<div class="ac-inputs">${inputs.map(([id, n]) =>
      `<span class="${itemCount(id) < n ? 'lack' : ''}">${icon(id, 'sm')} ${n}<small>(${fmt(itemCount(id))})</small></span>`).join('')}</div>` : ''}
    ${describeItem(a.id) ? `<div class="ac-desc">${describeItem(a.id)}</div>` : ''}
    <div class="ac-foot"><span>In bank: ${fmt(itemCount(a.id))}</span><span class="ac-btn">${active ? 'Stop' : locked ? `🔒 Level ${a.level}` : SKILLS[a.skill].verb}</span></div>
    <div class="prog"><i></i></div>
  </button>`;
}

function describeItem(id) {
  const it = ITEMS[id];
  if (it.slot === 'weapon') return `Weapon · Damage +${it.atk}`;
  if (it.slot === 'armor') return `Armor · HP +${it.hp}, Defence +${it.def}`;
  if (it.heal) return `Food · heals ${it.heal} HP in battle`;
  if (it.effect) return `Potion · ${it.effectText} for ${POTION_BATTLES} battles`;
  return '';
}

function prepLine() {
  const bits = [];
  if (state.provision) bits.push(`${ITEMS[state.provision].icon} ${fmt(itemCount(state.provision))} food`);
  if (state.potion) bits.push(`🧪 ${ITEMS[state.potion.id].effectText} (${state.potion.battles} left)`);
  return `<div class="prep-line">${bits.length ? bits.join(' · ') : '<span class="muted">No food or potion prepared · set up on the Character page</span>'}</div>`;
}
function prepPanel() {
  const food = state.provision;
  return `<div class="prep">
    <button class="prep-slot" data-act="pickfood">
      ${food ? icon(food, 'lg') : '<span class="ico lg empty">🍽️</span>'}
      <div><b>Food</b><small>${food ? `${ITEMS[food].name} · ${fmt(itemCount(food))} left · heals ${ITEMS[food].heal}` : 'None. Cook food so you heal when low.'}</small></div></button>
    <button class="prep-slot" data-act="pickpotion">
      ${state.potion ? icon(state.potion.id, 'lg') : '<span class="ico lg empty">🧪</span>'}
      <div><b>Potion</b><small>${state.potion ? `${ITEMS[state.potion.id].effectText} · ${state.potion.battles} battles left` : 'None active. Brew potions with Alchemy.'}</small></div></button>
  </div>`;
}

function render() {
  if (page.startsWith('skill:')) $('#screen').innerHTML = pages.skill(page.slice(6));
  else $('#screen').innerHTML = (pages[page] || pages.camp)();
  renderNav();
  renderTop();
  tickBars();
}
function go(p) {
  page = p;
  document.body.classList.remove('nav-open');
  render();
  $('#main').scrollTop = 0; window.scrollTo(0, 0);
}

// ---------------- Modals ----------------
function pickGear(slot) {
  const options = Object.keys(state.bank).filter(id => ITEMS[id].slot === slot).sort((a, b) => ITEMS[b].tier - ITEMS[a].tier);
  const cur = state.player.gear[slot];
  openModal(`
    <button class="close" data-act="close">✕</button>
    <h2>Choose ${slot}</h2>
    <div class="pick-list">
      ${options.map(id => `<button class="pick" data-act="equip" data-item="${id}">${icon(id, 'lg')}
        <div><b>${ITEMS[id].name}</b><small>${describeItem(id)} · ×${itemCount(id)}</small></div></button>`).join('')
        || `<p class="muted">No ${slot === 'weapon' ? 'weapons' : 'armor'} in your bank. Forge some with Smithing!</p>`}
      ${cur ? `<button class="btn ghost" data-act="unequip" data-slot="${slot}">Unequip ${ITEMS[cur].name}</button>` : ''}
      ${options.length ? '' : `<button class="btn" data-act="gosmith">Go to Smithing</button>`}
    </div>`);
}

function pickFood() {
  const opts = Object.keys(state.bank).filter(id => ITEMS[id].heal).sort((a, b) => ITEMS[b].tier - ITEMS[a].tier);
  openModal(`<button class="close" data-act="close">✕</button><h2>Food</h2>
    <p class="muted">Below 45% HP you eat one in battle (4s cooldown).</p>
    <div class="pick-list">${opts.map(id => `<button class="pick ${state.provision === id ? 'on' : ''}" data-act="setfood" data-item="${id}">${icon(id, 'lg')}
      <div><b>${ITEMS[id].name}</b><small>Heals ${ITEMS[id].heal} · ×${itemCount(id)}</small></div></button>`).join('') || '<p class="muted">No food yet. Catch fish, then cook them.</p>'}
    ${state.provision ? `<button class="btn ghost" data-act="setfood" data-item="">Clear food</button>` : ''}</div>`);
}
function pickPotion() {
  const opts = Object.keys(state.bank).filter(id => ITEMS[id].effect).sort((a, b) => ITEMS[b].tier - ITEMS[a].tier);
  openModal(`<button class="close" data-act="close">✕</button><h2>Drink a potion</h2>
    <p class="muted">Lasts ${POTION_BATTLES} battles. Drinking a new one replaces the current potion.</p>
    <div class="pick-list">${opts.map(id => `<button class="pick" data-act="drink" data-item="${id}">${icon(id, 'lg')}
      <div><b>${ITEMS[id].name}</b><small>${ITEMS[id].effectText} · ×${itemCount(id)}</small></div></button>`).join('') || '<p class="muted">No potions yet. Gather herbs, then brew with Alchemy.</p>'}</div>`);
}

function showItem(id) {
  const it = ITEMS[id], n = itemCount(id);
  if (!n) { closeModal(); return; }
  const recipe = ACTIONS[id];
  openModal(`<button class="close" data-act="close">✕</button>
    <div class="item-head">${icon(id, 'xl')}<div><h2>${it.name}</h2><small class="muted">${it.cat} · Tier ${it.tier + 1}</small></div></div>
    ${describeItem(id) ? `<p>${describeItem(id)}</p>` : ''}
    <p class="muted">Owned <b>${fmt(n)}</b> · sells for 🪙 ${it.sell} each · made with ${SKILLS[recipe.skill].icon} ${SKILLS[recipe.skill].name}</p>
    ${it.heal ? `<button class="btn" data-act="setfood" data-item="${id}">Use as battle food</button>` : ''}
    ${it.effect ? `<button class="btn" data-act="drink" data-item="${id}">Drink now (${POTION_BATTLES} battles)</button>` : ''}
    ${it.slot ? `<button class="btn" data-act="equip" data-item="${id}">Equip${state.player.gear[it.slot] ? ` (replaces ${ITEMS[state.player.gear[it.slot]].name})` : ''}</button>` : ''}
    <div class="row-btns"><button class="btn ghost" data-act="sell" data-item="${id}" data-n="1">Sell 1</button>
      <button class="btn ghost" data-act="sell" data-item="${id}" data-n="${n}">Sell all (🪙 ${fmt(it.sell * n)})</button></div>`);
}

function showReroll() {
  const id = state.pendingSkin;
  if (!id) return;
  openModal(`<h2 class="center">New look!</h2>
    <div class="reroll-new">${lookCard(id, 'big reveal')}</div>
    <div class="sub">Your current look</div>
    ${lookCard(state.player.skin, 'small')}
    <div class="row-btns"><button class="btn ghost" data-act="keepold">Keep current</button>
      <button class="btn gold" data-act="keepnew">Use new look</button></div>`);
}

// ---------------- Skilling loop ----------------
function onSkillTick(sum, offline) {
  if (!sum) return;
  if (offline && sum.count) {
    openModal(`<h2>Welcome back!</h2><p class="muted">While you were away (${fmtTime(sum.ms)}), your ${SKILLS[sum.skill].name} kept going:</p>
      <div class="loot">${Object.entries(sum.items).map(([id, n]) => `<span>${icon(id)} +${fmt(n)} ${ITEMS[id].name}</span>`).join('')}
      <span>${SKILLS[sum.skill].icon} +${fmt(sum.xp)} XP${sum.levelUp ? ` · now level ${sum.levelUp}!` : ''}</span></div>
      ${sum.stopped ? '<p class="muted">It stopped when you ran out of materials.</p>' : ''}
      <button class="btn" data-act="close">Nice</button>`);
  } else if (sum.levelUp) toast(`${SKILLS[sum.skill].icon} ${SKILLS[sum.skill].name} level ${sum.levelUp}!`);
  else if (sum.stopped) toast('Out of materials. Action stopped.');
  if (!offline) {
    const bank = page === 'bank' || page === 'skill:' + sum.skill || page === 'tasks';
    if (bank) render(); else { renderNav(); renderTop(); }
  }
}

// ---------------- Battle ----------------
const autoOn = () => localGet('auto') === '1';
function renderAutoBtn() { $('#btn-auto').classList.toggle('on', autoOn()); }

function startBattle() {
  clearTimeout(autoTimer);
  // One activity at a time: fighting stops any running skill.
  if (state.active) {
    const sk = SKILLS[ACTIONS[state.active.action].skill];
    processSkilling();
    state.active = null; save();
    toast(`Stopped ${sk.icon} ${sk.name} to fight`);
  }
  closeModal();
  const stage = state.stage;
  $('#battle-title').textContent = `${isBoss(stage) ? '👑 ' : ''}Stage ${stageLabel(stage)}`;
  $('#battle-info').innerHTML = prepLine();
  $('#battle').style.setProperty('--bg', `url(${battleBg(stage)})`);
  $('#battle').classList.remove('hidden');
  const b = new Battle(playerBattleUnit(), stageEnemies(stage), win => { if (battle === b) endBattle(b, win, stage); });
  battle = b;
  battle.speed = Number(localGet('speed') || 1);
  $('#btn-speed').textContent = battle.speed + 'x';
  renderAutoBtn();
  battle.mount();
  let last = performance.now();
  const loop = now => {
    if (!battle || battle.over) return;
    let dt = Math.min(0.1, (now - last) / 1000) * battle.speed;
    last = now;
    while (dt > 0) { const s = Math.min(dt, 0.05); battle.step(s); dt -= s; }
    battle.render();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

function endBattle(b, win, stage) {
  battle = null;
  const xp = grantCombatXp(b.dealt);
  state.stats.kills += b.kills;
  const xpLine = `${SKILLS[xp.style].icon} +${fmt(xp.xp)} ${SKILLS[xp.style].name} XP · ❤️ +${fmt(xp.hpXp)} Hitpoints XP`;
  const ups = xp.ups.map(([k, l]) => `<div class="lvl-up">${SKILLS[k].icon} ${SKILLS[k].name} is now level ${l}!</div>`).join('');
  if (win) {
    const r = stageReward(stage);
    state.gold += r.gold; state.gems += r.gems; state.scrolls += r.scrolls;
    claimIdle(); // bank idle loot at the old rate before the new stage raises it
    state.stage = stage + 1;
    save(); render();
    if (autoOn()) {
      // Auto mode: keep pushing forward without stopping at the results screen.
      toast(`Victory! 🪙${fmt(r.gold)} 💎${r.gems}${r.scrolls ? ' 📜' + r.scrolls : ''} · ${xp.ups.length ? xp.ups.map(([k, l]) => `${SKILLS[k].name} ${l}`).join(', ') : '+' + fmt(xp.xp) + ' XP'}`);
      autoTimer = setTimeout(startBattle, 500);
      return;
    }
    $('#battle').classList.add('hidden');
    openModal(`<div class="result win"><h2>Victory!</h2><div class="big-emoji">🏆</div>
      <p>🪙 ${fmt(r.gold)} &nbsp; 💎 ${r.gems}${r.scrolls ? ' &nbsp; 📜 ' + r.scrolls : ''}</p>
      <p class="xp-line">${xpLine}</p>${ups}
      <div class="row-btns"><button class="btn ghost" data-act="close">Camp</button><button class="btn gold" data-act="fightnow">Next stage ⚔️</button></div></div>`);
  } else {
    $('#battle').classList.add('hidden');
    save(); render();
    openModal(`<div class="result lose"><h2>Defeat</h2><div class="big-emoji">💀</div>
      <p class="xp-line">${xpLine}</p>${ups}
      <p class="muted">Tips: train Strength, Defence and Hitpoints, forge a better weapon and armor, cook food, brew potions, or reroll your look for a stronger bonus.</p>
      <div class="row-btns"><button class="btn ghost" data-act="gochar">Character</button><button class="btn" data-act="fightnow">Retry</button></div></div>`);
  }
}

function localGet(k) { try { return localStorage.getItem('idle-realms-' + k); } catch (e) { return null; } }
function localSet(k, v) { try { localStorage.setItem('idle-realms-' + k, v); } catch (e) { /* ignore */ } }

// ---------------- Events ----------------
document.addEventListener('click', e => {
  const t = e.target;
  if (t.closest('#menu-btn')) { document.body.classList.toggle('nav-open'); return; }
  if (t.id === 'scrim') { document.body.classList.remove('nav-open'); return; }
  const nav = t.closest('[data-page]');
  if (nav && !t.closest('#modal')) { go(nav.dataset.page); return; }

  const actCardEl = t.closest('[data-action]');
  if (actCardEl) {
    const r = toggleAction(actCardEl.dataset.action);
    if (r === 'level') toast(`Requires level ${ACTIONS[actCardEl.dataset.action].level}`);
    if (r === 'inputs') toast('Not enough materials');
    render(); return;
  }
  const bi = t.closest('[data-item]:not([data-act])');
  if (bi) { showItem(bi.dataset.item); return; }

  const act = t.closest('[data-act]');
  if (act) {
    const d = act.dataset;
    switch (d.act) {
      case 'claim': { const p = claimIdle(); toast(`Collected 🪙${fmt(p.gold)} 💎${p.gems}`); render(); break; }
      case 'fight': case 'fightnow': startBattle(); break;
      case 'gochar': closeModal(); go('character'); break;
      case 'gosmith': closeModal(); go('skill:smithing'); break;
      case 'close': closeModal(); break;
      case 'style': state.player.style = d.style; save(); render(); toast(`Now training ${SKILLS[d.style].icon} ${SKILLS[d.style].name}`); break;
      case 'pickgear': pickGear(d.slot); break;
      case 'equip': equipGear(d.item); closeModal(); render(); toast(`Equipped ${ITEMS[d.item].name}`); break;
      case 'unequip': unequipGear(d.slot); closeModal(); render(); break;
      case 'pickfood': pickFood(); break;
      case 'pickpotion': pickPotion(); break;
      case 'setfood': state.provision = d.item || null; save(); closeModal(); render(); toast(d.item ? `${ITEMS[d.item].name} set as battle food` : 'Food cleared'); break;
      case 'drink': if (drinkPotion(d.item)) { closeModal(); render(); toast(`🧪 ${ITEMS[d.item].effectText} for ${POTION_BATTLES} battles`); } break;
      case 'sell': { const g = sellItem(d.item, Number(d.n)); toast(`Sold for 🪙 ${fmt(g)}`); render(); showItem(d.item); break; }
      case 'reroll': if (rerollSkin()) { render(); showReroll(); } else toast(`Need a 📜 scroll or 💎 ${REROLL_GEMS}`); break;
      case 'keepnew': resolveReroll(true); closeModal(); render(); toast(`New look: ${skin().name}`); break;
      case 'keepold': resolveReroll(false); closeModal(); render(); break;
      case 'claimtask': { const task = TASK_TIERS.flatMap(x => x.tasks).find(x => x.key === d.key); if (claimTask(task)) toast('Reward: ' + rewardText(task.r)); render(); break; }
      case 'claimtier': { const ti = Number(d.tier); if (claimTier(ti)) toast(`Tier complete! ${rewardText(TASK_TIERS[ti].reward)}`); render(); break; }
      case 'reset': if (confirm('Delete your save and start over?')) { resetSave(); go('camp'); } break;
    }
    return;
  }
  if (t.id === 'modal' && !state.pendingSkin) closeModal();
});

$('#btn-speed').addEventListener('click', () => {
  if (!battle) return;
  battle.speed = battle.speed >= 3 ? 1 : battle.speed + 1;
  localSet('speed', battle.speed);
  $('#btn-speed').textContent = battle.speed + 'x';
});
$('#btn-skip').addEventListener('click', () => { if (battle && !battle.over) battle.skip(); });
$('#btn-auto').addEventListener('click', () => {
  localSet('auto', autoOn() ? '0' : '1');
  renderAutoBtn();
  toast(autoOn() ? 'Auto: keeps fighting the next stage after each win' : 'Auto off');
});
$('#btn-retreat').addEventListener('click', () => {
  // Leave the fight: stop auto and go back to camp (no rewards, XP still counts).
  localSet('auto', '0');
  clearTimeout(autoTimer);
  if (battle && !battle.over) { battle.over = true; const b = battle; battle = null; grantCombatXp(b.dealt); save(); }
  battle = null;
  $('#battle').classList.add('hidden');
  render();
});

// ---------------- Boot ----------------
load();
const offline = processSkilling();
render();
onSkillTick(offline, true);
if (state.pendingSkin) showReroll();
setInterval(() => { onSkillTick(processSkilling(), false); tickBars(); }, 100);
setInterval(() => {
  if (page === 'camp' && !modalOpen() && !battle) render(); else renderTop();
}, 1000);

// Android back button: close whatever is open first; return false to let the app exit.
window.handleBack = function () {
  if (battle || !$('#battle').classList.contains('hidden')) { $('#btn-retreat').click(); return true; }
  if (modalOpen()) { if (!state.pendingSkin) closeModal(); return true; }
  if (document.body.classList.contains('nav-open')) { document.body.classList.remove('nav-open'); return true; }
  if (page !== 'camp') { go('camp'); return true; }
  return false;
};
