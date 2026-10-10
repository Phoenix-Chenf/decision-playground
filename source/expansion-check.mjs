import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url)),ctx=vm.createContext({});
for(const name of ['games.js','expansion-data.js','facilitation-data.js','expansion-core.js']){
  assert.ok(existsSync(path.join(dir,name)),`${name} 尚未实现`);
  vm.runInContext(readFileSync(path.join(dir,name),'utf8'),ctx);
}
const d=ctx.GAME_DATA,x=ctx.EXPANSION_DATA,c=ctx.EXPANSION_CORE;
assert.equal(d.games.length,60);
assert.equal(new Set(d.games.map(g=>g.id)).size,60);
const gameIds=new Set(d.games.map(g=>g.id)),themeIds=new Set(ctx.FACILITATION_DATA.themes.map(t=>t.id));
assert.equal(themeIds.size,21);
for(const id of ['F15','F16','G8','G9'])assert.ok(!gameIds.has(id),`${id} must be absent from the public edition`);
for(const id of ['gitmaintenance','governance','evaluation'])assert.ok(!themeIds.has(id),`${id} must be absent from the public edition`);
for(const route of d.routes)for(const id of route.ids)assert.ok(gameIds.has(id),`broken route ${route.id}: ${id}`);
for(const theme of ctx.FACILITATION_DATA.themes){
 assert.ok(theme.games.length>0,`${theme.id} has no games`);
 for(const id of theme.games)assert.ok(gameIds.has(id),`broken theme ${theme.id}: ${id}`);
}
for(const game of d.games)if(game.theme)assert.ok(themeIds.has(game.theme),`unknown theme ${game.id}: ${game.theme}`);
assert.equal(new Set(d.games.filter(g=>g.family==='E').map(g=>g.config.kind)).size,12);
for(const g of d.games){assert.ok(g.scene.length>80,g.id);for(const f of ['roles','materials','rounds','debrief','sample','principles','pitfalls','deliverables'])assert.ok(g[f].length>=2,`${g.id} ${f}`);assert.ok(g.config.items.length>=3,g.id);}
assert.deepEqual(JSON.parse(JSON.stringify(x.scales.map(s=>s.id))),['solo','trio','small','midsize','scrum4','org125','org500']);
assert.equal(x.scenarios.length,3);assert.equal(x.dialogues.length,6);
for(const s of x.dialogues){assert.equal(s.turns.length,4);for(const t of s.turns)assert.equal(t.options.length,3);}
assert.equal(c.zopa(5,8,9,12).overlap,false);
assert.equal(c.zopa(8,5,6,9).valid,false);
assert.equal(c.zopa(5,8,6,9).low,6);
assert.equal(c.meso([{scope:2,weeks:6,support:1,maintenance:'shared'},{scope:2,weeks:8,support:2,maintenance:'shared'},{scope:3,weeks:8,support:0,maintenance:'shared'}]).equivalent,true);
let state=c.newCampaign('trial','small','test');
state.picks=['g1','g2'];state.dependencies.g1={provider:'平台',receiver:'产品',object:'样例',window:'两周',notice:'联系负责人',owner:'平台',test:'用样例测试',ackA:true,ackB:true};
state.acceptance.g1={definition:'明确样本',source:'本轮记录',threshold:'每条核对',window:'两周',owner:'产品',stop:'边界变化暂停',ackA:true,ackB:true};
state.step=4;
const before=JSON.stringify(state);c.invalidate(state,'目标变化');
assert.equal(state.dependencies.g1.ackA,false);assert.equal(state.acceptance.g1.ackB,false);assert.ok(state.history.length);assert.equal(JSON.parse(before).dependencies.g1.ackA,true);
const lab=c.newLab('capacity','labtest');lab.path=[0,1,2];lab.words=['提问','选项','条件'];
const fork=c.forkLab(lab,1,'forktest');assert.equal(fork.path.length,1);assert.equal(lab.path.length,3);assert.equal(fork.parent,'labtest');
const empty=c.empty();empty.campaigns.push(state);empty.labs.push(lab,fork);
assert.equal(c.validate(empty).campaigns.length,1);
assert.throws(()=>c.validate({...empty,version:99}));
assert.throws(()=>c.validate({...empty,campaigns:[{...state,scale:'unknown'}]}));
assert.throws(()=>c.validate({...empty,labs:[{...lab,path:[4]}]}));
assert.throws(()=>c.validate({...empty,workshop:{title:'a'.repeat(20001)}}));
assert.throws(()=>c.validate(JSON.parse('{"format":"decision-playground-expansion","version":1,"__proto__":{"polluted":true}}')));
const approved=c.newCampaign('trial','small','approved');approved.picks=['g1'];approved.leader=true;approved.completed=true;approved.notes={outcome:'有限试点',return:'回传并共同校准'};
approved.dependencies.g1={provider:'提供方',receiver:'接收方',object:'交付物',window:'两周',notice:'双方通知',owner:'主动承接者',test:'样例核对',ackA:true,ackB:true};
approved.acceptance.g1={definition:'共同定义',source:'可复核样本',threshold:'公开标准',window:'两周',owner:'主动承接者',stop:'边界变化暂停',ackA:true,ackB:true};
assert.equal(c.validate({...c.empty(),campaigns:[approved]}).campaigns[0].completed,true);
assert.throws(()=>c.validate({...c.empty(),campaigns:[{...approved,notes:{...approved.notes,outcome:'暂停'}}]}));
assert.throws(()=>c.validate({...c.empty(),campaigns:[{...approved,notes:{...approved.notes,outcome:'伪造批准'}}]}));
console.log('PASS public expansion: 60 games, 21 themes, 7 scales, excluded content and valid cross-references, 3 campaigns, 6 dialogues, constraints, invalidation, branching, safe import');
