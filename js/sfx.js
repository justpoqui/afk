// Battle sound effects, synthesized with the Web Audio API (no audio files to ship).
// sfx('hit'), sfx('block'), ... Sounds only play after the first tap (browser/WebView rule)
// and can be switched off from the battle bar or the home page.
const Sfx = (() => {
  let ctx = null, master = null, noiseBuf = null, voices = 0;
  const last = {};
  let on = true;
  try { on = localStorage.getItem('idle-realms-sound') !== '0'; } catch (e) { /* storage blocked */ }

  function init() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 1.6;
    // gentle limiter so overlapping hits don't clip
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 6;
    master.connect(comp).connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  // The audio context may only start from a user gesture.
  ['pointerdown', 'touchstart', 'keydown'].forEach(ev => addEventListener(ev, init, { passive: true }));
  document.addEventListener('visibilitychange', () => { if (ctx) document.hidden ? ctx.suspend() : ctx.resume(); });

  // ---- building blocks ----
  function env(g, t, a, peak, dec) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec);
  }
  function tone(t, { type = 'sine', f0, f1 = f0, dur = 0.2, peak = 0.4, a = 0.004, dest = master }) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, a, peak, dur);
    o.connect(g).connect(dest);
    o.start(t); o.stop(t + a + dur + 0.05);
  }
  function noise(t, { dur = 0.15, peak = 0.4, a = 0.003, filter = 'lowpass', f0 = 2000, f1 = f0, q = 0.8, dest = master }) {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf;
    s.playbackRate.value = 0.8 + Math.random() * 0.4;
    f.type = filter; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t);
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, a, peak, dur);
    s.connect(f).connect(g).connect(dest);
    s.start(t, Math.random() * 0.5); s.stop(t + a + dur + 0.05);
  }
  const vary = (x, p = 0.12) => x * (1 + (Math.random() * 2 - 1) * p);

  // ---- the sounds ----
  const SOUNDS = {
    // blade connects: a sharp swish into a meaty thump
    slash(t) {
      noise(t, { dur: 0.09, peak: 0.35, filter: 'bandpass', f0: vary(4200), f1: 1800, q: 1.2 });
      tone(t + 0.02, { type: 'triangle', f0: vary(170), f1: 60, dur: 0.14, peak: 0.5 });
      noise(t + 0.02, { dur: 0.12, peak: 0.35, f0: 900, f1: 300 });
    },
    // fists and feet, monster claws and bites: a dull thud
    punch(t) {
      tone(t, { type: 'sine', f0: vary(140), f1: 45, dur: 0.16, peak: 0.7 });
      noise(t, { dur: 0.07, peak: 0.4, f0: 1400, f1: 400 });
    },
    // arrow lands: a short wooden thunk
    arrow(t) {
      noise(t, { dur: 0.05, peak: 0.6, filter: 'bandpass', f0: vary(2600), q: 3 });
      tone(t, { type: 'triangle', f0: vary(320), f1: 140, dur: 0.1, peak: 0.6 });
    },
    // spell lands: a crackling burst
    magic(t) {
      noise(t, { dur: 0.22, peak: 0.7, filter: 'bandpass', f0: vary(3000), f1: 700, q: 2 });
      tone(t, { type: 'sawtooth', f0: vary(520), f1: 110, dur: 0.18, peak: 0.2 });
      tone(t, { type: 'sine', f0: vary(160), f1: 60, dur: 0.15, peak: 0.35 });
    },
    // critical hit: a heavier impact with a crack on top
    crit(t) {
      tone(t, { type: 'sine', f0: vary(110), f1: 35, dur: 0.3, peak: 0.85 });
      noise(t, { dur: 0.06, peak: 0.6, filter: 'highpass', f0: 2500 });
      noise(t + 0.01, { dur: 0.25, peak: 0.4, f0: 1200, f1: 200 });
    },
    // shield block: metallic clang (inharmonic partials ringing out)
    block(t) {
      noise(t, { dur: 0.03, peak: 0.5, filter: 'highpass', f0: 3000 });
      const base = vary(520, 0.06);
      for (const [r, p, d] of [[1, 0.22, 0.35], [2.76, 0.14, 0.25], [5.4, 0.09, 0.18], [8.93, 0.05, 0.12]])
        tone(t, { type: 'sine', f0: base * r, dur: d, peak: p, a: 0.002 });
      tone(t, { type: 'triangle', f0: 120, f1: 70, dur: 0.08, peak: 0.3 });
    },
    // attack misses: an empty whoosh
    miss(t) {
      noise(t, { dur: 0.2, peak: 0.6, a: 0.05, filter: 'bandpass', f0: vary(700), f1: 2600, q: 1.5 });
    },
    // bow released: a twang
    twang(t) {
      tone(t, { type: 'triangle', f0: vary(260, 0.05), f1: 220, dur: 0.16, peak: 0.4 });
      noise(t, { dur: 0.05, peak: 0.25, filter: 'highpass', f0: 3000 });
    },
    // spell cast: a rising shimmer
    cast(t) {
      tone(t, { type: 'sine', f0: vary(400), f1: 1100, dur: 0.18, peak: 0.2 });
      tone(t + 0.03, { type: 'sine', f0: vary(600), f1: 1600, dur: 0.15, peak: 0.12 });
    },
    // special attack: a big rising swell
    special(t) {
      noise(t, { dur: 0.35, peak: 0.3, a: 0.12, filter: 'bandpass', f0: 400, f1: 3000, q: 1 });
      tone(t, { type: 'sawtooth', f0: 110, f1: 330, dur: 0.35, peak: 0.1, a: 0.1 });
    },
    heal(t) {
      tone(t, { type: 'sine', f0: 660, dur: 0.18, peak: 0.12 });
      tone(t + 0.08, { type: 'sine', f0: 990, dur: 0.25, peak: 0.1 });
    },
    // something falls: a low descending groan
    death(t) {
      tone(t, { type: 'triangle', f0: 220, f1: 55, dur: 0.45, peak: 0.35 });
      noise(t + 0.15, { dur: 0.3, peak: 0.25, f0: 500, f1: 120 });
    },
    win(t) { [523, 659, 784, 1047].forEach((f, i) => tone(t + i * 0.11, { type: 'triangle', f0: f, dur: 0.3, peak: 0.22 })); },
    lose(t) { [392, 330, 262].forEach((f, i) => tone(t + i * 0.16, { type: 'triangle', f0: f, dur: 0.4, peak: 0.2 })); },
    cheer(t) { cheer(t); },
    boo(t) { boo(t); },
  };


  // ---- more building blocks: shaped voices for crowds and monsters ----
  const rnd = (a, b) => a + Math.random() * (b - a);
  // A gain node with a custom envelope: [[time offset, level], ...]
  function shape(t, pts, dest = master) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    for (const [dt, v] of pts) g.gain.linearRampToValueAtTime(Math.max(0.0001, v), t + dt);
    g.connect(dest);
    return g;
  }
  // A voiced sound: buzzy source through two vowel formants (F1, F2), with optional vibrato and pitch glide.
  function voice(t, { f0, f1 = f0, dur, peak = 0.3, F1 = 500, F2 = 1200, type = 'sawtooth', vib = 0, vibRate = 6, a = 0.03, growl = 0, dest = master }) {
    const o = ctx.createOscillator(), out = shape(t, [[a, peak], [dur * 0.7, peak * 0.7], [dur, 0]], dest);
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    if (vib) { const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = vibRate; lg.gain.value = vib; l.connect(lg).connect(o.frequency); l.start(t); l.stop(t + dur + 0.05); }
    let src = o;
    if (growl) { // rough throat: fast amplitude flutter
      const am = ctx.createGain(), l = ctx.createOscillator(), lg = ctx.createGain();
      am.gain.value = 1 - growl; l.type = 'square'; l.frequency.value = rnd(28, 40); lg.gain.value = growl;
      l.connect(lg).connect(am.gain); o.connect(am); src = am; l.start(t); l.stop(t + dur + 0.05);
    }
    for (const [F, q, v] of [[F1, 4, 1], [F2, 6, 0.5]]) {
      const f = ctx.createBiquadFilter(), g = ctx.createGain();
      f.type = 'bandpass'; f.frequency.value = F; f.Q.value = q; g.gain.value = v * 3;
      src.connect(f).connect(g).connect(out);
    }
    o.start(t); o.stop(t + dur + 0.05);
  }
  // A short click or tick (bones rattling, spider legs, crackling fire, claps).
  const click = (t, f, peak = 0.3, q = 2, dur = 0.025, dest = master) => noise(t, { dur, peak, filter: 'bandpass', f0: f, q, a: 0.001, dest });
  // A bubble pop: a quick rising sine.
  const bubble = (t, f = 300, peak = 0.25) => tone(t, { type: 'sine', f0: f, f1: f * 2.5, dur: 0.06, peak, a: 0.002 });

  // ---- arena crowd ----
  const crowdBus = v => { const g = ctx.createGain(); g.gain.value = v; g.connect(master); return g; };
  function cheer(t) {
    const bus = crowdBus(1.25), len = 2.6;
    // a roar of many voices: formant-filtered noise swelling and fading
    for (let i = 0; i < 18; i++) {
      const st = t + rnd(0, 0.35), d = rnd(1.2, len);
      const g = shape(st, [[rnd(0.08, 0.25), rnd(0.12, 0.22)], [d * 0.6, rnd(0.08, 0.16)], [d, 0]], bus);
      const s = ctx.createBufferSource(), f = ctx.createBiquadFilter();
      s.buffer = noiseBuf; s.playbackRate.value = rnd(0.7, 1.3);
      f.type = 'bandpass'; f.frequency.setValueAtTime(rnd(500, 1600), st); f.frequency.linearRampToValueAtTime(rnd(700, 2200), st + d * 0.5); f.Q.value = rnd(2, 5);
      s.connect(f).connect(g); s.start(st, rnd(0, 0.5)); s.stop(st + d + 0.05);
    }
    // voices shouting "yeah!"
    for (let i = 0; i < 10; i++) voice(t + rnd(0, 0.9), { f0: rnd(180, 380), f1: rnd(140, 300), dur: rnd(0.35, 0.7), peak: rnd(0.03, 0.06), F1: rnd(650, 850), F2: rnd(1500, 1900), dest: bus });
    // whistles
    for (let i = 0; i < 3; i++) { const st = t + rnd(0.2, 1.4), f = rnd(1800, 2600); tone(st, { type: 'sine', f0: f, f1: f * rnd(1.15, 1.4), dur: rnd(0.25, 0.45), peak: 0.07, a: 0.04, dest: bus }); }
    // clapping
    for (let i = 0; i < 70; i++) click(t + rnd(0.1, len - 0.3), rnd(1200, 2600), rnd(0.08, 0.2), 1.2, 0.03, bus);
  }
  function boo(t) {
    const bus = crowdBus(0.6), len = 2.2;
    // many low "booo" voices: a dark "oo" vowel sliding down
    for (let i = 0; i < 16; i++) {
      const st = t + rnd(0, 0.3), f = rnd(95, 175);
      voice(st, { f0: f, f1: f * rnd(0.75, 0.9), dur: rnd(1.3, len), peak: rnd(0.05, 0.09), F1: rnd(300, 380), F2: rnd(700, 850), vib: rnd(2, 5), vibRate: rnd(4, 7), a: rnd(0.15, 0.35), dest: bus });
    }
    // grumbling murmur underneath
    const g = shape(t, [[0.3, 0.12], [len * 0.7, 0.08], [len, 0]], bus);
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter();
    s.buffer = noiseBuf; f.type = 'lowpass'; f.frequency.value = 420;
    s.connect(f).connect(g); s.start(t); s.stop(t + len + 0.05);
  }

  // ---- monster voices: mode is 'atk' (attacking), 'special' (its big move) or 'die' ----
  const MONSTER_VOICE = {
    slime(t, m) { // wet squelch and bubbles
      const big = m !== 'atk';
      tone(t, { type: 'sine', f0: m === 'die' ? 400 : 140, f1: m === 'die' ? 70 : 420, dur: big ? 0.35 : 0.18, peak: 0.4 });
      noise(t, { dur: big ? 0.3 : 0.15, peak: 0.25, filter: 'lowpass', f0: 600, f1: 200, q: 6 });
      for (let i = 0; i < (big ? 6 : 3); i++) bubble(t + 0.04 + i * rnd(0.04, 0.07), rnd(200, 450), 0.18);
    },
    goblin(t, m, hi = 1) { // cackling "heh-heh" (higher for imps)
      const n = m === 'atk' ? 2 : m === 'special' ? 5 : 1;
      if (m === 'die') { voice(t, { f0: 420 * hi, f1: 160 * hi, dur: 0.45, peak: 0.3, F1: 700 * hi, F2: 1800 * hi, type: 'square' }); return; }
      for (let i = 0; i < n; i++) voice(t + i * 0.11, { f0: rnd(330, 420) * hi, f1: rnd(280, 340) * hi, dur: 0.09, peak: 0.28, F1: 650 * hi, F2: 1900 * hi, type: 'square', a: 0.008 });
    },
    goblin_archer(t, m) { MONSTER_VOICE.goblin(t, m, 1.12); },
    wolf(t, m) {
      if (m === 'atk') { voice(t, { f0: 95, f1: 80, dur: 0.35, peak: 0.35, F1: 350, F2: 900, growl: 0.7 }); click(t + 0.3, 1800, 0.3); return; } // growl + snap
      if (m === 'special') { voice(t, { f0: 380, f1: 520, dur: 1.0, peak: 0.25, F1: 600, F2: 1100, type: 'triangle', vib: 8, vibRate: 5, a: 0.15 }); return; } // howl
      voice(t, { f0: 700, f1: 380, dur: 0.4, peak: 0.25, F1: 900, F2: 1600, type: 'triangle' }); // yelp
    },
    spider(t, m) { // hiss and skittering legs
      noise(t, { dur: m === 'die' ? 0.5 : 0.25, peak: 0.3, filter: 'highpass', f0: 4000, a: 0.02 });
      for (let i = 0; i < (m === 'atk' ? 5 : 10); i++) click(t + i * rnd(0.025, 0.045), rnd(2500, 4500), 0.2, 4);
    },
    bat(t, m) { // high-pitched chirps / screech
      const n = m === 'atk' ? 2 : m === 'special' ? 4 : 1;
      for (let i = 0; i < n; i++) tone(t + i * 0.08, { type: 'sine', f0: rnd(3200, 4200), f1: rnd(1800, 2600), dur: 0.06, peak: 0.18, a: 0.003 });
      if (m === 'die') tone(t, { type: 'sawtooth', f0: 2600, f1: 900, dur: 0.3, peak: 0.08 });
    },
    skeleton(t, m) { // rattling bones; collapses into a clatter
      const n = m === 'die' ? 22 : m === 'special' ? 14 : 6, span = m === 'die' ? 0.6 : 0.25;
      for (let i = 0; i < n; i++) click(t + rnd(0, span), rnd(900, 2400), rnd(0.15, 0.3), 5, 0.03);
      if (m !== 'atk') voice(t, { f0: 140, f1: 90, dur: 0.5, peak: 0.12, F1: 400, F2: 1000, growl: 0.5 });
    },
    wraith(t, m) { // ghostly moan with breathy air
      const d = m === 'atk' ? 0.6 : 1.1;
      voice(t, { f0: m === 'die' ? 420 : 300, f1: m === 'die' ? 120 : 230, dur: d, peak: 0.22, F1: 400, F2: 850, type: 'triangle', vib: 12, vibRate: 4, a: 0.12 });
      noise(t, { dur: d, peak: 0.12, filter: 'bandpass', f0: 1500, f1: 600, q: 1, a: 0.2 });
    },
    cultist(t, m) { // low chant and whisper
      if (m === 'atk') { noise(t, { dur: 0.3, peak: 0.18, filter: 'bandpass', f0: 3500, f1: 2000, q: 2, a: 0.05 }); return; }
      for (const f of [98, 147]) voice(t, { f0: f, dur: m === 'die' ? 0.6 : 0.9, f1: m === 'die' ? f * 0.6 : f, peak: 0.12, F1: 450, F2: 800, a: 0.1 });
    },
    treant(t, m) { // creaking wood and a deep groan
      const d = m === 'atk' ? 0.4 : 0.9;
      const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = shape(t, [[0.05, 0.35], [d * 0.8, 0.3], [d, 0]]);
      o.type = 'square'; o.frequency.setValueAtTime(rnd(25, 35), t); o.frequency.linearRampToValueAtTime(rnd(60, 90), t + d * 0.6); o.frequency.linearRampToValueAtTime(rnd(20, 30), t + d);
      f.type = 'bandpass'; f.frequency.value = 700; f.Q.value = 3; o.connect(f).connect(g); o.start(t); o.stop(t + d + 0.05);
      if (m !== 'atk') voice(t, { f0: 70, f1: 50, dur: d, peak: 0.25, F1: 300, F2: 700, growl: 0.3 });
      if (m === 'die') for (let i = 0; i < 8; i++) click(t + 0.5 + rnd(0, 0.4), rnd(400, 900), 0.3, 2, 0.05); // branches snapping
    },
    golem(t, m) { // grinding stone and a deep rumble
      const d = m === 'atk' ? 0.4 : 0.9;
      noise(t, { dur: d, peak: 0.45, filter: 'lowpass', f0: 220, f1: 90, a: 0.05 });
      tone(t, { type: 'sine', f0: 55, f1: 35, dur: d, peak: 0.45 });
      for (let i = 0; i < (m === 'die' ? 14 : 5); i++) click(t + rnd(0, d), rnd(300, 900), 0.3, 2, 0.06); // rocks crunching
    },
    imp(t, m) { MONSTER_VOICE.goblin(t, m, 1.7); noise(t, { dur: 0.15, peak: 0.12, filter: 'highpass', f0: 3000 }); },
    fire_sprite(t, m) { // whoosh of flame and crackles
      const d = m === 'atk' ? 0.3 : 0.7;
      noise(t, { dur: d, peak: 0.35, filter: 'lowpass', f0: m === 'die' ? 1500 : 400, f1: m === 'die' ? 150 : 1800, a: 0.06 });
      for (let i = 0; i < (m === 'atk' ? 6 : 14); i++) click(t + rnd(0, d), rnd(2000, 5000), rnd(0.1, 0.25), 6, 0.012);
    },
    ogre(t, m) { // deep "HUH" grunts and a roar
      if (m === 'atk') { voice(t, { f0: 85, f1: 70, dur: 0.22, peak: 0.45, F1: 550, F2: 1000, a: 0.01, growl: 0.4 }); return; }
      voice(t, { f0: m === 'die' ? 110 : 75, f1: m === 'die' ? 55 : 95, dur: 0.9, peak: 0.45, F1: 600, F2: 1050, growl: 0.6, a: 0.06 });
    },
    wyrm(t, m) { // dragon roar with a fiery rasp
      const d = m === 'atk' ? 0.45 : 1.3;
      voice(t, { f0: m === 'die' ? 160 : 70, f1: m === 'die' ? 40 : 110, dur: d, peak: 0.5, F1: 500, F2: 1300, growl: 0.75, a: 0.06 });
      noise(t, { dur: d, peak: 0.3, filter: 'bandpass', f0: 900, f1: 2200, q: 1, a: 0.1 });
      tone(t, { type: 'sine', f0: 45, f1: 32, dur: d, peak: 0.4 });
    },
    lich(t, m) { // eerie detuned chord with a cold whisper
      const d = m === 'atk' ? 0.5 : 1.2;
      for (const r of [1, 1.19, 1.5, 1.78]) tone(t, { type: 'sine', f0: 220 * r * rnd(0.99, 1.01), f1: m === 'die' ? 110 * r : 220 * r, dur: d, peak: 0.07, a: 0.1 });
      noise(t, { dur: d, peak: 0.12, filter: 'bandpass', f0: 4000, f1: 2500, q: 2, a: 0.1 });
      if (m !== 'atk') voice(t, { f0: 130, f1: 90, dur: d, peak: 0.12, F1: 380, F2: 900, vib: 6, vibRate: 3 });
    },
    kraken(t, m) { // deep watery roar and bubbles
      const d = m === 'atk' ? 0.5 : 1.3;
      voice(t, { f0: 55, f1: m === 'die' ? 30 : 70, dur: d, peak: 0.45, F1: 300, F2: 650, growl: 0.5, a: 0.08 });
      for (let i = 0; i < (m === 'atk' ? 6 : 16); i++) bubble(t + rnd(0, d), rnd(150, 500), 0.15);
      noise(t, { dur: d, peak: 0.2, filter: 'lowpass', f0: 500, f1: 200, a: 0.1 });
    },
  };
  Object.assign(MONSTER_VOICE, {
    sheep(t, m) { // "baa-a-a": a bleat with a fast wobble
      const d = m === 'atk' ? 0.45 : 0.8;
      voice(t, { f0: m === 'die' ? 520 : 440, f1: m === 'die' ? 260 : 400, dur: d, peak: 0.3, F1: 800, F2: 1500, vib: 40, vibRate: 11, a: 0.04 });
    },
    boar(t, m) { // snorting grunts, a squeal when it falls
      if (m === 'die') { voice(t, { f0: 900, f1: 500, dur: 0.5, peak: 0.25, F1: 1200, F2: 2500, type: 'square' }); return; }
      for (let i = 0; i < (m === 'atk' ? 2 : 4); i++) {
        voice(t + i * 0.16, { f0: rnd(90, 120), f1: 80, dur: 0.12, peak: 0.4, F1: 400, F2: 900, growl: 0.6, a: 0.01 });
        noise(t + i * 0.16, { dur: 0.08, peak: 0.2, filter: 'bandpass', f0: 600, q: 2 });
      }
    },
    bear(t, m) { // a deep roar
      const d = m === 'atk' ? 0.45 : 1.1;
      voice(t, { f0: m === 'die' ? 140 : 80, f1: m === 'die' ? 50 : 100, dur: d, peak: 0.5, F1: 450, F2: 1000, growl: 0.7, a: 0.06 });
      noise(t, { dur: d, peak: 0.15, filter: 'bandpass', f0: 700, f1: 400, q: 1, a: 0.08 });
    },
    hound(t, m) { // ghostly barks and a growl
      if (m === 'atk') { for (let i = 0; i < 2; i++) voice(t + i * 0.18, { f0: 300, f1: 180, dur: 0.12, peak: 0.4, F1: 700, F2: 1400, a: 0.005 }); return; }
      if (m === 'special') { voice(t, { f0: 350, f1: 480, dur: 1.0, peak: 0.25, F1: 600, F2: 1100, type: 'triangle', vib: 10, vibRate: 5, a: 0.15 }); return; }
      voice(t, { f0: 600, f1: 250, dur: 0.5, peak: 0.25, F1: 900, F2: 1600, type: 'triangle', vib: 15, vibRate: 7 });
    },
    yeti(t, m) { // a booming roar with a howl on top
      const d = m === 'atk' ? 0.5 : 1.2;
      voice(t, { f0: 65, f1: m === 'die' ? 40 : 85, dur: d, peak: 0.5, F1: 350, F2: 800, growl: 0.6, a: 0.06 });
      voice(t + 0.05, { f0: 260, f1: m === 'die' ? 140 : 330, dur: d * 0.9, peak: 0.15, F1: 600, F2: 1000, type: 'triangle', vib: 8, vibRate: 5, a: 0.1 });
      tone(t, { type: 'sine', f0: 50, f1: 35, dur: d, peak: 0.35 });
    },
  });
  // Loudness per monster, so quiet voices (rattles, crackles) and huge bosses sit at a similar level.
  const MONSTER_VOL = { skeleton: 2.6, cultist: 1.8, fire_sprite: 2.6, bat: 1.5, spider: 1.4, slime: 1.3, golem: 1.3,
    goblin: 0.8, goblin_archer: 0.85, imp: 0.75, wolf: 1, wraith: 0.85, treant: 0.9, lich: 1.1, ogre: 0.6, wyrm: 0.55, kraken: 0.6, sheep: 0.75, boar: 0.7, bear: 0.65, hound: 0.75, yeti: 0.6 };
  function monster(key, mode) {
    const fn = MONSTER_VOICE[key];
    if (!fn || !on || !ctx || ctx.state !== 'running' || document.hidden) return false;
    const now = ctx.currentTime, id = 'm_' + key + mode;
    if ((id in last && now - last[id] < (mode === 'atk' ? 0.7 : 0.2)) || voices > 10) return true;
    last[id] = now; voices++;
    setTimeout(() => voices--, 600);
    const main = master, g = ctx.createGain();
    g.gain.value = MONSTER_VOL[key] || 1; g.connect(main);
    master = g; // route this voice through its own volume (all helpers default to master)
    try { fn(now + 0.005, mode); } catch (e) { /* never break the game over a sound */ }
    master = main;
    return true;
  }

  function play(name) {
    if (!on || !ctx || ctx.state !== 'running' || document.hidden || !SOUNDS[name]) return;
    const now = ctx.currentTime;
    if ((name in last && now - last[name] < 0.04) || voices > 10) return; // don't stack the same sound in one instant
    last[name] = now; voices++;
    setTimeout(() => voices--, 300);
    try { SOUNDS[name](now + 0.005); } catch (e) { /* never break the game over a sound */ }
  }
  return {
    play, monster, MONSTERS: () => Object.keys(MONSTER_VOICE),
    get on() { return on; },
    toggle() { on = !on; try { localStorage.setItem('idle-realms-sound', on ? '1' : '0'); } catch (e) { /* ignore */ } if (on) init(); return on; },
  };
})();
const sfx = name => Sfx.play(name);
