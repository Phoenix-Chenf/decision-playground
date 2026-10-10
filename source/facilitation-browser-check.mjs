import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
const dir=path.dirname(fileURLToPath(import.meta.url)),root=path.dirname(dir),require=createRequire(import.meta.url);
const {chromium}=require('playwright'),b=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})}),ctx=await b.newContext({acceptDownloads:true}),p=await ctx.newPage();
const errors=[],network=[];p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url());});const url=pathToFileURL(path.join(root,'index.html')).href;
async function go(hash){await p.goto(`${url}#${hash}`);await p.locator('#main').waitFor();}
const sel=k=>p.locator(`[data-f-select="${k}"]`),action=k=>p.locator(`[data-f-action="${k}"]`).first();
async function download(k){const ev=p.waitForEvent('download');await action(k).click();const dl=await ev;return readFileSync(await dl.path(),'utf8');}
try{
 await go('overview');assert.equal(await p.locator('.f-theme').count(),21);
 const themeIds=await sel('theme').locator('option').evaluateAll(options=>options.map(o=>o.value));
 assert.equal(themeIds.length,21);
 for(const id of ['gitmaintenance','governance','evaluation'])assert.ok(!themeIds.includes(id));
 for(const scale of ['small','midsize','scrum4','org125','org500'])for(const theme of themeIds){await sel('scale').selectOption(scale);await sel('theme').selectOption(theme);assert.ok((await p.locator('.f-path').innerText()).length>8);}
 await sel('scale').selectOption('org500');await sel('authority').selectOption('none');await sel('minutes').selectOption('60');await sel('format').selectOption('allhands');assert.match(await p.locator('.f-recommendation .warning-banner').innerText(),/授权/);assert.match(await p.locator('.f-format').innerText(),/全员同场/);const plan=await download('plan-export');assert.ok(plan.includes('500'));assert.ok(plan.includes('时间不足'));
 await action('plan-assembly').click();await p.waitForURL(/#assembly$/);await p.locator('.f-group').first().waitFor();assert.equal(await p.locator('.f-group').count(),63);
 await p.locator('.f-group summary').first().click();for(const [k,v]of[['facts','公开事实'],['goal','候选'],['representative','虚构代表'],['mandate','只能建议'],['dissent','<img src=x onerror="window.pwned=1">一条不同意见'],['returnNote','回传原句']])await p.locator(`[data-f-group="T01"][data-f-field="${k}"]`).fill(v);
 await p.locator('[data-f-group="T01"][data-f-field="returned"]').check();assert.ok((await p.locator('#f-stats').innerText()).includes('1'));
 await p.locator('[data-f-group="T01"][data-f-field="goal"]').fill('改变目标');assert.equal(await p.locator('[data-f-group="T01"][data-f-field="returned"]').isChecked(),false);
 const json=await download('assembly-json');const state=JSON.parse(json);assert.equal(state.assembly.people,500);assert.equal(state.assembly.groups.length,63);assert.equal(state.assembly.groups[0].goal,'改变目标');assert.equal(await p.evaluate(()=>window.pwned),undefined);
 const cards=await download('group-cards');assert.equal((cards.match(/class="card"/g)||[]).length,63);assert.ok(!cards.includes('一条不同意见'));
 const md=await download('assembly-md');assert.ok(md.includes('T63'));assert.ok(md.includes('待确认'));
 await p.locator('#f-import').setInputFiles({name:'group.json',mimeType:'application/json',buffer:Buffer.from(json)});await p.locator('#f-import-preview').waitFor();await action('assembly-import-confirm').click();assert.equal(await p.locator('.f-group').count(),63);
 const qa=path.join(dir,'qa','facilitation');mkdirSync(qa,{recursive:true});
 for(const width of [360,390,768,1440])for(const route of ['overview','assembly','game/F4/1','game/G2/1','game/G6/1']){await p.setViewportSize({width,height:960});await go(route);assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${width}/${route}`);if(['overview','assembly','game/F4/1'].includes(route))await p.screenshot({path:path.join(qa,`${width}-${route.replaceAll('/','-')}.png`),fullPage:true});}
 await p.setViewportSize({width:390,height:844});await go('overview');await p.locator('[data-action="menu"]').click();await p.locator('dialog [data-nav="assembly"]').click();await p.waitForURL(/#assembly/);assert.equal(await p.locator('dialog').isVisible(),false);
 const blocked=await b.newContext();await blocked.addInitScript(()=>{Object.defineProperty(Storage.prototype,'setItem',{value(){throw new Error('disabled');}});});const ep=await blocked.newPage();await ep.goto(`${url}#assembly`);assert.match(await ep.locator('#f-save').innerText(),/仅本次会话/);await ep.goto(`${url}#workshop`);assert.match(await ep.locator('#x-save').innerText(),/仅本次会话/);await blocked.close();
 await go('%E0%A4%A');assert.equal(await p.locator('.game-card').count(),60);assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
 writeFileSync(path.join(qa,'results.json'),JSON.stringify({themes:21,scales:5,recommendationChecks:105,groups:63,people:500,authorityWarnings:true,assemblyImport:true,originalInputsRetained:true,viewChecks:20,storageFallback:true,malformedHash:true,errors,network},null,2));console.log('PASS 105 overview combinations, 500 people/63 groups, authority, input mutation, JSON/cards/export, 20 responsive views, storage fallback, no errors/network');
}finally{await b.close();}
