// Screens, modals and battle flow.
let currentTab = 'camp';
let battle = null;
let heroFilter = 'all';
let selectedSlot = null;

const $ = s => document.querySelector(s);
const fmt = n => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e4 ? (n / 1e3).toFixed(1) + 'K' : String(Math.floor(n));
const fmtTime = ms => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 3600)}h ${String(Math.floor(s / 60) % 60).padStart(2, '0')}m ${String(s % 60).padStart(2, '0')}s`; };
const stars = n => n ? '★'.repeat(n) : '';

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.remove('hidden');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.add('hidden'), 1800);
}
function openModal(html) { $('#modal-card').innerHTML = html; $('#modal').classList.remove('hidden'); }
function closeModal() { $('#modal').classList.add('hidden'); }

function renderTop() {
  $('#r-gold').textContent = fmt(state.gold);
  $('#r-exp').textContent = fmt(state.exp);
  $('#r-gems').textContent = fmt(state.gems);
  $('#r-scrolls').textContent = fmt(state.scrolls);
}

function heroCard(h, extra = '') {
  const d = HERO_BY_ID[h.id];
  return `<div class="hero-card r-${d.rarity} ${extra}" data-uid="${h.uid}" style="--c:${FACTIONS[d.faction].color}">
    <div class="hc-emoji">${d.emoji}</div>
    <div class="hc-lv">Lv ${h.level}</div>
    <div class="hc-stars">${stars(h.stars)}</div>
    <div class="hc-name">${d.name.split(' ')[0]}</div>
  </div>`;
}

// ---------------- Screens ----------------
const screens = {
  camp() {
    const p = pendingIdle(), r = idleRates();
    const tp = teamPower(), sp = stagePower(state.stage);
    const ratio = tp / sp;
    const diff = ratio > 1.15 ? ['Easy', 'easy'] : ratio > 0.85 ? ['Even', 'even'] : ['Hard', 'hard'];
    return `
      <section class="panel camp-hero">
        <div class="chapter">Chapter ${chapterOf(state.stage)} · ${chapterName(state.stage)}</div>
        <div class="camp-scene"><span>🏕️</span><span class="bob">🔥</span><span>⛺</span></div>
        <div class="idle-box">
          <div class="idle-title">Idle Rewards <small>${fmtTime(p.ms)} / 12h</small></div>
          <div class="idle-bar"><i style="width:${100 * p.ms / IDLE_CAP_MS}%"></i></div>
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
        <div class="reward-line">Rewards: 🪙 ${fmt(stageReward(state.stage).gold)} ✨ ${fmt(stageReward(state.stage).exp)} 💎 ${stageReward(state.stage).gems}${stageReward(state.stage).scrolls ? ' 📜 ' + stageReward(state.stage).scrolls : ''}</div>
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
      <div class="sub">Owned ${state.heroes.length} / ${HEROES.length}</div>
      <div class="grid">${list.map(h => heroCard(h)).join('') || '<p class="muted">No heroes in this faction yet.</p>'}</div>`;
  },

  team() {
    const team = teamHeroes();
    const slot = i => {
      const h = team[i];
      const sel = selectedSlot === i ? ' sel' : '';
      return h ? `<div class="slot filled${sel}" data-slot="${i}">${heroCard(h)}</div>`
               : `<div class="slot${sel}" data-slot="${i}"><span>+</span></div>`;
    };
    const inTeam = new Set(state.team.filter(u => u != null));
    const bench = state.heroes.filter(h => !inTeam.has(h.uid)).sort((a, b) => heroPower(b) - heroPower(a));
    return `
      <section class="panel">
        <div class="sub center">Team power <b>${fmt(teamPower())}</b></div>
        <div class="formation">
          <div class="frow-label">Front row — melee heroes hold the line</div>
          <div class="frow">${slot(0)}${slot(1)}</div>
          <div class="frow-label">Back row — ranged heroes &amp; support</div>
          <div class="frow">${slot(2)}${slot(3)}${slot(4)}</div>
        </div>
        <p class="hint">${selectedSlot == null ? 'Tap a slot, then tap a hero below to place them. Tap a filled slot twice to clear it.' : 'Now pick a hero from the bench (or tap the slot again to clear it).'}</p>
        <button class="btn" data-act="autoteam">Auto-fill strongest</button>
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
};

function render() {
  renderTop();
  $('#screen').innerHTML = screens[currentTab]();
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('active', b.dataset.tab === currentTab));
}

// ---------------- Hero detail ----------------
function showHero(uid) {
  const h = getHero(uid), d = HERO_BY_ID[h.id], st = heroStats(h), c = CLASSES[d.cls];
  const cost = levelCost(h.level), cap = maxLevel(h.stars);
  const canLevel = h.level < cap && state.gold >= cost.gold && state.exp >= cost.exp;
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
    <div class="skill"><b>${d.skill.name}</b> <small>Ultimate</small><p>${d.skill.desc}</p></div>
    ${h.level < cap
      ? `<button class="btn ${canLevel ? 'gold' : 'off'}" data-act="levelup" data-uid="${uid}">Level up · 🪙 ${fmt(cost.gold)} ✨ ${fmt(cost.exp)}</button>
         <button class="btn ghost" data-act="levelmax" data-uid="${uid}">Level up as far as I can</button>`
      : `<p class="hint">Level cap reached — summon duplicates to gain stars.</p>`}
  `);
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
  while (front.length < 2 && ranged.length > 3) front.push(ranged.pop());
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

// ---------------- Summon ----------------
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

// ---------------- Battle ----------------
function startBattle() {
  if (!teamHeroes().some(Boolean)) { toast('Put a hero in your team first'); return; }
  const stage = state.stage;
  $('#battle-title').textContent = `${isBoss(stage) ? '👑 ' : ''}Stage ${stageLabel(stage)}`;
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
    // Collect idle rewards at the old rate before the higher stage rate kicks in.
    claimIdle();
    state.stage = stage + 1;
    save(); render();
    openModal(`<div class="result win"><h2>Victory!</h2><div class="big-emoji">🏆</div>
      <p>🪙 ${fmt(r.gold)} &nbsp; ✨ ${fmt(r.exp)} &nbsp; 💎 ${r.gems}${r.scrolls ? ' &nbsp; 📜 ' + r.scrolls : ''}</p>
      <p class="muted">Idle rewards now come from Stage ${stageLabel(state.stage)}.</p>
      <div class="row-btns"><button class="btn ghost" data-act="close">Camp</button><button class="btn gold" data-act="next">Next stage ⚔️</button></div></div>`);
  } else {
    render();
    openModal(`<div class="result lose"><h2>Defeat</h2><div class="big-emoji">💀</div>
      <p class="muted">Tips: level up your heroes, put tanks in the front row, and summon for stronger allies. Idle rewards keep coming while you're away.</p>
      <div class="row-btns"><button class="btn ghost" data-act="heroes">Heroes</button><button class="btn" data-act="retry">Retry</button></div></div>`);
  }
}

function localGet(k) { try { return localStorage.getItem('idle-realms-' + k); } catch (e) { return null; } }
function localSet(k, v) { try { localStorage.setItem('idle-realms-' + k, v); } catch (e) { /* ignore */ } }

// ---------------- Events ----------------
document.addEventListener('click', e => {
  const tab = e.target.closest('#tabs button');
  if (tab) { currentTab = tab.dataset.tab; selectedSlot = null; render(); return; }

  const f = e.target.closest('[data-filter]');
  if (f) { heroFilter = f.dataset.filter; render(); return; }

  const slot = e.target.closest('[data-slot]');
  if (slot) { tapTeamSlot(Number(slot.dataset.slot)); return; }

  const act = e.target.closest('[data-act]');
  if (act) {
    const a = act.dataset.act, uid = Number(act.dataset.uid);
    switch (a) {
      case 'claim': { const p = claimIdle(); toast(`Collected 🪙${fmt(p.gold)} ✨${fmt(p.exp)} 💎${p.gems}`); render(); break; }
      case 'fight': startBattle(); break;
      case 'next': closeModal(); startBattle(); break;
      case 'retry': closeModal(); startBattle(); break;
      case 'heroes': closeModal(); currentTab = 'heroes'; render(); break;
      case 'close': closeModal(); break;
      case 'levelup': levelUp(uid, false); break;
      case 'levelmax': levelUp(uid, true); break;
      case 'autoteam': autoTeam(); break;
      case 'summon1': doSummon(1); break;
      case 'summon10': doSummon(10); break;
      case 'reset': if (confirm('Delete your save and start over?')) { resetSave(); render(); } break;
    }
    return;
  }

  const card = e.target.closest('.hero-card');
  if (card) {
    const uid = Number(card.dataset.uid);
    if (currentTab === 'team') tapBench(uid); else showHero(uid);
    return;
  }
  if (e.target.id === 'modal') closeModal();
});

$('#btn-speed').addEventListener('click', () => {
  if (!battle) return;
  battle.speed = battle.speed >= 3 ? 1 : battle.speed + 1;
  localSet('speed', battle.speed);
  $('#btn-speed').textContent = battle.speed + 'x';
});
$('#btn-skip').addEventListener('click', () => { if (battle && !battle.over) battle.skip(); });

load();
render();
setInterval(() => { if (currentTab === 'camp' && $('#modal').classList.contains('hidden')) render(); else renderTop(); }, 1000);
