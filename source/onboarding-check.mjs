import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
const dir=path.dirname(fileURLToPath(import.meta.url)),ctx=vm.createContext({});
for(const file of ['games.js','expansion-data.js','facilitation-data.js','core.js','facilitation-core.js'])vm.runInContext(readFileSync(path.join(dir,file),'utf8'),ctx);
const games=ctx.GAME_DATA.games,theme=ctx.FACILITATION_DATA.themes.find(t=>t.id==='talent');
assert.equal(theme.title,'新成员融入与组织能力建设');
assert.match(games.find(g=>g.id==='F10').scene,/校招.*社招.*转岗.*内部流动/);
for(const id of ['F13','F14']){
 const g=games.find(g=>g.id===id);assert.ok(g,`${id} missing`);assert.ok(g.scene.length>80);assert.ok(g.sample.length>=3);assert.ok(g.roles.length>=3);
 assert.ok(theme.games.includes(id),`${id} onboarding route missing`);
 assert.ok(ctx.FACILITATION_DATA.themes.find(t=>t.id==='tooling').games.includes(id));
}
assert.match(games.find(g=>g.id==='F13').scene,/不登录.*不借用/);
assert.match(games.find(g=>g.id==='F14').scene,/最小必要权限/);
assert.match(games.find(g=>g.id==='F14').sample.join(' '),/权限.*分享|分享.*权限/);
const old={format:'chenfeng-decision-playground',version:1,sessions:{F10:{step:2,notes:{decision:'原记录保留'},inputs:{'stage-i1':'有方案或演示'}}}};
assert.equal(ctx.PLAYGROUND_CORE.validateImport(old,games).sessions.F10.notes.decision,'原记录保留');
for(const id of ['F15','F16','G8','G9']){
 assert.ok(!games.some(g=>g.id===id),`${id} is excluded from this public edition`);
 assert.throws(()=>ctx.PLAYGROUND_CORE.validateImport({format:'chenfeng-decision-playground',version:1,sessions:{[id]:{}}},games),`${id} records cannot enter the public edition silently`);
}
assert.throws(()=>ctx.PLAYGROUND_CORE.validateImport({format:'chenfeng-decision-playground',version:1,sessions:{F14:{inputs:{'authority-i1':{invalid:'object'}}}}},games));
assert.equal(games.length,60);assert.equal(ctx.FACILITATION_DATA.themes.length,21);
console.log('PASS public onboarding: tool navigation, minimum permission boundaries, excluded content/import rejection, F10 compatibility, 60 games and 21 themes');
