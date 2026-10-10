globalThis.ORGANIZER_CORE = (() => {
 'use strict';
 const scales=EXPANSION_DATA.scales,games=GAME_DATA.games;
 const fieldNames=['purpose','output','facts','authority','when','place','fallback','invitation','dataBoundary'];
 const checkTemplates=[
  ['scope','目的与开放选择已明确','只讨论一个必要对象；已确定与可讨论部分分开。'],
  ['mandate','授权边界已向相关方确认','谁拍方向、谁选实现、谁仅提供建议；缺席者的批准另约。'],
  ['voices','参与者与表达方式已确认','关键相关方、独立输入和不愿公开表达的替代方式。'],
  ['inputs','资料与事实来源已检查','资料可合法读取和分享；事实、假设、未知分别标注。'],
  ['roles','角色分工与材料发放已安排','组织者、引导师、记录及必要协同人员；私有卡分别发。'],
  ['logistics','时间、场地与备用安排已检查','议程预算、休息、设备、纸面及可达性；规模较大时先彩排。'],
  ['expectations','邀请与预期已校准','参与人知道要准备什么、不在现场决定什么；不承诺保证共识。']
 ];
 const scaleOf=id=>scales.find(s=>s.id===id);
 const modeOptions=scale=>scale==='solo'?[{id:'self',title:'自我推演'},{id:'rehearsal',title:'主持预演'}]:scale==='trio'?[{id:'hosted',title:'1位引导师 + 2位参与者'},{id:'rotating',title:'3人轮换主持'}]:[{id:'shared',title:'按工作边界安排角色'}];
 const agendaFor=(scale,mode)=>scale==='trio'&&mode==='rotating'?['甲','乙','丙'].map(name=>({title:`${name}主持：独立输入、备选、待确认`,minutes:20})):scaleOf(scale).process.map(([title,minutes])=>({title,minutes}));
 function participants(scale,mode=modeOptions(scale)[0].id){
  const roles=scale==='solo'?['本人（兼推演与核对）']:scale==='trio'?(mode==='rotating'?['成员甲（轮换主持）','成员乙（轮换主持）','成员丙（轮换主持）']:['引导师','参与者甲','参与者乙']):['组织者 / 主引导师','获授权负责人','领域或小组代表','材料与记录负责人',...(['org125','org500'].includes(scale)?['桌主持与总控协调人']:[])];
  return roles.map(role=>({role,name:'',authority:'',needs:''}));
 }
 function create(template='F4',scale='small',mode){
  const g=games.find(g=>g.id===template),s=scaleOf(scale);if(!g||!s)throw new Error('未知模板或规模');
  const roleMode=modeOptions(scale).some(m=>m.id===mode)?mode:modeOptions(scale)[0].id;
  return {template,scale,roleMode,people:{solo:1,trio:3,small:8,midsize:40,scrum4:32,org125:125,org500:500}[scale],minutes:s.minutes,title:`${g.title} · 会前筹备`,fields:{purpose:g.mission,output:g.deliverables.join('；'),facts:g.scene,authority:'',when:'',place:'',fallback:'',invitation:'',dataBoundary:'仅使用获授权的必要资料；独立角色卡分别发放，公开简报不含私有上下文。'},participants:participants(scale,roleMode),agenda:agendaFor(scale,roleMode),materials:[...g.materials.slice(0,4).map(m=>({title:m.title,owner:'',due:'',ready:false})),{title:'独立角色卡与公开简报',owner:'',due:'',ready:false},{title:'纸面或设备备用材料',owner:'',due:'',ready:false}],checks:checkTemplates.map(([id,label,hint])=>({id,label,hint,confirmed:false,note:''})),updatedAt:new Date().toISOString()};
 }
 function guidance(p){
  if(p.scale==='solo')return p.roleMode==='rehearsal'?'同一人预演开场、追问、收敛和备用安排。换角色不是独立验证；不能替缺席相关方批准，预演不证明真实引导效果。':'先保留独立判断，再切换视角找反例。不能把自己替角色作答当成他人反馈；需要他人确认的条款列入未决。';
  if(p.scale==='trio')return p.roleMode==='rotating'?'3人按甲→乙→丙轮换过程责任，每轮其余2人表达；每轮约20分钟。主持轮换不转移业务授权，保留原句，争议条款由真正有权的人确认。':'3人总数包括引导师。两位参与者先独立输入，互相复述再比较备选；引导师不是第三票。若负责人不在这3人中，只准备建议与升级包。';
  return scaleOf(p.scale).roles;
 }
 function status(p){
  const gaps=[];
  const labels={purpose:'目的',output:'预期产物',facts:'公开事实与来源',authority:'授权边界',when:'时间',place:'场地或参与方式',fallback:'备用安排'};
  for(const [key,label] of Object.entries(labels))if(!p.fields[key].trim())gaps.push(`待补充${label}。`);
  if(!p.title.trim())gaps.push('待补充筹备标题。');
  if(p.agenda.reduce((n,a)=>n+a.minutes,0)>p.minutes)gaps.push('拟议议程超过可用时长，需缩范围或调整安排。');
  if(p.participants.some(r=>!r.name.trim()||!r.authority.trim()))gaps.push('角色尚缺承接者或授权说明；可以明确写缺席及确认安排。');
  if(p.materials.some(m=>!m.ready||!m.owner.trim()||!m.due.trim()))gaps.push('材料尚未备齐，或缺准备者/准备期限。');
  if(p.checks.some(r=>!r.confirmed||!r.note.trim()))gaps.push('会前检查尚缺人工核对记录。');
  return {ready:gaps.length===0,gaps,checked:p.checks.filter(r=>r.confirmed&&r.note.trim()).length,total:p.checks.length,agendaMinutes:p.agenda.reduce((n,a)=>n+a.minutes,0)};
 }
 const copy=v=>JSON.parse(JSON.stringify(v));
 const backup=p=>({format:'decision-playground-organizer',version:1,plan:copy(p)});
 function object(v,allowed){if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).some(k=>!allowed.includes(k))||allowed.some(k=>!Object.hasOwn(v,k)))throw new Error('筹备记录含未知字段、缺失字段或结构不合法');}
 function str(v,max=12000){if(typeof v!=='string'||v.length>max)throw new Error('筹备文本类型不合法或过长');}
 function rows(v,max){if(!Array.isArray(v)||v.length<1||v.length>max)throw new Error('筹备列表数量不合法');}
 function validate(raw){
  object(raw,['format','version','plan']);if(raw.format!=='decision-playground-organizer'||raw.version!==1)throw new Error('不是组织者会前筹备v1记录');
  const p=raw.plan;
  object(p,['template','scale','roleMode','people','minutes','title','fields','participants','agenda','materials','checks','updatedAt']);
  if(!games.some(g=>g.id===p.template)||!scaleOf(p.scale)||!modeOptions(p.scale).some(m=>m.id===p.roleMode))throw new Error('筹备模板、规模或角色安排不合法');
  const bounds={solo:[1,1],trio:[3,3],small:[5,9],midsize:[20,50],scrum4:[12,80],org125:[125,125],org500:[500,500]}[p.scale];
  if(!Number.isInteger(p.people)||p.people<bounds[0]||p.people>bounds[1]||!Number.isInteger(p.minutes)||p.minutes<10||p.minutes>1440)throw new Error('筹备人数或可用时长不合法');
  str(p.title,3000);str(p.updatedAt,100);if(Number.isNaN(Date.parse(p.updatedAt)))throw new Error('筹备日期不合法');
  object(p.fields,fieldNames);for(const k of fieldNames)str(p.fields[k]);
  rows(p.participants,20);if(['solo','trio'].includes(p.scale)&&p.participants.length!==p.people)throw new Error('单人/3人角色数量不符');
  for(const r of p.participants){object(r,['role','name','authority','needs']);for(const v of Object.values(r))str(v,3000);}
  rows(p.agenda,12);for(const a of p.agenda){object(a,['title','minutes']);str(a.title,3000);if(!Number.isInteger(a.minutes)||a.minutes<1||a.minutes>360)throw new Error('拟议议程时长不合法');}
  rows(p.materials,20);for(const m of p.materials){object(m,['title','owner','due','ready']);for(const k of ['title','owner','due'])str(m[k],3000);if(typeof m.ready!=='boolean')throw new Error('材料状态不合法');}
  rows(p.checks,checkTemplates.length);if(p.checks.length!==checkTemplates.length)throw new Error('检查项缺失');
  p.checks.forEach((r,i)=>{object(r,['id','label','hint','confirmed','note']);if(r.id!==checkTemplates[i][0]||typeof r.confirmed!=='boolean')throw new Error('会前检查标识不合法');for(const k of ['label','hint','note'])str(r[k]);});
  const result=copy(raw);result.plan.checks.forEach((r,i)=>{r.label=checkTemplates[i][1];r.hint=checkTemplates[i][2];});return result;
 }
 return {create,participants,modeOptions,agendaFor,guidance,status,backup,validate,fieldNames};
})();
