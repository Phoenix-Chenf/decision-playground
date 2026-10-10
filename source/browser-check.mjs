import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import assert from 'node:assert/strict';

const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})});
const context=await browser.newContext({viewport:{width:1440,height:1050},acceptDownloads:true});
const page=await context.newPage();const errors=[],network=[];
page.on('pageerror',error=>errors.push(error.message));
page.on('request',request=>{if(/^https?:/.test(request.url()))network.push(request.url());});
const url=pathToFileURL(path.join(root,'index.html')).href;
const qa=path.join(root,'source','qa');mkdirSync(qa,{recursive:true});
await page.goto(`${url}#library`);assert.equal(await page.locator('.game-card').count(),60);
const gameSummary=await page.evaluate(()=>({games:GAME_DATA.games.length,originalMechanisms:new Set(GAME_DATA.games.filter(g=>['A','B','C','D'].includes(g.family)).map(g=>g.engine)).size,additionalBoardKinds:new Set(GAME_DATA.games.filter(g=>['E','F','G'].includes(g.family)).map(g=>`${g.engine}/${g.config.kind}`)).size}));
await page.screenshot({path:path.join(qa,'desktop-library.png'),fullPage:true});
await page.locator('#search').fill('分母');assert.ok(await page.locator('.game-card').count()>=1);
await page.locator('#search').fill('');assert.equal(await page.locator('.game-card').count(),60);
await page.locator('[data-filter="C"]').click();await page.waitForFunction(()=>document.querySelectorAll('.game-card').length===6);assert.equal(await page.locator('.game-card').count(),6);
await page.locator('[data-nav="library"]').first().click();
const go=async hash=>{await page.goto(`${url}#${hash}`);await page.waitForFunction(hash=>{if(hash.startsWith('game/')){const [,id,step]=hash.split('/');return document.querySelector('.eyebrow')?.textContent.includes(`${id} /`)&&(step===undefined||document.querySelector('[aria-current="step"]')?.dataset.step===step);}return hash==='records'?document.querySelector('h1')?.textContent==='我的记录':document.querySelector('h1')?.textContent==='决策游乐场';},hash);};
const step=async n=>{await page.locator(`[data-step="${n}"]`).first().click();await page.waitForFunction(n=>document.querySelector('[aria-current="step"]')?.dataset.step===String(n),n);};
await page.waitForFunction(()=>document.querySelectorAll('.game-card').length===60);
await page.locator('[data-star="A1"]').click();await go('game/A1/0');await go('records');
assert.equal(await page.locator('.record-row').count(),1,'先收藏再开始的游戏也应进入记录');
for(const id of await page.evaluate(()=>GAME_DATA.games.map(g=>g.id))){
  await go(`game/${id}/0`);
  assert.ok((await page.locator('h1').innerText()).length>1);
  await page.locator('[data-note="opening"]').fill(`测试开场 ${id}`);
  await step(1);
  assert.ok(await page.locator('.stage-content [data-input],.stage-content [data-reveal],.stage-content [data-choice]').count()>0,`${id} 没有操作区`);
  await page.locator('[data-action="check"]').click();
  assert.ok((await page.locator('#feedback').innerText()).length>10);
  await page.locator('[data-note="decision"]').fill(`虚构练习判断 ${id}`);
  await step(2);await page.locator('[data-action="event"]').click();
  assert.equal(await page.locator('.event-block').count(),1);
  await page.locator('[data-note="event"]').fill('新信息改变条件，不代替参与人承诺。');
  await step(3);
  await page.locator('[data-note="reflection"]').fill('直接事实与合理推断分开，真实采用仍需验证。');
  await step(4);await page.locator('[data-note="transfer"]').fill('下一次小范围观察，需要授权，也允许停止。');
  await page.locator('[data-action="complete"]').click();
  assert.ok((await page.locator('.stage-content').innerText()).includes('已归档'));
  await page.locator('.side-note [data-action="prompt"]').click();assert.ok((await page.locator('#prompt-text').inputValue()).includes('完整规则参数'));
  await page.locator('[data-action="close-dialog"]').click();
}
await page.reload();assert.ok(await page.locator('.stage-content').innerText());
await go('game/B5/1');assert.ok((await page.locator('#live-calculation').innerText()).includes('150'));
await page.locator('[data-input="runs"]').fill('1');assert.ok((await page.locator('#live-calculation').innerText()).includes('-192'));
await page.locator('[data-input="runs"]').fill('-1');assert.equal(await page.locator('[data-input="runs"]').inputValue(),'0','负数不能破坏下一次载入');
await go('game/B3/1');await page.locator('[data-input="success"]').fill('0');await page.locator('[data-input="failed"]').fill('0');await page.locator('[data-input="excluded"]').fill('0');assert.ok((await page.locator('#live-calculation').innerText()).includes('不可计算'));
await go('game/C4/1');await page.locator('[data-action="save-offer"]').click();assert.ok((await page.locator('[data-note="offers"]').inputValue()).includes('6 周'));
await go('game/C2/1');for(let i=0;i<5;i++)await page.locator('[data-reveal]:not(:disabled)').first().click();assert.equal(await page.locator('[data-reveal]:not(:disabled)').count(),0);
await go('game/D6/1');await page.locator('[data-input="try-photo"]').check();assert.equal(await page.locator('[data-input="actual-photo"]').count(),1);
await go('game/A1/1');await page.locator('[data-reveal]').first().click();await page.reload();assert.ok((await page.locator('.revealed').innerText()).length>0);
await page.locator('[data-action="backup"]').first().click();const downloadPromise=page.waitForEvent('download');await page.locator('[data-action="export-json"]').click();const downloaded=await downloadPromise;const backup=path.join(qa,'test-backup.json');await downloaded.saveAs(backup);assert.equal(Object.keys(JSON.parse(readFileSync(backup)).sessions).length,60);
await page.locator('[data-action="close-dialog"]').click();
await page.screenshot({path:path.join(qa,'desktop-board.png'),fullPage:true});
const checks=[];
for(const width of [1440,1024,768,390,360]){
  await page.setViewportSize({width,height:900});
  for(const id of ['library','game/A4/1','game/B5/1','game/C6/1','game/D6/1','records']){
    await go(id);
    const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+1);
    assert.equal(overflow,false,`${width}px ${id} 水平溢出`);checks.push(`${width}px ${id}`);
  }
}
await page.setViewportSize({width:390,height:844});await go('library');await page.screenshot({path:path.join(qa,'mobile-library.png'),fullPage:true});await go('game/C4/1');await page.screenshot({path:path.join(qa,'mobile-offer.png'),fullPage:true});
assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
writeFileSync(path.join(qa,'verification.json'),JSON.stringify({...gameSummary,flows:60,viewports:[1440,1024,768,390,360],overflowChecks:checks.length,pageErrors:errors,externalRequests:network},null,2));
await browser.close();console.log('PASS: all 60 flows, local persistence, computed boundaries, prompts, exports and 30 responsive checks.');
