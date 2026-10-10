import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';

const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});
const context=await browser.newContext({offline:true,viewport:{width:1440,height:1000},acceptDownloads:true});
const page=await context.newPage(),errors=[],network=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url());});
page.on('dialog',d=>d.accept());
const url=pathToFileURL(path.join(root,'index.html')).href;
const qa=path.join(root,'source','qa','onboarding');mkdirSync(qa,{recursive:true});
const go=async hash=>{await page.goto(`${url}#${hash}`);await page.locator('#main').waitFor();};
const input=k=>page.locator(`[data-input="${k}"]`);
const feedback=async()=>{await page.locator('[data-action="check"]').click();return page.locator('#feedback').innerText();};
try{
 await go('overview');
 assert.equal(await page.locator('.f-theme').count(),21);
 const card=page.locator('.f-theme').filter({has:page.getByRole('heading',{name:'新成员融入与组织能力建设',exact:true})});
 assert.equal(await card.count(),1);await card.locator('button').click();
 assert.equal(await page.locator('[data-f-select="theme"]').inputValue(),'talent');
 for(const id of ['F10','F13','F14'])assert.ok(await page.locator(`.f-path a[href="#game/${id}"]`).count());
 for(const id of ['F15','F16','G8','G9'])assert.equal(await page.locator(`.f-path a[href="#game/${id}"]`).count(),0);
 await page.locator('[data-f-select="theme"]').selectOption('tooling');assert.ok((await page.locator('.f-path').innerText()).length>10);
 for(const id of ['gitmaintenance','governance','evaluation'])assert.equal(await page.locator(`[data-f-select="theme"] option[value="${id}"]`).count(),0);

 await go('game/F13/1');
 for(const [key,value]of [['task-i1','找到当前说明'],['fact-i1','虚构说明 v3 与维护者'],['hypothesis-i1','旧链接可能过期'],['verify-i1','向维护者核对当前版本']])await input(key).fill(value);
 assert.match(await feedback(),/当事人证据/);
 await go('game/F13/2');await page.locator('[data-action="event"]').click();
 await go('game/F13/1');await page.reload();assert.equal(await input('fact-i1').inputValue(),'虚构说明 v3 与维护者');
 await go('game/F14/1');
 await input('authority-i1').selectOption('需负责人批准');
 await input('mandate-i1').fill('仅申请脱敏样例的阅读权限');await input('notify-i1').fill('向资料维护者确认范围与期限');
 assert.match(await feedback(),/过程权.*承诺/);
 await page.reload();assert.equal(await input('authority-i1').inputValue(),'需负责人批准');

 const old={format:'chenfeng-decision-playground',version:1,sessions:{F10:{step:1,updatedAt:new Date().toISOString(),notes:{decision:'旧F10记录继续保留'},inputs:{'stage-i1':'有方案或演示'}}}};
 await page.locator('[data-action="backup"]').first().click();
 await page.locator('#import-file').setInputFiles({name:'old-f10.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(old))});
 await page.locator('#dialog').waitFor({state:'hidden'});
 await go('game/F10/1');assert.equal(await page.locator('[data-note="decision"]').inputValue(),'旧F10记录继续保留');
 assert.equal(await input('stage-i1').inputValue(),'有方案或演示');
 await go('game/F10/0');assert.match(await page.locator('.stage-content').innerText(),/校招.*社招.*转岗.*内部流动/s);
 await page.locator('[data-action="backup"]').first().click();
 const downloadEvent=page.waitForEvent('download');await page.locator('[data-action="export-json"]').click();
 const download=await downloadEvent,backup=readFileSync(await download.path(),'utf8'),parsed=JSON.parse(backup);
 assert.equal(parsed.format,'chenfeng-decision-playground');assert.equal(parsed.sessions.F13.inputs['fact-i1'],'虚构说明 v3 与维护者');
 assert.equal(parsed.sessions.F14.inputs['authority-i1'],'需负责人批准');
 for(const id of ['F15','F16','G8','G9'])assert.ok(!Object.hasOwn(parsed.sessions,id));
 await page.locator('#import-file').setInputFiles({name:'roundtrip.json',mimeType:'application/json',buffer:Buffer.from(backup)});
 await page.locator('#dialog').waitFor({state:'hidden'});
 await go('game/F14/1');assert.equal(await input('mandate-i1').inputValue(),'仅申请脱敏样例的阅读权限');

 await go('workshop');assert.equal(await page.locator('[data-x-scope="workshop"][data-x-field="template"] option').count(),60);
 for(const id of ['F13','F14']){
  await page.locator('[data-x-scope="workshop"][data-x-field="template"]').selectOption(id);
  await page.locator('[data-x-action="workshop-template"]').click();
  assert.equal(await page.locator('[data-x-scope="workshop"][data-x-field="title"]').inputValue(),id==='F13'?'新成员内部工具导航':'权限与资料边界握手');
 }
 for(const id of ['F15','F16','G8','G9'])assert.equal(await page.locator(`[data-x-scope="workshop"][data-x-field="template"] option[value="${id}"]`).count(),0);

 let viewChecks=0;
 for(const width of [360,390,768,1440])for(const route of ['overview','game/F10/1','game/F13/1','game/F14/1','workshop']){
  await page.setViewportSize({width,height:1000});await go(route);
  if(route==='overview')await page.locator('[data-f-select="theme"]').selectOption('talent');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${width}/${route} overflow`);viewChecks++;
  if(route==='game/F14/1')await page.screenshot({path:path.join(qa,`${width}-permissions-board.png`),fullPage:true});
  if(route==='overview'&&[390,1440].includes(width))await card.screenshot({path:path.join(qa,`${width}-new-member-card.png`)});
 }
 assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
 writeFileSync(path.join(qa,'results.json'),JSON.stringify({games:60,themes:21,onboardingBoards:['F13','F14'],newMemberScope:true,oldF10Import:true,permissionBoundaries:true,excludedContent:true,backupRoundtrip:true,hostTemplates:true,viewChecks,errors,network},null,2));
 console.log('PASS public onboarding: scope, tools and permission boards, F10 import, excluded content, backups, templates, 20 responsive views; zero HTTP/JS errors');
}finally{await browser.close();}
