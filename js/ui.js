// Pages, navigation, modals and battle flow.
let page = 'camp';
let battle = null;
let heroFilter = 'all';
let selectedSlot = null;

const $ = s => document.querySelector(s);
const fmt = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'K' : String(Math.floor(n));
const fmtTime = ms => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 3600)}h ${String(Math.floor(s / 60) % 60).padStart(2, '0')}m ${String(s % 60).padStart(2, '0')}s`; };
const stars = n => n ? '★'.repeat(n) : '';
const icon = (id, extra = '') => `<span class="ico ${extra}" style="--t:${ITEMS[id].tint}">${ITEMS[id].icon}</span>`;

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.add('hidden'), 2000);
}
function openModal(html) { $('#modal-card').innerHTML = html; $('#modal').classList.remove('hidden'); }
function closeModal() { $('#modal').classList.add('hidden'); }
const modalOpen = () => !$('#modal').classList.contains('hidden');

// ---------------- Chrome: sidebar, top bar, active strip ----------------
const NAV = [
  ['Combat', [['camp', '🏕️', 'Camp'], ['heroes', '🧝', 'Heroes'], ['team', '🛡️', 'Team'], ['summon', '🔮', 'Summon']]],
  ['Gathering', Object.entries(SKILLS).filter(([, s]) => s.type === 'gather').map(([k, s]) => ['skill:' + k, s.icon, s.name])],
  ['Crafting', Object.entries(SKILLS).filter(([, s]) => s.type === 'craft').map(([k, s]) => ['skill:' + k, s.icon, s.name])],
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
      if (id === 'bank') right = `<span class="lvl">${Object.keys(state.bank).length}</span>`;
      const running = id === 'skill:' + activeSkill;
      return `<button class="nav-item ${page === id ? 'on' : ''} ${running ? 'running' : ''}" data-page="${id}">
        <span class="ni">${ic}</span><span class="nn">${name}</span>${right}
        ${running ? '<i class="nav-prog"></i>' : ''}</button>`;
    }).join('')}`).join('');
}

function renderTop() {
  $('#r-gold').textContent = fmt(state.gold);
  $('#r-exp').textContent = fmt(state.exp);
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

function heroCard(h, extra = '') {
  const d = HERO_BY_ID[h.id];
  return `<div class="hero-card r-${d.rarity} ${extra}" data-uid="${h.uid}" style="--c:${FACTIONS[d.faction].color}">
    <div class="hc-emoji">${d.emoji}</div>
    <div class="hc-lv">Lv ${h.level}</div>
    <div class="hc-stars">${stars(h.stars)}</div>
    <div class="hc-gear">${h.weapon ? ITEMS[h.weapon].icon : ''}${h.armor ? ITEMS[h.armor].icon : ''}</div>
    <div class="hc-name">${d.name.split(' ')[0]}</div>
  </div>`;
}

// ---------------- Pages ----------------
const pages = {
  camp() {
    const p = pendingIdle(), r = idleRates();
    const tp = teamPower(), sp = stagePower(state.stage);
    const ratio = tp / sp;
    const diff = ratio > 1.15 ? ['Easy', 'easy'] : ratio > 0.85 ? ['Even', 'even'] : ['Hard', 'hard'];
    const rw = stageReward(state.stage);
    const ti = currentTierIndex();
    const nextTask = ti < TASK_TIERS.length ? TASK_TIERS[ti].tasks.find(t => !taskClaimed(t)) : null;
    return `
      ${nextTask ? `<button class="panel next-task" data-page="tasks">
        <span class="nt-label">📋 Next task</span><span>${taskText(nextTask)}</span>
        <span class="muted">${taskProgress(nextTask).map(fmt).join(' / ')}</span></button>` : ''}
      <section class="panel">
        <div class="chapter">Chapter ${chapterOf(state.stage)} · ${chapterName(state.stage)}</div>
        <div class="camp-scene"><span>🏕️</span><span class="bob">🔥</span><span>⛺</span></div>
        <div class="idle-box">
          <div class="idle-title">Idle Rewards <small>${fmtTime(p.ms)} / 12h</small></div>
          <div class="bar-track"><i style="width:${100 * p.ms / IDLE_CAP_MS}%"></i></div>
          <div class="idle-loot">🪙 ${fmt(p.gold)} &nbsp; ✨ ${fmt(p.exp)} &nbsp; 💎 ${fmt(p.gems)}</div>
          <div class="idle-rate">${r.gold} 🪙/min · ${r.exp} ✨/min · ${r.gemsPerHour} 💎/h</div>
          <button class="btn gold" data-act="claim">Collect</button>
        </div>
      </section>
      <section class="panel stage-box">
        <div class="stage-title">${isBoss(state.stage) ? '👑 Boss ' : ''}Stage ${stageLabel(state.stage)}</div>
        <div class="enemy-preview">${stageEnemies(state.stage).filter(Boolean).map(e => `<span class="${e.boss ? 'big' : ''}">${e.emoji}</span>`).join('')}</div>
        <div class="power-cmp">
          <div>Your power<b>${fmt(tp)}</b></div>
          <div class="diff ${diff[1]}">${diff[0]}</div>
          <div>Enemy power<b>${fmt(sp)}</b></div>
        </div>
        ${prepLine()}
        <div class="reward-line">Rewards: 🪙 ${fmt(rw.gold)} ✨ ${fmt(rw.exp)} 💎 ${rw.gems}${rw.scrolls ? ' 📜 ' + rw.scrolls : ''}</div>
        <button class="btn big" data-act="fight">⚔️ Battle</button>
      </section>
      <div class="footer-links"><button class="link" data-act="reset">Reset save</button></div>`;
  },

  heroes() {
    const list = state.heroes
      .filter(h => heroFilter === 'all' || HERO_BY_ID[h.id].faction === heroFilter)
      .sort((a, b) => heroPower(b) - heroPower(a));
    return `
      <div class="filters">
        <button class="${heroFilter === 'all' ? 'on' : ''}" data-filter="all">All</button>
        ${Object.entries(FACTIONS).map(([k, f]) => `<button class="${heroFilter === k ? 'on' : ''}" data-filter="${k}" style="--c:${f.color}">${f.name}</button>`).join('')}
      </div>
      <div class="sub">Owned ${state.heroes.length} / ${HEROES.length} · tap a hero to level up and equip gear</div>
      <div class="grid">${list.map(h => heroCard(h)).join('') || '<p class="muted">No heroes in this faction yet.</p>'}</div>`;
  },

  team() {
    const team = teamHeroes();
    const slot = i => {
      const h = team[i], sel = selectedSlot === i ? ' sel' : '';
      return h ? `<div class="slot filled${sel}" data-slot="${i}">${heroCard(h)}</div>`
               : `<div class="slot${sel}" data-slot="${i}"><span>+</span></div>`;
    };
    const inTeam = new Set(state.team.filter(u => u != null));
    const bench = state.heroes.filter(h => !inTeam.has(h.uid)).sort((a, b) => heroPower(b) - heroPower(a));
    return `
      <section class="panel">
        <div class="sub center">Team power <b>${fmt(teamPower())}</b></div>
        <div class="formation">
          <div class="frow-label">Front row: melee heroes hold the line</div>
          <div class="frow">${slot(0)}${slot(1)}</div>
          <div class="frow-label">Back row: ranged heroes &amp; support</div>
          <div class="frow">${slot(2)}${slot(3)}${slot(4)}</div>
        </div>
        <p class="hint">${selectedSlot == null ? 'Tap a slot, then a hero on the bench. Tap a filled slot twice to clear it.' : 'Now pick a hero from the bench (or tap the slot again to clear it).'}</p>
        <button class="btn" data-act="autoteam">Auto-fill strongest</button>
      </section>
      <section class="panel">
        <div class="panel-title">Battle preparation</div>
        ${prepPanel()}
      </section>
      <div class="sub">Bench</div>
      <div class="grid bench">${bench.map(h => heroCard(h)).join('') || '<p class="muted">Everyone is deployed!</p>'}</div>`;
  },

  summon() {
    const ten = SUMMON_GEMS * 10 * 0.9;
    return `
      <section class="panel summon">
        <div class="portal">🔮</div>
        <h2>Astral Gate</h2>
        <p class="muted">Legendary ${RARITY.L.rate * 100}% · Epic ${RARITY.E.rate * 100}% · Rare ${RARITY.R.rate * 100}%</p>
        <p class="pity">Legendary guaranteed within <b>${PITY_LIMIT - state.pity}</b> summons</p>
        <div class="summon-btns">
          <button class="btn" data-act="summon1">Summon ×1<small>${state.scrolls >= 1 ? '📜 1' : '💎 ' + SUMMON_GEMS}</small></button>
          <button class="btn gold" data-act="summon10">Summon ×10<small>${state.scrolls >= 10 ? '📜 10' : '💎 ' + ten}</small></button>
        </div>
        <p class="hint">Duplicates raise a hero's stars (+20% stats, +15 level cap each, up to ★5).</p>
      </section>
      <div class="sub">Hero Codex</div>
      <div class="codex">${HEROES.map(d => {
        const owned = state.heroes.some(h => h.id === d.id);
        return `<div class="codex-item r-${d.rarity} ${owned ? '' : 'locked'}" style="--c:${FACTIONS[d.faction].color}">${d.emoji}</div>`;
      }).join('')}</div>`;
  },

  skill(id) {
    const sk = SKILLS[id], lv = skillLevel(id), xp = state.skills[id].xp;
    const cur = xpForLevel(lv), next = xpForLevel(lv + 1);
    const pct = lv >= MAX_SKILL ? 100 : 100 * (xp - cur) / (next - cur);
    const acts = Object.values(ACTIONS).filter(a => a.skill === id);
    const groups = [...new Set(acts.map(a => a.group))];
    return `
      <section class="panel skill-head">
        <div class="sh-icon">${sk.icon}</div>
        <div class="sh-body">
          <div class="sh-top"><b>${sk.name}</b><span>Level <b>${lv}</b> / ${MAX_SKILL}</span></div>
          <div class="bar-track xp"><i style="width:${pct}%"></i></div>
          <div class="sh-meta"><span>${fmt(xp)} / ${lv >= MAX_SKILL ? 'MAX' : fmt(next)} XP</span><span>${bonusLabel(id)} ${(bonusChance(id) * 100).toFixed(1)}%</span></div>
        </div>
      </section>
      ${groups.map(g => `${g ? `<div class="sub">${g}</div>` : ''}
        <div class="act-grid">${acts.filter(a => a.group === g).map(actCard).join('')}</div>`).join('')}
      <p class="hint">Only one skill action runs at a time. It keeps going while the game is closed (up to 12h).</p>`;
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
  if (it.slot === 'weapon') return `Weapon · ATK +${it.atk}`;
  if (it.slot === 'armor') return `Armor · HP +${it.hp}, DEF +${it.def}`;
  if (it.heal) return `Provisions · heals ${it.heal} HP in battle`;
  if (it.effect) return `Potion · ${it.effectText} for ${POTION_BATTLES} battles`;
  return '';
}

function prepLine() {
  const bits = [];
  if (state.provision) bits.push(`${ITEMS[state.provision].icon} ${fmt(itemCount(state.provision))} food`);
  if (state.potion) bits.push(`🧪 ${ITEMS[state.potion.id].effectText} (${state.potion.battles} left)`);
  return `<div class="prep-line">${bits.length ? bits.join(' · ') : '<span class="muted">No food or potion prepared · set up on the Team page</span>'}</div>`;
}
function prepPanel() {
  const food = state.provision;
  return `<div class="prep">
    <button class="prep-slot" data-act="pickfood">
      ${food ? icon(food, 'lg') : '<span class="ico lg empty">🍽️</span>'}
      <div><b>Provisions</b><small>${food ? `${ITEMS[food].name} · ${fmt(itemCount(food))} left · heals ${ITEMS[food].heal}` : 'None. Cook food so heroes heal when low.'}</small></div></button>
    <button class="prep-slot" data-act="pickpotion">
      ${state.potion ? icon(state.potion.id, 'lg') : '<span class="ico lg empty">🧪</span>'}
      <div><b>Potion</b><small>${state.potion ? `${ITEMS[state.potion.id].effectText} · ${state.potion.battles} battles left` : 'None active. Brew potions with Alchemy.'}</small></div></button>
  </div>`;
}

function render() {
  if (page.startsWith('skill:')) $('#screen').innerHTML = pages.skill(page.slice(6));
  else $('#screen').innerHTML = pages[page]();
  renderNav();
  renderTop();
  tickBars();
}
function go(p) {
  page = p; selectedSlot = null;
  document.body.classList.remove('nav-open');
  render();
  $('#main').scrollTop = 0; window.scrollTo(0, 0);
}

// ---------------- Hero detail ----------------
function showHero(uid) {
  const h = getHero(uid), d = HERO_BY_ID[h.id], st = heroStats(h), c = CLASSES[d.cls];
  const cost = levelCost(h.level), cap = maxLevel(h.stars);
  const canLevel = h.level < cap && state.gold >= cost.gold && state.exp >= cost.exp;
  const gearSlot = slot => {
    const it = h[slot] ? ITEMS[h[slot]] : null;
    return `<button class="gear-slot" data-act="pickgear" data-uid="${uid}" data-slot="${slot}">
      ${it ? icon(it.id, 'lg') : `<span class="ico lg empty">${slot === 'weapon' ? '🗡️' : '🛡️'}</span>`}
      <div><b>${it ? it.name : slot === 'weapon' ? 'No weapon' : 'No armor'}</b><small>${it ? describeItem(it.id) : 'Tap to equip'}</small></div></button>`;
  };
  openModal(`
    <button class="close" data-act="close">✕</button>
    <div class="hd-top r-${d.rarity}" style="--c:${FACTIONS[d.faction].color}">
      <div class="hd-emoji">${d.emoji}</div>
      <div>
        <h2>${d.name}</h2>
        <div class="tags"><span class="tag rar">${RARITY[d.rarity].name}</span><span class="tag fac">${FACTIONS[d.faction].name}</span><span class="tag">${c.name}</span></div>
        <div class="hd-stars">${stars(h.stars) || '☆'} <small>Lv ${h.level} / ${cap}</small></div>
      </div>
    </div>
    <div class="stats">
      <div>❤️ HP<b>${fmt(st.hp)}</b></div><div>⚔️ ATK<b>${fmt(st.atk)}</b></div>
      <div>🛡️ DEF<b>${fmt(st.def)}</b></div><div>💨 SPD<b>${st.spd}</b></div>
    </div>
    <div class="power-line">Power <b>${fmt(heroPower(h))}</b></div>
    <div class="gear">${gearSlot('weapon')}${gearSlot('armor')}</div>
    <div class="skill"><b>${d.skill.name}</b> <small>Ultimate</small><p>${d.skill.desc}</p></div>
    ${h.level < cap
      ? `<button class="btn ${canLevel ? 'gold' : 'off'}" data-act="levelup" data-uid="${uid}">Level up · 🪙 ${fmt(cost.gold)} ✨ ${fmt(cost.exp)}</button>
         <button class="btn ghost" data-act="levelmax" data-uid="${uid}">Level up as far as I can</button>`
      : `<p class="hint">Level cap reached. Summon duplicates to gain stars.</p>`}
  `);
}

function pickGear(uid, slot) {
  const h = getHero(uid);
  const options = Object.keys(state.bank).filter(id => ITEMS[id].slot === slot).sort((a, b) => ITEMS[b].tier - ITEMS[a].tier);
  openModal(`
    <button class="close" data-act="hero" data-uid="${uid}">←</button>
    <h2>Choose ${slot}</h2>
    <div class="pick-list">
      ${options.map(id => `<button class="pick" data-act="equip" data-uid="${uid}" data-item="${id}">${icon(id, 'lg')}
        <div><b>${ITEMS[id].name}</b><small>${describeItem(id)} · ×${itemCount(id)}</small></div></button>`).join('')
        || `<p class="muted">No ${slot === 'weapon' ? 'weapons' : 'armor'} in your bank. Forge some with Smithing!</p>`}
      ${h[slot] ? `<button class="btn ghost" data-act="unequip" data-uid="${uid}" data-slot="${slot}">Unequip ${ITEMS[h[slot]].name}</button>` : ''}
      ${options.length ? '' : `<button class="btn" data-act="gosmith">Go to Smithing</button>`}
    </div>`);
}

function pickFood() {
  const opts = Object.keys(state.bank).filter(id => ITEMS[id].heal).sort((a, b) => ITEMS[b].tier - ITEMS[a].tier);
  openModal(`<button class="close" data-act="close">✕</button><h2>Provisions</h2>
    <p class="muted">Heroes below 45% HP eat one in battle (4s cooldown each).</p>
    <div class="pick-list">${opts.map(id => `<button class="pick ${state.provision === id ? 'on' : ''}" data-act="setfood" data-item="${id}">${icon(id, 'lg')}
      <div><b>${ITEMS[id].name}</b><small>Heals ${ITEMS[id].heal} · ×${itemCount(id)}</small></div></button>`).join('') || '<p class="muted">No food yet. Catch fish, then cook them.</p>'}
    ${state.provision ? `<button class="btn ghost" data-act="setfood" data-item="">Clear provisions</button>` : ''}</div>`);
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
    ${it.heal ? `<button class="btn" data-act="setfood" data-item="${id}">Use as battle provisions</button>` : ''}
    ${it.effect ? `<button class="btn" data-act="drink" data-item="${id}">Drink now (${POTION_BATTLES} battles)</button>` : ''}
    ${it.slot ? `<button class="btn" data-act="equipfrombank" data-item="${id}">Equip on a hero…</button>` : ''}
    <div class="row-btns"><button class="btn ghost" data-act="sell" data-item="${id}" data-n="1">Sell 1</button>
      <button class="btn ghost" data-act="sell" data-item="${id}" data-n="${n}">Sell all (🪙 ${fmt(it.sell * n)})</button></div>`);
}
function equipFromBank(id) {
  const slot = ITEMS[id].slot;
  const heroes = [...state.heroes].sort((a, b) => heroPower(b) - heroPower(a));
  openModal(`<button class="close" data-act="close">✕</button><h2>Equip ${ITEMS[id].name}</h2>
    <div class="pick-list">${heroes.map(h => `<button class="pick" data-act="equip" data-uid="${h.uid}" data-item="${id}">
      <span class="ico lg">${HERO_BY_ID[h.id].emoji}</span><div><b>${HERO_BY_ID[h.id].name}</b>
      <small>Lv ${h.level} · current: ${h[slot] ? ITEMS[h[slot]].name : 'none'}</small></div></button>`).join('')}</div>`);
}

function levelUp(uid, many) {
  const h = getHero(uid);
  let n = 0;
  do {
    const cost = levelCost(h.level);
    if (h.level >= maxLevel(h.stars) || state.gold < cost.gold || state.exp < cost.exp) break;
    state.gold -= cost.gold; state.exp -= cost.exp; h.level++; n++;
  } while (many);
  if (!n) toast('Not enough 🪙 gold or ✨ EXP');
  save(); render(); showHero(uid);
}

function autoTeam() {
  const sorted = [...state.heroes].sort((a, b) => heroPower(b) - heroPower(a)).slice(0, TEAM_SIZE);
  const melee = sorted.filter(h => CLASSES[HERO_BY_ID[h.id].cls].range === 'melee');
  const ranged = sorted.filter(h => CLASSES[HERO_BY_ID[h.id].cls].range !== 'melee');
  const front = melee.splice(0, 2);
  const back = [...ranged, ...melee];
  while (front.length < 2 && back.length > 3) front.push(back.pop());
  state.team = [front[0], front[1], back[0], back[1], back[2]].map(h => (h ? h.uid : null));
  save(); render();
}
function tapTeamSlot(i) {
  if (selectedSlot === i) {
    if (state.team[i] != null && state.team.filter(u => u != null).length > 1) state.team[i] = null;
    selectedSlot = null;
  } else if (selectedSlot != null) {
    [state.team[selectedSlot], state.team[i]] = [state.team[i], state.team[selectedSlot]];
    selectedSlot = null;
  } else selectedSlot = i;
  save(); render();
}
function tapBench(uid) {
  let slot = selectedSlot;
  if (slot == null) slot = state.team.findIndex(u => u == null);
  if (slot === -1) { toast('Pick a slot to replace first'); return; }
  state.team[slot] = uid;
  selectedSlot = null;
  save(); render();
}

function doSummon(n) {
  const res = summon(n);
  if (!res) { toast('Not enough 💎 gems'); return; }
  render();
  openModal(`
    <h2 class="center">Summon Results</h2>
    <div class="summon-results">${res.map((r, i) => `
      <div class="sr r-${r.def.rarity}" style="animation-delay:${i * 90}ms;--c:${FACTIONS[r.def.faction].color}">
        <div class="hc-emoji">${r.def.emoji}</div><div class="hc-name">${r.def.name.split(' ')[0]}</div><div class="sr-note">${r.note}</div>
      </div>`).join('')}</div>
    <button class="btn" data-act="close">OK</button>`);
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
function startBattle() {
  if (!teamHeroes().some(Boolean)) { toast('Put a hero in your team first'); return; }
  const stage = state.stage;
  $('#battle-title').textContent = `${isBoss(stage) ? '👑 ' : ''}Stage ${stageLabel(stage)}`;
  $('#battle-info').innerHTML = prepLine();
  $('#battle').classList.remove('hidden');
  battle = new Battle(teamHeroes(), stageEnemies(stage), win => endBattle(win, stage));
  battle.speed = Number(localGet('speed') || 1);
  $('#btn-speed').textContent = battle.speed + 'x';
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

function endBattle(win, stage) {
  battle = null;
  $('#battle').classList.add('hidden');
  if (win) {
    const r = stageReward(stage);
    state.gold += r.gold; state.exp += r.exp; state.gems += r.gems; state.scrolls += r.scrolls;
    claimIdle(); // bank idle loot at the old rate before the new stage raises it
    state.stage = stage + 1;
    save(); render();
    openModal(`<div class="result win"><h2>Victory!</h2><div class="big-emoji">🏆</div>
      <p>🪙 ${fmt(r.gold)} &nbsp; ✨ ${fmt(r.exp)} &nbsp; 💎 ${r.gems}${r.scrolls ? ' &nbsp; 📜 ' + r.scrolls : ''}</p>
      <p class="muted">Idle rewards now come from Stage ${stageLabel(state.stage)}.</p>
      <div class="row-btns"><button class="btn ghost" data-act="close">Camp</button><button class="btn gold" data-act="fightnow">Next stage ⚔️</button></div></div>`);
  } else {
    save(); render();
    openModal(`<div class="result lose"><h2>Defeat</h2><div class="big-emoji">💀</div>
      <p class="muted">Tips: forge weapons and armor with Smithing, cook food for provisions, brew potions, level up your heroes, and keep tanks in the front row.</p>
      <div class="row-btns"><button class="btn ghost" data-act="goheroes">Heroes</button><button class="btn" data-act="fightnow">Retry</button></div></div>`);
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

  const f = t.closest('[data-filter]');
  if (f) { heroFilter = f.dataset.filter; render(); return; }
  const slot = t.closest('[data-slot]:not([data-act])');
  if (slot) { tapTeamSlot(Number(slot.dataset.slot)); return; }

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
    const d = act.dataset, uid = Number(d.uid);
    switch (d.act) {
      case 'claim': { const p = claimIdle(); toast(`Collected 🪙${fmt(p.gold)} ✨${fmt(p.exp)} 💎${p.gems}`); render(); break; }
      case 'fight': startBattle(); break;
      case 'fightnow': closeModal(); startBattle(); break;
      case 'goheroes': closeModal(); go('heroes'); break;
      case 'gosmith': closeModal(); go('skill:smithing'); break;
      case 'close': closeModal(); break;
      case 'hero': showHero(uid); break;
      case 'levelup': levelUp(uid, false); break;
      case 'levelmax': levelUp(uid, true); break;
      case 'pickgear': pickGear(uid, d.slot); break;
      case 'equip': equipItem(uid, d.item); render(); showHero(uid); break;
      case 'unequip': unequip(uid, d.slot); render(); showHero(uid); break;
      case 'equipfrombank': equipFromBank(d.item); break;
      case 'pickfood': pickFood(); break;
      case 'pickpotion': pickPotion(); break;
      case 'setfood': state.provision = d.item || null; save(); closeModal(); render(); toast(d.item ? `${ITEMS[d.item].name} set as provisions` : 'Provisions cleared'); break;
      case 'drink': if (drinkPotion(d.item)) { closeModal(); render(); toast(`🧪 ${ITEMS[d.item].effectText} for ${POTION_BATTLES} battles`); } break;
      case 'sell': { const g = sellItem(d.item, Number(d.n)); toast(`Sold for 🪙 ${fmt(g)}`); render(); showItem(d.item); break; }
      case 'autoteam': autoTeam(); break;
      case 'summon1': doSummon(1); break;
      case 'summon10': doSummon(10); break;
      case 'claimtask': { const task = TASK_TIERS.flatMap(x => x.tasks).find(x => x.key === d.key); if (claimTask(task)) toast('Reward: ' + rewardText(task.r)); render(); break; }
      case 'claimtier': { const ti = Number(d.tier); if (claimTier(ti)) toast(`Tier complete! ${rewardText(TASK_TIERS[ti].reward)}`); render(); break; }
      case 'reset': if (confirm('Delete your save and start over?')) { resetSave(); go('camp'); } break;
    }
    return;
  }

  const card = t.closest('.hero-card');
  if (card) {
    const uid = Number(card.dataset.uid);
    if (page === 'team') tapBench(uid); else showHero(uid);
    return;
  }
  if (t.id === 'modal') closeModal();
});

$('#btn-speed').addEventListener('click', () => {
  if (!battle) return;
  battle.speed = battle.speed >= 3 ? 1 : battle.speed + 1;
  localSet('speed', battle.speed);
  $('#btn-speed').textContent = battle.speed + 'x';
});
$('#btn-skip').addEventListener('click', () => { if (battle && !battle.over) battle.skip(); });

// ---------------- Boot ----------------
load();
const offline = processSkilling();
render();
onSkillTick(offline, true);
setInterval(() => { onSkillTick(processSkilling(), false); tickBars(); }, 100);
setInterval(() => {
  if (page === 'camp' && !modalOpen() && !battle) render(); else renderTop();
}, 1000);
