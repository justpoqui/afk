// Player protection: signed saves, rolling backups with automatic recovery, strict validation of
// everything loaded from storage, a clock-rollback guard, and portable save export / import.
//
// On Android the save is signed with an HMAC key kept in the phone's Android Keystore (the key never
// leaves the secure hardware). A save that was edited or damaged fails its check and the newest good
// backup is restored instead. Every save also carries a portable checksum so backups restored to a
// new phone (where the Keystore key is new) still load.
const SAVE_V2 = 'idle-realms-save-v2';
const LEGACY_SAVE = 'idle-realms-save-v1';
const PREVIOUS = 'idle-realms-save-previous'; // the last good save before the current one
const QUARANTINE = 'idle-realms-save-quarantine';
const BACKUPS = ['idle-realms-backup-0', 'idle-realms-backup-1', 'idle-realms-backup-2'];
const BACKUP_EVERY_MS = 5 * 60 * 1000;
const CLOCK_SLACK_MS = 2 * 60 * 1000;
const EXPORT_PREFIX = 'IR1.';
const BAD_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

const security = { source: null, problem: null, lastBackup: 0, signed: false };

// ---- storage (every access guarded: storage can be unavailable or full) ----
const store = {
  get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } },
  del(k) { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
};

// ---- checksums & signatures ----
// Portable 64-bit checksum (two FNV-1a passes): detects damage; the Keystore HMAC detects edits.
function checksum(str) {
  let a = 0x811c9dc5, b = 0x01000193 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    a = Math.imul(a ^ c, 0x01000193);
    b = Math.imul(b ^ (c + i), 0x01000193 + 0x9e3779b0);
  }
  return (a >>> 0).toString(16).padStart(8, '0') + (b >>> 0).toString(16).padStart(8, '0');
}
const native = () => (typeof window !== 'undefined' && window.IRNative) || null;
function nativeSign(data) {
  const n = native();
  if (!n || !n.sign) return null;
  try { const s = n.sign(data); return s || null; } catch (e) { return null; }
}
const keyIsNew = () => { const n = native(); try { return !!(n && n.freshKey && n.freshKey()); } catch (e) { return false; } };

function sealEnvelope(json) {
  const env = { v: 2, at: Date.now(), data: json, sum: checksum(json) };
  const sig = nativeSign(json);
  if (sig) env.sig = sig;
  security.signed = !!sig;
  return JSON.stringify(env);
}
// Returns the save JSON string if the envelope is intact and authentic, otherwise null.
function openEnvelope(raw) {
  let env;
  try { env = JSON.parse(raw); } catch (e) { return null; }
  if (!env || env.v !== 2 || typeof env.data !== 'string' || checksum(env.data) !== env.sum) return null;
  const sig = nativeSign(env.data);
  if (sig) {
    if (env.sig === sig) return env.data;
    // A brand-new Keystore key means a reinstall or a restored backup on a new phone: the save is
    // intact (checksum above) but was signed by the old key, so accept it and it gets re-signed.
    if (keyIsNew()) return env.data;
    return null; // signed by this phone's key but altered since: rejected
  }
  return env.data; // no Keystore available (development builds): checksum only
}

// ---- reading & writing ----
function writeSave(obj) {
  obj.lastSeen = Date.now();
  const env = sealEnvelope(JSON.stringify(obj));
  const cur = store.get(SAVE_V2);
  if (cur && openEnvelope(cur) != null) store.set(PREVIOUS, cur); // keep the last good save one step behind
  store.set(SAVE_V2, env);
  const now = Date.now();
  if (now - security.lastBackup > BACKUP_EVERY_MS) { // rolling backups: newest in slot 0
    for (let i = BACKUPS.length - 1; i > 0; i--) { const prev = store.get(BACKUPS[i - 1]); if (prev) store.set(BACKUPS[i], prev); }
    store.set(BACKUPS[0], env);
    security.lastBackup = now;
  }
}

// Finds the newest trustworthy save. Returns a plain object (already stripped of dangerous keys) or null.
function readSave() {
  security.problem = null;
  const main = store.get(SAVE_V2);
  const candidates = [[main, 'save'], [store.get(PREVIOUS), 'your previous save'], ...BACKUPS.map((k, i) => [store.get(k), `backup ${i + 1}`])];
  for (const [raw, source] of candidates) {
    if (!raw) continue;
    const json = openEnvelope(raw);
    if (json == null) continue;
    try {
      const obj = cleanKeys(JSON.parse(json));
      if (!obj || typeof obj !== 'object') continue;
      security.source = source;
      if (source !== 'save' && main) security.problem = `Your save didn't pass its safety check, so it was restored from ${source}.`;
      return obj;
    } catch (e) { /* try the next candidate */ }
  }
  const legacy = store.get(LEGACY_SAVE); // saves from before protection: accepted once, then signed
  if (legacy) {
    try { security.source = 'legacy'; return cleanKeys(JSON.parse(legacy)); } catch (e) { /* unreadable */ }
  }
  if (main) { // nothing usable: keep the damaged data aside instead of overwriting it
    store.set(QUARANTINE, main);
    security.problem = "Your save was damaged and no backup could be used, so a new game was started. The damaged save was kept aside.";
  }
  security.source = null;
  return null;
}

// Removes keys that could tamper with JavaScript objects (prototype pollution) at any depth.
function cleanKeys(v, depth = 0) {
  if (depth > 12) return undefined;
  if (Array.isArray(v)) return v.map(x => cleanKeys(x, depth + 1));
  if (v && typeof v === 'object') {
    const out = {};
    for (const k of Object.keys(v)) if (!BAD_KEYS.has(k)) out[k] = cleanKeys(v[k], depth + 1);
    return out;
  }
  return v;
}

// ---- validation: every value is checked against the game's own data and clamped to sane ranges ----
const num = (v, min, max, def) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : def);
const int = (v, min, max, def) => Math.floor(num(v, min, max, def));
const plainObj = v => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});

function validateState(s) {
  const now = Date.now(), MAX = 1e15, fresh = newState();
  s.gold = int(s.gold, 0, MAX, 0); s.gems = int(s.gems, 0, MAX, 0); s.scrolls = int(s.scrolls, 0, MAX, 0);
  s.stage = int(s.stage, 1, 100000, 1);
  s.lastClaim = num(s.lastClaim, 0, now, now);
  s.lastSeen = num(s.lastSeen, 0, Infinity, now);
  s.bonusSlots = int(s.bonusSlots, 0, 400, 0);

  const up = plainObj(s.upgrades);
  s.upgrades = {
    tools: Object.fromEntries(Object.keys(TOOLS).map(k => [k, int(plainObj(up.tools)[k], 0, TOOLS[k].length, 0)]).filter(([, v]) => v)),
    backpack: int(up.backpack, 0, BACKPACK_COST.length, 0), courier: up.courier === true, bankSlots: int(up.bankSlots, 0, 100000, 0),
  };

  const bank = {};
  for (const [id, n] of Object.entries(plainObj(s.bank))) { const k = int(n, 0, MAX, 0); if (ITEMS[id] && k > 0) bank[id] = k; }
  s.bank = bank;

  const inv = [];
  for (const x of Array.isArray(s.inv) ? s.inv : []) {
    if (!x || !ITEMS[x.id]) continue;
    const n = int(x.n, 1, MAX, 1);
    if (ITEMS[x.id].stack) {
      const cap = ITEMS[x.id].maxStack || Infinity;
      inv.push({ id: x.id, n: Math.min(n, cap) });
      if (n > cap) s.bank[x.id] = (s.bank[x.id] || 0) + (n - cap); // over the stack limit: to the bank
    }
    else for (let i = 0; i < Math.min(n, 1000); i++) inv.push({ id: x.id, n: 1 });
  }
  const cap = BASE_INV + 4 * s.upgrades.backpack + s.bonusSlots;
  for (const x of inv.splice(cap)) s.bank[x.id] = (s.bank[x.id] || 0) + x.n; // overflow goes to the bank
  s.inv = inv;

  const skills = {};
  for (const k of Object.keys(SKILLS)) skills[k] = { xp: num(plainObj(plainObj(s.skills)[k]).xp, 0, XP_TABLE[99] * 50, fresh.skills[k].xp) };
  s.skills = skills;

  const looks = {};
  for (const [id, st] of Object.entries(plainObj(s.looks))) if (HERO_BY_ID[id]) looks[id] = int(st, 0, MAX_LOOK_STARS, 0);
  if (!Object.keys(looks).length) looks.tobin = 0;
  s.looks = looks;

  const p = plainObj(s.player), gear = emptyGear();
  for (const slot of GEAR_SLOTS) { const id = plainObj(p.gear)[slot]; if (ITEMS[id] && ITEMS[id].slot === slot) gear[slot] = id; }
  s.player = {
    skin: looks[p.skin] !== undefined ? p.skin : Object.keys(looks)[0],
    style: STYLES[p.style] ? p.style : 'strength',
    ctype: COMBAT_TYPES[p.ctype] ? p.ctype : 'melee',
    gear,
  };

  const st = plainObj(s.stats), stats = {};
  for (const [k, def] of Object.entries(fresh.stats)) stats[k] = typeof def === 'number' ? int(st[k], 0, MAX, 0) : {};
  for (const [id, n] of Object.entries(plainObj(st.actions))) if (ACTIONS[id]) stats.actions[id] = int(n, 0, MAX, 0);
  const monsterKeys = new Set(AREAS.flatMap(a => a.monsters.map(m => m[0])).concat([...MONSTERS, ...BOSSES].map(m => m.sprite.replace(/^(mon|boss)_/, ''))));
  for (const [k, n] of Object.entries(plainObj(st.mkills))) if (monsterKeys.has(k)) stats.mkills[k] = int(n, 0, MAX, 0);
  s.stats = stats;

  const taskKeys = new Set(TASK_TIERS.flatMap(t => t.tasks.map(x => x.key)));
  s.tasksClaimed = [...new Set((Array.isArray(s.tasksClaimed) ? s.tasksClaimed : []).filter(k => taskKeys.has(k)))];
  s.tiersClaimed = [...new Set((Array.isArray(s.tiersClaimed) ? s.tiersClaimed : []).filter(i => Number.isInteger(i) && i >= 0 && i < TASK_TIERS.length))];
  const quests = {};
  for (const q of QUESTS) if (plainObj(s.quests)[q.id] === 'done') quests[q.id] = 'done';
  s.quests = quests;

  const a = plainObj(s.active);
  s.active = ACTIONS[a.action] ? { action: a.action, start: num(a.start, 0, now, now) } : null;
  s.provision = ITEMS[s.provision] && ITEMS[s.provision].heal ? s.provision : null;
  const pot = plainObj(s.potion);
  s.potion = ITEMS[pot.id] && ITEMS[pot.id].effect ? { id: pot.id, battles: int(pot.battles, 1, POTION_BATTLES, 1) } : null;

  // Only known fields survive.
  for (const k of Object.keys(s)) if (!(k in fresh) && k !== 'lastSeen') delete s[k];
  return s;
}

// ---- clock guard: moving the phone's clock back must not grant extra idle or offline progress ----
function clockGuard(s) {
  const now = Date.now();
  if (s.lastSeen && now < s.lastSeen - CLOCK_SLACK_MS) {
    s.lastClaim = now;                       // idle rewards restart from now
    if (s.active) s.active.start = now;      // the running action restarts from now
    s.lastSeen = now;
    return true;
  }
  return false;
}

// ---- portable export / import (move a save between phones, or keep a copy) ----
function exportSave(obj) {
  const data = JSON.stringify(obj);
  const env = JSON.stringify({ v: 2, data, sum: checksum(data) });
  return EXPORT_PREFIX + btoa(unescape(encodeURIComponent(env)));
}
function importSave(code) {
  code = String(code || '').trim();
  if (!code.startsWith(EXPORT_PREFIX) || code.length > 2_000_000) return null;
  let env;
  try { env = JSON.parse(decodeURIComponent(escape(atob(code.slice(EXPORT_PREFIX.length))))); } catch (e) { return null; }
  if (!env || env.v !== 2 || typeof env.data !== 'string' || checksum(env.data) !== env.sum) return null;
  try { return cleanKeys(JSON.parse(env.data)); } catch (e) { return null; }
}
