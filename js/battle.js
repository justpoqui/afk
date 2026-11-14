// Real-time auto-battle engine with DOM rendering.
const BATTLE_TIME = 90;

class Battle {
  constructor(allySlots, enemySlots, onEnd) {
    this.units = [];
    this.onEnd = onEnd;
    this.time = 0;
    this.speed = 1;
    this.over = false;
    const pe = potionEffect();
    allySlots.forEach((h, i) => {
      if (!h) return;
      const def = HERO_BY_ID[h.id], st = heroStats(h);
      for (const k of ['hp', 'atk', 'def', 'spd']) st[k] = Math.round(st[k] * (1 + (pe[k] || 0)));
      this.units.push(this.makeUnit('ally', i, { ...st, name: def.name, emoji: def.emoji,
        range: CLASSES[def.cls].range, cls: def.cls, skill: def.skill, color: FACTIONS[def.faction].color }));
    });
    enemySlots.forEach((e, i) => { if (e) this.units.push(this.makeUnit('enemy', i, { ...e, color: e.boss ? '#ff5d5d' : '#888' })); });
  }

  makeUnit(side, slot, d) {
    return { ...d, side, slot, row: slot < 2 ? 'front' : 'back', maxHp: d.hp, hp: d.hp, energy: 0,
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

  damage(src, tgt, mult) {
    let crit = Math.random() < 0.12;
    let dmg = this.atkOf(src) * mult * (100 / (100 + tgt.def)) * (0.9 + Math.random() * 0.2);
    if (crit) dmg *= 1.6;
    dmg = Math.max(1, Math.round(dmg));
    let absorbed = Math.min(tgt.shield, dmg);
    tgt.shield -= absorbed;
    tgt.hp = Math.max(0, tgt.hp - (dmg - absorbed));
    tgt.energy = Math.min(100, tgt.energy + 8);
    this.fx(tgt, 'hit');
    this.float(tgt, (crit ? '💥' : '') + dmg, crit ? 'crit' : 'dmg');
    if (tgt.hp <= 0) this.fx(tgt, 'dead');
    return dmg;
  }
  heal(tgt, amt) {
    amt = Math.round(amt);
    tgt.hp = Math.min(tgt.maxHp, tgt.hp + amt);
    this.float(tgt, '+' + amt, 'heal');
  }

  // Heroes eat the selected provisions from the bank when they get low.
  eat(u) {
    const id = state.provision;
    if (!id || !itemCount(id)) return;
    removeItem(id); state.stats.eaten++;
    u.eatCd = 4;
    this.float(u, ITEMS[id].icon, 'heal');
    this.heal(u, ITEMS[id].heal);
  }

  basic(u) {
    if (u.cls === 'support' && Math.random() < 0.4) {
      const t = this.weakest(this.friends(u));
      if (t.hp < t.maxHp) { this.fx(u, 'atk'); this.heal(t, this.atkOf(u) * 1.2); u.energy += 20; return; }
    }
    const t = this.pickTarget(u);
    if (!t) return;
    this.fx(u, 'atk');
    this.damage(u, t, 1);
    u.energy = Math.min(100, u.energy + 22);
  }

  ultimate(u) {
    const s = u.skill;
    u.energy = 0;
    this.fx(u, 'ult');
    this.float(u, s.name, 'skill');
    const foes = this.foes(u), friends = this.friends(u);
    switch (s.type) {
      case 'nuke':    { const t = this.pickTarget(u); if (t) this.damage(u, t, s.power); break; }
      case 'aoe':     foes.forEach(t => this.damage(u, t, s.power)); break;
      case 'execute': if (foes.length) this.damage(u, this.weakest(foes), s.power); break;
      case 'stun':    { const t = this.pickTarget(u); if (t) { this.damage(u, t, s.power); t.stun = 2; this.float(t, '💫 Stun', 'skill'); } break; }
      case 'drain':   { const t = this.pickTarget(u); if (t) this.heal(u, this.damage(u, t, s.power)); break; }
      case 'heal':    friends.forEach(f => this.heal(f, this.atkOf(u) * s.power)); break;
      case 'shield':  friends.forEach(f => { f.shield += Math.round(this.atkOf(u) * s.power); this.float(f, '🛡️', 'heal'); }); break;
      case 'buff':    friends.forEach(f => { f.buff = s.power; f.buffT = 6; this.float(f, '⬆ ATK', 'heal'); }); break;
    }
  }

  step(dt) {
    if (this.over) return;
    this.time += dt;
    for (const u of this.units) {
      if (u.hp <= 0) continue;
      if (u.buffT > 0) u.buffT -= dt;
      if (u.eatCd > 0) u.eatCd -= dt;
      if (u.side === 'ally' && u.hp < u.maxHp * 0.45 && u.eatCd <= 0) this.eat(u);
      if (u.stun > 0) { u.stun -= dt; continue; }
      u.timer += dt;
      if (u.energy >= 100) { this.ultimate(u); u.timer = 0; }
      else if (u.timer >= 120 / u.spd) { u.timer = 0; this.basic(u); }
      if (!this.alive('ally').length || !this.alive('enemy').length) break;
    }
    const allyLeft = this.alive('ally').length, enemyLeft = this.alive('enemy').length;
    if (!enemyLeft || !allyLeft || this.time >= BATTLE_TIME) {
      this.over = true;
      if (state.potion && --state.potion.battles <= 0) state.potion = null;
      this.render();
      setTimeout(() => this.onEnd(enemyLeft === 0 && allyLeft > 0), 700);
    }
  }

  // Run the rest of the fight instantly (no effects).
  skip() {
    this.silent = true;
    while (!this.over) this.step(0.05);
  }

  // ---- Rendering ----
  mount() {
    for (const side of ['ally', 'enemy']) {
      for (const row of ['front', 'back']) document.querySelector(`#field .${side} .${row}`).innerHTML = '';
    }
    for (const u of this.units) {
      const el = document.createElement('div');
      el.className = 'unit' + (u.boss ? ' boss' : '');
      el.style.setProperty('--c', u.color);
      el.innerHTML = `<div class="u-emoji">${u.emoji}</div>
        <div class="bar hp"><i></i><b></b></div><div class="bar en"><i></i></div>
        <div class="u-name">${u.name.split(' ')[0]}</div>`;
      u.el = el;
      document.querySelector(`#field .${u.side} .${u.row}`).appendChild(el);
    }
    this.render();
  }

  render() {
    for (const u of this.units) {
      if (!u.el) continue;
      u.el.querySelector('.hp i').style.width = (100 * u.hp / u.maxHp) + '%';
      u.el.querySelector('.hp b').style.width = Math.min(100, 100 * u.shield / u.maxHp) + '%';
      u.el.querySelector('.en i').style.width = u.energy + '%';
      u.el.classList.toggle('stunned', u.stun > 0 && u.hp > 0);
      u.el.classList.toggle('ko', u.hp <= 0);
    }
    document.getElementById('battle-timer').textContent = Math.max(0, Math.ceil(BATTLE_TIME - this.time));
  }

  fx(u, cls) {
    if (this.silent || !u.el) return;
    u.el.classList.remove(cls);
    void u.el.offsetWidth; // restart animation
    u.el.classList.add(cls);
  }
  float(u, text, cls) {
    if (this.silent || !u.el) return;
    const f = document.createElement('div');
    f.className = 'float ' + cls;
    f.textContent = text;
    f.style.left = (30 + Math.random() * 40) + '%';
    u.el.appendChild(f);
    setTimeout(() => f.remove(), 900);
  }
}
