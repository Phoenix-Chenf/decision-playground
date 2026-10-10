import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
const dir=path.dirname(fileURLToPath(import.meta.url)),root=path.dirname(dir),require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})}),context=await browser.newContext({acceptDownloads:true}),page=await context.newPage();
const errors=[],network=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url());});
const url=pathToFileURL(path.join(root,'index.html')).href;
async function go(hash){await page.goto(`${url}#${hash}`);await page.locator('#main').waitFor();}
const xp=(scope,field)=>page.locator(`[data-x-scope="${scope}"][data-x-field="${field}"]`);
async function click(action,value){await page.locator(`[data-x-action="${action}"]${value!==undefined?`[data-x-value="${value}"]`:''}`).first().click();}
async function download(action,value){const promise=page.waitForEvent('download');await click(action,value);const dl=await promise;const file=await dl.path();return readFileSync(file,'utf8');}
try{
 await go('library');assert.equal(await page.locator('.game-card').count(),60);
 for(let n=1;n<=12;n++){
  await go(`game/E${n}/1`);assert.ok(await page.locator('[data-input], [data-note]').count()>2);
  await page.locator('[data-action="check"]').click();assert.ok((await page.locator('#feedback').innerText()).length>40);
 }
 await go('game/E2/1');assert.match(await page.locator('#x-neg-calc').innerText(),/没有交集/);
 await go('game/E4/1');assert.match(await page.locator('#x-neg-calc').innerText(),/三案同值/);
 for(const scale of ['small','scrum4','org125']){
  await go('campaign');await xp('launch','scale-trial').selectOption(scale);await click('new-campaign','trial');await page.waitForURL(/#campaign\//);
  const card=await download('campaign-card','0');assert.ok(!card.includes('第三项需新授权'));
  await click('campaign-step','1');await xp('campaign-pick','g1').check();await xp('campaign-pick','g2').check();await xp('campaign','leader').check();
  await click('campaign-step','2');
  for(const id of ['g1','g2'])for(const field of ['provider','receiver','object','window','notice','owner','test'])await page.locator(`[data-x-scope="campaign-row"][data-x-id="${id}"][data-x-field="${field}"]`).fill(`测试 ${field}`);
  for(const id of ['g1','g2'])for(const field of ['ackA','ackB'])await page.locator(`[data-x-section="dependencies"][data-x-id="${id}"][data-x-field="${field}"]`).check();
  await click('campaign-event');assert.equal(await xp('campaign','leader').isChecked(),false);
  await click('campaign-step','2');assert.equal(await page.locator('[data-x-field="ackA"]').first().isChecked(),false);
  await click('campaign-step','4');await xp('campaign-note','return').fill('回传代表和相关方，收集少数意见');await xp('campaign-note','outcome').selectOption('暂停');
  const md=await download('campaign-export');assert.ok(md.includes('待确认'));assert.ok(md.includes('暂停'));
 }
 await go('campaign');await xp('launch','scale-trial').selectOption('org500');await click('new-campaign','trial');await page.waitForURL(/#campaign\//);
 await click('campaign-step','1');await xp('campaign-pick','g1').check();
 await click('campaign-step','2');
 for(const field of ['provider','receiver','object','window','notice','owner','test'])await page.locator(`[data-x-section="dependencies"][data-x-id="g1"][data-x-field="${field}"]`).fill(`核验 ${field}`);
 for(const field of ['ackA','ackB'])await page.locator(`[data-x-section="dependencies"][data-x-id="g1"][data-x-field="${field}"]`).check();
 await click('campaign-step','3');
 for(const field of ['definition','source','threshold','window','owner','stop'])await page.locator(`[data-x-section="acceptance"][data-x-id="g1"][data-x-field="${field}"]`).fill(`共同校准 ${field}`);
 for(const field of ['ackA','ackB'])await page.locator(`[data-x-section="acceptance"][data-x-id="g1"][data-x-field="${field}"]`).check();
 await click('campaign-step','4');await xp('campaign-note','return').fill('负责人收束后回组，保留异议和复看窗口');await xp('campaign','leader').check();await xp('campaign-note','outcome').selectOption('有限试点');await click('campaign-complete');
 assert.match(await page.locator('.page-heading .subhead').innerText(),/已模拟批准/);
 await click('campaign-step','2');await page.locator('[data-x-section="dependencies"][data-x-field="object"]').fill('已修改的交付物');
 assert.equal(await page.locator('[data-x-section="dependencies"][data-x-field="ackA"]').isChecked(),false);
 await click('campaign-step','3');assert.equal(await page.locator('[data-x-section="acceptance"][data-x-field="ackB"]').isChecked(),false);
 assert.match(await page.locator('.page-heading .subhead').innerText(),/可继续校准/);
 await go('workshop');
 await xp('workshop','scale').selectOption('org125');page.once('dialog',dialog=>dialog.accept());await click('workshop-scale');assert.equal(await page.locator('.x-agenda-row').count(),6);
 await xp('workshop','contextA').fill('私有甲 ONLY-A');await xp('workshop','contextB').fill('私有乙 ONLY-B');await xp('workshop','scene').fill('<script>window.pwned=1</script>公共情境');
 const a=await download('workshop-card','A');assert.ok(a.includes('ONLY-A'));assert.ok(!a.includes('ONLY-B'));assert.ok(a.includes('&lt;script&gt;'));assert.equal(await page.evaluate(()=>window.pwned),undefined);
 const brief=await download('workshop-brief');assert.ok(!brief.includes('ONLY-A'));assert.ok(!brief.includes('ONLY-B'));
 await click('agenda-down','0');assert.match(await xp('agenda','title').first().inputValue(),/条件包/);
 await click('decision-add');assert.equal(await page.locator('.x-decisions .engine-item').count(),3);
 await click('host-timer');await page.waitForTimeout(1150);assert.notEqual(await page.locator('#x-timer').innerText(),'00:00');await click('host-timer');
 await go('lab');await click('new-lab','capacity');await page.waitForURL(/#lab\//);const first=page.url().split('#')[1];
 for(const choice of ['0','2','0','2']){await xp('lab-word','word').fill('自己的表达');await click('lab-choice',choice);}
 assert.equal(await page.locator('.x-dialogue-turn').count(),4);await click('lab-fork','1');await page.waitForURL(u=>u.hash!==`#${first}`);await page.waitForFunction(()=>document.querySelectorAll('.x-dialogue-turn').length===1);assert.equal(await page.locator('.x-dialogue-turn').count(),1);
 await click('lab-choice','1');assert.ok((await page.locator('#x-compare').innerText()).includes('对照路径'));
 const lab=await download('lab-export');assert.ok(lab.includes('原路径'));
 const backup=await download('backup');const parsed=JSON.parse(backup);assert.equal(parsed.campaigns.length,4);assert.equal(parsed.labs.length,2);assert.ok(parsed.workshop);
 await page.locator('#x-import').setInputFiles({name:'records.json',mimeType:'application/json',buffer:Buffer.from(backup)});await page.locator('#x-import-preview').waitFor();await click('import-confirm');assert.equal(await page.locator('.x-record').count(),2);
 const qa=path.join(dir,'qa','expansion');mkdirSync(qa,{recursive:true});
 for(const width of [360,390,768,1440])for(const route of ['library','family-E','game/E4/1','campaign','workshop','lab',first]){
  await page.setViewportSize({width,height:960});await go(route);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`overflow ${width} ${route}`);
  if(['workshop','library','game/E4/1','lab'].includes(route))await page.screenshot({path:path.join(qa,`${width}-${route.replaceAll('/','-')}.png`),fullPage:true});
 }
 assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
 writeFileSync(path.join(qa,'results.json'),JSON.stringify({games:60,negotiation:12,scales:4,campaignApprovedPath:true,campaignInvalidation:true,rolePrivacy:true,workshop:true,dialogueFork:true,importRoundtrip:true,viewports:4,network,errors},null,2));
 console.log('PASS browser: 12 negotiation boards, 4 scales, full approval and invalidation, host/editor, private cards, dialogue fork, export/import, 28 responsive views; zero HTTP and JS errors');
}finally{await browser.close();}
