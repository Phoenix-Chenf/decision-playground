globalThis.EXPANSION_CORE = (() => {
  const data=globalThis.EXPANSION_DATA;
  const find=(list,id)=>list.find(v=>v.id===id);
  const copy=v=>JSON.parse(JSON.stringify(v));
  const now=()=>new Date().toISOString();
  function zopa(aMin,aMax,bMin,bMax){
    const nums=[aMin,aMax,bMin,bMax].map(Number);
    if(nums.some(n=>!Number.isFinite(n)||n<0)||nums[0]>nums[1]||nums[2]>nums[3])return {valid:false,overlap:false};
    const low=Math.max(nums[0],nums[2]),high=Math.min(nums[1],nums[3]);
    return {valid:true,overlap:low<=high,low,high};
  }
  function meso(packages){
    const values=packages.map(p=>({a:p.scope*4+p.support*2+(p.maintenance==='B'?3:p.maintenance==='shared'?2:0)+(8-p.weeks),b:p.weeks*2-p.scope*3-p.support*2+(p.maintenance==='A'?3:p.maintenance==='shared'?2:0)}));
    return {values,equivalent:values.length===3&&values.every(v=>v.a===values[0].a),distinct:new Set(packages.map(p=>JSON.stringify(p))).size===packages.length};
  }
  const empty=()=>({format:'decision-playground-expansion',version:1,campaigns:[],labs:[],workshop:null});
  function newCampaign(scenario,scale,id){
    if(!find(data.scenarios,scenario)||!find(data.scales,scale))throw new Error('未知战役或规模');
    return {id,scenario,scale,step:0,event:false,picks:[],notes:{},dependencies:{},acceptance:{},leader:false,completed:false,history:[],updatedAt:now()};
  }
  function invalidate(state,reason){
    for(const section of ['dependencies','acceptance'])for(const row of Object.values(state[section])){row.ackA=false;row.ackB=false;}
    state.leader=false;state.completed=false;
    state.history.push(`${now()} · ${reason}；下游确认已取消，填写内容保留。`);
    state.history=state.history.slice(-80);state.updatedAt=now();
  }
  function campaignStatus(state){
    const scenario=find(data.scenarios,state.scenario),scale=find(data.scales,state.scale);
    const chosen=scenario.goals.filter(g=>state.picks.includes(g.id));
    const capacity=state.event?scale.eventCapacity:scale.capacity,cost=chosen.reduce((n,g)=>n+g.cost,0),messages=[];
    if(!chosen.length)messages.push('尚未选择目标；也可以有依据地暂停，但不要标成已批准执行。');
    if(chosen.length>3)messages.push('超过 TOP3，需收敛。');
    if(cost>capacity)messages.push(`目标 ${cost} 点超过当前 ${capacity} 点教学容量。`);
    for(const g of chosen){
      for(const [section,fields,label] of [['dependencies',['provider','receiver','object','window','notice','owner','test'],'依赖'],['acceptance',['definition','source','threshold','window','owner','stop'],'验收']]){
        const row=state[section][g.id]||{};
        const missing=fields.filter(f=>!String(row[f]||'').trim());
        if(missing.length)messages.push(`${g.title}：${label}尚缺 ${missing.length} 类信息。`);
        if(!row.ackA||!row.ackB)messages.push(`${g.title}：${label}双方模拟确认未齐。`);
      }
    }
    if(!state.leader)messages.push('负责人 TOP3 与风险模拟批准未记录。');
    if(!String(state.notes.return||'').trim())messages.push('尚未记录回传与少数意见校准安排。');
    return {chosen,cost,capacity,messages,ready:messages.length===0};
  }
  const newLab=(scenario,id)=>{if(!find(data.dialogues,scenario))throw new Error('未知对话');return {id,scenario,path:[],words:[],parent:'',forkAt:null,updatedAt:now()};};
  function forkLab(lab,turn,id){
    if(!Number.isInteger(turn)||turn<0||turn>lab.path.length)throw new Error('分岔节点不合法');
    return {...copy(lab),id,path:lab.path.slice(0,turn),words:lab.words.slice(0,turn),parent:lab.id,forkAt:turn,updatedAt:now()};
  }
  function safeTree(value,depth=0){
    if(depth>8)throw new Error('数据嵌套过深');
    if(typeof value==='string'){if(value.length>20000)throw new Error('文本过长');return value;}
    if(value===null||typeof value==='boolean')return value;
    if(typeof value==='number'){if(!Number.isFinite(value)||Math.abs(value)>100000)throw new Error('数字超界');return value;}
    if(Array.isArray(value)){if(value.length>100)throw new Error('列表过长');return value.map(v=>safeTree(v,depth+1));}
    if(value&&typeof value==='object'){
      if(Object.keys(value).length>100)throw new Error('字段过多');
      const out={};for(const [k,v] of Object.entries(value)){if(!/^[a-zA-Z0-9_-]{1,80}$/.test(k)||['__proto__','constructor','prototype'].includes(k))throw new Error('不安全字段');out[k]=safeTree(v,depth+1);}return out;
    }
    throw new Error('值类型不合法');
  }
  function textMap(value,keys){if(!value||Array.isArray(value)||typeof value!=='object')throw new Error('文本字段结构不合法');for(const [k,v] of Object.entries(value)){if(typeof v!=='string'||keys&&!keys.includes(k))throw new Error('文本字段不合法');}}
  function date(value){if(typeof value!=='string'||Number.isNaN(Date.parse(value)))throw new Error('日期不合法');}
  function flags(value,keys){for(const k of keys)if(typeof value[k]!=='boolean')throw new Error('确认状态不合法');}
  function knownKeys(value,keys){if(Object.keys(value).some(k=>!keys.includes(k)))throw new Error('未知字段');}
  function validate(raw){
    const v=safeTree(raw);if(!v||v.format!=='decision-playground-expansion'||v.version!==1)throw new Error('不是本扩展的 v1 记录');
    knownKeys(v,['format','version','campaigns','labs','workshop','exportedAt']);
    if(!Array.isArray(v.campaigns)||v.campaigns.length>20||!Array.isArray(v.labs)||v.labs.length>40)throw new Error('局数异常');
    const ids=new Set();const checkID=id=>{if(typeof id!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(id)||ids.has(id))throw new Error('局标识重复或不合法');ids.add(id);};
    for(const s of v.campaigns){
      knownKeys(s,['id','scenario','scale','step','event','picks','notes','dependencies','acceptance','leader','completed','history','updatedAt']);checkID(s.id);
      if(!find(data.scenarios,s.scenario)||!find(data.scales,s.scale)||!Number.isInteger(s.step)||s.step<0||s.step>4)throw new Error('战役参数不合法');
      flags(s,['event','leader','completed']);date(s.updatedAt);textMap(s.notes,['map','decision','alternate','return','reflection','outcome']);
      if(s.notes.outcome!==undefined&&!['待确认','有限试点','重谈','暂停','停止'].includes(s.notes.outcome))throw new Error('战役结果不合法');
      const allowed=find(data.scenarios,s.scenario).goals.map(g=>g.id);
      if(!Array.isArray(s.picks)||s.picks.length>6||new Set(s.picks).size!==s.picks.length||s.picks.some(id=>!allowed.includes(id)))throw new Error('未知目标');
      if(!Array.isArray(s.history)||s.history.length>80||s.history.some(n=>typeof n!=='string'))throw new Error('变更记录不合法');
      for(const [section,fields] of [['dependencies',['provider','receiver','object','window','notice','owner','test']],['acceptance',['definition','source','threshold','window','owner','stop']]]){
        if(!s[section]||Array.isArray(s[section])||typeof s[section]!=='object')throw new Error('依赖或验收结构不合法');
        for(const [id,row] of Object.entries(s[section])){
          if(!allowed.includes(id)||!row||Array.isArray(row)||typeof row!=='object')throw new Error('未知依赖或验收');
          knownKeys(row,[...fields,'ackA','ackB']);flags(row,['ackA','ackB']);textMap(Object.fromEntries(Object.entries(row).filter(([k])=>!['ackA','ackB'].includes(k))),fields);
        }
      }
      if(s.completed&&(!campaignStatus(s).ready||s.notes.outcome!=='有限试点'))throw new Error('已批准战役仍有未满足条件');
    }
    for(const s of v.labs){
      knownKeys(s,['id','scenario','path','words','parent','forkAt','updatedAt']);checkID(s.id);
      if(!find(data.dialogues,s.scenario)||!Array.isArray(s.path)||s.path.length>4||s.path.some(n=>!Number.isInteger(n)||n<0||n>2))throw new Error('对话路径不合法');
      if(!Array.isArray(s.words)||s.words.length!==s.path.length||s.words.some(v=>typeof v!=='string'))throw new Error('表达记录不合法');
      if(typeof s.parent!=='string'||s.parent&& !/^[a-zA-Z0-9_-]{1,80}$/.test(s.parent))throw new Error('原路径标识不合法');
      if(s.forkAt!==null&&(!Number.isInteger(s.forkAt)||s.forkAt<0||s.forkAt>4))throw new Error('分岔位置不合法');date(s.updatedAt);
    }
    if(v.workshop!==null){
      const w=v.workshop;if(!w||Array.isArray(w)||typeof w!=='object')throw new Error('主持台结构不合法');
      knownKeys(w,['title','scene','mission','scale','template','roleA','roleB','contextA','contextB','wantA','wantB','boundaryA','boundaryB','event','agenda','decisions','hostNotes','updatedAt']);
      textMap(Object.fromEntries(Object.entries(w).filter(([k])=>!['agenda','decisions'].includes(k))));
      if(!find(data.scales,w.scale)||!GAME_DATA.games.some(g=>g.id===w.template))throw new Error('主持模板不合法');
      date(w.updatedAt);
      if(!Array.isArray(w.agenda)||w.agenda.length<1||w.agenda.length>12)throw new Error('议程数量不合法');
      for(const a of w.agenda){knownKeys(a,['title','minutes','done']);if(typeof a.title!=='string'||!Number.isInteger(a.minutes)||a.minutes<1||a.minutes>180||typeof a.done!=='boolean')throw new Error('议程不合法');}
      if(!Array.isArray(w.decisions)||w.decisions.length>8)throw new Error('决定数量不合法');
      for(const r of w.decisions){knownKeys(r,['object','choice','decider','owner','partner','criteria','source','window','status','return']);textMap(r);if(!['建议','待批准','已模拟批准','暂停','停止'].includes(r.status))throw new Error('决定状态不合法');}
    }
    return {format:v.format,version:1,campaigns:v.campaigns,labs:v.labs,workshop:v.workshop};
  }
  return {zopa,meso,empty,newCampaign,invalidate,campaignStatus,newLab,forkLab,validate,copy};
})();
