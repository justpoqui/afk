// Pages, navigation, modals and battle flow.
let page = 'home';
let fightTab = 'campaign';
let lookCat = 'all'; // all | melee | archery | magic
let shopTab = 'upgrades';
let hunt = null; // active hunting session
const skillGroup = {}; // which recipe group each crafting skill page shows
const GROUP_ICON = { Weapons: '⚔️', Armor: '🛡️', Shields: '🛡️', Planks: '🪵', Glass: '🫧', Vials: '🧪', Orbs: '🔮', Bars: '🧱' };
let battle = null;
let autoTimer = null;

const $ = s => document.querySelector(s);
const fmt = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'K' : String(Math.floor(n));
const fmtTime = ms => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 3600)}h ${String(Math.floor(s / 60) % 60).padStart(2, '0')}m ${String(s % 60).padStart(2, '0')}s`; };
// Item art: the rendered icon, falling back to the emoji if an image is missing.
const itemImg = id => `<img class="item-img" src="${ITEMS[id].img}" alt="${ITEMS[id].icon}" draggable="false" onerror="this.replaceWith(this.alt)">`;
const icon = (id, extra = '') => `<span class="ico ${extra}" style="--t:${ITEMS[id].tint}">${itemImg(id)}</span>`;
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
  ['Main', [['home', '🏠', 'Home'], ['fight', '⚔️', 'Fight'], ['shop', '🏪', 'Shop']]],
  ['Character', [['sheet', '🧍', 'Character Sheet'], ['equipment', '🛡️', 'Equipment'], ['summon', '🎁', 'Summon Looks'], ['library', '📚', 'Look Library']]],
  ['Combat Skills', skillNav('combat')],
  ['Gathering', skillNav('gather')],
  ['Crafting', skillNav('craft').filter(([id]) => SKILLS[id.slice(6)].group === 'crafting')],
  ['Cooking & Brewing', skillNav('craft').filter(([id]) => SKILLS[id.slice(6)].group === 'kitchen')],
  ['General', [['inventory', '🎒', 'Inventory'], ['bank', '🏦', 'Bank'], ['tasks', '📋', 'Tasks'], ['quests', '📜', 'Quests'], ['skills', '🧠', 'All Skills']]],
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
      if (id === 'fight') right = `<span class="lvl">${stageLabel(state.stage)}</span>`;
      if (id === 'sheet') right = `<span class="lvl">Cb ${combatLevel()}</span>`;
      if (id === 'library') right = `<span class="lvl">${Object.keys(state.looks).length}/${HEROES.length}</span>`;
      if (id === 'quests' && QUESTS.some(questReady)) right = `<span class="badge">!</span>`;
      if (id === 'bank') right = `<span class="lvl">${Object.keys(state.bank).length}</span>`;
      if (id === 'inventory') right = `<span class="lvl ${invFull() ? 'full' : ''}">${invUsed()}/${invSize()}</span>`;
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
    strip.innerHTML = `<span>${SKILLS[a.skill].icon} ${a.name}</span><span class="muted">🎒 ${invUsed()}/${invSize()}</span><i class="strip-prog"></i>`;
  } else if (invFull() && page !== 'inventory' && page !== 'bank') {
    strip.classList.remove('hidden');
    strip.dataset.page = 'inventory';
    strip.innerHTML = `<span class="full">🎒 Inventory full</span><span class="muted">Tap to deposit in the bank</span>`;
  } else strip.classList.add('hidden');
}

// 28-slot inventory grid. Stackable items show their count.
function invGrid(small = false) {
  const cells = [];
  for (let i = 0; i < invSize(); i++) {
    const x = state.inv[i];
    cells.push(x ? `<button class="inv-slot" data-inv="${i}" style="--t:${ITEMS[x.id].tint}">${itemImg(x.id)}${x.n > 1 ? `<span class="qty">${fmt(x.n)}</span>` : ''}</button>`
                 : '<div class="inv-slot empty"></div>');
  }
  return `<div class="inv-grid ${small ? 'small' : ''}">${cells.join('')}</div>`;
}
function invBar() {
  return `<div class="inv-bar ${invFull() ? 'is-full' : ''}"><span>🎒 Inventory <b>${invUsed()}/${invSize()}</b>${invFull() ? ' · full!' : ''}</span>
    <button class="btn sm ghost" data-act="depositall">Deposit all</button><button class="btn sm ghost" data-page="inventory">Open</button></div>`;
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
// Small helpers shared by several pages
const tile = (pg, ic, name, sub, extra = '') => `<button class="tile ${extra}" data-page="${pg}"><span class="t-ic">${ic}</span><b>${name}</b><small>${sub}</small></button>`;
const tabs = (cur, act, list) => `<div class="tabs">${list.map(([k, label]) => `<button class="${cur === k ? 'on' : ''}" data-act="${act}" data-k="${k}">${label}</button>`).join('')}</div>`;
const diffClass = lvl => { const d = lvl - combatLevel(); return d <= -5 ? 'easy' : d <= 4 ? 'even' : 'hard'; };

const pages = {
  home() {
    const p = pendingIdle(), r = idleRates();
    const busy = state.active ? ACTIONS[state.active.action] : null;
    const claim = claimableCount(), readyQ = QUESTS.filter(questReady).length;
    const ti = currentTierIndex();
    const nextTask = ti < TASK_TIERS.length ? TASK_TIERS[ti].tasks.find(t => !taskClaimed(t)) : null;
    return `
      <section class="panel home-head">
        <img class="camp-banner" src="assets/bg/camp.webp" alt="Your camp" draggable="false">
        <div class="idle-box">
          <div class="idle-title">Idle Rewards <small>${fmtTime(p.ms)} / 12h · ${r.gold} 🪙/min · ${r.gemsPerHour} 💎/h</small></div>
          <div class="bar-track"><i style="width:${100 * p.ms / IDLE_CAP_MS}%"></i></div>
          <div class="row-btns"><div class="idle-loot">🪙 ${fmt(p.gold)} &nbsp; 💎 ${fmt(p.gems)}</div><button class="btn gold sm" data-act="claim">Collect</button></div>
        </div>
        <div class="doing">${busy ? `Now: ${SKILLS[busy.skill].icon} <b>${busy.name}</b> · 🎒 ${invUsed()}/${invSize()}` : 'Idle: pick a skill or go fight.'}</div>
      </section>
      <div class="tiles">
        ${tile('fight', '⚔️', 'Fight', `Arena ${stageLabel(state.stage)} · Hunting`)}
        ${tile('skills', '🧠', 'Skills', `Total level ${totalSkillLevel()}`)}
        ${tile('summon', '🎁', 'Summon Looks', `📜 ${state.scrolls} scrolls`)}
        ${tile('library', '📚', 'Look Library', `${Object.keys(state.looks).length} / ${HEROES.length} looks`)}
        ${tile('tasks', '📋', 'Tasks', claim ? `${claim} to claim!` : nextTask ? taskText(nextTask) : 'All done', claim ? 'alert' : '')}
        ${tile('quests', '📜', 'Quests', readyQ ? `${readyQ} ready to complete!` : `${QUESTS.filter(questDone).length} / ${QUESTS.length} done`, readyQ ? 'alert' : '')}
        ${tile('bank', '🏦', 'Bank', `${Object.keys(state.bank).length} item types`)}
        ${tile('inventory', '🎒', 'Inventory', `${invUsed()} / ${invSize()} slots`, invFull() ? 'alert' : '')}
        ${tile('sheet', '🧍', 'Character Sheet', `Combat level ${combatLevel()}`)}
        ${tile('equipment', '🛡️', 'Equipment', `${GEAR_SLOTS.filter(gearItem).length}/${GEAR_SLOTS.length} slots · 🍽️ ${foodCarried()}`)}
        ${tile('shop', '🏪', 'Shop', 'Tools, backpacks, supplies')}
      </div>
      <div class="footer-links"><button class="link" data-act="reset">Reset save</button></div>`;
  },

  fight() {
    const busy = state.active ? SKILLS[ACTIONS[state.active.action].skill] : null;
    const warn = busy ? `<p class="warn">⚠️ Fighting stops ${busy.icon} ${busy.name}. You can do one thing at a time.</p>` : '';
    const head = `${tabs(fightTab, 'fighttab', [['campaign', '🏟️ Arena'], ['hunting', '🗺️ Hunting Grounds']])}
      <div class="prep-line">Combat level <b>${combatLevel()}</b> · training <b>${SKILLS[state.player.style].icon} ${SKILLS[state.player.style].name}</b> + ❤️ · ${prepLine().replace(/<\/?div[^>]*>/g, '')}</div>${warn}`;
    if (fightTab === 'hunting') {
      return `${head}
        <p class="hint">Fight one monster at a time, over and over. Your HP carries between kills, so carry food in your inventory. Loot goes to your inventory.</p>
        ${AREAS.map((a, ai) => {
          const lv = a.monsters.map(m => m[1]);
          return `<section class="panel area"><div class="area-head"><span>${a.icon}</span><b>${a.name}</b><small>Lv ${Math.min(...lv)}–${Math.max(...lv)}</small></div>
            ${a.monsters.map(([key, lvl], mi) => {
              const m = monsterUnit(ai, mi);
              return `<div class="mon-row"><span class="mon-art">${art(m, 'flip', true)}</span>
                <div class="mon-info"><b>${m.name}</b><small>Lv <span class="lv ${diffClass(lvl)}">${lvl}</span> · ❤️ ${fmt(m.hp)} · ⚔️ ${fmt(m.atk)}${state.stats.mkills[key] ? ` · ☠ ${fmt(state.stats.mkills[key])}` : ''}</small></div>
                <button class="btn sm" data-act="hunt" data-a="${ai}" data-m="${mi}">Fight</button></div>`;
            }).join('')}</section>`;
        }).join('')}`;
    }
    const tp = playerPower(), sp = stagePower(state.stage), ratio = tp / sp;
    const diff = ratio > 1.15 ? ['Easy', 'easy'] : ratio > 0.85 ? ['Even', 'even'] : ['Hard', 'hard'];
    const rw = stageReward(state.stage);
    return `${head}
      <section class="panel stage-box">
        <div class="chapter">🏟️ Arena ${chapterOf(state.stage)} · ${chapterName(state.stage)}</div>
        <div class="stage-title">${isBoss(state.stage) ? '👑 Champion round' : `Round ${floorOf(state.stage)}`} / 10</div>
        <div class="floors">${Array.from({ length: 10 }, (_, i) => `<i class="${i + 1 < floorOf(state.stage) ? 'done' : i + 1 === floorOf(state.stage) ? 'cur' : ''} ${i === 9 ? 'boss' : ''}"></i>`).join('')}</div>
        <div class="vs-preview">
          <div class="enemy-preview">${stageEnemies(state.stage).filter(Boolean).map(e => `<span class="${e.boss ? 'big' : ''}">${art(e, 'flip', true)}</span>`).join('')}</div>
          <span class="vs">VS</span>
          <div class="enemy-preview"><span class="big">${art(skin(), '', true)}</span></div>
        </div>
        <div class="power-cmp"><div>Enemy power<b>${fmt(sp)}</b></div><div class="diff ${diff[1]}">${diff[0]}</div><div>Your power<b>${fmt(tp)}</b></div></div>
        <div class="reward-line">Rewards: 🪙 ${fmt(rw.gold)} 💎 ${rw.gems}${rw.scrolls ? ' 📜 ' + rw.scrolls : ''} + combat XP</div>
        <button class="btn big" data-act="fight">⚔️ Battle</button>
      </section>`;
  },

  sheet() {
    const st = playerStats(), d = skin();
    return `
      <section class="panel">
        ${lookCard(d.id, 'big')}
        <button class="btn ghost" data-page="library">📚 Change look in the Library</button>
      </section>
      <section class="panel">
        <div class="panel-title">Combat level ${combatLevel()} <span class="muted">· Power ${fmt(power(st))}</span></div>
        <div class="stats">
          <div>❤️ Max HP<b>${fmt(st.hp)}</b></div><div>⚔️ Damage<b>${fmt(st.atk)}</b></div>
          <div>🛡️ Defence<b>${fmt(st.def)}</b></div><div>💨 Attacks/s<b>${(st.spd / 120).toFixed(2)}</b></div>
        </div>
      </section>
      <section class="panel">
        <div class="panel-title">Fighting style</div>
        <label class="select"><select data-change="ctype">${Object.entries(COMBAT_TYPES).map(([k, c]) =>
          `<option value="${k}" ${state.player.ctype === k ? 'selected' : ''}>${c.icon} ${c.name}</option>`).join('')}</select></label>
        <p class="hint">${COMBAT_TYPES[state.player.ctype].perk}. Your look still brings its own special attack.</p>
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
      </section>`;
  },

  equipment() {
    const st = playerStats(), w = gearItem('weapon');
    const slot = sl => {
      const it = gearItem(sl), info = GEAR_SLOT_INFO[sl];
      return `<button class="doll-slot ${it ? 'filled' : ''}" style="grid-area:${sl}" data-act="pickgear" data-slot="${sl}">
        ${it ? `<span class="ds-ico" style="--t:${it.tint}">${itemImg(it.id)}</span>` : `<span class="ds-ico empty">${info.icon}</span>`}
        <small>${info.name}</small></button>`;
    };
    return `
      <section class="panel">
        <div class="doll">
          <div class="doll-figure">${art(skin())}</div>
          ${GEAR_SLOTS.map(slot).join('')}
        </div>
        <div class="doll-stats">❤️ ${fmt(st.hp)} · ⚔️ ${fmt(st.atk)} · 🛡️ ${fmt(st.def)} · ${COMBAT_TYPES[state.player.ctype].icon} ${COMBAT_TYPES[state.player.ctype].name}</div>
        ${GEAR_SLOTS.map(gearItem).filter(it => it && !meetsReq(it)).map(it => `<p class="warn">⚠️ ${it.name} needs ${SKILLS[it.req.skill].name} ${it.req.level}: it gives no stats until then.</p>`).join('')}
        ${w && !weaponMatches(w) ? `<p class="warn">⚠️ Your ${w.name} is a ${COMBAT_TYPES[w.wtype].name} weapon but you fight with ${COMBAT_TYPES[state.player.ctype].name}: half damage. Change your fighting style on the Character Sheet.</p>` : ''}
      </section>
      <section class="panel"><div class="panel-title">Equipped</div>
        <div class="equipped-list">${GEAR_SLOTS.map(sl => {
          const it = gearItem(sl);
          return `<button class="eq-row" data-act="pickgear" data-slot="${sl}">${it ? icon(it.id) : `<span class="ico empty">${GEAR_SLOT_INFO[sl].icon}</span>`}
            <div><b>${it ? it.name : `No ${GEAR_SLOT_INFO[sl].name.toLowerCase()}`}</b><small>${it ? describeItem(it.id) : 'Tap to equip'}</small></div></button>`;
        }).join('')}</div></section>
      <section class="panel"><div class="panel-title">Battle preparation</div>${prepPanel()}</section>
      <section class="panel"><div class="panel-title">🎒 Inventory ${invUsed()}/${invSize()}</div>${invGrid(true)}</section>`;
  },

  summon() {
    return `
      <section class="panel exchange">
        <div><b>📜 ${state.scrolls} scrolls</b><small>💎 ${fmt(state.gems)} gems · ${fmt(GEMS_PER_SCROLL)} 💎 = 1 📜</small></div>
        <div class="shop-buy">${[1, 5].map(n => `<button class="btn sm ${state.gems < GEMS_PER_SCROLL * n ? 'off' : 'gold'}" data-act="exchange" data-n="${n}">Buy ${n} 📜</button>`).join('')}</div>
      </section>
      <p class="hint">Scrolls open chests that unlock looks for your Library. Duplicates add a ★ (+${LOOK_STAR_BONUS * 100}% look bonus each, up to ★${MAX_LOOK_STARS}).</p>
      ${CHESTS.map(c => `<section class="panel chest chest-${c.id}">
        <div class="chest-head"><span class="chest-ic">${c.icon}</span><div><b>${c.name}</b>
          <small>${['L', 'E', 'R'].filter(r => c.odds[r]).map(r => `<span class="r-${r} odd">${RARITY[r].name} ${Math.round(c.odds[r] * 100)}%</span>`).join(' ')}</small></div></div>
        <div class="row-btns">
          <button class="btn ${state.scrolls < c.cost1 ? 'off' : ''}" data-act="spin" data-c="${c.id}" data-n="1">Spin ×1<small>📜 ${c.cost1}</small></button>
          <button class="btn gold ${state.scrolls < c.cost6 ? 'off' : ''}" data-act="spin" data-c="${c.id}" data-n="6">Spin ×6<small>📜 ${c.cost6}</small></button>
        </div></section>`).join('')}`;
  },

  library() {
    const list = HEROES.filter(d => lookCat === 'all' || CLASS_TYPE[d.cls] === lookCat)
      .sort((a, b) => ownsLook(b.id) - ownsLook(a.id) || 'LER'.indexOf(a.rarity) - 'LER'.indexOf(b.rarity));
    return `
      <section class="panel"><div class="panel-title">Wearing</div>${lookCard(state.player.skin, 'big')}</section>
      <label class="select"><select data-change="lookcat">
        <option value="all" ${lookCat === 'all' ? 'selected' : ''}>📚 All looks</option>
        ${Object.entries(COMBAT_TYPES).map(([k, c]) => `<option value="${k}" ${lookCat === k ? 'selected' : ''}>${c.icon} ${c.name} looks</option>`).join('')}
      </select></label>
      <div class="sub">Owned ${Object.keys(state.looks).length} / ${HEROES.length}${lookCat !== 'all' ? ` · ${list.filter(d => ownsLook(d.id)).length}/${list.length} ${COMBAT_TYPES[lookCat].name}` : ''} · tap an owned look to wear it</div>
      <div class="lib-grid">${list.map(d => {
        const own = ownsLook(d.id), cur = d.id === state.player.skin;
        return `<button class="lib-card r-${d.rarity} ${own ? '' : 'locked'} ${cur ? 'current' : ''}" ${own ? `data-act="look" data-id="${d.id}"` : ''} style="--c:${FACTIONS[d.faction].color}">
          <div class="lib-art">${art(d)}</div><b>${d.name.split(' ')[0]}</b>
          <small>${COMBAT_TYPES[CLASS_TYPE[d.cls]].icon} ${own ? (lookStars(d.id) ? '★'.repeat(lookStars(d.id)) : RARITY[d.rarity].name) : '🔒 ' + RARITY[d.rarity].name}</small>
          ${cur ? '<span class="wearing">Wearing</span>' : ''}</button>`;
      }).join('')}</div>`;
  },

  skills() {
    const group = (title, type) => `<div class="sub">${title}</div><div class="skill-list">${Object.entries(SKILLS).filter(([, s]) => s.type === type || s.group === type).map(([k, sk]) => {
      const b = xpBar(k), on = state.active && ACTIONS[state.active.action].skill === k;
      return `<button class="skill-row ${on ? 'running' : ''}" data-page="skill:${k}"><span>${sk.icon}</span>
        <div><div class="cs-top"><b>${sk.name}</b><span>${b.lv} / ${MAX_SKILL}</span></div><div class="bar-track sm xp"><i style="width:${b.pct}%"></i></div></div></button>`;
    }).join('')}</div>`;
    return `<div class="sub">Total level ${totalSkillLevel()}</div>${group('Combat', 'combat')}${group('Gathering', 'gather')}${group('Crafting', 'crafting')}${group('Cooking & Brewing', 'kitchen')}`;
  },

  shop() {
    const head = `${tabs(shopTab, 'shoptab', [['upgrades', '🛠️ Upgrades'], ['supplies', '🧺 Supplies']])}<div class="sub">You have 🪙 ${fmt(state.gold)}</div>`;
    if (shopTab === 'supplies') {
      return `${head}<p class="hint">Purchases go to your bank.</p>
        <div class="shop-list">${SHOP_STOCK.map(([id, price]) => `<div class="shop-row">${icon(id, 'lg')}
          <div class="shop-info"><b>${ITEMS[id].name}</b><small>${describeItem(id) || ITEMS[id].cat} · 🪙 ${price} each</small></div>
          <div class="shop-buy">${[1, 10, 100].map(q => `<button class="btn sm ${state.gold < price * q ? 'off' : ''}" data-act="buy" data-item="${id}" data-n="${q}">×${q}</button>`).join('')}</div></div>`).join('')}
          <div class="shop-row"><span class="ico lg">💎</span><div class="shop-info"><b>${GEM_PACK.gems} Gems</b><small>${fmt(GEMS_PER_SCROLL)} gems buy a 📜 scroll for look chests</small></div>
          <div class="shop-buy"><button class="btn sm gold ${state.gold < GEM_PACK.gold ? 'off' : ''}" data-act="buygems">🪙 ${fmt(GEM_PACK.gold)}</button></div></div></div>`;
    }
    const bp = state.upgrades.backpack;
    return `${head}
      <div class="shop-list">
        <div class="shop-row"><span class="ico lg">🎒</span><div class="shop-info"><b>Backpack ${bp >= BACKPACK_COST.length ? '(max)' : `+4 slots (${bp + 1}/${BACKPACK_COST.length})`}</b>
          <small>Inventory ${invSize()} slots</small></div>
          ${bp < BACKPACK_COST.length ? `<button class="btn sm ${state.gold < BACKPACK_COST[bp] ? 'off' : 'gold'}" data-act="buypack">🪙 ${fmt(BACKPACK_COST[bp])}</button>` : '<span class="owned">✓</span>'}</div>
        <div class="shop-row"><span class="ico lg">🏦</span><div class="shop-info"><b>Bank slot +1</b>
          <small>Bank ${bankUsed()}/${bankSize()} slots · gets 10% pricier each time</small></div>
          <button class="btn sm ${state.gold < bankSlotCost(state.upgrades.bankSlots || 0) ? 'off' : 'gold'}" data-act="buybank">🪙 ${fmt(bankSlotCost(state.upgrades.bankSlots || 0))}</button></div>
        <div class="shop-row"><span class="ico lg">🦉</span><div class="shop-info"><b>Bank Courier</b>
          <small>When your inventory fills while skilling, everything except food is sent to the bank, even offline.</small></div>
          ${state.upgrades.courier ? '<span class="owned">✓ Hired</span>' : `<button class="btn sm ${state.gold < COURIER_COST ? 'off' : 'gold'}" data-act="buycourier">🪙 ${fmt(COURIER_COST)}</button>`}</div>
      </div>
      <div class="sub">Tools: each tier makes that skill ${TOOL_SPEED * 100}% faster</div>
      <div class="shop-list">${Object.entries(TOOLS).map(([sk, names]) => {
        const t = toolTier(sk), maxed = t >= 3;
        return `<div class="shop-row"><span class="ico lg">${SKILLS[sk].icon}</span>
          <div class="shop-info"><b>${maxed ? names[2] + ' (max)' : names[t]}</b>
          <small>${t ? `Owned: ${names[t - 1]} (−${t * 10}%)` : 'No tool yet'}${maxed ? '' : ` · needs ${SKILLS[sk].name} ${TOOL_REQ[t]}`}</small></div>
          ${maxed ? '<span class="owned">✓</span>' : `<button class="btn sm ${state.gold < TOOL_COST[t] || skillLevel(sk) < TOOL_REQ[t] ? 'off' : 'gold'}" data-act="buytool" data-skill="${sk}">🪙 ${fmt(TOOL_COST[t])}</button>`}</div>`;
      }).join('')}</div>`;
  },

  quests() {
    return QUESTS.map(q => {
      const done = questDone(q), open = questUnlocked(q);
      return `<section class="panel quest ${done ? 'done' : ''} ${open ? '' : 'locked'}">
        <div class="quest-head"><span>${q.icon}</span><div><b>${q.name}</b><small>${done ? '✓ Completed' : open ? q.desc : '🔒 Complete the previous quest first'}</small></div></div>
        ${open && !done ? q.steps.map(st => {
          const [c, n] = questStep(st);
          const label = st.t === 'deliver' ? `Deliver ${n} × ${ITEMS[st.id].icon} ${ITEMS[st.id].name}` : st.t === 'kill' ? `Defeat ${n} × ${monsterTemplate(st.id).name}` : `Reach ${SKILLS[st.skill].name} level ${n}`;
          return `<div class="q-step ${c >= n ? 'ok' : ''}"><span>${c >= n ? '✓' : '•'} ${label}</span><small>${fmt(c)}/${fmt(n)}</small></div>`;
        }).join('') : ''}
        <div class="q-reward">Reward: ${questRewardText(q.r)}</div>
        ${questReady(q) ? `<button class="btn gold" data-act="quest" data-id="${q.id}">Complete quest${q.steps.some(st => st.t === 'deliver') ? ' (hands over the items)' : ''}</button>` : ''}
      </section>`;
    }).join('');
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
          <button class="btn ghost" data-page="fight">⚔️ Go fight</button></section>`;
    }
    const acts = Object.values(ACTIONS).filter(a => a.skill === id);
    const groups = [...new Set(acts.map(a => a.group))];
    const cur = groups.includes(skillGroup[id]) ? skillGroup[id] : groups[0];
    const picker = groups.length > 1 ? `<label class="select"><select data-change="actgroup" data-skill="${id}">${groups.map(g =>
      `<option value="${g}" ${g === cur ? 'selected' : ''}>${GROUP_ICON[g] || '📦'} ${g}</option>`).join('')}</select></label>` : '';
    return `${head}${invBar()}${picker}
      ${id === 'cooking' ? `<p class="hint">Food can burn: ${Math.round(burnChance(ACTIONS.food0) * 100)}% for ${ACTIONS.food0.name} at your level. Burnt dishes become stackable 🍖 Burnt Food.</p>` : ''}
      <div class="act-grid">${acts.filter(a => a.group === cur).map(actCard).join('')}</div>
      <p class="hint">You can do one thing at a time: one skill action, or fighting. Items go into your inventory one slot each, and the action stops when it's full, so deposit in the bank, where items stack. Skills keep going while the game is closed (up to 12h).</p>`;
  },

  bank() {
    const ids = Object.keys(state.bank).sort((a, b) => CATEGORY_ORDER.indexOf(ITEMS[a].cat) - CATEGORY_ORDER.indexOf(ITEMS[b].cat) || ITEMS[a].tier - ITEMS[b].tier || a.localeCompare(b));
    const value = ids.reduce((s, id) => s + ITEMS[id].sell * state.bank[id], 0);
    const top = `<section class="panel"><div class="panel-title">🎒 Inventory ${invUsed()}/${invSize()}</div>${invGrid(true)}
      <div class="row-btns"><button class="btn ghost" data-act="depositall">Deposit all</button><button class="btn ghost" data-act="depositkeep">Deposit all but food</button></div></section>`;
    return `${top}
      <section class="panel">
        <div class="panel-title">🏦 Bank <span class="${bankUsed() >= bankSize() ? 'full' : 'muted'}">· ${bankUsed()}/${bankSize()} slots</span>
          <button class="link" data-page="shop">+ buy space</button></div>
        <div class="bank-grid">${ids.map(id =>
          `<button class="bank-item" data-item="${id}" style="--t:${ITEMS[id].tint}" title="${ITEMS[id].name}">${itemImg(id)}<span class="qty">${fmt(state.bank[id])}</span></button>`).join('')}${
          Array.from({ length: Math.max(0, bankSize() - ids.length) }, () => '<div class="bank-item empty"></div>').join('')}</div>
        <div class="sub">Total value 🪙 ${fmt(value)} · each item type takes one slot and stacks inside it</div>
      </section>`;
  },

  inventory() {
    return `
      <section class="panel">
        <div class="panel-title">🎒 Inventory <span class="muted">· ${invUsed()}/${invSize()} slots</span></div>
        ${invGrid()}
        <div class="row-btns"><button class="btn ghost" data-act="depositall">Deposit all</button><button class="btn ghost" data-act="depositkeep">Deposit all but food</button></div>
        <p class="hint">Each item takes one slot. Only the bank stacks items, except stackables like 🍖 Burnt Food. Skill actions stop when your inventory is full. Food you carry here is what you eat in battle.</p>
      </section>`;
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
      <div class="ac-meta">⏱ ${actionDur(a)}s · +${a.xp} XP</div></div></div>
    ${inputs.length ? `<div class="ac-inputs">${inputs.map(([id, n]) =>
      `<span class="${haveCount(id) < n ? 'lack' : ''}">${icon(id, 'sm')} ${n}<small>(${fmt(haveCount(id))})</small></span>`).join('')}</div>` : ''}
    ${describeItem(a.id) ? `<div class="ac-desc">${describeItem(a.id)}</div>` : ''}
    <div class="ac-foot"><span>🎒 ${fmt(invCount(a.id))} · 🏦 ${fmt(itemCount(a.id))}</span><span class="ac-btn">${active ? 'Stop' : locked ? `🔒 Level ${a.level}` : SKILLS[a.skill].verb}</span></div>
    <div class="prog"><i></i></div>
  </button>`;
}

function describeItem(id) {
  const it = ITEMS[id];
  if (it.slot) {
    const stats = [it.atk && `Damage +${it.atk}`, it.hp && `HP +${it.hp}`, it.def && `Defence +${it.def}`].filter(Boolean).join(', ');
    const kind = it.slot === 'weapon' ? `${COMBAT_TYPES[it.wtype].icon} ${COMBAT_TYPES[it.wtype].name} weapon` : GEAR_SLOT_INFO[it.slot].name;
    const extra = [it.spd && `${it.spd > 0 ? '+' : ''}${Math.round(it.spd * 100)}% attack speed`, it.twoHanded && 'two-handed (no shield)'].filter(Boolean).join(', ');
    const req = it.req ? ` · <span class="${meetsReq(it) ? 'req-ok' : 'req-no'}">needs ${SKILLS[it.req.skill].icon} ${SKILLS[it.req.skill].name} ${it.req.level}</span>` : '';
    return `${kind} · ${stats}${extra ? ' · ' + extra : ''}${req}${it.slot === 'weapon' && !weaponMatches(it) ? ' (half damage: not your fighting style)' : ''}`;
  }
  if (it.heal) return `Food · heals ${it.heal} HP in battle`;
  if (it.effect) return `Potion · ${it.effectText} for ${POTION_BATTLES} battles`;
  if (it.burnt) return 'Ruined while cooking. Stacks in your inventory. Only good for selling.';
  return '';
}

function prepLine() {
  const bits = [];
  bits.push(foodCarried() ? `🍽️ ${foodCarried()} food carried` : '⚠️ no food in inventory');
  if (state.potion) bits.push(`🧪 ${ITEMS[state.potion.id].effectText} (${state.potion.battles} left)`);
  return `<div class="prep-line">${bits.join(' · ')}</div>`;
}
function prepPanel() {
  const food = state.provision;
  return `<div class="prep">
    <button class="prep-slot" data-act="pickfood">
      ${food ? icon(food, 'lg') : '<span class="ico lg empty">🍽️</span>'}
      <div><b>Food</b><small>${food ? `${ITEMS[food].name} · heals ${ITEMS[food].heal}` : 'Eats the best food you carry.'} · <b>${foodCarried()}</b> in inventory</small></div></button>
    <button class="prep-slot" data-act="pickpotion">
      ${state.potion ? icon(state.potion.id, 'lg') : '<span class="ico lg empty">🧪</span>'}
      <div><b>Potion</b><small>${state.potion ? `${ITEMS[state.potion.id].effectText} · ${state.potion.battles} battles left` : 'None active. Brew potions with Alchemy.'}</small></div></button>
  </div>
  ${food && itemCount(food) && invFree() ? `<button class="btn ghost" data-act="fillfood">Fill ${invFree()} free slots with ${ITEMS[food].name} (${fmt(itemCount(food))} in bank)</button>` : ''}`;
}

function render() {
  if (page.startsWith('skill:')) $('#screen').innerHTML = pages.skill(page.slice(6));
  else $('#screen').innerHTML = (pages[page] || pages.home)();
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
  const options = [...new Set([...Object.keys(state.bank), ...state.inv.map(x => x.id)])].filter(id => ITEMS[id].slot === slot).sort((a, b) => ITEMS[b].tier - ITEMS[a].tier);
  const cur = state.player.gear[slot];
  openModal(`
    <button class="close" data-act="close">✕</button>
    <h2>${GEAR_SLOT_INFO[slot].icon} Choose ${GEAR_SLOT_INFO[slot].name.toLowerCase()}</h2>
    <div class="pick-list">
      ${options.map(id => `<button class="pick ${meetsReq(ITEMS[id]) ? '' : 'locked'}" data-act="equip" data-item="${id}">${icon(id, 'lg')}
        <div><b>${ITEMS[id].name}</b><small>${describeItem(id)} · ×${haveCount(id)}</small></div></button>`).join('')
        || `<p class="muted">You have no ${GEAR_SLOT_INFO[slot].name.toLowerCase()} gear yet. ${slot === 'weapon' ? 'Forge blades with Metalworking, or make bows and staves with Carpentry.' : slot === 'shield' ? 'Forge kite shields with Metalworking or make wooden shields with Carpentry.' : 'Forge it with Metalworking.'}</p>`}
      ${cur ? `<button class="btn ghost" data-act="unequip" data-slot="${slot}">Unequip ${ITEMS[cur].name}</button>` : ''}
      ${options.length ? '' : `<button class="btn" data-act="gosmith">Go to ${slot === 'weapon' || slot === 'shield' ? 'Metalworking' : 'Metalworking'}</button>`}
    </div>`);
}

function pickFood() {
  const opts = [...new Set([...Object.keys(state.bank), ...state.inv.map(x => x.id)])].filter(id => ITEMS[id].heal).sort((a, b) => ITEMS[b].tier - ITEMS[a].tier);
  openModal(`<button class="close" data-act="close">✕</button><h2>Food</h2>
    <p class="muted">Below 45% HP you eat food <b>from your inventory</b> (4s cooldown). This one is eaten first.</p>
    <div class="pick-list">${opts.map(id => `<button class="pick ${state.provision === id ? 'on' : ''}" data-act="setfood" data-item="${id}">${icon(id, 'lg')}
      <div><b>${ITEMS[id].name}</b><small>Heals ${ITEMS[id].heal} · 🎒 ${invCount(id)} · 🏦 ${itemCount(id)}</small></div></button>`).join('') || '<p class="muted">No food yet. Catch fish, then cook them.</p>'}
    ${state.provision ? `<button class="btn ghost" data-act="setfood" data-item="">Clear food</button>` : ''}</div>`);
}
function pickPotion() {
  const opts = [...new Set([...Object.keys(state.bank), ...state.inv.map(x => x.id)])].filter(id => ITEMS[id].effect).sort((a, b) => ITEMS[b].tier - ITEMS[a].tier);
  openModal(`<button class="close" data-act="close">✕</button><h2>Drink a potion</h2>
    <p class="muted">Lasts ${POTION_BATTLES} battles. Drinking a new one replaces the current potion.</p>
    <div class="pick-list">${opts.map(id => `<button class="pick" data-act="drink" data-item="${id}">${icon(id, 'lg')}
      <div><b>${ITEMS[id].name}</b><small>${ITEMS[id].effectText} · ×${haveCount(id)}</small></div></button>`).join('') || '<p class="muted">No potions yet. Gather herbs, then brew with Alchemy.</p>'}</div>`);
}

// from='bank' or 'inv': where the tapped item lives.
function showItem(id, from = 'bank') {
  const it = ITEMS[id], inv = from === 'inv', n = inv ? invCount(id) : itemCount(id);
  if (!n) { closeModal(); return; }
  const recipe = ACTIONS[id];
  openModal(`<button class="close" data-act="close">✕</button>
    <div class="item-head">${icon(id, 'xl')}<div><h2>${it.name}</h2><small class="muted">${it.cat}${it.slot ? ` · Tier ${it.tier + 1} (level ${GEAR_LEVEL[it.tier]})` : ''}${it.stack ? ' · stackable' : ''}</small></div></div>
    ${describeItem(id) ? `<p>${describeItem(id)}</p>` : ''}
    <p class="muted">${inv ? 'In inventory' : 'In bank'} <b>${fmt(n)}</b> · sells for 🪙 ${it.sell} each${recipe ? ` · made with ${SKILLS[recipe.skill].icon} ${SKILLS[recipe.skill].name}` : ''}</p>
    ${inv ? `<div class="row-btns"><button class="btn" data-act="deposit" data-item="${id}" data-n="1">Deposit 1</button><button class="btn" data-act="deposit" data-item="${id}" data-n="${n}">Deposit all ${n}</button></div>`
          : `<div class="row-btns"><button class="btn" data-act="withdraw" data-item="${id}" data-n="1">Withdraw 1</button><button class="btn" data-act="withdraw" data-item="${id}" data-n="${n}">Withdraw all${it.stack ? '' : ` (≤${invFree()})`}</button></div>`}
    ${it.heal ? `<button class="btn" data-act="setfood" data-item="${id}">Use as battle food</button>` : ''}
    ${it.effect ? `<button class="btn" data-act="drink" data-item="${id}">Drink now (${POTION_BATTLES} battles)</button>` : ''}
    ${it.slot ? `<button class="btn" data-act="equip" data-item="${id}">Equip${state.player.gear[it.slot] ? ` (replaces ${ITEMS[state.player.gear[it.slot]].name})` : ''}</button>` : ''}
    <div class="row-btns"><button class="btn ghost" data-act="sell" data-from="${from}" data-item="${id}" data-n="1">Sell 1</button>
      <button class="btn ghost" data-act="sell" data-from="${from}" data-item="${id}" data-n="${n}">Sell all (🪙 ${fmt(it.sell * n)})</button></div>`);
}

function showSpin(results) {
  openModal(`<h2 class="center">Chest opened!</h2>
    <div class="summon-results ${results.length === 1 ? 'one' : ''}">${results.map((r, i) => {
      const d = HERO_BY_ID[r.id];
      return `<div class="sr r-${d.rarity}" style="animation-delay:${i * 110}ms;--c:${FACTIONS[d.faction].color}">
        <div class="hc-art">${art(d)}</div><div class="hc-name">${d.name.split(' ')[0]}</div><div class="sr-note">${r.note}</div></div>`;
    }).join('')}</div>
    <div class="row-btns"><button class="btn ghost" data-act="close">OK</button><button class="btn" data-act="golib">Open Library</button></div>`);
}
function showLook(id) {
  openModal(`<button class="close" data-act="close">✕</button>${lookCard(id, 'big')}
    <p class="muted">${lookStars(id) ? `★${lookStars(id)}: bonus +${lookStars(id) * LOOK_STAR_BONUS * 100}%` : 'Get duplicates from chests to add stars.'}</p>
    ${id === state.player.skin ? '<p class="good center">✓ You are wearing this look</p>' : `<button class="btn gold" data-act="wear" data-id="${id}">Wear this look</button>`}`);
}

// ---------------- Skilling loop ----------------
function onSkillTick(sum, offline) {
  if (!sum) return;
  if (offline && sum.count) {
    openModal(`<h2>Welcome back!</h2><p class="muted">While you were away (${fmtTime(sum.ms)}), your ${SKILLS[sum.skill].name} kept going:</p>
      <div class="loot">${Object.entries(sum.items).map(([id, n]) => `<span>${icon(id)} +${fmt(n)} ${ITEMS[id].name}</span>`).join('')}
      <span>${SKILLS[sum.skill].icon} +${fmt(sum.xp)} XP${sum.levelUp ? ` · now level ${sum.levelUp}!` : ''}</span></div>
      ${sum.stopped ? `<p class="muted">It stopped when ${sum.full ? 'your inventory filled up. Deposit items in the bank to keep going' : 'you ran out of materials'}.</p>` : ''}
      <button class="btn" data-act="close">Nice</button>`);
  } else if (sum.levelUp) toast(`${SKILLS[sum.skill].icon} ${SKILLS[sum.skill].name} level ${sum.levelUp}!`);
  else if (sum.stopped) toast(sum.full ? '🎒 Inventory full! Deposit items in the bank.' : 'Out of materials. Action stopped.');
  if (!offline) {
    const bank = page === 'bank' || page === 'inventory' || page === 'skill:' + sum.skill || page === 'tasks';
    if (bank) render(); else { renderNav(); renderTop(); }
  }
}

// ---------------- Battle ----------------
const autoOn = () => localGet('auto') === '1';
function renderAutoBtn() { $('#btn-auto').classList.toggle('on', autoOn()); }

// One activity at a time: fighting stops any running skill.
function stopSkillForFight() {
  if (!state.active) return;
  const sk = SKILLS[ACTIONS[state.active.action].skill];
  processSkilling();
  state.active = null; save();
  toast(`Stopped ${sk.icon} ${sk.name} to fight`);
}
function openBattleScreen(title, bg) {
  closeModal();
  $('#battle-title').textContent = title;
  $('#battle').style.setProperty('--bg', `url(${bg})`);
  $('#battle').classList.remove('hidden');
  $('#btn-speed').textContent = (Number(localGet('speed') || 1)) + 'x';
  $('#btn-auto').classList.toggle('hidden', !!hunt);
  renderAutoBtn();
}
function runBattle(b) {
  battle = b;
  b.speed = Number(localGet('speed') || 1);
  b.mount();
  let last = performance.now();
  const loop = now => {
    if (battle !== b || b.over) return;
    let dt = Math.min(0.1, (now - last) / 1000) * b.speed;
    last = now;
    while (dt > 0) { const st = Math.min(dt, 0.05); b.step(st); dt -= st; }
    b.render();
    if (hunt) huntHud();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

function startBattle() {
  clearTimeout(autoTimer);
  if (hunt) return;
  stopSkillForFight();
  const stage = state.stage;
  openBattleScreen(`${isBoss(stage) ? '👑 ' : '🏟️ '}${chapterName(stage)} ${floorOf(stage)}/10`, battleBg(stage));
  $('#battle-info').innerHTML = prepLine();
  const b = new Battle(playerBattleUnit(), stageEnemies(stage), win => { if (battle === b) endBattle(b, win, stage); });
  runBattle(b);
}

// ---- Hunting: one monster at a time, on repeat, HP carried between kills ----
function startHunt(ai, mi) {
  stopSkillForFight();
  const [, lvl] = AREAS[ai].monsters[mi];
  hunt = { ai, mi, kills: 0, gold: 0, gems: 0, items: {}, lost: 0, xp: 0, hpXp: 0, ups: {}, hp: null, energy: 0, style: state.player.style };
  const m = monsterUnit(ai, mi);
  openBattleScreen(`${AREAS[ai].icon} ${m.name} · Lv ${lvl}`, `assets/bg/hunt_${AREAS[ai].id}.webp`);
  nextHuntFight(true);
}
function nextHuntFight(first = false) {
  if (!hunt) return;
  const p = playerBattleUnit();
  if (hunt.hp != null) { p.startHp = hunt.hp; p.startEnergy = hunt.energy; }
  const b = new Battle(p, [monsterUnit(hunt.ai, hunt.mi)], win => { if (battle === b) huntFightEnd(b, win); }, { hunt: true, cont: !first });
  runBattle(b);
  huntHud();
}
function huntHud() {
  if (!hunt) return;
  $('#battle-timer').textContent = '☠ ' + hunt.kills;
  $('#battle-info').innerHTML = `<div class="prep-line">🪙 ${fmt(hunt.gold)}${hunt.gems ? ` · 💎 ${hunt.gems}` : ''} · loot ${Object.values(hunt.items).reduce((a, b) => a + b, 0)} · 🍽️ ${foodCarried()} food · 🎒 ${invUsed()}/${invSize()}</div>`;
}
function bankHuntXp(b) {
  const xp = grantCombatXp(b.dealt);
  hunt.xp += xp.xp; hunt.hpXp += xp.hpXp;
  for (const [k, l] of xp.ups) { hunt.ups[k] = l; toast(`${SKILLS[k].icon} ${SKILLS[k].name} level ${l}!`); }
}
function huntFightEnd(b, win) {
  battle = null;
  bankHuntXp(b);
  if (!win) { endHunt(true); return; }
  hunt.kills++; state.stats.kills++;
  const lvl = AREAS[hunt.ai].monsters[hunt.mi][1], loot = rollLoot(hunt.ai, lvl);
  state.gold += loot.gold; hunt.gold += loot.gold;
  state.gems += loot.gems; hunt.gems += loot.gems;
  for (const [id, n] of Object.entries(loot.items)) {
    let k = invAdd(id, n);
    if (k < n && state.upgrades.courier) { depositAll(true); k += invAdd(id, n - k); }
    hunt.items[id] = (hunt.items[id] || 0) + k;
    hunt.lost += n - k;
  }
  hunt.hp = b.player.hp; hunt.energy = b.player.energy;
  save();
  setTimeout(() => nextHuntFight(), 250);
}
function endHunt(died) {
  const h = hunt;
  hunt = null;
  battle = null;
  if (state.potion && --state.potion.battles <= 0) state.potion = null;
  save();
  $('#battle').classList.add('hidden');
  render();
  const m = monsterTemplate(AREAS[h.ai].monsters[h.mi][0]);
  openModal(`<div class="result ${died ? 'lose' : 'win'}"><h2>${died ? 'You were defeated' : 'Hunt over'}</h2>
    <div class="big-emoji">${died ? '💀' : '🏹'}</div>
    <p><b>${h.kills}</b> × ${m.name} defeated</p>
    <p>🪙 ${fmt(h.gold)}${h.gems ? ` &nbsp; 💎 ${h.gems}` : ''}</p>
    <div class="loot">${Object.entries(h.items).filter(([, n]) => n).map(([id, n]) => `<span>${icon(id)} +${n} ${ITEMS[id].name}</span>`).join('')}</div>
    ${h.lost ? `<p class="warn">🎒 ${h.lost} drops were lost because your inventory was full.</p>` : ''}
    <p class="xp-line">${SKILLS[h.style].icon} +${fmt(h.xp)} ${SKILLS[h.style].name} XP · ❤️ +${fmt(h.hpXp)} Hitpoints XP</p>
    ${Object.entries(h.ups).map(([k, l]) => `<div class="lvl-up">${SKILLS[k].icon} ${SKILLS[k].name} is now level ${l}!</div>`).join('')}
    <div class="row-btns"><button class="btn ghost" data-act="close">Done</button><button class="btn" data-act="hunt" data-a="${h.ai}" data-m="${h.mi}">Fight again</button></div></div>`);
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
      <div class="row-btns"><button class="btn ghost" data-act="gochar">Equipment</button><button class="btn" data-act="fightnow">Retry</button></div></div>`);
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
    if (r === 'full') toast('🎒 Inventory full. Deposit items in the bank first.');
    render(); return;
  }
  const bi = t.closest('[data-item]:not([data-act])');
  if (bi) { showItem(bi.dataset.item); return; }
  const slotEl = t.closest('[data-inv]');
  if (slotEl) { const x = state.inv[Number(slotEl.dataset.inv)]; if (x) showItem(x.id, 'inv'); return; }

  const act = t.closest('[data-act]');
  if (act) {
    const d = act.dataset;
    switch (d.act) {
      case 'claim': { const p = claimIdle(); toast(`Collected 🪙${fmt(p.gold)} 💎${p.gems}`); render(); break; }
      case 'fight': case 'fightnow': startBattle(); break;
      case 'gochar': closeModal(); go('equipment'); break;
      case 'golib': closeModal(); go('library'); break;
      case 'hunt': closeModal(); startHunt(Number(d.a), Number(d.m)); break;
      case 'fighttab': fightTab = d.k; render(); break;
      case 'lookcat': lookCat = d.k; render(); break;
      case 'shoptab': shopTab = d.k; render(); break;
      case 'spin': { const r = spinChest(d.c, Number(d.n)); if (r) { render(); showSpin(r); } else toast('Not enough 📜 scrolls. Buy them with 💎 gems above.'); break; }
      case 'exchange': if (exchangeGems(Number(d.n))) { render(); toast(`+${d.n} 📜`); } else toast(`Need ${fmt(GEMS_PER_SCROLL * Number(d.n))} 💎`); break;
      case 'look': showLook(d.id); break;
      case 'wear': wearLook(d.id); closeModal(); render(); toast(`Now wearing ${skin().name}`); break;
      case 'buy': if (buyItem(d.item, Number(d.n))) { render(); toast(`Bought ${d.n} × ${ITEMS[d.item].name} (sent to bank)`); } else toast(bankHasRoom(d.item) ? 'Not enough gold' : '🏦 Bank is full'); break;
      case 'buygems': if (buyGems()) { render(); toast(`+${GEM_PACK.gems} 💎`); } else toast('Not enough gold'); break;
      case 'buybank': if (buyBankSlot()) { render(); toast(`🏦 Bank is now ${bankSize()} slots`); } else toast('Not enough gold'); break;
      case 'buypack': if (buyBackpack()) { render(); toast(`🎒 Inventory is now ${invSize()} slots`); } else toast('Not enough gold'); break;
      case 'buycourier': if (buyCourier()) { render(); toast('🦉 The Bank Courier is hired!'); } else toast('Not enough gold'); break;
      case 'buytool': if (buyTool(d.skill)) { render(); toast(`${SKILLS[d.skill].icon} ${TOOLS[d.skill][toolTier(d.skill) - 1]} bought!`); } else toast('Need more gold or a higher skill level'); break;
      case 'quest': { const q = QUESTS.find(x => x.id === d.id); if (completeQuest(q)) { render(); toast(`📜 Quest complete! ${questRewardText(q.r)}`); } break; }
      case 'gosmith': closeModal(); go('skill:metalworking'); break;
      case 'close': closeModal(); break;
      case 'style': state.player.style = d.style; save(); render(); toast(`Now training ${SKILLS[d.style].icon} ${SKILLS[d.style].name}`); break;
      case 'pickgear': pickGear(d.slot); break;
      case 'equip': { const it = ITEMS[d.item], r = equipGear(d.item);
        if (r === 'req') { toast(`Needs ${SKILLS[it.req.skill].icon} ${SKILLS[it.req.skill].name} level ${it.req.level} to equip`); break; }
        closeModal(); render(); toast(`Equipped ${it.name}`); break; }
      case 'unequip': unequipGear(d.slot); closeModal(); render(); break;
      case 'pickfood': pickFood(); break;
      case 'pickpotion': pickPotion(); break;
      case 'setfood': state.provision = d.item || null; save(); closeModal(); render(); toast(d.item ? `${ITEMS[d.item].name} set as battle food` : 'Food cleared'); break;
      case 'drink': if (drinkPotion(d.item)) { closeModal(); render(); toast(`🧪 ${ITEMS[d.item].effectText} for ${POTION_BATTLES} battles`); } break;
      case 'sell': { const g = sellItem(d.item, Number(d.n), d.from === 'inv'); toast(`Sold for 🪙 ${fmt(g)}`); render(); showItem(d.item, d.from); break; }
      case 'deposit': if (!deposit(d.item, Number(d.n))) toast('🏦 Bank is full. Buy more space in the Shop.'); render(); showItem(d.item, 'inv'); break;
      case 'withdraw': { const k = withdraw(d.item, Number(d.n)); if (!k) toast('🎒 Inventory full'); render(); showItem(d.item, 'bank'); break; }
      case 'depositall': { const k = depositAll(false); render(); toast(k ? `🏦 Bank full: ${k} item type${k === 1 ? "" : "s"} stayed in your inventory` : 'Deposited everything in the bank'); break; }
      case 'depositkeep': { const k = depositAll(true); render(); toast(k ? `🏦 Bank full: ${k} item type${k === 1 ? "" : "s"} stayed in your inventory` : 'Deposited everything except food'); break; }
      case 'fillfood': { const k = withdraw(state.provision, invFree()); render(); toast(`Packed ${k} × ${ITEMS[state.provision].name}`); break; }
      case 'claimtask': { const task = TASK_TIERS.flatMap(x => x.tasks).find(x => x.key === d.key); if (claimTask(task)) toast('Reward: ' + rewardText(task.r)); render(); break; }
      case 'claimtier': { const ti = Number(d.tier); if (claimTier(ti)) toast(`Tier complete! ${rewardText(TASK_TIERS[ti].reward)}`); render(); break; }
      case 'reset': if (confirm('Delete your save and start over?')) { resetSave(); go('home'); } break;
    }
    return;
  }
  if (t.id === 'modal') closeModal();
});

document.addEventListener('change', e => {
  const k = e.target.dataset.change;
  if (k === 'ctype') { state.player.ctype = e.target.value; save(); render(); toast(`Fighting style: ${COMBAT_TYPES[e.target.value].icon} ${COMBAT_TYPES[e.target.value].name}`); }
  if (k === 'lookcat') { lookCat = e.target.value; render(); }
  if (k === 'actgroup') { skillGroup[e.target.dataset.skill] = e.target.value; render(); }
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
  if (hunt) {
    const b = battle;
    if (b && !b.over) { b.over = true; bankHuntXp(b); }
    endHunt(false);
    return;
  }
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
setInterval(() => { onSkillTick(processSkilling(), false); tickBars(); }, 100);
setInterval(() => {
  if (page === 'home' && !modalOpen() && !battle) render(); else renderTop();
}, 1000);

// Android back button: close whatever is open first; return false to let the app exit.
window.handleBack = function () {
  if (battle || !$('#battle').classList.contains('hidden')) { $('#btn-retreat').click(); return true; }
  if (modalOpen()) { closeModal(); return true; }
  if (document.body.classList.contains('nav-open')) { document.body.classList.remove('nav-open'); return true; }
  if (page !== 'home') { go('home'); return true; }
  return false;
};
