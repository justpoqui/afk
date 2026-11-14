// Lists every item that has no rendered icon yet.  Usage: node art/check-item-icons.js
// Add a builder for each missing id in art/blender/items.py, then: python art/blender/items.py <id>
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const ctx = vm.createContext({ console, Math, Object, Array, JSON });
const src = ['js/data.js', 'js/skilldata.js', 'js/content.js'].map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
vm.runInContext(src + '\n;this.ITEMS = ITEMS;', ctx);
const missing = Object.values(ctx.ITEMS).filter(it => !fs.existsSync(path.join(root, it.img)));
const builders = fs.readFileSync(path.join(root, 'art/blender/items.py'), 'utf8');
if (!missing.length) console.log(`All ${Object.keys(ctx.ITEMS).length} items have icons.`);
for (const it of missing) console.log(`MISSING ${it.id} (${it.name})${builders.includes(`'${it.id}'`) ? '' : ' (no builder in items.py yet)'}`);
process.exitCode = missing.length ? 1 : 0;
