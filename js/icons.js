// Game icons: every emoji the game shows is swapped for a Blender-rendered icon as it reaches the screen.
// Icons come from assets/icons (UI symbols), assets/items (materials and gear) or assets/sprites (monsters).
// A MutationObserver converts text as pages, modals, toasts and battle numbers are drawn, so game code can
// keep writing plain emoji. Emoji in <option> and <textarea> stay as text (they can't hold images).
const ICON_SRC = (() => {
  const ic = n => `assets/icons/${n}.webp`, it = n => `assets/items/${n}.webp`, sp = n => `assets/sprites/${n}_smooth.webp`;
  const m = {
    // currency and core
    '🪙': ic('coin'), '💎': ic('gem'), '📜': ic('scroll'), '🎒': ic('backpack'), '🏦': ic('bank'), '❤️': ic('heart'), '💖': ic('heart'),
    '⚔️': ic('swords'), '🛡️': ic('shield'), '🏹': ic('bow'), '🔮': it('orb4'), '🙏': ic('grace'), '🔒': ic('lock'), '🔣': it('glyph_void'),
    '👑': ic('crown'), '🔥': ic('flame'), '💀': ic('skull'), '☠': ic('skull'), '☠️': ic('skull'), '✨': ic('sparkle'), '⚠️': ic('warning'),
    '⏳': ic('hourglass'), '🎁': 'assets/chests/golden.webp', '📚': ic('books'), '📋': ic('clipboard'), '🍽️': ic('plate'), '🔊': ic('speaker'),
    '🔇': ic('mute'), '📥': ic('withdraw'), '👊': ic('fist'), '🦶': ic('foot'), '🧙': it('mhood4'), '🪄': it('staff2'), '🧍': sp('hero_tobin'),
    '🏟️': ic('arena'), '🧩': ic('puzzle'), '💥': ic('burst'), '💫': ic('dizzy'), '⚰️': ic('coffin'), '🌳': ic('tree'), '🌀': ic('portal'),
    '⛏️': ic('pickaxe'), '🎣': ic('rod'), '🎯': ic('target'), '💪': ic('muscle'), '⚡': ic('lightning'), '🪦': ic('tombstone'), '💨': ic('wind'),
    '🏪': ic('shop'), '🧠': ic('books'), '⬆️': ic('up'), '🛠️': ic('tools'), '🦉': ic('owl'), '✅': ic('check'), '🕒': ic('clock'),
    '🌾': ic('wheat'), '🌲': ic('pine'), '🏔️': ic('mountain'), '🌊': ic('wave'), '🕳️': ic('hole'), '❄️': ic('snowflake'), '🔭': ic('telescope'),
    '🌉': ic('bridge'), '🥉': ic('medal_bronze'), '🥈': ic('medal_silver'), '🥇': ic('medal_gold'), '🏠': ic('house'), '🗺️': ic('map'),
    '🏰': ic('castle'), '🧺': ic('basket'), '📦': ic('box'), '📖': ic('spellbook'), '🚪': ic('door'), '🏆': ic('trophy'), '👁️': ic('eye'),
    '🦅': ic('eagle'), '🌱': ic('sprout'), '🌪️': ic('tornado'), '🌟': ic('star'),
    // skills
    '🪓': ic('axe'), '🔨': ic('hammer'), '🪚': ic('saw'), '🫙': it('vial'), '🪣': ic('tub'), '🧶': ic('yarn'), '🍳': ic('pan'), '⚗️': ic('alembic'),
    // gear slots and materials
    '🗡️': it('sword2'), '⛑️': it('helm2'), '👕': it('armor2'), '👖': it('legs2'), '🧤': it('gloves2'), '👢': it('boots2'),
    '🪵': it('log1'), '🪨': it('ore0'), '🐟': it('fish1'), '🐠': it('fish1'), '🐡': it('fish2'), '🦈': it('fish3'), '🐍': it('fish4'),
    '🧪': it('pot0'), '🍖': it('burnt'), '🦴': it('bones'), '⚱️': it('ash'), '🍱': it('food4'), '🍣': it('food1'), '🍢': it('food0'),
    '🍲': it('food2'), '🥩': it('food3'), '🍤': it('food5'), '🍞': it('bread'), '🫧': it('glass'), '🧱': it('bar1'), '🟫': it('leather1'),
    '🧵': it('cloth'), '🌿': it('herb0'), '🌼': it('herb1'), '🌸': it('herb2'), '🌶️': it('herb3'), '🍀': it('herb4'), '🪷': it('herb6'),
    '🥀': it('herb7'), '🕸️': it('silk'), '🦷': it('fang'), '🍯': it('sap'), '⏱': ic('hourglass'),
    // monsters
    '🟢': sp('mon_slime'), '🐺': sp('mon_wolf'), '🐉': sp('boss_wyrm'), '🐻': sp('mon_bear'), '🦇': sp('mon_bat'), '👻': sp('mon_wraith'),
    '😈': sp('mon_imp'), '🐑': sp('mon_sheep'), '👺': sp('mon_goblin'), '🕷️': sp('mon_spider'), '🗿': sp('mon_golem'), '🐗': sp('mon_boar'),
    '🐕': sp('mon_hound'), '🦍': sp('mon_yeti'), '👹': sp('boss_ogre'), '🧟': sp('boss_lich'), '🐙': sp('boss_kraken'),
  };
  return m;
})();
// Longest first, so multi-character emoji win over their parts; the variation selector (U+FE0F) is optional.
const ICON_KEYS = Object.keys(ICON_SRC).sort((a, b) => b.length - a.length);
const ICON_RE = new RegExp(ICON_KEYS.map(k => k.replace(/️/g, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\uFE0F?').join('|'), 'gu');
const iconFor = e => ICON_SRC[e] || ICON_SRC[e + '️'] || ICON_SRC[e.replace(/️/g, '')];
const SKIP_TAGS = new Set(['OPTION', 'SELECT', 'TEXTAREA', 'SCRIPT', 'STYLE', 'TITLE']);

function iconizeText(node) {
  const text = node.nodeValue;
  ICON_RE.lastIndex = 0;
  if (!ICON_RE.test(text)) return;
  ICON_RE.lastIndex = 0;
  const frag = document.createDocumentFragment();
  let last = 0, m;
  while ((m = ICON_RE.exec(text))) {
    const src = iconFor(m[0]);
    if (!src) continue;
    if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
    const img = document.createElement('img');
    img.className = 'gi'; img.src = src; img.alt = m[0]; img.draggable = false;
    frag.appendChild(img);
    last = m.index + m[0].length;
  }
  if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
  node.parentNode.replaceChild(frag, node);
}
function iconize(root) {
  if (root.nodeType === 3) { if (root.parentNode && !SKIP_TAGS.has(root.parentNode.nodeName)) iconizeText(root); return; }
  if (root.nodeType !== 1 || SKIP_TAGS.has(root.nodeName)) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: n => (n.parentNode.closest && n.parentNode.closest('option,select,textarea') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(iconizeText);
}
// A missing icon falls back to the emoji (listener: the security policy forbids inline handlers).
document.addEventListener('error', e => { const t = e.target; if (t && t.classList && t.classList.contains('gi')) t.replaceWith(t.alt); }, true);
new MutationObserver(muts => {
  for (const mu of muts) {
    if (mu.type === 'characterData') iconize(mu.target);
    else mu.addedNodes.forEach(iconize);
  }
}).observe(document.body, { childList: true, subtree: true, characterData: true });
iconize(document.body);
