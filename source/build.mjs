import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import vm from 'node:vm';

const source=path.dirname(fileURLToPath(import.meta.url)), root=path.dirname(source);
const require=createRequire(import.meta.url), lucide=require('lucide');
const context=vm.createContext({});vm.runInContext(readFileSync(path.join(source,'games.js'),'utf8'),context);
vm.runInContext(readFileSync(path.join(source,'expansion-data.js'),'utf8'),context);
vm.runInContext(readFileSync(path.join(source,'facilitation-data.js'),'utf8'),context);
const data=context.GAME_DATA;
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const iconNames=['network','scan-search','messages-square','compass','circle','shapes','layout-grid','notebook-pen','bookmark','folder-down','book-open','circle-help','chevron-right','menu','a-large-small','search','clock-3','users','check','arrow-up-right','route','arrow-right','package-check','eye','flag','shuffle','mail','arrow-left','plus','copy','download','printer','play','pause','rotate-ccw','x','file-text','upload','message-circle','handshake','arrow-up','arrow-down','puzzle','layers'];
const icons=Object.fromEntries(iconNames.map(name=>{
  const camel=name.split('-').map(s=>s[0].toUpperCase()+s.slice(1)).join('');
  const nodes=lucide.icons[camel];if(!nodes)throw new Error(`缺少图标 ${name}`);
  const svg=`<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${nodes.map(([tag,attrs])=>`<${tag} ${Object.entries(attrs).filter(([k])=>k!=='key').map(([k,v])=>`${k}="${esc(v)}"`).join(' ')}></${tag}>`).join('')}</svg>`;
  return [name,svg];
}));
let shell=readFileSync(path.join(source,'shell.html'),'utf8');
const iconLicense=readFileSync(path.join(path.dirname(require.resolve('lucide/package.json')),'LICENSE'),'utf8');
const read=name=>readFileSync(path.join(source,name),'utf8');
for(const [slot,content]of Object.entries({STYLE:read('style.css')+'\n'+read('expansion.css')+'\n'+read('facilitation.css')+'\n'+read('organizer.css'),ICONS:`/* ${iconLicense} */\nglobalThis.PLAYGROUND_ICONS=${JSON.stringify(icons)};`,DATA:read('games.js')+'\n'+read('expansion-data.js')+'\n'+read('facilitation-data.js'),CORE:read('core.js')+'\n'+read('expansion-core.js')+'\n'+read('facilitation-core.js')+'\n'+read('organizer-core.js'),APP:read('expansion-app.js')+'\n'+read('facilitation-app.js')+'\n'+read('organizer-app.js')+'\n'+read('app.js')}))shell=shell.replace(`/* ${slot} */`,()=>content);
writeFileSync(path.join(root,'index.html'),shell);

const engineRules={
  facilitation:'按本局地图、顺序、阶段门、条件包或覆盖核对来操作。保留事实、假设、授权和未决，方向由获授权者确定，实现由参与人选择。结构完整不证明执行或效能。',
  negotiation:'根据本局类型核对替代可执行性、可谈窗口、条件包、授权或变更。数字为公开教学设置，不能替代现实价值判断。记录初始选择后再揭示变化，不把让步、填表、模拟批准当真实采用。',
  reveal:'先记录开场与共同地图，再逐次揭示信息。每揭示一次就说明它改变了什么；预算用完后，把剩余未知交给具体确认人。多人由主持人分别发私有卡，单人靠自觉不提前看完整上下文。',
  priority:'勾选最多三个目标，容量按明示点数相加。初始十点，事件后八点；超限意味着需要重谈范围或组合，不是能力失败。至少比较两套组合，负责人拍 TOP3，参与人选择承接方式。',
  roadmap:'将每项工作放入 Q1-Q4。检查上游工作是否晚于下游；同季度允许并行，但需要说明内部先后。第一阶段应留下可验证结果，不只列活动。',
  handshake:'每项依赖填写提供方、接收方、交付对象、窗口与前置条件、验收形式、变更通知。未知填待确认，并指定确认人；真实握手需要双方确认，不以表格完整代替同意。',
  claim:'模拟负责人主动领取，每项只能有一个交付责任人。容量与能力条件按本局公开参数核对，未承接可以缩小、延期或交负责人取舍。事件后研发容量降为两点，要重新公开协商。',
  accept:'分别写结果、质量和可运营性验收，每项包含对象、口径、证据与窗口、标准、共同确认人和确认形式。不得把填写完整当作标准已通过，也不要照抄示例阈值到真实业务。',
  classify:'逐条选择当前最高证据层级，随后展开来源核对。计数只表示与本局来源相符，不是人格或能力评级。至少改写两条原本容易夸大的说法，并保留缺口。',
  timeline:'选定一个截止日，只显示当时已经存在的记录，再判断状态。后来采用不能提前到批准日。最后再换一个时点，写清新证据带来的变化。',
  denominator:'输入完成、失败、暂排样本及原报告分母。全收到占比以三者之和为分母；已明确完成失败比例暂不纳入暂排；原报告使用其声明分母。排除核验之后才能确认合法边界，零分母应显示不可计算。',
  flow:'从五个阶段中只选一个干预点，提出机制假设和反证，再写最低负担改动与可比较复测。柱长不是根因，等待天数不等于个人工时。事件把等待拆为信息未齐五天、授权三天。',
  cost:'启动窗口净收益 = 次数×(原每轮-新每轮-复核)-维护-搭建。持续窗口不再计首次搭建。每轮净省非正时无法靠增加频次回本；质量效果未提供，必须保留未知。',
  compare:'逐条标记两份预置输出的越界主张，再比较生成、审阅与修订总时间。它们不是真实模型输出。设计真实对照时固定材料和标准，考虑顺序、熟练度及剩余错误。',
  interpret:'可以同时保留多种解释，再选择两次追问。问题应邀请对方提供上下文，不把猜测当作前提。页面回应是预置，不等于你已经理解现实中的某个人。',
  questions:'最多揭示五个问题，逐次记录是否改变决定或明确必要边界。问题价值取决于当前授权，而非显得深刻。可以不耗尽预算，次要背景留到下一轮。',
  hypotheses:'为四条观察分别判断对两个解释的支持、削弱或无法区分。没有唯一预设心理原因；找最大反证并准备非诱导问题。不要从少说话跳到人格结论。',
  offer:'调节窗口二到八周、范围一到五档、支持零到三档、维护零或一。可用 = 周数+支持×2+明确维护×2；所需 = 范围×3。保存两套不同条件包；容量可行不替代业务取舍与本人同意。',
  stress:'对六项承诺选择保留、重谈或停止，写依据、协商人、通知与恢复条件。需要负责人的是目标、资源或风险授权的重大改变，不是每个实现细节。',
  branch:'三个节点分别选介入方式，查看教学分支，写目的与替代路径代价。可回看另一选择，但需记录自己何时看过参考。分支只帮助思考，不预测真实行为。',
  career:'选择一个工作日，完成一个核心任务和一个维护任务，分别记录投入感、熟悉度、消耗与愿意重复。可以体验另外两条方向；不从一次模拟产生职业匹配结论。',
  portable:'移除至少两项组织便利，对每项提出替代输入、授权或缩小交付，再写最小服务与拒绝条件。没有合法资料或召集授权时停止相关部分，不能靠热情弥补权限。',
  transfer:'只选一个场景和一种方法，用普通语言写一页约定。避开本局六个惯用术语，保留对象、维护、确认和退出。禁词通过只是提醒，不代表对方已经理解。',
  interview:'选择一种服务，写一句话交付，再展开至少三个追问，记录证据边界。拒绝无来源百分比保证。预置合作方不提供市场验证，真实需求另行取证。',
  field:'实际观察或先准备问题都可以，但必须标明状态。写三条事实、两种解释和未知；不采集敏感资料，不打扰服务。可以决定不改，不要求商业产出。',
  interest:'选两项小活动，期待与实际感受分开填写；实际尝试后再勾选已尝试。不存在人格总分。可以暂放、换条件或结束，无展示成果也可以继续。'
};
const rulesFor=g=>engineRules[g.engine];
const list=items=>`<ul>${items.map(i=>`<li>${esc(i)}</li>`).join('')}</ul>`;
const practicePrompt=g=>`请主持“${g.title}”虚构练习。我是玩家，你按需要扮演角色，不替我作判断。\n\n目的：${g.mission}\n情境：${g.scene}\n\n角色私有资料：\n${g.roles.map(r=>`${r.name}：公开开场 ${r.opening}；上下文 ${r.context}；希望 ${r.want}；边界 ${r.boundary}`).join('\n')}\n\n材料：\n${g.materials.map(m=>`${m.title}：${m.text}`).join('\n')}\n\n规则：${rulesFor(g)}\n完整参数：${JSON.stringify(g.config,null,2)}\n轮次：${g.rounds.join('；')}\n\n先让我完成初始选择，然后再揭示事件：${g.event.title}。${g.event.text}\n复盘：${g.debrief.join('；')}\n交付：${g.deliverables.join('；')}\n迁移边界：${g.transfer}\n\n一次只推进一个必要问题，不先给参考答案；所有人物和数字为虚构。不预设明显冲突、不把沉默当同意、不默认现实会议没有执行。不诊断人格或健康；方向和重大风险由获授权负责人拍板，实现与承诺由参与人选择。区分练习表现、真实采用、效果和个人贡献。请从简短开场开始。`;
mkdirSync(path.join(root,'主持提示词'),{recursive:true});
for(const g of data.games)writeFileSync(path.join(root,'主持提示词',`${g.id}-${g.title}.txt`),practicePrompt(g));

const sheets=[];
sheets.push(`<section class="sheet cover"><div class="kicker">Phoenix Chen · 敏捷协作与决策练习 / v${data.version}</div><h1>决策游乐场</h1><p class="lead">${data.games.length} 个完整游戏<br>组织决策 · 证据核对 · 复杂协作 · 生活探索</p><div class="cover-board">${data.families.map(f=>`<span style="border-color:${f.color}">${f.id} / ${data.games.filter(g=>g.family===f.id).length}<br>${esc(f.title)}</span>`).join('')}</div><h2>Phoenix Chen</h2><p>Phoenix Chen · Agile Coach。关注敏捷协作、引导与决策练习，通过虚构情境探索上下文澄清、备选比较、授权与协作边界。</p><h2>这不是测评</h2><p>所有场景、角色、数字和事件均为虚构练习材料。预置回应和计算只解释本局规则，不诊断心理特征，不认证职业能力，也不证明外部需求。参与人承接、负责人拍板与引导师过程责任分别表达。</p><p class="muted">${data.updatedAt} / 离线完整手册。互动主入口为同文件夹中的 index.html。Agile Coach / 敏捷协作、引导与决策练习。</p></section>`);
sheets.push(`<section class="sheet"><div class="kicker">目录 / ${data.games.length} 局</div><h1>七组游戏，按场景组合</h1>${data.families.map(f=>`<section class="toc-family" style="--accent:${f.color}"><h2>${f.id} · ${f.title}</h2><div class="toc-list">${data.games.filter(g=>g.family===f.id).map(g=>`<a href="#${g.id}"><strong>${g.id} ${g.title}</strong><span>${g.minutes} 分钟 / ${g.level}</span></a>`).join('')}</div></section>`).join('')}</section>`);
sheets.push(`<section class="sheet"><div class="kicker">开始前 / 主持约定</div><h1>怎么组织一局</h1><h2>单人</h2><p>先读公开情境与角色开场，再做操作。尽量保留初始判断，之后揭示变化和参考路径。可以只阅读，但应记录“尚未实际尝试”。单人不能实现真正私有信息隔离。</p><h2>多人</h2><p>主持人分别发角色私有卡；确定谁扮演负责人，谁是参与人。先约定目的、边界、记录与停止方式。角色可依据自己的上下文拒绝承诺，但不必为了戏剧效果制造对抗。</p><h2>外部 AI</h2><p>同目录“主持提示词”文件夹包含 ${data.games.length} 份完整提示。由你自行复制，不存在页面自动联网或实时模型。主持人应逐轮回应，保留角色约束，允许不同合理路径。</p><h2>每局五步</h2><ol><li>情境：明确本次选择、授权和已有事实。</li><li>操作：记录安排与依据，不急着揭示答案。</li><li>变化：只重谈受新信息影响的承诺。</li><li>复盘：区分事实、推断、未知与反证。</li><li>归档：留下下一次观察或停止的选择。</li></ol><h2>共同边界</h2>${list(['不预设真实组织会议没有执行；本套练习用于表达决定与变化。','不将真实同事作为未经同意的心理分析对象。','不把模拟表现升级成真实业务、效能或市场证据。','导出的个人记录需要自行脱敏，游戏材料本身不含内部人员与经营事实。'])}</section>`);
sheets.push(`<section class="sheet"><div class="kicker">组合 / 保存 / 迁移</div><h1>按兴趣走，不按进度赶</h1>${data.routes.map(r=>`<h2>${r.title}</h2><p>${r.ids.join(' → ')}<br>${r.text}</p>`).join('')}<h2>四种组合导向</h2>${list(['职业积累：A＋B，连接讨论过程与证据判断。','心理学、谈判与引导：A＋C，理解上下文并形成选择。','未来选择权：B＋D，检验方法与服务离开原组织后的条件。','轻负担好奇：C＋D，允许只有体验、不形成职业成果。'])}<h2>把记录带走</h2><p>HTML 优先使用浏览器本地存储，无法保存时会提示。迁移前导出 JSON，新环境导入按更新时间合并。每局只保留一个当前活动版本；重新开始前导出上一局。Markdown 用于长期阅读，打印用于纸上记录。</p><p class="muted">完整手册中的参考路径不是唯一标准答案。计算模型可检查明示约束，不替负责人取舍；完成游戏不等于完成真实试点。</p></section>`);
for(const g of data.games){
  const f=data.families.find(f=>f.id===g.family);
  const roleMarkup=g.roles.map(r=>`<div class="role"><h3>${r.name}</h3><p>开场：“${r.opening}”<br>私有上下文：${r.context}<br>希望：${r.want}<br>边界：${r.boundary}</p></div>`).join('');
  sheets.push(`<section class="sheet game-sheet" id="${g.id}" style="--accent:${f.color}">
    <div class="kicker">${g.id} / ${f.title} / 情境与角色</div>
    <h1>${g.title}</h1><p class="subtitle">${g.subtitle} · ${g.minutes} 分钟 · ${g.players} · ${g.level}</p>
    <h2>发生了什么</h2><p>${g.scene}</p><div class="mission">${g.mission}</div>
    <h2>角色卡 · 主持人掌握，按需分别发放</h2>
    <div class="role-group ${g.roles.length===4?'four-roles':''}">${roleMarkup}</div>
    <h2>桌面材料</h2>${g.materials.map(m=>`<p class="material"><strong>${m.title}：</strong>${m.text}</p>`).join('')}
    <p class="compact-rounds"><strong>三轮安排：</strong>${g.rounds.map((r,n)=>`${n+1}. ${r}`).join(' ')}</p>
  </section>`);
  sheets.push(`<section class="sheet game-sheet" style="--accent:${f.color}"><div class="kicker">${g.id} / ${g.title} / 操作、变化与复盘</div><h2>独立操作机制</h2><p>${rulesFor(g)}</p><div class="objects">${g.config.items.map(i=>`<p><strong>${i.label}${i.cost!==undefined?` / ${i.cost} 点`:''}${i.days!==undefined?` / ${i.days} 天`:''}：</strong>${i.detail||i.answer||i.options?.map(o=>`${o.label}：${o.detail}`).join('；')||''}${i.allowed?` 可独立承接：${i.allowed.join('、')}。`:''}</p>`).join('')}</div><div class="event"><h3>变化事件 · ${g.event.title}</h3><p>${g.event.text}</p></div><h2>参考路径与反例</h2>${list(g.sample)}<h2>复盘问题</h2><ol>${g.debrief.map(q=>`<li>${q}</li>`).join('')}</ol><div class="small-columns"><section><h3>可迁移方法</h3>${list(g.principles)}</section><section><h3>容易走偏</h3>${list(g.pitfalls)}</section></div><h3>本局交付</h3><p>${g.deliverables.join('；')}。</p><p class="boundary"><strong>迁移边界：</strong>${g.transfer}</p></section>`);
}
const handbook=`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>决策游乐场 · 完整游戏手册</title><style>
*{box-sizing:border-box}body{margin:0;color:#202622;background:#edf1ee;font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;letter-spacing:0;font-size:16px;line-height:1.72}a{color:#176a59}h1,h2,h3,p{margin-top:0}h1{font-size:30px;line-height:1.3;margin-bottom:12px}h2{font-size:19px;line-height:1.4;margin:20px 0 9px}h3{font-size:15px;line-height:1.4;margin:14px 0 6px}p{margin-bottom:10px}li{margin-bottom:5px}ul,ol{padding-left:21px;margin:8px 0 14px}.sheet{max-width:920px;background:white;margin:26px auto;padding:45px 48px;--accent:#176a59}.kicker{font-size:11px;color:#627068;border-bottom:2px solid var(--accent);padding-bottom:10px;margin-bottom:22px}.subtitle,.muted{font-size:12px;color:#647069}.mission{border-left:3px solid var(--accent);padding-left:13px;font-weight:650;font-size:15px;margin:16px 0}.role{border-top:1px solid #dbe2df;break-inside:avoid}.role p,.material{font-size:13px}.objects p{font-size:12px;margin-bottom:7px}.event{border-left:3px solid #a78235;padding-left:13px;margin-top:17px;break-inside:avoid}.event p{font-size:14px}.small-columns{display:grid;grid-template-columns:1fr 1fr;gap:24px}.small-columns li{font-size:12px}.boundary{font-size:12px;color:#58685e;border-top:1px solid #dbe2df;padding-top:10px;margin-top:14px}.write-line{font-size:12px;color:#647069;margin-top:12px;overflow-wrap:anywhere}.lead{font-size:23px;line-height:1.65;margin-top:25px}.cover-board{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:32px 0;border-top:1px solid #dbe2df;border-bottom:1px solid #dbe2df;padding:20px 0}.cover-board span{font-size:16px;line-height:1.9;padding-left:15px;border-left:3px solid #176a59}.cover-board span:nth-child(2){border-color:#af3c52}.cover-board span:nth-child(3){border-color:#5164a1}.cover-board span:nth-child(4){border-color:#8a6613}.toc-family h2{color:var(--accent);margin-top:22px;font-size:17px}.toc-list{display:grid;grid-template-columns:1fr 1fr;gap:7px 20px}.toc-list a{display:flex;justify-content:space-between;gap:10px;color:inherit;text-decoration:none;border-bottom:1px solid #e1e6e3;font-size:12px;padding-bottom:6px}.toc-list span{font-size:10px;color:#6b756f;white-space:nowrap}.book-nav{max-width:920px;margin:20px auto;display:flex;gap:20px;padding:0 15px;font-size:13px}@media(max-width:640px){.sheet{padding:25px 22px;margin:15px 10px}.small-columns,.toc-list{grid-template-columns:1fr}.lead{font-size:20px}.book-nav{flex-wrap:wrap}}@page{size:A4;margin:16mm 15mm 17mm}@media print{body{background:white;font-size:11.4pt;line-height:1.65}.book-nav{display:none}.sheet{max-width:none;margin:0;padding:0;break-after:page}.sheet:last-child{break-after:auto}h1{font-size:25pt}h2{font-size:15pt;margin-top:14px}h3{font-size:11.5pt;margin-top:10px}p,li{font-size:11.2pt}p{margin-bottom:7px}li{margin-bottom:3px}.subtitle,.muted,.kicker{font-size:9pt}.kicker{margin-bottom:14px}.role p,.material{font-size:10.2pt;line-height:1.6}.objects p{font-size:9.8pt;line-height:1.55}.event p{font-size:10.5pt}.small-columns li,.boundary,.write-line{font-size:9.7pt}.mission{font-size:11pt}.cover .lead{font-size:20pt}.toc-list a{font-size:10pt}.toc-list span{font-size:8pt}.toc-family h2{font-size:13pt}.game-sheet h2{font-size:13pt}.game-sheet .small-columns{gap:17px}.write-line{margin-top:9px}h2,h3{break-after:avoid}p{orphans:3;widows:3}.role,.event{break-inside:avoid}}
.four-roles{display:grid;grid-template-columns:1fr 1fr;gap:0 20px}@media(max-width:640px){.four-roles{grid-template-columns:1fr}}
@media print{.four-roles{grid-template-columns:1fr 1fr}.game-sheet .role h3{margin-top:7px}.game-sheet .role p{margin-bottom:4px}.game-sheet .material{margin-bottom:4px}.compact-rounds{font-size:9.8pt;line-height:1.5;margin-top:12px}}
</style></head><body><nav class="book-nav"><a href="index.html">返回互动游戏库</a><a href="#A1">从第一局开始</a></nav>${sheets.join('')}</body></html>`;
writeFileSync(path.join(root,'完整游戏手册.html'),handbook);
const guide=`# Phoenix Chen · 决策游乐场目录与主持说明\n\n${data.updatedAt} / ${data.games.length} 个完整游戏 / 所有情境与数字均为虚构。\n\n## 格式选择\n\n互动 HTML 为主：揭示、选择、计算、分支和记录需要互动。本轮完整内容保存在 HTML，可打印为纸上材料。公开包不包含旧版PDF与旧交接档案。\n\n## 七组玩法\n\n`+data.families.map(f=>`### ${f.title}\n\n${f.intro}\n\n`+data.games.filter(g=>g.family===f.id).map(g=>`- ${g.id} ${g.title}：${g.subtitle}。${g.minutes} 分钟，${g.players}，${g.level}。独立机制：${rulesFor(g)}`).join('\n')).join('\n\n')+`\n\n## 组合路线\n\n${data.routes.map(r=>`- ${r.title}：${r.ids.join(' → ')}。${r.text}`).join('\n')}\n\n## 主持方式\n\n单人按情境、操作、变化、复盘、归档推进。多人分别发角色私有卡，明确最终负责人和引导师边界。外部 AI 可使用“主持提示词”目录中的完整文本。单人网页不能技术隔离秘密，预置回应不是现场模型。\n\n## 质量与边界\n\n本套没有真人有效性验证。游戏完成不作为职业能力、人际风格、心理健康或市场需求证明。方向由负责人确定，实现方式与承诺由参与人选择；不默认严肃会议缺乏执行。已有角色目标、提出方案、交付、采用和效果分别记录。\n\n生活组允许不产生可展示成果。真实观察不得采集敏感信息；真实组织实践需要具体授权与维护人。\n\n## 保存\n\n本地存储可能受到浏览器限制。换机器或重新开始一局前导出 JSON；Markdown 便于阅读。分享个人记录前脱敏。源码和全部成品在同一目录，无服务器、无依赖安装、无线上服务要求。\n`;
writeFileSync(path.join(root,'游戏目录与主持说明.md'),guide);
const licensePath=path.join(path.dirname(require.resolve('lucide/package.json')),'LICENSE');
try{writeFileSync(path.join(root,'图标许可-LUCIDE.txt'),readFileSync(licensePath));}catch{writeFileSync(path.join(root,'图标许可-LUCIDE.txt'),'Lucide icons, ISC License. Included from the installed bundled lucide package. See source/build.mjs for packaging source.');}
console.log(`Built index.html, handbook HTML, directory guide and ${data.games.length} complete host prompts.`);
await import('./build-extra.mjs');
