import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url)),ctx=vm.createContext({});
for(const name of ['games.js','expansion-data.js','facilitation-data.js','expansion-core.js','facilitation-core.js']){assert.ok(existsSync(path.join(dir,name)),name);vm.runInContext(readFileSync(path.join(dir,name),'utf8'),ctx);}
assert.equal(ctx.GAME_DATA.games.length,60);assert.equal(ctx.EXPANSION_DATA.scales.length,7);
const f=ctx.FACILITATION_DATA,c=ctx.FACILITATION_CORE;
assert.equal(f.themes.length,21);
for(const theme of f.themes)for(const id of theme.games)assert.ok(ctx.GAME_DATA.games.some(g=>g.id===id),`${theme.id} ${id}`);
for(const theme of f.themes)for(const scale of ctx.EXPANSION_DATA.scales){
 const r=c.recommend({theme:theme.id,scale:scale.id,minutes:10,authority:'none'});
 assert.ok(r.games.length>0,`${theme.id} ${scale.id}`);assert.equal(r.scale.id,scale.id);
 assert.ok(r.warnings.some(x=>x.includes('授权')));assert.ok(r.warnings.some(x=>x.includes('时间')));
}
assert.ok(JSON.stringify(ctx.GAME_DATA.games.find(g=>g.id==='G2').roles).includes('自愿'));
for(const g of ctx.GAME_DATA.games.filter(g=>['F','G'].includes(g.family))){assert.ok(g.scene.length>80,g.id);assert.ok(g.sample.length>=3,g.id);assert.ok(g.config.items.length>=3,g.id);}
const plan=c.recommend({theme:'retrospective',scale:'org500',minutes:60,authority:'none'});
assert.ok(plan.warnings.some(x=>x.includes('授权')));assert.ok(plan.warnings.some(x=>x.includes('时间')));assert.ok(plan.games.includes('F1'));
const a=c.newAssembly('org500');assert.equal(a.groups.length,63);assert.equal(a.groups.reduce((n,g)=>n+g.people,0),500);
a.groups[0].goal='目标';a.groups[0].representative='甲';a.groups[0].mandate='只代表本组建议';a.groups[0].proposal='范围一';a.groups[0].dissent='还有反例';a.groups[0].returned=true;
assert.equal(c.assemblyStatus(a).returned,1);assert.equal(c.validateAssembly(a).groups.length,63);
assert.throws(()=>c.validateAssembly({...a,groups:[{...a.groups[0],people:999}]}));
assert.throws(()=>c.validateAssembly({...a,groups:[{...a.groups[0],mandate:3}]}));
assert.equal(c.checkSequence([{id:'a'},{id:'b'},{id:'c'}],[['a','b']],{order_a:'3',order_b:'1',order_c:'2'}).inversions.length,1);
assert.equal(c.checkSequence([{id:'a'},{id:'b'}],[['a','b']],{order_a:'1',order_b:'1'}).duplicates,true);
console.log('PASS 60 games, 21 themes, 7 scales, 147 theme/scale recommendations, 500-person 63-group plan, voluntary conflict and authority validation');
