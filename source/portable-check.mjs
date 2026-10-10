import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {existsSync,readFileSync,writeFileSync,mkdirSync,mkdtempSync,copyFileSync,rmSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url)),root=path.dirname(dir),require=createRequire(import.meta.url);
const {chromium}=require('playwright');
const files=['完整游戏手册.html','扩展玩法与规模方案.html',...['solo','trio','small','midsize','scrum4','org125','org500'].map(id=>`规模方案/${id}.html`)];
const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH}:{})}),context=await browser.newContext({offline:true}),page=await context.newPage();
const errors=[],network=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))network.push(r.url());});
const qa=path.join(dir,'qa','portability');mkdirSync(qa,{recursive:true});
const temp=mkdtempSync(path.join(tmpdir(),'decision-playground-'));
let localLinks=0;
try{
 for(const file of files){
  const full=path.join(root,file),source=readFileSync(full,'utf8');
  assert.ok(!/km\.sankuai|git\.sankuai|dev\.sankuai|people-review|\/Users\//.test(source),`private reference: ${file}`);
  for(const href of [...source.matchAll(/href="([^"]+)"/g)].map(m=>m[1])){
   if(/^(?:https?:|#|mailto:)/.test(href))continue;
   assert.ok(existsSync(path.resolve(path.dirname(full),decodeURIComponent(href.split('#')[0]))),`broken link: ${file} ${href}`);localLinks++;
  }
  for(const width of [390,1440]){
   await page.setViewportSize({width,height:960});await page.goto(pathToFileURL(full).href);
   assert.ok((await page.locator('body').innerText()).length>1000,file);assert.ok(await page.locator('h1').count()>=1,file);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`overflow ${file} ${width}`);
   if(file==='扩展玩法与规模方案.html'||file==='规模方案/org500.html')await page.screenshot({path:path.join(qa,`${width}-${path.basename(file,'.html')}.png`),fullPage:true});
  }
 }
 const promptFiles=readdirSync(path.join(root,'主持提示词')).filter(f=>f.endsWith('.txt'));
 assert.equal(promptFiles.length,60);
 const catalog=JSON.parse(readFileSync(path.join(root,'离线内容目录.json'),'utf8'));assert.equal(catalog.games.length,60);assert.equal(catalog.themes.length,21);assert.equal(catalog.scales.length,7);
 const gameIds=new Set(catalog.games.map(g=>g.id));
 for(const id of ['F15','F16','G8','G9'])assert.ok(!gameIds.has(id));
 for(const id of ['gitmaintenance','governance','evaluation'])assert.ok(!catalog.themes.some(t=>t.id===id));
 for(const game of catalog.games)assert.ok(promptFiles.some(f=>f.startsWith(`${game.id}-`)),`missing host prompt: ${game.id}`);
 for(const theme of catalog.themes)for(const id of theme.games)assert.ok(gameIds.has(id),`broken catalog theme ${theme.id}: ${id}`);
 copyFileSync(path.join(root,'index.html'),path.join(temp,'standalone.html'));
 const standalone=pathToFileURL(path.join(temp,'standalone.html')).href;
 await page.goto(standalone);assert.match(await page.locator('.page-heading h1').innerText(),/Overview/);
 for(const route of ['library','organizer','campaign','workshop','lab','assembly','game/G2/1','game/E4/1','game/F13/1','game/F14/1']){
  await page.goto(`${standalone}#${route}`);assert.ok((await page.locator('#main').innerText()).length>300,route);
 }
 await page.goto(`${standalone}#library`);assert.equal(await page.locator('.game-card').count(),60);
 assert.deepEqual(errors,[]);assert.deepEqual(network,[]);
 writeFileSync(path.join(qa,'results.json'),JSON.stringify({documents:files.length,documentViewportChecks:files.length*2,localLinks,hostPrompts:60,catalogGames:60,themes:21,scales:7,standaloneOffline:true,defaultOverview:true,externalRequests:network,pageErrors:errors},null,2));
 console.log(`PASS portability: 9 offline documents, 18 responsive views, ${localLinks} local links, 60 prompts, catalog and relocated standalone HTML; zero HTTP and JS errors`);
}finally{await browser.close();rmSync(temp,{recursive:true,force:true});}
