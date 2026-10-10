globalThis.FACILITATION_CORE = (() => {
 const d=FACILITATION_DATA,scales=EXPANSION_DATA.scales;
 const textFields=['facts','goal','concern','proposal','representative','mandate','dissent','owner','acceptance','returnNote','topic'];
 function recommend({theme,scale,minutes,authority}){
  const t=d.themes.find(t=>t.id===theme),s=scales.find(s=>s.id===scale);if(!t||!s)throw new Error('未知场景或规模');
  const warnings=[];if(authority==='none')warnings.push('缺少决策授权：本次只公开事实、提出备选与安排升级，不记录正式执行承诺。');
  if(authority==='partial')warnings.push('仅部分授权：将局部决定与需要负责人批准的条款分开。');
  if(Number(minutes)<(s.minimumMinutes||(scale==='org500'?240:scale==='org125'?120:scale==='scrum4'?90:45)))warnings.push('时间不足以完成全流程；建议拆场，不删掉相关方校准与回传。');
  if(scale==='solo')warnings.push('单人只形成个人备选、主持预演和待确认项，不能代表他人同意或组织承诺。');
  if(scale==='trio')warnings.push('3人总数包含引导师；负责人不在其中时只形成建议，不假设额外一人已经批准。');
  if(['org125','org500'].includes(scale))warnings.push('大型场景需要协同主持、分组输入、代表授权与回传；离线工具由授权人员汇总，不提供多人并发。');
  if(theme==='conflict')warnings.push('若有威胁、骚扰、报复或严重权力不对等，应转正式程序；不强迫和解或公开隐私。');
  return {games:t.games,output:t.output,condition:t.condition,warnings,scale:s};
 }
 function checkSequence(items,edges,inputs){
  const values=items.map(i=>inputs[`order_${i.id}`]),incomplete=values.some(n=>!n),duplicates=new Set(values.filter(Boolean)).size!==values.filter(Boolean).length;
  const inversions=edges.filter(([a,b])=>inputs[`order_${a}`]&&inputs[`order_${b}`]&&Number(inputs[`order_${a}`])>Number(inputs[`order_${b}`]));
  return {incomplete,duplicates,inversions};
 }
 function newAssembly(scale){
  const people={solo:1,trio:3,small:8,midsize:40,scrum4:32,org125:125,org500:500}[scale];if(!people)throw new Error('规模未知');
  const size=scale==='scrum4'?8:scale==='small'?8:8,count=Math.ceil(people/size);
  return {scale,people,groups:Array.from({length:count},(_,i)=>({id:`T${String(i+1).padStart(2,'0')}`,people:Math.min(size,people-i*size),...Object.fromEntries(textFields.map(k=>[k,''])),returned:false})),decision:'',decider:'',returnWindow:'',updatedAt:new Date().toISOString()};
 }
 function assemblyStatus(a){return {total:a.groups.length,inputs:a.groups.filter(g=>g.facts.trim()&&g.goal.trim()).length,mandates:a.groups.filter(g=>g.representative.trim()&&g.mandate.trim()).length,dissents:a.groups.filter(g=>g.dissent.trim()).length,returned:a.groups.filter(g=>g.returned).length,ready:a.groups.every(g=>g.facts.trim()&&g.goal.trim()&&g.representative.trim()&&g.mandate.trim()&&g.returned)&&a.decision.trim()&&a.decider.trim()&&a.returnWindow.trim()};}
 function validateAssembly(a){
  if(!a||typeof a!=='object'||Array.isArray(a)||!scales.some(s=>s.id===a.scale))throw new Error('组织规模不合法');
  if(Object.keys(a).some(k=>!['scale','people','groups','decision','decider','returnWindow','updatedAt'].includes(k)))throw new Error('未知组织字段');
  if(!Number.isInteger(a.people)||a.people<1||a.people>500||a.scale==='solo'&&a.people!==1||a.scale==='trio'&&a.people!==3||!['solo','trio'].includes(a.scale)&&a.people<5)throw new Error('人数超界或与单人/3人规模不符');
  if(!Array.isArray(a.groups)||a.groups.length<1||a.groups.length>100)throw new Error('分组数量异常');
  const ids=new Set();for(const g of a.groups){if(!g||typeof g!=='object'||Object.keys(g).some(k=>!['id','people','returned',...textFields].includes(k)))throw new Error('未知小组字段');if(!/^T\d{2,3}$/.test(g.id)||ids.has(g.id))throw new Error('小组标识不合法');ids.add(g.id);if(!Number.isInteger(g.people)||g.people<1||g.people>20||typeof g.returned!=='boolean')throw new Error('小组人数或回传标记不合法');for(const k of textFields)if(typeof g[k]!=='string'||g[k].length>12000)throw new Error('小组文本不合法');}
  if(a.groups.reduce((n,g)=>n+g.people,0)!==a.people)throw new Error('分组人数合计不一致');for(const k of ['decision','decider','returnWindow','updatedAt'])if(typeof a[k]!=='string'||a[k].length>20000)throw new Error('组织文本不合法');if(Number.isNaN(Date.parse(a.updatedAt)))throw new Error('日期不合法');return JSON.parse(JSON.stringify(a));
 }
 return {recommend,checkSequence,newAssembly,assemblyStatus,validateAssembly,textFields};
})();
