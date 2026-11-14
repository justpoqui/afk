// Real-time auto-battle engine with DOM rendering.
// Sideways arena: your team stands on the right facing left, enemies on the left facing right.
// Front column = melee, back column = archers / casters that fire over the front line.
const BATTLE_TIME = 90;
const PROJ_MS = 480;     // flight time of arrows and spells at 1x speed
const FLOAT_MS = 1600;   // how long damage numbers stay on screen
// Where each formation slot stands: [left %, feet height % from the bottom, size]. Matches the arena art's floor.
const SPOTS = {
  enemy: { 0: [38, 22, 1], 1: [25, 26, 0.88], 2: [12, 24, 0.94], 3: [25, 26, 0.88], 4: [12, 24, 0.94], boss: [31, 22, 1] },
  ally:  { 0: [73, 22, 1], 1: [81, 26, 0.88], 2: [84, 23, 1], 3: [81, 26, 0.88], 4: [84, 23, 1] },
};

class Battle {
  // One player character (from playerBattleUnit) against a group of enemies.
  // opts.hunt: endless 1v1 hunting (no time limit, HP carried over between kills via player.startHp).
  constructor(player, enemySlots, onEnd, opts = {}) {
    this.hunt = !!opts.hunt;
    this.cont = !!opts.cont;
    this.units = [];
    this.onEnd = onEnd;
    this.time = 0;
    this.speed = 1;
    this.over = false;
    this.dealt = 0; // damage the player dealt: becomes combat XP
    this.kills = 0;
    this.player = this.makeUnit('ally', player.range === 'melee' ? 0 : 2, { ...player, hero: true });
    this.units.push(this.player);
    enemySlots.forEach((e, i) => { if (e) this.units.push(this.makeUnit('enemy', i, { ...e, color: e.boss ? '#ff5d5d' : '#888' })); });
  }

  makeUnit(side, slot, d) {
    const hp = d.startHp != null ? Math.min(d.hp, d.startHp) : d.hp;
    return { ...d, side, slot, row: slot < 2 ? 'front' : 'back', maxHp: d.hp, hp, shownHp: hp, energy: d.startEnergy || 0,
      timer: Math.random() * 0.5, eatCd: 0, stun: 0, shield: 0, buff: 0, buffT: 0, el: null };
  }

  alive(side) { return this.units.filter(u => u.side === side && u.hp > 0); }
  foes(u) { return this.alive(u.side === 'ally' ? 'enemy' : 'ally'); }
  friends(u) { return this.alive(u.side); }

  pickTarget(u) {
    const foes = this.foes(u);
    if (!foes.length) return null;
    if (u.range === 'melee') {
      const front = foes.filter(f => f.row === 'front');
      const pool = front.length ? front : foes;
      return pool.reduce((a, b) => (Math.abs(a.slot - u.slot) <= Math.abs(b.slot - u.slot) ? a : b));
    }
    return foes[Math.floor(Math.random() * foes.length)];
  }
  weakest(list) { return list.reduce((a, b) => (a.hp / a.maxHp <= b.hp / b.maxHp ? a : b)); }

  atkOf(u) { return u.atk * (1 + (u.buffT > 0 ? u.buff : 0)); }

  // ---- combat (state changes now, visuals land when the hit arrives) ----
  // Attack trains accuracy against the enemy's level; Defence makes enemies miss more.
  hitChance(src, tgt) {
    return src.side === 'ally' ? playerHitChance(src.accLvl, tgt.lvl) : enemyHitChance(tgt.defLvl, src.lvl);
  }

  damage(src, tgt, mult, delay = 0) {
    if (Math.random() > this.hitChance(src, tgt)) {
      this.later(delay, () => this.float(tgt, 'Miss', 'miss'));
      return 0;
    }
    const crit = Math.random() < 0.12;
    // Defence soaks less against stronger attackers: armor is measured against the attacker's level.
    const soak = 100 + 12 * (src.lvl || 1);
    let dmg = this.atkOf(src) * mult * (soak / (soak + tgt.def)) * (0.9 + Math.random() * 0.2);
    if (crit) dmg *= 1.6;
    dmg = Math.max(1, Math.round(dmg));
    const absorbed = Math.min(tgt.shield, dmg);
    tgt.shield -= absorbed;
    const lost = Math.min(tgt.hp, dmg - absorbed);
    tgt.hp -= lost;
    if (src.side === 'ally') {
      this.dealt += lost;
      if (tgt.hp <= 0) { this.kills++; if (tgt.key) state.stats.mkills[tgt.key] = (state.stats.mkills[tgt.key] || 0) + 1; }
    }
    tgt.energy = Math.min(100, tgt.energy + 8);
    this.later(delay, () => {
      tgt.shownHp = tgt.hp;
      this.fx(tgt, 'hit');
      this.float(tgt, (crit ? '💥' : '') + dmg, crit ? 'crit' : 'dmg');
    });
    return dmg;
  }
  heal(tgt, amt, delay = 0) {
    amt = Math.round(amt);
    tgt.hp = Math.min(tgt.maxHp, tgt.hp + amt);
    this.later(delay, () => { tgt.shownHp = tgt.hp; this.float(tgt, '+' + amt, 'heal'); });
  }

  // Heroes eat the selected provisions from the bank when they get low.
  eat(u) {
    const id = nextFood(); // food is eaten from the inventory
    if (!id) return;
    invRemove(id); state.stats.eaten++;
    u.eatCd = 4;
    this.float(u, ITEMS[id].icon, 'heal');
    this.heal(u, ITEMS[id].heal);
  }

  // One attack against `t`: melee units dash in, ranged units fire over the front line.
  strike(u, t, mult, big = false) {
    if (u.range === 'melee' || !u.proj) {
      this.fx(u, 'lunge');
      return this.damage(u, t, mult, 140);
    }
    this.fx(u, 'cast');
    const ms = this.shoot(u, t, u.proj, u.bolt, big);
    return this.damage(u, t, mult, ms);
  }

  basic(u) {
    if (u.cls === 'support' && Math.random() < 0.4) {
      const t = this.weakest(this.friends(u));
      if (t.hp < t.maxHp) {
        this.fx(u, 'cast');
        this.heal(t, this.atkOf(u) * 1.2, this.shoot(u, t, 'heal', '#7dffa0'));
        u.energy += 20;
        return;
      }
    }
    const t = this.pickTarget(u);
    if (!t) return;
    this.strike(u, t, 1);
    u.energy = Math.min(100, u.energy + 22 * (u.energyMult || 1));
  }

  ultimate(u) {
    const s = u.skill;
    u.energy = 0;
    this.fx(u, 'ult');
    this.float(u, s.name, 'skill');
    const foes = this.foes(u), friends = this.friends(u);
    switch (s.type) {
      case 'nuke':    { const t = this.pickTarget(u); if (t) this.strike(u, t, s.power, true); break; }
      case 'execute': if (foes.length) this.strike(u, this.weakest(foes), s.power, true); break;
      case 'aoe':
        foes.forEach((t, i) => {
          if (u.range === 'melee' || !u.proj) { this.fx(u, 'lunge'); this.damage(u, t, s.power, 160 + i * 60); }
          else this.damage(u, t, s.power, this.rain(u, t, i));
        });
        break;
      case 'stun': {
        const t = this.pickTarget(u);
        if (t) { const ms = this.visualDelay(u); this.strike(u, t, s.power, true); t.stun = 2; this.later(ms, () => this.float(t, '💫 Stunned', 'skill')); }
        break;
      }
      case 'drain':   { const t = this.pickTarget(u); if (t) this.heal(u, this.strike(u, t, s.power, true), this.visualDelay(u)); break; }
      case 'heal':    friends.forEach(f => this.heal(f, this.atkOf(u) * s.power, this.shoot(u, f, 'heal', '#7dffa0'))); break;
      case 'shield':  friends.forEach(f => { f.shield += Math.round(this.atkOf(u) * s.power); this.float(f, '🛡️ Shield', 'buff'); }); break;
      case 'buff':    friends.forEach(f => { f.buff = s.power; f.buffT = 6; this.float(f, '⚔️ ATK up', 'buff'); }); break;
    }
  }

  step(dt) {
    if (this.over) return;
    this.time += dt;
    for (const u of this.units) {
      if (u.hp <= 0) continue;
      if (u.buffT > 0) u.buffT -= dt;
      if (u.eatCd > 0) u.eatCd -= dt;
      if (u.regen) u.hp = u.shownHp = Math.min(u.maxHp, u.hp + u.maxHp * u.regen * dt);
      if (u.side === 'ally' && u.hp < u.maxHp * 0.45 && u.eatCd <= 0) this.eat(u);
      if (u.stun > 0) { u.stun -= dt; continue; }
      u.timer += dt;
      if (u.energy >= 100) { this.ultimate(u); u.timer = 0; }
      else if (u.timer >= 120 / u.spd) { u.timer = 0; this.basic(u); }
      if (!this.alive('ally').length || !this.alive('enemy').length) break;
    }
    const allyLeft = this.alive('ally').length, enemyLeft = this.alive('enemy').length;
    if (!enemyLeft || !allyLeft || (!this.hunt && this.time >= BATTLE_TIME)) {
      this.over = true;
      if (!this.hunt && state.potion && --state.potion.battles <= 0) state.potion = null;
      setTimeout(() => {
        this.units.forEach(x => { x.shownHp = x.hp; });
        this.render();
      }, this.silent ? 0 : PROJ_MS / this.speed);
      setTimeout(() => this.onEnd(enemyLeft === 0 && allyLeft > 0), this.silent ? 300 : (this.hunt && allyLeft ? 650 : 1300));
    }
  }

  // Run the rest of the fight instantly (no effects).
  skip() {
    this.silent = true;
    while (!this.over) this.step(0.05);
  }

  // ---- visuals ----
  later(ms, fn) {
    if (this.silent || !ms) { fn(); return; }
    setTimeout(fn, ms / this.speed);
  }
  visualDelay(u) { return u.range === 'melee' || !u.proj ? 140 : PROJ_MS; }

  center(u) {
    const f = this.fieldRect, r = u.el.querySelector('.u-emoji').getBoundingClientRect();
    return { x: r.left + r.width / 2 - f.left, y: r.top + r.height / 2 - f.top };
  }

  // Fire a projectile from u to t in an overhead arc; returns its flight time (ms at 1x).
  shoot(u, t, kind, color, big = false) {
    if (this.silent || !u.el || !t.el) return PROJ_MS;
    const a = this.center(u), b = this.center(t);
    const backline = u.row === 'back' && kind !== 'heal';
    const h = kind === 'heal' ? 40 : Math.max(backline ? 90 : 45, Math.abs(b.x - a.x) * (backline ? 0.45 : 0.25));
    this.fly(kind, color, a, b, h, PROJ_MS, big);
    return PROJ_MS;
  }
  // Area ultimates: projectiles fall from the sky onto each target, one after another.
  rain(u, t, i) {
    const ms = PROJ_MS + 120 + i * 90;
    if (this.silent || !t.el) return ms;
    const b = this.center(t);
    const a = { x: b.x + (u.side === 'ally' ? 70 : -70), y: b.y - 280 };
    setTimeout(() => this.fly(u.proj === 'arrow' ? 'arrow' : 'meteor', u.bolt, a, b, 0, PROJ_MS - 80, true), (120 + i * 90) / this.speed);
    return ms;
  }
  fly(kind, color, a, b, h, ms, big) {
    const p = document.createElement('div');
    p.className = `proj ${kind}${big ? ' big' : ''}`;
    p.style.setProperty('--pc', color || '#fff');
    this.fxLayer.appendChild(p);
    const dx = b.x - a.x, dy = b.y - a.y, frames = [];
    for (let i = 0; i <= 10; i++) {
      const s = i / 10;
      const x = a.x + dx * s, y = a.y + dy * s - 4 * h * s * (1 - s);
      const ang = Math.atan2(dy - 4 * h * (1 - 2 * s), dx) * 180 / Math.PI;
      frames.push({ transform: `translate(${x}px, ${y}px) rotate(${ang}deg) translate(-50%, -50%)` });
    }
    const dur = ms / this.speed;
    p.animate(frames, { duration: dur, easing: 'linear', fill: 'forwards' });
    setTimeout(() => {
      p.remove();
      const burst = document.createElement('div');
      burst.className = `burst ${kind}`;
      burst.style.setProperty('--pc', color || '#fff');
      burst.style.transform = `translate(${b.x}px, ${b.y}px) translate(-50%, -50%)`;
      this.fxLayer.appendChild(burst);
      setTimeout(() => burst.remove(), 450);
    }, dur);
  }

  mount() {
    const field = document.getElementById('field');
    field.querySelectorAll('.unit').forEach(el => el.remove());
    this.fxLayer = document.getElementById('fx');
    this.fxLayer.innerHTML = '';
    // Fill each column top-to-bottom in slot order so formations look the same every time.
    for (const u of [...this.units].sort((a, b) => a.slot - b.slot)) {
      const el = document.createElement('div');
      el.className = `unit ${this.cont && u.side === 'ally' ? '' : 'enter'} ${u.side} ${u.row}` + (u.boss ? ' boss' : '') + (u.hero ? ' hero' : '') + (u.range === 'melee' ? ' melee' : ' ranged');
      // Side-on arena: everyone stands on the floor in a line; units further back sit slightly higher.
      const p = SPOTS[u.side][u.boss ? 'boss' : u.slot];
      el.style.left = p[0] + '%';
      el.style.bottom = p[1] + '%';
      el.style.zIndex = 10 - Math.round(p[1]);
      if (p[2] !== 1) el.style.setProperty('--depth', p[2]);
      el.style.setProperty('--c', u.color);
      el.style.animationDelay = (u.slot * 70) + 'ms';
      el.innerHTML = `<div class="u-status"></div><div class="u-name">${u.name.split(' ')[0]}</div>
        <div class="bar hp"><i></i><b></b></div><div class="bar en"><i></i></div>
        <div class="u-emoji">${art(u, '', true)}</div>`;
      u.el = el;
      field.appendChild(el);
    }
    this.fieldRect = document.getElementById('field').getBoundingClientRect();
    this.render();
  }

  render() {
    for (const u of this.units) {
      if (!u.el) continue;
      const hp = this.silent ? u.hp : u.shownHp;
      u.el.querySelector('.hp i').style.width = (100 * hp / u.maxHp) + '%';
      u.el.querySelector('.hp b').style.width = Math.min(100, 100 * u.shield / u.maxHp) + '%';
      u.el.querySelector('.en i').style.width = u.energy + '%';
      u.el.classList.toggle('stunned', u.stun > 0 && u.hp > 0);
      u.el.classList.toggle('ko', hp <= 0);
      u.el.classList.toggle('charged', u.energy >= 100 && u.hp > 0);
      // Status badges stay visible for as long as the effect lasts.
      const st = u.hp <= 0 ? '' : (u.shield > 0 ? '<span title="Shield">🛡️</span>' : '') +
        (u.buffT > 0 ? `<span title="Attack up">⚔️<small>${Math.ceil(u.buffT)}</small></span>` : '') +
        (u.stun > 0 ? `<span title="Stunned">💫<small>${Math.ceil(u.stun)}</small></span>` : '');
      if (st !== u._st) { u.el.querySelector('.u-status').innerHTML = st; u._st = st; }
    }
    if (!this.hunt) document.getElementById('battle-timer').textContent = Math.max(0, Math.ceil(BATTLE_TIME - this.time));
  }

  fx(u, cls) {
    if (this.silent || !u.el) return;
    u.el.classList.remove(cls);
    void u.el.offsetWidth; // restart animation
    u.el.classList.add(cls);
  }
  float(u, text, cls) {
    if (this.silent || !u.el) return;
    u.floatN = ((u.floatN || 0) + 1) % 3; // stagger so back-to-back numbers don't overlap
    const f = document.createElement('div');
    f.className = 'float ' + cls;
    f.textContent = text;
    f.style.left = (35 + Math.random() * 30) + '%';
    f.style.top = (-u.floatN * 16) + 'px';
    f.style.animationDuration = (FLOAT_MS / Math.max(1, this.speed * 0.75)) + 'ms';
    u.el.appendChild(f);
    setTimeout(() => f.remove(), FLOAT_MS);
  }
}
