import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {readdirSync,readFileSync,writeFileSync,lstatSync} from 'node:fs';

const root=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const require=createRequire(import.meta.url),JSZip=require('jszip'),zip=new JSZip();
const rootFiles=['README.md','AUTHOR.md','.gitignore','package.json','package-lock.json','index.html','完整游戏手册.html','扩展玩法与规模方案.html','游戏目录与主持说明.md','场景覆盖与选用.md','离线内容目录.json','验收与校准.md','图标许可-LUCIDE.txt'];
const catalog=JSON.parse(readFileSync(path.join(root,'离线内容目录.json'),'utf8'));
if(catalog.games.length!==60||catalog.themes.length!==21||catalog.scales.length!==7)throw new Error('公开内容数量不符，停止打包。');
const sourceFiles=readdirSync(path.join(root,'source')).filter(n=>/\.(?:js|mjs|css|html|md)$/.test(n)).map(n=>`source/${n}`);
const files=[...rootFiles,...sourceFiles,...catalog.scales.map(s=>`规模方案/${s.id}.html`),...catalog.games.map(g=>`主持提示词/${g.id}-${g.title}.txt`)];
for(const name of files){
 const full=path.join(root,name);
 if(!lstatSync(full).isFile())throw new Error(`拒绝非普通文件：${name}`);
 zip.file(`decision-playground/${name}`,readFileSync(full));
}
const target=path.join(root,'decision-playground-Phoenix-Chen-v2.2-public.zip');
writeFileSync(target,await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE',compressionOptions:{level:6}}));
console.log(JSON.stringify({target,files:files.length,games:60,themes:21,scales:7}));
