globalThis.ORGANIZER_UI = (() => {
 'use strict';
 const c=ORGANIZER_CORE,scales=EXPANSION_DATA.scales,games=GAME_DATA.games;
 const key='phoenix-decision-playground-public-organizer-v1';
 const esc=v=>String(v??'').replace(/[&<>"']/g,k=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[k]));
 const $=s=>document.querySelector(s),steps=['范围与授权','参与与角色','议程与材料','检查与导出'];
 let plan=null,api=null,step=0,pending=null,storageOK=true,saveEnabled=true,loadWarning='';
 try{
  const raw=localStorage.getItem(key);if(raw)plan=c.validate(JSON.parse(raw)).plan;
  localStorage.setItem(`${key}-probe`,'1');localStorage.removeItem(`${key}-probe`);
 }catch(error){storageOK=false;saveEnabled=false;loadWarning='未能读取筹备记录，原存档不会被自动覆盖。可先导出当前草案，再导入备份或新建筹备。';}
 const icon=n=>api.icon(n);
 const button=(label,action,value='',name='arrow-right')=>`<button class="btn" data-o-action="${action}" data-o-value="${esc(value)}">${icon(name)}${esc(label)}</button>`;
 const field=(label,value,name,{section='fields',index='',long=false,options=null,number=null,disabled=false}={})=>{
  const attrs=`data-o-section="${section}" data-o-field="${name}"${index!==''?` data-o-index="${index}"`:''}`;
  let input;
  if(options)input=`<select class="form-select" ${attrs}>${options.map(o=>`<option value="${esc(o.id)}"${o.id===value?' selected':''}>${esc(o.title)}</option>`).join('')}</select>`;
  else if(long)input=`<textarea class="note-input" ${attrs} maxlength="12000">${esc(value)}</textarea>`;
  else input=`<input class="short-input" ${attrs} value="${esc(value)}" ${number?`type="number" step="1" min="${number[0]}" max="${number[1]}"`:'type="text" maxlength="3000"'}${disabled?' disabled':''}>`;
  return `<label class="field-label">${esc(label)}${input}</label>`;
 };
 const checkbox=(label,value,section,index)=>`<label class="select-line"><input type="checkbox" data-o-section="${section}" data-o-field="${section==='checks'?'confirmed':'ready'}" data-o-index="${index}"${value?' checked':''}><span>${esc(label)}</span></label>`;
 const scaleOf=()=>scales.find(s=>s.id===plan.scale);
 function save(){
  plan.updatedAt=new Date().toISOString();
  if(saveEnabled){try{localStorage.setItem(key,JSON.stringify(c.backup(plan)));storageOK=true;}catch{storageOK=false;}}
  const label=$('#o-save');if(label)label.textContent=storageOK?'筹备记录已存于此浏览器':'仅本次会话，请导出筹备 JSON';
 }
 function resetChecks(){plan.checks.forEach(r=>r.confirmed=false);document.querySelectorAll('[data-o-section="checks"][type="checkbox"]').forEach(t=>t.checked=false);}
 function summary(){const st=c.status(plan);return `<h2>筹备核对</h2><p class="o-progress">${st.checked} / ${st.total} 项已留人工核对记录</p><dl><dt>规模</dt><dd>${esc(scaleOf().title)} · ${plan.people} 人</dd><dt>可用时间</dt><dd>${plan.minutes} 分钟</dd><dt>拟议议程</dt><dd>${st.agendaMinutes} 分钟${st.agendaMinutes<plan.minutes?` · 余量 ${plan.minutes-st.agendaMinutes} 分钟`:''}</dd></dl>${st.gaps.length?`<ul class="o-gaps">${st.gaps.map(g=>`<li>${esc(g)}</li>`).join('')}</ul>`:'<p class="o-ready">所填筹备信息已齐。仍需按真实授权核实，不能据此认定会议成果。</p>'}`;}
 function refresh(){const slot=$('#o-summary');if(slot)slot.innerHTML=summary();save();}
 function render(){
  if(!api)return;plan||=c.create();const s=scaleOf(),g=games.find(g=>g.id===plan.template);
  let content='';
  if(step===0)content=`<h2>本次要准备什么</h2>${field('筹备标题',plan.title,'title',{section:'plan'})}${field('目的与开放选择',plan.fields.purpose,'purpose',{long:true})}${field('预期留下的产物',plan.fields.output,'output',{long:true})}${field('公开事实、来源与仍未知的部分',plan.fields.facts,'facts',{long:true})}${field('决策人、授权范围与缺席时的确认安排',plan.fields.authority,'authority',{long:true})}<p class="helper">${esc(s.approval)}</p><div class="field-row">${field('日期与时间',plan.fields.when,'when')}${field('场地或参与方式',plan.fields.place,'place')}</div>${field('资料边界与公开范围',plan.fields.dataBoundary,'dataBoundary',{long:true})}`;
  if(step===1)content=`<h2>参与安排</h2>${field('角色安排',plan.roleMode,'roleMode',{section:'plan',options:c.modeOptions(plan.scale)})}<p class="o-guidance">${esc(c.guidance(plan))}</p><p class="helper">${plan.scale==='solo'?'只有一位真实使用者，其他视角是推演材料。':plan.scale==='trio'?'下列3人就是全部人数，引导师也在其中。':'下列是筹备职责，不是完整成员名册；同一人可以兼任，但要分别说明权限。'}</p>${plan.participants.map((r,i)=>`<section class="o-row"><h3>${esc(r.role)}</h3><div class="field-row">${field('姓名或公开角色代号',r.name,'name',{section:'participants',index:i})}${field('本人可以决定 / 仅建议 / 待确认',r.authority,'authority',{section:'participants',index:i})}</div>${field('提前输入、参与支持及不公开表达安排',r.needs,'needs',{section:'participants',index:i})}</section>`).join('')}${field('邀请内容与参与人要提前准备的事项',plan.fields.invitation,'invitation',{long:true})}<h3>模板角色卡</h3><div class="o-role-links">${g.roles.map((r,i)=>button(`${r.name} · 单独导出`,'role',String(i),'download')).join('')}</div><p class="helper">角色卡用于虚构练习，不表示现实中需要再增加这些人。3人默认版由两位参与者使用前两张卡，引导师持过程材料；第三张仅在确有该角色或预演时使用。不要把整个页面作为私有信息隔离。</p>`;
  if(step===2)content=`<h2>拟议议程</h2><p class="helper">${esc(s.prep)}</p><div class="button-row">${button('套用核心议程','agenda-core','','rotate-ccw')}${button(`压缩为 ${s.lightMinutes||30} 分钟筹备议程`,'agenda-light','','clock-3')}${button('增加环节','agenda-add','','plus')}</div>${plan.agenda.map((a,i)=>`<section class="o-agenda-row"><div class="field-row">${field(`环节 ${i+1}`,a.title,'title',{section:'agenda',index:i})}${field('分钟',a.minutes,'minutes',{section:'agenda',index:i,number:[1,360]})}</div><div class="o-row-tools">${i?`<button class="icon-btn" data-o-action="agenda-up" data-o-value="${i}" title="上移环节" aria-label="上移环节 ${i+1}">${icon('arrow-up')}</button>`:''}${i<plan.agenda.length-1?`<button class="icon-btn" data-o-action="agenda-down" data-o-value="${i}" title="下移环节" aria-label="下移环节 ${i+1}">${icon('arrow-down')}</button>`:''}<button class="icon-btn" data-o-action="agenda-remove" data-o-value="${i}" title="移除环节" aria-label="移除环节 ${i+1}"${plan.agenda.length===1?' disabled':''}>${icon('x')}</button></div></section>`).join('')}<h2>准备材料</h2>${plan.materials.map((m,i)=>`<section class="o-row"><div class="field-row">${field('材料',m.title,'title',{section:'materials',index:i})}${field('准备者',m.owner,'owner',{section:'materials',index:i})}${field('会前准备期限',m.due,'due',{section:'materials',index:i})}</div>${checkbox('已准备并检查',m.ready,'materials',i)}<button class="icon-btn o-remove" data-o-action="material-remove" data-o-value="${i}" title="移除材料" aria-label="移除材料 ${i+1}"${plan.materials.length===1?' disabled':''}>${icon('x')}</button></section>`).join('')}${button('增加材料','material-add','','plus')}${field('设备、纸面、场地、休息与不能同场时的备用安排',plan.fields.fallback,'fallback',{long:true})}`;
  if(step===3)content=`<h2>会前检查</h2>${plan.checks.map((r,i)=>`<section class="o-row">${checkbox(r.label,r.confirmed,'checks',i)}<p class="helper">${esc(r.hint)}</p>${field('核对依据、未决或缩小安排',r.note,'note',{section:'checks',index:i,long:true})}</section>`).join('')}<h2>带走筹备材料</h2><div class="button-row">${button('公开简报 HTML','brief','','file-text')}${button('组织者筹备单 HTML','prep-html','','printer')}${button('筹备单 Markdown','prep-md','','file-text')}${button('备份筹备 JSON','backup','','download')}</div><p class="helper">公开简报不含模板私有上下文和参与支持及非公开安排；包括公开角色、授权、你填写的公开事实和邀请内容。组织者筹备单和备份保留完整内容。导出前检查分享权限；人工勾选不认证权限或真实同意。</p>`;
  api.frame(`<div class="page-heading"><div><h1>组织者模式</h1><p class="subhead">会前筹备</p></div><div class="button-row">${button('新建筹备','new','','plus')}${button('导出 JSON','backup','','download')}</div></div><nav class="x-mode-tabs"><a class="btn" href="#overview">${icon('compass')}快速选玩法</a><a class="btn" href="#workshop">${icon('users')}现有主持台</a><a class="btn" href="扩展玩法与规模方案.html">${icon('book-open')}规模方案</a></nav>${loadWarning?`<p class="warning-banner">${esc(loadWarning)}</p>`:''}<section class="o-selectors">${field('练习模板',plan.template,'template',{section:'plan',options:games.map(g=>({id:g.id,title:`${g.id} ${g.title}`}))})}${field('规模',plan.scale,'scale',{section:'plan',options:scales})}${field('总人数（含引导师）',plan.people,'people',{section:'plan',number:{solo:[1,1],trio:[3,3],small:[5,9],midsize:[20,50],scrum4:[12,80],org125:[125,125],org500:[500,500]}[plan.scale],disabled:['solo','trio','org125','org500'].includes(plan.scale)})}${field('可用时长 / 分钟',plan.minutes,'minutes',{section:'plan',number:[10,1440]})}</section><nav class="o-steps" aria-label="会前筹备步骤">${steps.map((t,i)=>`<button data-o-action="step" data-o-value="${i}"${step===i?' aria-current="step"':''}><span>${i+1}</span>${t}</button>`).join('')}</nav><div class="o-layout"><section class="o-content">${content}<div class="o-step-bottom">${step?button('上一步','step',String(step-1),'arrow-left'):''}${step<3?button('下一步','step',String(step+1),'arrow-right'):''}</div></section><aside id="o-summary" class="o-summary" aria-live="polite">${summary()}</aside></div><footer class="x-footer"><span id="o-save">${storageOK?'筹备记录已存于此浏览器':'仅本次会话，请导出筹备 JSON'}</span><div class="button-row">${button('备份筹备 JSON','backup','','download')}${button('导入筹备备份','import','','upload')}<input type="file" id="o-import" accept=".json,application/json" hidden></div><p>筹备记录独立保存，不替换单局、战役、主持台或组织输入。此处不记录现场执行、正式决定或会后成果。</p></footer>`,'组织者会前筹备');
 }
 function mount(route,helpers){if(route!=='organizer')return false;api=helpers;plan||=c.create();save();render();return true;}
 function html(title,body){return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title><style>body{font:18px/1.85 -apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;color:#22323b;max-width:950px;margin:32px auto;padding:0 24px;letter-spacing:0}h1{font-size:30px}h2{font-size:23px;margin-top:30px}h3{font-size:19px}p,li{overflow-wrap:anywhere;white-space:pre-wrap}section{border-top:1px solid #ccd9dd;padding-top:18px;margin-top:22px}small{color:#52626b}@media print{body{margin:0;font-size:14pt}h1{font-size:23pt}section{break-inside:avoid}}</style></head><body><h1>${esc(title)}</h1>${body}</body></html>`;}
 const line=(label,value)=>`<p><strong>${esc(label)}：</strong>${esc(value||'待确认')}</p>`;
 function briefBody(){return `<p>${esc(scaleOf().title)} · ${plan.people} 人（含引导师） · 可用 ${plan.minutes} 分钟</p>${[['目的与开放选择','purpose'],['预期产物','output'],['公开事实与来源','facts'],['决策授权','authority'],['时间','when'],['参与方式','place'],['资料边界','dataBoundary'],['邀请与提前准备','invitation']].map(([l,k])=>line(l,plan.fields[k])).join('')}<section><h2>角色安排</h2><p>${esc(c.guidance(plan))}</p>${plan.participants.map(r=>line(r.role,`${r.name||'待安排'}；${r.authority||'授权待确认'}`)).join('')}</section><section><h2>拟议议程</h2><ol>${plan.agenda.map(a=>`<li>${esc(a.title)} · ${a.minutes} 分钟</li>`).join('')}</ol></section><small>会前草案；不代表现场完成、他人同意或正式批准。模板事实为虚构，自行填入的信息须另核对分享权限。</small>`;}
 function prepBody(){const st=c.status(plan);return briefBody()+`<section><h2>参与支持与非公开安排（仅组织者）</h2>${plan.participants.map(r=>line(`${r.role} / ${r.name||'待安排'}`,r.needs)).join('')}</section><section><h2>材料准备</h2>${plan.materials.map(m=>line(m.title,`${m.owner||'准备者待定'} / ${m.due||'期限待定'} / ${m.ready?'已检查':'待准备'}`)).join('')}${line('备用安排',plan.fields.fallback)}</section><section><h2>人工会前核对</h2>${plan.checks.map(r=>line(`${r.confirmed?'已标记核对':'待核对'} · ${r.label}`,r.note)).join('')}<h3>仍需处理</h3>${st.gaps.length?`<ul>${st.gaps.map(g=>`<li>${esc(g)}</li>`).join('')}</ul>`:'<p>所填筹备信息已齐；真实授权须人工核实。</p>'}</section>`;}
 function markdown(){const st=c.status(plan);return `# ${plan.title}\n\n会前筹备，不代表现场执行或正式批准。\n\n规模：${scaleOf().title} / ${plan.people}人 / ${plan.minutes}分钟\n角色：${c.guidance(plan)}\n\n${c.fieldNames.map(k=>`## ${{purpose:'目的',output:'产物',facts:'公开事实',authority:'授权',when:'时间',place:'参与方式',fallback:'备用安排',invitation:'邀请',dataBoundary:'资料边界'}[k]}\n${plan.fields[k]||'待确认'}`).join('\n\n')}\n\n## 参与与分工\n${plan.participants.map(r=>`- ${r.role}：${r.name||'待安排'}；${r.authority||'授权待确认'}；${r.needs||'输入待确认'}`).join('\n')}\n\n## 拟议议程\n${plan.agenda.map(a=>`- ${a.title} / ${a.minutes}分钟`).join('\n')}\n\n## 材料\n${plan.materials.map(m=>`- ${m.title}：${m.owner||'待安排'} / ${m.due||'期限待定'} / ${m.ready?'已检查':'待准备'}`).join('\n')}\n\n## 人工核对\n${plan.checks.map(r=>`- [${r.confirmed?'x':' '}] ${r.label}：${r.note||'待核对'}`).join('\n')}\n\n## 缺口\n${st.gaps.join('\n')||'所填筹备信息已齐，仍需人工核实授权。'}`;}
 function edit(t,commit=false){
  const {oSection:section,oField:k,oIndex:index}=t.dataset;if(!section||!plan)return;
  let value=t.type==='checkbox'?t.checked:t.value;
  if(t.type==='number'){
   const raw=Number(t.value),min=Number(t.min),max=Number(t.max);
   if(!commit&&(t.value===''||!Number.isInteger(raw)||raw<min||raw>max))return;
   value=commit?Math.min(max,Math.max(min,Math.round(raw)||min)):raw;
   if(commit)t.value=value;
  }
  if(section==='plan'&&['template','scale','roleMode'].includes(k)){
   const old=plan[k];if(value===old)return;
   const warning=k==='template'?'切换模板会更换标题、目的、产物、公开事实和材料清单；其他填写保留。需要旧稿时先导出JSON。':k==='scale'?'切换规模会更换人数、角色名单和拟议议程；其他文字保留。需要旧稿时先导出JSON。':'切换角色安排会更新角色职责和拟议议程，姓名和文字保留；需要旧议程时先导出JSON，并重新核实授权。';
   if(!confirm(warning)){t.value=old;return;}
   if(k==='template'){const fresh=c.create(value,plan.scale);plan.template=value;plan.title=fresh.title;for(const name of ['purpose','output','facts'])plan.fields[name]=fresh.fields[name];plan.materials=fresh.materials;}
   if(k==='scale'){const fresh=c.create(plan.template,value);for(const name of ['scale','roleMode','people','minutes','participants','agenda'])plan[name]=fresh[name];}
   if(k==='roleMode'){plan.roleMode=value;const roles=c.participants(plan.scale,value);plan.participants.forEach((r,i)=>r.role=roles[i].role);plan.agenda=c.agendaFor(plan.scale,value);}
   resetChecks();save();render();return;
  }
  const target=section==='plan'?plan:section==='fields'?plan.fields:plan[section]?.[Number(index)];if(!target)return;
  target[k]=value;if(section!=='checks')resetChecks();refresh();
 }
 document.addEventListener('input',e=>{if(e.target.dataset.oSection&&!['checkbox','select-one'].includes(e.target.type))edit(e.target);});
 document.addEventListener('change',e=>{if(e.target.dataset.oSection&&['checkbox','select-one','number'].includes(e.target.type))edit(e.target,true);});
 document.addEventListener('click',e=>{
  const t=e.target.closest('[data-o-action]');if(!t||!api||!plan)return;const a=t.dataset.oAction,n=Number(t.dataset.oValue);
  if(a==='step'){step=n;render();$('#main').focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}
  if(a==='new'){if(!confirm('新建会替换当前筹备草案。需要保留时先导出筹备JSON；其他模式记录不受影响。'))return;plan=c.create();saveEnabled=true;loadWarning='';step=0;save();render();}
  if(a==='backup')api.download('组织者-会前筹备.json',JSON.stringify(c.backup(plan),null,2),'application/json');
  if(a==='brief')api.download('会前公开简报.html',html(plan.title,briefBody()),'text/html;charset=utf-8');
  if(a==='prep-html')api.download('组织者会前筹备单.html',html(plan.title,prepBody()),'text/html;charset=utf-8');
  if(a==='prep-md')api.download('组织者会前筹备单.md',markdown());
  if(a==='role'){const g=games.find(g=>g.id===plan.template),r=g.roles[n];if(r)api.download(`${g.id}-角色${n+1}.html`,html(`${r.name} · 角色卡`,line('公开情境',plan.fields.facts)+[['开场',r.opening],['此角色上下文',r.context],['希望',r.want],['边界',r.boundary]].map(([l,v])=>line(l,v)).join('')+'<small>虚构练习卡，只含本角色。需要现实授权时另行确认。</small>'),'text/html;charset=utf-8');}
  if(a==='agenda-core'||a==='agenda-light'){
   if(!confirm('将替换拟议议程，其他文字保留。需要旧议程时先导出筹备JSON。'))return;
   if(a==='agenda-core'){plan.agenda=c.agendaFor(plan.scale,plan.roleMode);plan.minutes=scaleOf().minutes;}
   else{const time=scaleOf().lightMinutes||30;plan.agenda=[{title:plan.scale==='solo'?'独立初判与事实':'目的、角色与事实',minutes:Math.round(time/3)},{title:'只讨论一项备选与约束',minutes:Math.round(time/3)},{title:'待确认对象与下一步安排',minutes:time-2*Math.round(time/3)}];plan.minutes=time;}
   resetChecks();save();render();
  }
  if(a==='agenda-add'||a==='material-add'){const list=a==='agenda-add'?plan.agenda:plan.materials,limit=a==='agenda-add'?12:20;if(list.length>=limit){api.toast(`最多${limit}项，请合并或替换已有内容`);return;}list.push(a==='agenda-add'?{title:'新环节',minutes:10}:{title:'新材料',owner:'',due:'',ready:false});resetChecks();save();render();}
  if(a==='agenda-up'||a==='agenda-down'){const to=n+(a==='agenda-up'?-1:1);if(plan.agenda[to]){[plan.agenda[n],plan.agenda[to]]=[plan.agenda[to],plan.agenda[n]];resetChecks();save();render();}}
  if(a==='agenda-remove'||a==='material-remove'){const list=a==='agenda-remove'?plan.agenda:plan.materials;if(list.length>1){list.splice(n,1);resetChecks();save();render();}}
  if(a==='import')$('#o-import').click();
  if(a==='import-cancel'){pending=null;$('#o-import-preview')?.remove();}
  if(a==='import-confirm'&&pending){plan=pending.plan;pending=null;saveEnabled=true;loadWarning='';save();render();api.toast('会前筹备已替换，其他模式记录未改变');}
 });
 document.addEventListener('change',async e=>{
  if(e.target.id!=='o-import')return;const file=e.target.files?.[0];if(!file)return;
  try{if(file.size>2000000)throw new Error('文件超过2MB');pending=c.validate(JSON.parse(await file.text()));$('#o-import-preview')?.remove();const box=document.createElement('section');box.id='o-import-preview';box.className='x-import-preview';box.innerHTML=`<h2>确认替换会前筹备</h2><p>${esc(pending.plan.title)} · ${esc(scales.find(s=>s.id===pending.plan.scale).title)}。只替换当前筹备草案，不修改游戏、主持台或组织输入。需要旧稿时先备份。</p><div class="button-row">${button('先备份当前','backup','','download')}${button('取消','import-cancel','','x')}${button('确认替换','import-confirm','','upload')}</div>`;$('#main').append(box);box.scrollIntoView();}
  catch(error){pending=null;api.toast(`未导入：${error.message}`);}finally{e.target.value='';}
 });
 function prepare(template,scale,mode,minutes){if(plan&&!confirm('将用当前选择替换会前筹备。需要保留时先导出筹备JSON；其他模式不受影响。'))return false;plan=c.create(template,scale,mode);if(Number.isInteger(Number(minutes))&&Number(minutes)>=10&&Number(minutes)<=1440)plan.minutes=Number(minutes);saveEnabled=true;loadWarning='';step=0;save();return true;}
 return {mount,prepare};
})();
