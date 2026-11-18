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
  };

  function play(name) {
    if (!on || !ctx || ctx.state !== 'running' || document.hidden || !SOUNDS[name]) return;
    const now = ctx.currentTime;
    if ((name in last && now - last[name] < 0.04) || voices > 10) return; // don't stack the same sound in one instant
    last[name] = now; voices++;
    setTimeout(() => voices--, 300);
    try { SOUNDS[name](now + 0.005); } catch (e) { /* never break the game over a sound */ }
  }
  return {
    play,
    get on() { return on; },
    toggle() { on = !on; try { localStorage.setItem('idle-realms-sound', on ? '1' : '0'); } catch (e) { /* ignore */ } if (on) init(); return on; },
  };
})();
const sfx = name => Sfx.play(name);
