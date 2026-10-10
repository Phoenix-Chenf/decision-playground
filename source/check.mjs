import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
assert.ok(existsSync(path.join(root, 'games.js')), '24 个完整游戏尚未建立');
const context = vm.createContext({});
vm.runInContext(readFileSync(path.join(root, 'games.js'), 'utf8'), context);
const games = context.GAME_DATA.games;
assert.equal(games.length, 24);
assert.equal(new Set(games.map(g => g.id)).size, 24);
assert.equal(new Set(games.map(g => g.engine)).size, 24, '每个游戏需要独立操作机制');
for (const family of ['A', 'B', 'C', 'D']) {
  assert.equal(games.filter(g => g.family === family).length, 6);
}
for (const game of games) {
  for (const field of ['title', 'scene', 'mission', 'event', 'sample', 'config']) {
    assert.ok(game[field], `${game.id} 缺少 ${field}`);
  }
  assert.ok(game.scene.length > 80, `${game.id} 场景内容过少`);
  for (const field of ['roles', 'materials', 'rounds', 'debrief', 'principles', 'pitfalls', 'deliverables']) {
    assert.ok(game[field].length >= 2, `${game.id} 的 ${field} 不完整`);
  }
  assert.ok(game.debrief.length >= 3);
  assert.ok(game.config.items?.length >= 3, `${game.id} 没有足够操作项目`);
}
assert.ok(existsSync(path.join(root, 'core.js')), '游戏计算与数据校验尚未实现');
vm.runInContext(readFileSync(path.join(root, 'core.js'), 'utf8'), context);
const core = context.PLAYGROUND_CORE;
assert.equal(core.cost({ runs: 20, before: 30, after: 8, review: 4, maintenance: 90, setup: 120 }).net, 150);
assert.equal(core.cost({ runs: 1, before: 10, after: 8, review: 4, maintenance: 30, setup: 120 }).net, -152);
assert.equal(core.rates({success: 80, failed: 20, excluded: 0, claimed: 80}).complete, 80);
assert.equal(core.rates({success: 0, failed: 0, excluded: 0, claimed: 0}).complete, null);
assert.equal(core.offer({weeks:6, scope:3, support:2, ownership:1}).feasible, true);
assert.equal(core.offer({weeks:2, scope:5, support:0, ownership:0}).feasible, false);
const clean = core.validateImport({format:'chenfeng-decision-playground',version:1,sessions:{A1:{notes:{opening:'test'},step:2,completed:true}}}, games);
assert.equal(clean.sessions.A1.notes.opening, 'test');
assert.throws(() => core.validateImport({format:'wrong',sessions:{}}, games));
assert.throws(() => core.validateImport({format:'chenfeng-decision-playground',version:1,sessions:{Z99:{}}}, games));
assert.throws(() => core.validateImport({format:'chenfeng-decision-playground',version:1,sessions:{A1:{step:99}}}, games));
assert.throws(() => core.validateImport({format:'chenfeng-decision-playground',version:1,sessions:{A1:{notes:{opening:{bad:'value'}}}}}, games));
assert.throws(() => core.validateImport({format:'chenfeng-decision-playground',version:1,sessions:{B2:{inputs:{cutoff:99}}}}, games));
assert.throws(() => core.validateImport({format:'chenfeng-decision-playground',version:1,sessions:{C4:{inputs:{scope:999}}}}, games));
assert.throws(() => core.validateImport({format:'chenfeng-decision-playground',version:1,sessions:{A1:{completed:'false'}}}, games));
assert.equal(core.validateImport({format:'chenfeng-decision-playground',version:1,route:'first',sessions:{}}, games).route,'first');
console.log('PASS: 24 个游戏、24 种操作机制、计算边界和导入校验');
