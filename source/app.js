(() => {
  'use strict';
  const data = globalThis.GAME_DATA, core = globalThis.PLAYGROUND_CORE;
  const games = data.games, families = data.families;
  const key = 'phoenix-decision-playground-public-v1';
  const $ = selector => document.querySelector(selector);
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon = name => globalThis.PLAYGROUND_ICONS[name] || globalThis.PLAYGROUND_ICONS.circle;
  const familyOf = game => families.find(f => f.id === game.family);
  let store = {format:'chenfeng-decision-playground',version:1,sessions:{}};
  let storageOK = true, loadWarning = '', view = 'library', filter = 'all', search = '', statusFilter = 'all', current = null;
  let toastTimeout, saveTimeout, routeNotice = '', timer = {id:null,seconds:0,running:false}, largeType = false;
  try {
    localStorage.setItem(`${key}-test`, '1'); localStorage.removeItem(`${key}-test`);
    const old = localStorage.getItem(key);
    if (old) store = core.validateImport(JSON.parse(old), games);
  } catch (error) { storageOK = false; loadWarning = '当前浏览器未能载入本地记录；可继续使用，并导出 JSON 保存。'; }
  const session = game => {
    const value = store.sessions[game.id] ||= {step:0,notes:{},inputs:{},revealed:[],event:false,completed:false,starred:false,updatedAt:new Date().toISOString()};
    value.openedAt ||= new Date().toISOString();
    return value;
  };
  const val = (s, name, fallback = '') => s.inputs[name] ?? fallback;
  const checked = value => value ? ' checked' : '';
  function readControl(control) {
    if (control.type === 'checkbox') return control.checked;
    if (!['number','range'].includes(control.type)) return control.value;
    const parsed = Number(control.value);
    const min = Number(control.min || 0), max = Number(control.max || 100000);
    const value = Math.min(max, Math.max(min, Number.isFinite(parsed) ? parsed : min));
    if (control.value !== '' && value !== parsed) control.value = value;
    return value;
  }
  const options = (labels, selected, empty = true) => `${empty ? '<option value="">待选择</option>' : ''}${labels.map(label => `<option value="${escape(label)}"${String(selected) === String(label) ? ' selected' : ''}>${escape(label)}</option>`).join('')}`;
  const input = (s, name, label, hint = '', type = 'text', fallback = '') => `<label class="field-label">${escape(label)}${hint ? `<span class="field-hint">${escape(hint)}</span>` : ''}<input class="short-input ${type === 'number' ? 'number' : ''}" data-input="${name}" type="${type}" ${type === 'number' ? 'min="0" max="100000" step="1"' : 'maxlength="3000"'} value="${escape(val(s,name,fallback))}"></label>`;
  const note = (s, name, label, hint = '') => `<label class="field-label" for="note-${name}">${escape(label)}${hint ? `<span class="field-hint">${escape(hint)}</span>` : ''}</label><textarea id="note-${name}" class="note-input" data-note="${name}" maxlength="25000" placeholder="写下你的判断、依据和仍不知道的部分…">${escape(s.notes[name] || '')}</textarea>`;
  const select = (s, name, labels, label, fallback = '') => `<label class="field-label">${escape(label)}<select class="form-select" data-input="${name}">${options(labels,val(s,name,fallback))}</select></label>`;
  const item = (title, body, desc = '') => `<section class="engine-item"><h3>${escape(title)}</h3>${desc ? `<p>${escape(desc)}</p>` : ''}${body}</section>`;
  function toast(message) {
    $('#toast').textContent = message; $('#toast').classList.add('show'); clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => $('#toast').classList.remove('show'), 3500);
  }
  function persist(game) {
    if (game) session(game).updatedAt = new Date().toISOString();
    try { localStorage.setItem(key, JSON.stringify(store)); }
    catch (error) { storageOK = false; }
    const save = $('.save-state');
    if (save) { save.classList.toggle('warning', !storageOK); save.innerHTML = `<span class="save-dot"></span>${storageOK ? '记录已存于此浏览器' : '仅本次会话 · 请导出记录'}`; }
  }
  function saveLater(game) { clearTimeout(saveTimeout); saveTimeout = setTimeout(() => persist(game), 250); }
  function download(name, text, mime = 'text/plain;charset=utf-8') {
    const url = URL.createObjectURL(new Blob([text],{type:mime}));
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url),1000);
  }
  function sidebar() {
    const count = family => games.filter(g => !family || g.family === family).length;
    return `<aside class="sidebar"><a class="brand" href="#library"><span class="brand-mark">${icon('shapes')}</span>决策游乐场</a><div class="profile"><strong>Phoenix Chen</strong><span>Agile Coach · 协作与决策练习</span></div><div class="nav-label">游戏库</div><button class="nav-btn ${view === 'library' && filter === 'all' ? 'active' : ''}" data-nav="library">${icon('layout-grid')}全部游戏<span class="count">${games.length}</span></button>${families.map(f => `<button class="nav-btn ${view === 'library' && filter === f.id ? 'active' : ''}" data-nav="family-${f.id}" style="${filter === f.id ? `color:${f.color}` : ''}">${icon(f.icon)}${f.short}<span class="count">${count(f.id)}</span></button>`).join('')}<div class="nav-label">个人留痕</div><button class="nav-btn ${view === 'records' ? 'active' : ''}" data-nav="records">${icon('notebook-pen')}我的记录<span class="count">${Object.values(store.sessions).filter(s=>s.openedAt).length}</span></button><button class="nav-btn ${view === 'favorites' ? 'active' : ''}" data-nav="favorites">${icon('bookmark')}收藏</button><div class="side-bottom"><button class="nav-btn" data-action="backup">${icon('folder-down')}备份与迁移</button><a class="nav-btn" href="完整游戏手册.html" target="_blank" rel="noopener">${icon('book-open')}完整手册</a><button class="nav-btn ${view === 'about' ? 'active' : ''}" data-nav="about">${icon('circle-help')}边界与主持约定</button><div class="save-state ${storageOK ? '' : 'warning'}"><span class="save-dot"></span>${storageOK ? '记录已存于此浏览器' : '仅本次会话 · 请导出记录'}</div></div></aside>`;
  }
  function frame(content, crumb) {
    const top = `<header class="topbar"><div class="breadcrumb"><button class="icon-btn mobile-menu" data-action="menu" aria-label="打开导航" title="打开导航">${icon('menu')}</button><span class="crumb-root">Phoenix Chen的实践游戏库</span>${icon('chevron-right')}<strong>${escape(crumb)}</strong></div><div class="top-actions"><button class="icon-btn ${largeType ? 'on' : ''}" data-action="type" aria-label="切换较大字号" title="切换较大字号">${icon('a-large-small')}</button><button class="icon-btn desktop-action" data-action="backup" aria-label="备份与迁移" title="备份与迁移">${icon('folder-down')}</button><button class="icon-btn" data-nav="records" aria-label="我的记录" title="我的记录">${icon('notebook-pen')}</button></div></header>`;
    $('#app').innerHTML = `<div class="shell">${sidebar()}<div class="workspace">${top}<main class="main" id="main" tabindex="-1">${content}</main></div></div>`;
    document.body.classList.toggle('large-type',largeType);
    globalThis.EXPANSION_UI?.decorate(view);
  }
  function artwork(game) {
    const c = familyOf(game).color, n = Number(game.id.slice(1));
    const stroke = `stroke="${c}" stroke-width="1.5" fill="white"`;
    let marks;
    if(game.family==='A') marks=`<path d="M28 24H86M28 24V63H86M86 24V63" fill="none" stroke="${c}" stroke-dasharray="3 3"/><rect x="12" y="11" width="33" height="25" rx="3" ${stroke}/><rect x="69" y="11" width="33" height="25" rx="3" ${stroke}/><rect x="12" y="50" width="33" height="25" rx="3" ${stroke}/><rect x="69" y="50" width="33" height="25" rx="3" ${stroke}/><path d="M20 23h16m-16 6h10M77 23h16m-16 6h10M20 61h16m-16 6h10M77 61h16m-16 6h10" stroke="${c}"/>`;
    else if(game.family==='B') marks=`<rect x="18" y="8" width="72" height="71" rx="3" ${stroke}/><path d="M29 24h45M29 38h45M29 52h45M29 66h28" stroke="${c}" opacity=".5"/><rect x="63" y="${22+n*3}" width="43" height="21" rx="3" fill="${c}"/><path d="M72 ${33+n*3}h22" stroke="white" stroke-width="2"/><path d="M10 51v18h18" stroke="${c}" stroke-width="2" fill="none"/>`;
    else if(game.family==='C') marks=`<path d="M18 12h75v33H61L46 59V45H18z" ${stroke}/><path d="M39 45h71v28H89l-9 9v-9H39z" fill="${c}" opacity=".15" stroke="${c}"/><path d="M29 25h47m-47 9h30M50 56h42m-42 8h26" stroke="${c}"/><rect x="88" y="8" width="18" height="18" rx="2" fill="${c}"/><path d="M92 17h10m-5-5v10" stroke="white"/>`;
    else marks=`<path d="M14 15l32-7 32 7 29-7v63l-29 7-32-7-32 7z" ${stroke}/><path d="M46 8v63M78 15v63" stroke="${c}" opacity=".3"/><path d="M27 55l20-25 16 15 27-17" fill="none" stroke="${c}" stroke-width="2" stroke-dasharray="4 3"/><rect x="22" y="50" width="10" height="10" rx="2" fill="${c}"/><rect x="85" y="23" width="10" height="10" rx="2" fill="${c}"/>`;
    return `<svg viewBox="0 0 125 88" role="img" aria-label="${escape(game.title)}的${escape(familyOf(game).short)}游戏板">${marks}</svg>`;
  }
  function card(game) {
    const f = familyOf(game), s = store.sessions[game.id];
    const status = s?.completed ? '已归档' : s?.openedAt ? '进行中' : '未开始';
    return `<article class="game-card family-${f.id}" style="--accent:${f.color}"><div class="card-art" data-open="${game.id}" role="button" tabindex="0" aria-label="进入${escape(game.title)}"><div class="art-id"><strong>${game.id}</strong><span>${f.short}</span></div>${artwork(game)}</div><div class="card-body"><div class="card-title"><h3><a href="#game/${game.id}">${game.title}</a></h3><button class="icon-btn ${s?.starred?'starred':''}" data-star="${game.id}" title="${s?.starred?'取消收藏':'收藏游戏'}" aria-label="${s?.starred?'取消收藏':'收藏'}${game.title}" aria-pressed="${Boolean(s?.starred)}">${icon('bookmark')}</button></div><p class="card-desc">${game.subtitle}</p><div class="card-meta"><span>${icon('clock-3')}${game.minutes} 分钟</span><span>${icon('users')}${game.players}</span><span>${game.level}</span></div><div class="card-foot"><span class="status ${s?.completed?'done':''}">${s?.completed?icon('check'):''}${status}</span><a class="link-button" href="#game/${game.id}">${s?.openedAt?'继续这一局':'进入这一局'}${icon('arrow-up-right')}</a></div></div></article>`;
  }
  function library() {
    current=null;
    const family = families.find(f=>f.id===filter);
    const heading=view==='favorites'?'收藏的游戏':family?.title||'决策游乐场';
    const selected=games.filter(g=>(filter==='all'||g.family===filter)&&(view!=='favorites'||store.sessions[g.id]?.starred)&&(!search||`${g.id} ${g.title} ${g.subtitle} ${g.scene} ${g.mission}`.toLowerCase().includes(search.toLowerCase()))&&(statusFilter==='all'||(statusFilter==='done'?store.sessions[g.id]?.completed:statusFilter==='active'?store.sessions[g.id]?.openedAt&&!store.sessions[g.id]?.completed:!store.sessions[g.id]?.openedAt)));
    document.documentElement.style.setProperty('--accent',family?.color||'#176a59');
    frame(`<div class="page-heading"><div><div class="eyebrow"><span class="line"></span>24 EXPERIMENTS / 04 COLLECTIONS</div><h1>${heading}</h1><p class="subhead">${family?.tag||'组织决策、证据核对、复杂协作，以及工作之外的好奇心。'}</p></div><div class="summary-count"><span><strong>${selected.length}</strong>局</span><span><strong>${Object.values(store.sessions).filter(s=>s.completed).length}</strong>已归档</span></div></div>${loadWarning?`<div class="warning-banner">${escape(loadWarning)}</div>`:''}<div class="filters"><div class="tabs" role="tablist" aria-label="游戏分组"><button class="tab ${filter==='all'?'active':''}" role="tab" aria-selected="${filter==='all'}" data-filter="all">全部</button>${families.map(f=>`<button class="tab ${filter===f.id?'active':''}" data-filter="${f.id}" role="tab" aria-selected="${filter===f.id}">${f.short}</button>`).join('')}</div><div class="filter-tools"><label class="search">${icon('search')}<input id="search" type="search" value="${escape(search)}" placeholder="搜索游戏或情境" aria-label="搜索游戏或情境"></label><select id="status-filter" class="filter-select" aria-label="游戏进度筛选">${options(['all','new','active','done'].map(x=>x),statusFilter,false).replace('>all<','>全部进度<').replace('>new<','>未开始<').replace('>active<','>进行中<').replace('>done<','>已归档<')}</select></div></div><div class="deck">${selected.map(card).join('')||'<div class="empty">没有匹配的游戏。换个关键词或进度条件看看。</div>'}</div>${view!=='favorites'&&filter==='all'&&!search?`<section class="routes"><div class="section-label">${icon('route')}组合路线</div><div class="route-list">${data.routes.map(r=>`<div class="route"><div class="route-top"><h3>${r.title}</h3><button class="link-button" data-route="${r.id}">开始${icon('arrow-right')}</button></div><p>${r.text}</p><div class="route-games">${r.ids.join(' → ')}</div></div>`).join('')}</div></section>`:''}`,heading);
  }
  function controlNumbers(game,s,defaults) { return `<div class="field-row">${game.config.items.map(i=>input(s,i.id,i.label,i.detail,'number',defaults[i.id]??0)).join('')}</div>`; }
  function revealCards(game,s,kind='plain') {
    const config=game.config;
    return `<div class="budget">${kind==='interpret'?'最多两次追问':'信息揭示预算'}<span>${s.revealed.length} / ${config.limit}</span></div>${config.items.map(i=>{
      const open=s.revealed.includes(i.id);
      const label=kind==='interpret'?`<label class="select-line"><input type="checkbox" data-input="hyp-${i.id}"${checked(val(s,`hyp-${i.id}`,false))}><span>${i.label}</span></label>`:`<h3>${i.label}</h3>`;
      return `<section class="engine-item">${label}${kind==='interpret'?`<p>${i.detail}</p>`:''}<button class="reveal-btn" data-reveal="${i.id}" ${open||s.revealed.length>=config.limit?'disabled':''}>${icon(open?'check':'eye')}${open?'已揭示':kind==='interpret'?'提出这个追问':'揭示信息'}</button>${open?`<div class="revealed">${escape(i.answer||i.detail)}</div>`:''}${kind==='questions'&&open?select(s,`changed-${i.id}`,['改变了决定','提供了必要边界','只增加背景','还不能判断'],'这个回答的作用'):''}</section>`;
    }).join('')}`;
  }
  function engine(game,s) {
    const cfg=game.config;
    const intro=`<p class="engine-intro">${game.mission}</p>`;
    let body='';
    switch(game.engine) {
      case 'negotiation':body=EXPANSION_UI.negotiation(game,s,{input,select,note,item});break;
      case 'facilitation':body=FACILITATION_UI.board(game,s,{input,select,note,item});break;
      case 'reveal': body=revealCards(game,s); break;
      case 'priority': body=`<div class="budget">最多三个目标 · ${s.event?cfg.eventBudget:cfg.budget} 点容量<span id="priority-sum"></span></div>${cfg.items.map(i=>item(i.label,`<label class="select-line"><input type="checkbox" data-input="pick-${i.id}"${checked(val(s,`pick-${i.id}`,false))}><span>纳入建议组合 <small>${i.cost} 点 · ${i.detail}</small></span></label>`)).join('')}${note(s,'alternative','第二套组合与未入选项的处理')}`;break;
      case 'roadmap':body=cfg.items.map(i=>item(i.label,select(s,`quarter-${i.id}`,['Q1','Q2','Q3','Q4'],'安排季度'),i.detail)).join('');break;
      case 'handshake':body=cfg.items.map(i=>item(i.label,`<div class="field-row">${select(s,`provider-${i.id}`,cfg.owners,'提供方')}${select(s,`receiver-${i.id}`,cfg.owners,'接收方')}${input(s,`object-${i.id}`,'交付对象')}${input(s,`window-${i.id}`,'窗口与前置条件')}${input(s,`accept-${i.id}`,'验收方式')}${input(s,`notify-${i.id}`,'变化时由谁通知谁')}</div>`,i.detail)).join('');break;
      case 'claim':body=`<p class="helper">姓名选择代表模拟自主领取；未领取是需要处理的状态，不是玩家失败。</p>${cfg.items.map(i=>item(i.label,select(s,`claim-${i.id}`,['暂未承接',...cfg.owners.map(o=>o.name)],`领取人 · ${i.cost} 点`, '暂未承接'),i.detail)).join('')}<div id="claim-capacity"></div>`;break;
      case 'accept':body=cfg.items.map(i=>item(i.label,`<div class="field-row">${input(s,`target-${i.id}`,'验收对象与边界')}${input(s,`definition-${i.id}`,'口径 / 分子分母')}${input(s,`source-${i.id}`,'证据来源与观察窗口')}${input(s,`threshold-${i.id}`,'标准 / 阈值 / 未知项')}${input(s,`who-${i.id}`,'共同确认人')}${input(s,`form-${i.id}`,'确认形式与版本')}</div>`,i.detail)).join('');break;
      case 'classify':body=cfg.items.map(i=>item(i.label,select(s,`state-${i.id}`,cfg.labels,'当前最高支持层级'))).join('');break;
      case 'timeline':{const index=Number(val(s,'cutoff',1));body=`<div class="timeline-steps">${cfg.items.map((i,n)=>`<button class="choice ${index===n?'active':''}" data-choice="cutoff" data-value="${n}">${i.label}</button>`).join('')}</div><div class="materials">${cfg.items.filter((_,n)=>n<=index).map(i=>`<section class="material"><h3>${i.label}</h3><p>${i.detail}</p></section>`).join('')}</div>${select(s,'asof',cfg.labels,'截止当日最高可支持状态')}`;break;}
      case 'denominator':body=controlNumbers(game,s,cfg.defaults)+'<div id="live-calculation"></div>';break;
      case 'flow':body=`${cfg.items.map(i=>`<div class="flow-row"><span>${i.label}</span><div class="flow-track"><div class="flow-bar" style="width:${i.days/8*100}%"></div></div><span>${i.days} 天</span></div>`).join('')}${select(s,'intervention',cfg.items.map(i=>i.label),'只选一处先干预')}${note(s,'mechanism','机制假设与反证','说明原因，不只引用最长的柱；等待时间不等于工作时间。')}${note(s,'retest','下一观察窗口如何保持可比较')}`;break;
      case 'cost':body=controlNumbers(game,s,cfg.defaults)+'<div id="live-calculation"></div>';break;
      case 'compare':body=`<div class="compare-grid">${['a','b'].map(side=>`<div class="compare-column"><h3>预置输出${side==='a'?'甲':'乙'}</h3>${cfg.items.map(i=>`<div class="compare-claim">${i.label}<label><input type="checkbox" data-input="flag-${side}-${i.id}"${checked(val(s,`flag-${side}-${i.id}`,false))}>需要核对或降级</label></div>`).join('')}${input(s,`${side}Generate`,'生成分钟','','number',cfg.defaults[`${side}Generate`])}${input(s,`${side}Review`,'审阅分钟','','number',cfg.defaults[`${side}Review`])}${input(s,`${side}Fix`,'修订分钟','','number',cfg.defaults[`${side}Fix`])}</div>`).join('')}</div><div id="live-calculation"></div><p class="helper">上述时间是本局假设；真正实验请另建同口径观察。</p>`;break;
      case 'interpret':body=revealCards(game,s,'interpret');break;
      case 'questions':body=revealCards(game,s,'questions');break;
      case 'hypotheses':body=`<div class="hypothesis-grid">${cfg.hypotheses.map(h=>`<p>${h}</p>`).join('')}</div>${cfg.items.map(i=>item(i.label,`<div class="field-row">${cfg.hypotheses.map((h,n)=>select(s,`h${n}-${i.id}`,cfg.labels,h)).join('')}</div>`)).join('')}${note(s,'counterexample','最可能推翻初始解释的观察')}`;break;
      case 'offer':body=`${[['weeks','交付窗口（周）',2,8],['scope','范围档位',1,5],['support','业务支持档位',0,3],['ownership','维护归属（0 未明 / 1 明确）',0,1]].map(([id,label,min,max])=>`<label class="range-control"><span>${label}</span><input type="range" data-input="${id}" min="${min}" max="${max}" step="1" value="${escape(val(s,id,cfg.defaults[id]))}"><output id="range-${id}">${escape(val(s,id,cfg.defaults[id]))}</output></label>`).join('')}<div id="live-calculation"></div><button class="btn" data-action="save-offer">${icon('plus')}保留这一套条件包</button>${note(s,'offers','条件包比较','可以保存多套；分别说明业务价值与各方代价。')}`;break;
      case 'stress':body=cfg.items.map(i=>item(i.label,select(s,`stress-${i.id}`,cfg.labels,'变化之后的处理'))).join('')+note(s,'authority','需要负责人决定什么，哪些由相关方协商');break;
      case 'branch':body=cfg.items.map(i=>{const choice=val(s,`branch-${i.id}`);const option=i.options.find(o=>o.id===choice);return item(`${i.id}. ${i.label}`,`<div class="choice-buttons">${i.options.map(o=>`<button class="choice ${choice===o.id?'active':''}" data-choice="branch-${i.id}" data-value="${o.id}">${o.label}</button>`).join('')}</div>${option?`<div class="revealed">${option.detail}</div>`:''}${input(s,`reason-${i.id}`,'你的介入目的与另一条路径的代价')}`);}).join('');break;
      case 'career':{const track=val(s,'track','工作流诊断');body=`<div class="choice-buttons">${['工作流诊断','资源决策支持','团队决策引导'].map(t=>`<button class="choice ${track===t?'active':''}" data-choice="track" data-value="${t}">${t}</button>`).join('')}</div>${cfg.items.filter(i=>i.track===track).map(i=>item(`${i.kind}任务：${i.label}`,`${note(s,`task-${i.id}`,'本次实际判断或动作')}<div class="field-row">${select(s,`engage-${i.id}`,['1 很低','2 较低','3 一般','4 较高','5 很高'],'投入感')}${select(s,`repeat-${i.id}`,['愿意重复','需要改变条件','暂不想重复','尚未实际尝试'],'愿意重复？')}${select(s,`familiar-${i.id}`,['熟悉','部分熟悉','陌生'],'熟悉度')}${input(s,`drain-${i.id}`,'消耗与让你犹豫的部分')}</div>`,i.detail)).join('')}`;break;}
      case 'portable':body=cfg.items.map(i=>item(i.label,`<label class="select-line"><input type="checkbox" data-input="remove-${i.id}"${checked(val(s,`remove-${i.id}`,false))}><span>本轮移除这项条件</span></label>${val(s,`remove-${i.id}`,false)?`<div class="revealed">${i.detail}</div>${input(s,`replace-${i.id}`,'替代输入 / 授权 / 缩小方式')}`:''}`)).join('')+note(s,'minimum','移除条件后的最小交付与拒绝条件');break;
      case 'transfer':body=select(s,'scene',cfg.items.map(i=>i.label),'迁移到哪个场景')+select(s,'method',['状态分层','依赖握手','共同验收'],'只选一种方法')+`<div class="materials">${cfg.items.map(i=>`<div class="material"><h3>${i.label}</h3><p>${i.detail}</p></div>`).join('')}</div>${note(s,'agreement','一页普通语言约定','对象、最少记录、维护人、确认方式、不适用与退出。')}<div id="transfer-check"></div>`;break;
      case 'interview':body=select(s,'service',['工作流诊断','资源决策支持','团队决策引导'],'本次只介绍一种服务')+input(s,'oneLine','一句话：最后交付什么')+cfg.items.map(i=>item(i.label,`<button class="reveal-btn" data-reveal="${i.id}"${s.revealed.includes(i.id)?' disabled':''}>${icon(s.revealed.includes(i.id)?'check':'message-circle')}${s.revealed.includes(i.id)?'追问已展开':'展开合作方追问'}</button>${s.revealed.includes(i.id)?`<div class="revealed">${i.detail}</div>${note(s,`answer-${i.id}`,'你的回答')}${select(s,`proof-${i.id}`,['有直接证据','合理推断','需要验证','应拒绝承诺'],'回答的证据边界')}`:''}`)).join('');break;
      case 'field':body=select(s,'observe',cfg.items.map(i=>i.label),'本次观察对象')+input(s,'when','观察时间与条件','不填具体地点或个人身份也可以。')+`${[1,2,3].map(n=>item(`观察 ${n}`,`<div class="field-row">${input(s,`fact-${n}`,'实际事实')}${input(s,`explain-${n}`,'解释一')}${input(s,`alternate-${n}`,'替代解释')}${input(s,`unknown-${n}`,'未知与下一次观察')}</div>`)).join('')}${select(s,'observed',['已实际观察','仅准备问题，尚未观察'],'当前状态')}${note(s,'small-change','一个小改善，或决定不改')}`;break;
      case 'interest':body=cfg.items.map(i=>`<section class="interest-row"><label class="select-line"><input type="checkbox" data-input="try-${i.id}"${checked(val(s,`try-${i.id}`,false))}><span>${i.label}<small>${i.detail}</small></span></label>${val(s,`try-${i.id}`,false)?`<div class="interest-ratings">${select(s,`expect-${i.id}`,['1 很低','2 较低','3 一般','4 较高','5 很高'],'尝试前期待')}${select(s,`actual-${i.id}`,['1 很低','2 较低','3 一般','4 较高','5 很高'],'实际投入感')}${select(s,`again-${i.id}`,['愿意再做','换个条件再试','暂放','结束','尚未尝试'],'下一次选择')}</div><label class="select-line"><input type="checkbox" data-input="done-${i.id}"${checked(val(s,`done-${i.id}`,false))}><span>我已实际尝试</span></label>${input(s,`condition-${i.id}`,'实际消耗、体验条件与不展示时是否愿意重复')}`:''}</section>`).join('')+'<div id="interest-summary"></div>';break;
    }
    return `${intro}${body}<div class="button-row"><button class="btn" data-action="check">${icon('scan-search')}核对本局记录</button></div><div id="feedback" aria-live="polite"></div>${note(s,'decision','初始安排与依据','写清这是谁的选择、根据什么、还有哪些未知。')}`;
  }
  function live(game,s) {
    const cfg=game.config;
    if(game.engine==='negotiation')EXPANSION_UI.negotiationLive(game,s);
    if(game.engine==='priority') {const picks=cfg.items.filter(i=>val(s,`pick-${i.id}`,false));const budget=s.event?cfg.eventBudget:cfg.budget;const sum=picks.reduce((n,i)=>n+i.cost,0);if($('#priority-sum'))$('#priority-sum').textContent=`${picks.length}/3 项 · ${sum}/${budget} 点`;}
    if(game.engine==='claim') {const loads=cfg.owners.map(o=>{const capacity=o.name==='研发'&&s.event?2:o.capacity;const use=cfg.items.filter(i=>val(s,`claim-${i.id}`)===o.name).reduce((n,i)=>n+i.cost,0);return `<div><small>${o.name}</small><strong class="${use>capacity?'warn':''}">${use}/${capacity}</strong></div>`;});if($('#claim-capacity'))$('#claim-capacity').innerHTML=`<div class="live-result" style="grid-template-columns:repeat(2,1fr)">${loads.join('')}</div>`;}
    let calc='';
    if(game.engine==='cost') {const numbers=Object.fromEntries(Object.keys(cfg.defaults).map(k=>[k,val(s,k,cfg.defaults[k])]));const out=core.cost(numbers);calc=`<div class="live-result"><div><small>启动窗口净节省 / 分钟</small><strong class="${out.net>=0?'good':'warn'}">${round(out.net)}</strong></div><div><small>持续窗口净节省 / 分钟</small><strong class="${out.recurring>=0?'good':'warn'}">${round(out.recurring)}</strong></div><div><small>启动窗口回本 / 次</small><strong>${out.breakEven===null?'无法回本':out.breakEven}</strong></div></div><p class="formula">每轮净省 ${round(out.perRun)} 分钟；净收益还需扣除窗口维护与适用的搭建成本。</p>`;}
    if(game.engine==='denominator') {const v=Object.fromEntries(Object.keys(cfg.defaults).map(k=>[k,val(s,k,cfg.defaults[k])]));const out=core.rates(v);calc=`<div class="live-result"><div><small>全收到请求完成占比</small><strong>${percent(out.complete)}</strong></div><div><small>已明确完成 / 失败样本比例</small><strong>${percent(out.known)}</strong></div><div><small>原报告口径</small><strong class="${out.suspicious?'warn':''}">${percent(out.reported)}</strong></div></div><p class="formula">合计 ${out.total} 条。暂排样本需另行核验；第二项不能自动称为合法边界内完成率。</p>`;}
    if(game.engine==='offer') {const v=Object.fromEntries(Object.keys(cfg.defaults).map(k=>[k,val(s,k,cfg.defaults[k])]));const out=core.offer(v);calc=`<div class="live-result"><div><small>本局可用容量</small><strong>${out.available}</strong></div><div><small>本局所需容量</small><strong>${out.required}</strong></div><div><small>模型检查</small><strong class="${out.feasible?'good':'warn'}">${out.feasible?'可行':'需调整'}</strong></div></div><p class="formula">可用 = 周数 + 支持×2 + 明确维护×2；所需 = 范围×3。可行不等于业务值得。</p>`;Object.keys(cfg.defaults).forEach(k=>{if($(`#range-${k}`))$(`#range-${k}`).textContent=v[k];});}
    if(game.engine==='compare') {const a=['aGenerate','aReview','aFix'].reduce((n,k)=>n+Number(val(s,k,cfg.defaults[k])),0);const b=['bGenerate','bReview','bFix'].reduce((n,k)=>n+Number(val(s,k,cfg.defaults[k])),0);calc=`<div class="live-result"><div><small>甲总分钟</small><strong>${round(a)}</strong></div><div><small>乙总分钟</small><strong>${round(b)}</strong></div><div><small>来源</small><strong style="font-size:17px">预置假设</strong></div></div>`;}
    if($('#live-calculation'))$('#live-calculation').innerHTML=calc;
    if(game.engine==='transfer'&&$('#transfer-check')) {const text=s.notes.agreement||'';const found=cfg.banned.filter(word=>text.toLowerCase().includes(word.toLowerCase()));$('#transfer-check').innerHTML=`<p class="helper">${found.length?`还出现惯用术语：${found.join('、')}`:'未发现本局禁词；这不证明对方已理解。'}</p>`;}
    if(game.engine==='interest'&&$('#interest-summary')) {const chosen=cfg.items.filter(i=>val(s,`try-${i.id}`,false));const actual=chosen.filter(i=>val(s,`done-${i.id}`,false));$('#interest-summary').innerHTML=`<p class="rating-summary">选了 ${chosen.length} 项，实际尝试 ${actual.length} 项。${chosen.length>2?'可以先缩为两项，避免把兴趣变成任务队列。':'未尝试的评分只能表示期待，不能归为真实体验。'}</p>`;}
  }
  const round=n=>Math.round(n*10)/10;
  const percent=n=>n===null?'不可计算':`${round(n)}%`;
  function check(game,s) {
    const cfg=game.config, lines=[];
    const filled=key=>String(val(s,key)).trim().length>0;
    switch(game.engine) {
      case 'negotiation':lines.push(...EXPANSION_UI.negotiationCheck(game,s));break;
      case 'facilitation':lines.push(...FACILITATION_UI.check(game,s));break;
      case 'reveal':lines.push(`已公开 ${s.revealed.length} 张上下文卡。请在共同地图里分别记录事实、目标、约束与未知。`);break;
      case 'priority':{const picks=cfg.items.filter(i=>val(s,`pick-${i.id}`,false)),sum=picks.reduce((n,i)=>n+i.cost,0),budget=s.event?cfg.eventBudget:cfg.budget;lines.push(`${picks.length} 项目标，${sum}/${budget} 点容量。${!picks.length?'尚未选择。':picks.length>3||sum>budget?'超出本局约束，需要重谈范围或组合。':'符合本局数量与容量约束，但尚不证明是最优组合。'}`);lines.push('请区分主持人建议、负责人决定和参与人承接。');break;}
      case 'roadmap':{const missing=cfg.items.filter(i=>!filled(`quarter-${i.id}`));const inverted=cfg.edges.filter(([a,b])=>filled(`quarter-${a}`)&&filled(`quarter-${b}`)&&Number(val(s,`quarter-${a}`).slice(1))>Number(val(s,`quarter-${b}`).slice(1)));lines.push(missing.length?`尚未安排：${missing.map(i=>i.label).join('、')}。`:'六项工作已安排。');lines.push(inverted.length?`依赖倒置：${inverted.map(([a,b])=>`${cfg.items.find(i=>i.id===a).label} → ${cfg.items.find(i=>i.id===b).label}`).join('；')}。`:'未发现跨季度依赖倒置。同季度内仍需说明先后和允许并行。');break;}
      case 'handshake':{const fields=['provider','receiver','object','window','accept','notify'];const misses=cfg.items.map(i=>({i,missing:fields.filter(k=>!filled(`${k}-${i.id}`))}));lines.push(...misses.map(({i,missing})=>`${i.label}：${missing.length?`尚缺 ${missing.length} 类握手信息`:'记录结构完整；仍需双方确认'}`));const same=cfg.items.filter(i=>filled(`provider-${i.id}`)&&val(s,`provider-${i.id}`)===val(s,`receiver-${i.id}`));if(same.length)lines.push('有依赖的提供方与接收方相同，请核对是内部任务还是跨方握手。');break;}
      case 'claim':{for(const o of cfg.owners){const capacity=o.name==='研发'&&s.event?2:o.capacity;const load=cfg.items.filter(i=>val(s,`claim-${i.id}`)===o.name).reduce((n,i)=>n+i.cost,0);if(load>capacity)lines.push(`${o.name} 超过本局容量：${load}/${capacity} 点。`);}for(const i of cfg.items){const who=val(s,`claim-${i.id}`,'暂未承接');if(who==='暂未承接')lines.push(`${i.label} 尚未承接；可以缩小、延期或升级给负责人选择。`);else if(!i.allowed.includes(who))lines.push(`${i.label}：${who} 不满足本局独立承接条件，需协作或重谈。`);}if(!lines.length)lines.push('符合本局容量与承接条件。真实自主领取仍需由本人表达。');break;}
      case 'accept':lines.push(...cfg.items.map(i=>{const n=['target','definition','source','threshold','who','form'].filter(k=>!filled(`${k}-${i.id}`)).length;return `${i.label}：${n?`尚缺 ${n} 类验收信息`:'六类信息已填写；共同确认和结果达标还需真实证据'}`;}));break;
      case 'classify':{let correct=0,answered=0;for(const i of cfg.items){const answer=val(s,`state-${i.id}`);if(answer){answered++;if(answer===i.correct)correct++;}}lines.push(`已判断 ${answered}/6 条，与本局来源相符 ${correct} 条。这个计数不是能力评分。`);lines.push(...cfg.items.map(i=>`${i.label} → ${i.correct}。${i.detail}`));break;}
      case 'timeline':{const at=cfg.items[Number(val(s,'cutoff',1))];lines.push(`截止 ${at.label}，本局最高支持状态：${at.correct}。`);lines.push(val(s,'asof')===at.correct?'你的选择符合当时存在的记录。':'请检查是否提前引用了后续记录，或把计划与采用混写。');break;}
      case 'denominator':lines.push('已重算三个口径。排除理由仍需逐条核验；比例变高不自动表示用户效果改善。');lines.push('本局复核事件的合法边界内比例为 80/104≈76.9%，不是原报告的 100%。');break;
      case 'flow':lines.push(val(s,'intervention')?`先干预：${val(s,'intervention')}。`:'尚未选择单一干预点。');lines.push('最长等待提供线索，不证明根因。请说明机制、最小改动、维护成本和反证。');break;
      case 'cost':{const out=core.cost(Object.fromEntries(Object.keys(cfg.defaults).map(k=>[k,val(s,k,cfg.defaults[k])])));lines.push(`启动窗口净收益 ${round(out.net)} 分钟，持续窗口 ${round(out.recurring)} 分钟。`);lines.push(out.net<0?'启动窗口尚未回本；可以检查后续频次，也可以缩小或停止。':'输入假设下启动窗口为正；还需核验输入与质量护栏。');break;}
      case 'compare':lines.push(...cfg.items.map(i=>`${i.label}：甲 ${i.a}；乙 ${i.b}。${i.detail}`));lines.push('以上是预置样例，不证明真实模型或流程的普遍优劣。');break;
      case 'interpret':lines.push('本局预置回应支持已有承诺与范围不明共同存在；并未证明对方向本身反对。');lines.push('已问问题可以缩小不确定性，不能给现实人物下心理诊断。');break;
      case 'questions':lines.push(`用了 ${s.revealed.length}/5 次提问。`);lines.push('检查每问是否影响当前授权、范围、风险、资源或验收；未问完不代表不完整。');break;
      case 'hypotheses':lines.push(...cfg.items.map(i=>`${i.label}：${i.detail}`));lines.push('本局没有唯一心理原因，也不对玩家解释打人格分。');break;
      case 'offer':{const o=core.offer(Object.fromEntries(Object.keys(cfg.defaults).map(k=>[k,val(s,k,cfg.defaults[k])])));lines.push(o.feasible?'当前组合符合公开容量模型；仍需说明业务价值和参与人同意。':'当前组合超出公开容量模型，需调整窗口、范围、支持或维护条件。');lines.push('两套条件包都可能可行，负责人仍要作价值取舍。');break;}
      case 'stress':lines.push(...cfg.items.map(i=>`${i.label}：${i.detail}`));lines.push('保留、重谈或停止需结合你写下的范围与条件；不要把教学提示当成唯一答案。');break;
      case 'branch':lines.push('分支用于比较介入代价，不预测真实人的反应。');lines.push('请为每次选择补目的、其他路径和下一次观察信号。');break;
      case 'career':lines.push('分别记录核心与维护任务，以及熟悉度。未实际尝试的部分只算想象输入。');lines.push('这里不产生职业匹配分数，外部需求与陌生组织授权仍需真实验证。');break;
      case 'portable':{const removed=cfg.items.filter(i=>val(s,`remove-${i.id}`,false));lines.push(`移除 ${removed.length} 项组织便利。${removed.length<2?'可再移除一项，检验更严格的迁移条件。':'请逐项说明替代输入与授权。'}`);lines.push('无授权时暂停读取和召集，必要时缩为公开方法讨论。');break;}
      case 'transfer':{const found=cfg.banned.filter(w=>(s.notes.agreement||'').toLowerCase().includes(w.toLowerCase()));lines.push(found.length?`仍有禁词：${found.join('、')}。`:'未发现禁词；仍需由对方复述和试用检验理解。');lines.push('不要新增无人维护的载体；十分钟维护约束下可缩小记录范围。');break;}
      case 'interview':lines.push(`已展开 ${s.revealed.length} 个预置追问。`);lines.push('回答的来源、服务边界和拒绝条件比包装完整更重要。模拟合作方不是市场验证。');break;
      case 'field':{const n=[1,2,3].filter(i=>filled(`fact-${i}`)).length;lines.push(`已填写 ${n} 条事实记录。当前状态：${val(s,'observed','尚未说明')}。`);lines.push('是否真实观察由你确认；页面不会把文字自动认证为事实。');break;}
      case 'interest':{const chosen=cfg.items.filter(i=>val(s,`try-${i.id}`,false));const actual=chosen.filter(i=>val(s,`done-${i.id}`,false));lines.push(`选了 ${chosen.length} 项，实际尝试 ${actual.length} 项。`);lines.push('未尝试的投入感不能作为真实体验。没有成果也可以是有价值的兴趣。');break;}
    }
    s.inputs.checked=true;persist(game);
    $('#feedback').innerHTML=`<div class="feedback"><ul>${lines.map(line=>`<li>${escape(line)}</li>`).join('')}</ul></div>`;
  }
  function scene(game,s) {
    return `<div class="section-label">${icon('flag')}情境与授权</div><p class="scene">${game.scene}</p><div class="mission">${game.mission}</div><h3>三轮安排</h3><ol class="rule-list">${game.rounds.map(r=>`<li>${r}</li>`).join('')}</ol><div class="dossier"><h3>桌面材料</h3><div class="materials">${game.materials.map(m=>`<section class="material"><h3>${m.title}</h3><p>${m.text}</p></section>`).join('')}</div></div><div class="roles"><h3>角色开场卡</h3>${game.roles.map((r,n)=>`<div class="role"><strong>${r.name}</strong><p class="opening">“${r.opening}”</p></div>`).join('')}</div>${note(s,'opening','你怎样开场？本次要形成什么选择？')}`;
  }
  function eventPage(game,s) {
    return `<div class="section-label">${icon('shuffle')}变化事件</div>${s.event?`<div class="event-block"><h3>${game.event.title}</h3><p>${game.event.text}</p></div><button class="btn" data-action="back-board">${icon('arrow-left')}回到操作区调整</button>${note(s,'event','变化之后：保留、重谈与新增确认','指出受到影响的部分，不必让所有工作重新开始。')}`:`<div class="event-seal">${icon('mail')}<span>一条新信息，可能改变原来的安排</span><button class="btn primary" data-action="event">${icon('eye')}揭示变化事件</button></div><p class="helper">先保留初始判断，再打开新信息，便于比较你为什么改变或不改变。</p>`}`;
  }
  function review(game,s) {
    return `<div class="section-label">${icon('messages-square')}复盘，不评分人格</div><ol class="debrief-list">${game.debrief.map(q=>`<li>${q}</li>`).join('')}</ol>${note(s,'reflection','一个关键判断，以及最强反证','分别说明直接事实、合理推断和信息不足；没有唯一完美答案。')}<details class="reference"><summary>参考路径与反例</summary><ul>${game.sample.map(p=>`<li>${p}</li>`).join('')}</ul></details><details class="reference"><summary>角色的完整上下文 · 主持人可阅</summary>${game.roles.map(r=>`<section class="role"><h3>${r.name}</h3><p>${r.context}</p><p><strong>希望：</strong>${r.want}<br><strong>边界：</strong>${r.boundary}</p></section>`).join('')}</details><h3 style="margin-top:22px">可以迁移的方法</h3><ul class="rule-list">${game.principles.map(p=>`<li>${p}</li>`).join('')}</ul><h3>容易走偏的地方</h3><ul class="rule-list">${game.pitfalls.map(p=>`<li>${p}</li>`).join('')}</ul>`;
  }
  function archive(game,s) {
    return `<div class="section-label">${icon('notebook-pen')}把这一局留住</div><h2>留下判断，不急着给自己命名</h2><p class="helper">${game.transfer}</p>${note(s,'transfer','下一次可以怎样真实观察？','写一个小范围动作、需要的授权和能推翻判断的结果；生活游戏也可以选择不继续。')}<label class="select-line" style="margin-top:18px"><input type="checkbox" data-input="reading"${checked(val(s,'reading',false))}><span>本次仅阅读与整理，尚未实际尝试</span></label><div class="button-row"><button class="btn primary" data-action="complete">${icon('check')}保存这一局</button><button class="btn" data-action="export-game">${icon('download')}导出本局记录</button><button class="btn" data-action="print-game">${icon('printer')}打印本局</button></div>${s.completed?'<div class="feedback">已归档。它是个人练习记录，不是能力认证或真实业务结果。</div>':''}<details class="reference" style="margin-top:24px"><summary>与外部 AI 或真人一起进行</summary><p class="helper">本页面为离线规则；外部 AI 为可选扩展，需要你自行打开。提示词只附带虚构材料和公开角色，不会自动附带你的填写内容。</p><button class="btn" data-action="prompt">${icon('copy')}打开完整主持提示词</button></details>${routeNotice?`<div class="feedback">${escape(routeNotice)}</div>`:''}`;
  }
  function gamePage(game) {
    current=game; const s=session(game); const f=familyOf(game);document.documentElement.style.setProperty('--accent',f.color);
    const activeRoute = data.routes.find(r=>r.id===store.route&&r.ids.includes(game.id));
    routeNotice = activeRoute ? `当前路线：${activeRoute.title} / ${activeRoute.ids.join(' → ')}` : '';
    const stageNames=['情境','操作','变化','复盘','归档'];
    const body=[scene,engine,eventPage,review,archive][s.step](game,s);
    const footer=`<div class="stage-footer">${s.step>0?`<button class="btn" data-step="${s.step-1}">${icon('arrow-left')}上一步</button>`:'<button class="btn" data-nav="library">返回游戏库</button>'}${s.step<4?`<button class="btn primary" data-step="${s.step+1}">${stageNames[s.step+1]}${icon('arrow-right')}</button>`:`<button class="btn" data-action="next-game">下一局${icon('arrow-right')}</button>`}</div>`;
    frame(`<div class="page-heading session-heading"><div><div class="eyebrow"><span class="line"></span>${game.id} / ${f.title}</div><h1>${game.title}</h1><p class="subhead">${game.subtitle}</p><div class="session-meta" style="margin-top:12px"><span>${game.minutes} 分钟</span><span>${game.players}</span><span class="badge">${game.level}</span><span class="badge">虚构情境</span><button class="icon-btn ${s.starred?'starred':''}" data-star="${game.id}" title="收藏游戏" aria-label="收藏游戏" aria-pressed="${s.starred}">${icon('bookmark')}</button></div></div><div class="timer"><span id="timer-value">${clockText(timer.id===game.id?timer.seconds:Number(s.inputs.elapsed)||0)}</span><button class="icon-btn" data-action="timer" title="${timer.running&&timer.id===game.id?'暂停计时':'开始计时'}" aria-label="${timer.running&&timer.id===game.id?'暂停计时':'开始计时'}">${icon(timer.running&&timer.id===game.id?'pause':'play')}</button><button class="icon-btn" data-action="timer-reset" title="计时归零" aria-label="计时归零">${icon('rotate-ccw')}</button></div></div><nav class="stage-nav" aria-label="本局阶段">${stageNames.map((name,n)=>`<button class="stage-button ${n===s.step?'active':''} ${n<s.step?'complete':''}" data-step="${n}" ${n===s.step?'aria-current="step"':''}><span>0${n+1}</span>${name}</button>`).join('')}</nav><div class="session-layout"><section class="stage-content" aria-label="${stageNames[s.step]}">${body}${footer}</section><aside class="side-note"><div><div class="section-label">${icon('package-check')}本局交付</div><ul>${game.deliverables.map(d=>`<li>${d}</li>`).join('')}</ul><h3>迁移边界</h3><p>${game.transfer}</p></div><div><h3>四个证据层次</h3><p>练习中的选择 ≠ 真实能力证明。<br>方法设计 ≠ 组织采用。<br>组织采用 ≠ 效果达成。<br>团队结果 ≠ 个人全部贡献。</p><div class="button-row"><button class="btn" data-action="prompt">${icon('copy')}主持提示词</button><button class="btn" data-action="reset-game">${icon('rotate-ccw')}重新开始</button></div></div></aside></div>`,game.title);
    if(s.step===1)live(game,s);
    persist(game);
  }
  function records() {
    current=null;
    const played=games.filter(g=>store.sessions[g.id]?.openedAt).sort((a,b)=>Date.parse(store.sessions[b.id].updatedAt)-Date.parse(store.sessions[a.id].updatedAt));
    frame(`<div class="page-heading"><div><div class="eyebrow"><span class="line"></span>PERSONAL NOTES</div><h1>我的记录</h1><p class="subhead">把当时的选择、变化与反证一起留住。</p></div><button class="btn" data-action="export-md">${icon('download')}导出全部记录</button></div><div class="shelf-head">${played.length} 局已开始 · ${played.filter(g=>store.sessions[g.id].completed).length} 局已归档</div><div class="record-list">${played.map(g=>{const s=store.sessions[g.id];return `<article class="record-row" style="--accent:${familyOf(g).color}"><span class="record-id">${g.id}</span><div><h3><a href="#game/${g.id}">${g.title}</a></h3><p>${s.completed?'已归档':'进行中'}${val(s,'reading',false)?' · 仅阅读':''} · ${new Date(s.updatedAt).toLocaleString('zh-CN',{hour12:false})}</p><p>${escape((s.notes.reflection||s.notes.opening||'尚未填写判断').slice(0,95))}</p></div><div class="record-actions"><button class="icon-btn" data-export="${g.id}" aria-label="导出${g.title}" title="导出这一局">${icon('download')}</button><a class="icon-btn" href="#game/${g.id}" aria-label="继续${g.title}" title="继续这一局">${icon('arrow-right')}</a></div></article>`;}).join('')||'<div class="empty">还没有记录。挑一局开始，不需要一次玩完。</div>'}</div>`, '我的记录');
  }
  function about() {
    current=null;frame(`<div class="page-heading"><div><div class="eyebrow"><span class="line"></span>FACILITATOR AGREEMENT</div><h1>边界与主持约定</h1></div></div><article class="about-section"><h2>关于决策游乐场</h2><p>以虚构情境练习敏捷协作、引导与决策。先澄清目的、上下文和授权，再比较备选与协作安排。</p><h2>事实与模拟</h2><ul><li>${games.length} 个游戏的情境、人物、数据和事件均为虚构，不复用真实员工评价或内部经营数据。</li><li>离线页面的回应、检查和分支均为预置。它们解释本局规则，不证明真实人会这样反应，也不提供人格或心理健康诊断。</li><li>不默认会议缺乏执行。执行与验收游戏帮助表达已有决定及变化，不替真实组织作负面判断。</li><li>练习记录、职业能力证据、市场需求与付费意愿分别验证。</li></ul><h2>单人、多人和外部 AI</h2><ul><li>单人：按阶段完成判断，再展开参考路径。直接查看后续也可以，但请记录本次仅阅读。</li><li>多人：由主持人分别发放角色卡。网页不能技术隔离私有信息，不把同屏翻卡当成真正隐藏信息。</li><li>外部 AI：自行复制完整主持提示词。不开启自动联网，不发送你的个人笔记。</li><li>真实会议：先明确授权、目的、信息边界和记录方式；参与人承接任务，负责人拍方向与重大风险。</li></ul><h2>保存与迁移</h2><p>记录优先存在当前浏览器，本地文件存储可能因浏览器策略而不可用。换电脑、浏览器或移动文件前导出 JSON；导入会校验并按更新时间合并。同一游戏当前只有一份活动记录，重新开始前请导出旧记录。</p><h2>个人介绍</h2><p>Phoenix Chen · Agile Coach。关注敏捷协作、引导与决策练习，通过虚构情境探索上下文澄清、备选比较、授权与协作边界。本套材料用于实践与方法探索，不宣称心理咨询、治疗或职业测评资格。</p><div class="button-row"><a class="btn" href="完整游戏手册.html" target="_blank" rel="noopener">${icon('book-open')}HTML 完整手册</a><button class="btn" data-action="backup">${icon('folder-down')}备份记录</button></div></article>`, '边界与主持约定');
  }
  function route() {
    let hash;try{hash=decodeURIComponent(location.hash.slice(1)||'overview');}catch{hash='library';}
    if(hash==='organizer'){current=null;view=hash;ORGANIZER_UI.mount(hash,{frame,icon,escape,toast,download});return;}
    if(['overview','assembly'].includes(hash)){current=null;view=hash;FACILITATION_UI.mount(hash,{frame,icon,escape,toast,download});return;}
    if(/^(campaign(?:\/[a-zA-Z0-9_-]+)?|workshop|lab(?:\/[a-zA-Z0-9_-]+)?)$/.test(hash)){
      current=null;view=hash.split('/')[0];EXPANSION_UI.mount(hash,{frame,icon,escape,toast,download});return;
    }
    const candidate=hash.match(/^game\/([A-Z][0-9]{1,2})(?:\/([0-4]))?$/);
    const match=candidate&&games.some(g=>g.id===candidate[1])?candidate:null;
    if(match) {const game=games.find(g=>g.id===match[1]);view='game';if(match[2]!==undefined)session(game).step=Number(match[2]);gamePage(game);}
    else if(hash==='records'){view='records';records();}
    else if(hash==='about'){view='about';about();}
    else {view=hash==='favorites'?'favorites':'library';const f=hash.match(/^family-([A-G])$/);filter=f?f[1]:'all';library();}
  }
  function navigate(hash) {if(location.hash===`#${hash}`)route();else location.hash=hash;}
  function setStep(n) {if(!current)return;session(current).step=n;persist(current);navigate(`game/${current.id}/${n}`);$('#main')?.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}
  function modal(title,body) {$('#dialog').innerHTML=`<div class="dialog-body"><div class="dialog-head"><h2>${title}</h2><button class="icon-btn" data-action="close-dialog" title="关闭" aria-label="关闭">${icon('x')}</button></div>${body}</div>`;if(!$('#dialog').open)$('#dialog').showModal();EXPANSION_UI.decorateModal();}
  function backup() {modal('备份与迁移',`<p>导出 JSON 可迁移进度，Markdown 用于阅读。导出文件包含你填写的内容，分享前请脱敏。当前为${storageOK?'本地保存':'仅会话保存'}。</p><div class="button-row"><button class="btn primary" data-action="export-json">${icon('download')}导出 JSON</button><button class="btn" data-action="export-md">${icon('file-text')}导出 Markdown</button><button class="btn" data-action="import">${icon('upload')}导入记录</button></div><p style="margin-top:20px">导入按更新时间合并，不会静默覆盖较新的同局记录。同一局保留一个活动版本；需要多次试玩时，先导出上一局。</p>`);}
  function prompt(game) {
    const roles=game.roles.map(r=>`${r.name}\n公开开场：${r.opening}\n私有上下文：${r.context}\n希望：${r.want}\n边界：${r.boundary}`).join('\n\n');
    return `请主持一场名为“${game.title}”的虚构练习。我是玩家；你按需要扮演各角色，但不替我作判断。\n\n练习目的：${game.mission}\n情境：${game.scene}\n\n角色资料（主持人保留，逐轮按合理提问揭示）：\n${roles}\n\n桌面材料：\n${game.materials.map(m=>`${m.title}：${m.text}`).join('\n')}\n\n轮次：\n${game.rounds.map((r,n)=>`${n+1}. ${r}`).join('\n')}\n\n操作对象：\n${game.config.items.map(i=>`${i.label}：${i.detail||i.answer||'根据角色约束组织选择'}`).join('\n')}\n完整规则参数：${JSON.stringify(game.config,null,2)}\n\n初始选择完成后再揭示变化事件：${game.event.title}。${game.event.text}\n\n交付：${game.deliverables.join('；')}\n复盘：${game.debrief.join('；')}\n\n主持约束：一次只推进一个必要问题；不预设明确冲突，不把沉默当同意；方向和重大风险由获授权负责人拍板，实现方式与承诺由参与人选择；不默认真实组织会议不执行。不要讨好玩家，也不要凭空替现实人物作心理诊断。所有新资料必须标为虚构。只对明示规则和来源核对，不把练习表现当作职业能力或市场需求证明。游戏中人物和数字不是任何真实公司的事实。\n\n迁移限制：${game.transfer}\n请从简短开场和本轮需要我作出的选择开始，不先展示参考答案。`;
  }
  function recordLabel(game,key) {
    const common={opening:'开场与本次选择',decision:'初始安排与依据',event:'变化后的调整',reflection:'判断与反证',transfer:'真实观察与迁移',alternative:'替代组合',mechanism:'机制假设',retest:'复测安排',offers:'条件包比较',counterexample:'最大反证',minimum:'最小交付与拒绝条件',agreement:'普通语言约定',authority:'负责人选择与相关方协商',reading:'仅阅读',checked:'已核对本局记录',elapsed:'累计练习秒数',cutoff:'观察截止日',asof:'截止日状态',intervention:'单一干预点',scene:'迁移场景',method:'所选方法',service:'所选服务',oneLine:'一句话交付',observe:'观察对象',observed:'实际观察状态',when:'观察条件',track:'体验工作日', 'small-change':'小改善或不改'};
    if(common[key])return common[key];
    const exact=game.config.items.find(i=>i.id===key);if(exact)return exact.label;
    const prefixes={pick:'纳入组合',quarter:'安排季度',provider:'提供方',receiver:'接收方',object:'交付对象',window:'窗口与条件',accept:'验收方式',notify:'变化通知',claim:'领取人',target:'验收对象',definition:'验收口径',source:'来源与窗口',threshold:'标准与未知',who:'共同确认人',form:'确认形式',state:'证据层级',hyp:'保留解释',changed:'提问作用',h0:'对解释甲',h1:'对解释乙',stress:'变化处理',branch:'介入选择',reason:'介入依据',task:'任务判断',engage:'投入感',repeat:'愿意重复',familiar:'熟悉度',drain:'消耗',remove:'移除条件',replace:'替代输入',answer:'追问回答',proof:'回答证据边界',try:'所选活动',expect:'尝试前期待',actual:'实际投入感',again:'下一次选择',done:'已实际尝试',condition:'消耗与体验条件'};
    for(const entry of game.config.items){const suffix=`-${entry.id}`;if(key.endsWith(suffix)){const prefix=key.slice(0,-suffix.length);return `${entry.label} / ${prefixes[prefix]||({'flag-a':'甲需要核对','flag-b':'乙需要核对'}[prefix]||prefix)}`;}}
    const observation=key.match(/^(fact|explain|alternate|unknown)-(\d)$/);if(observation)return `观察 ${observation[2]} / ${{fact:'事实',explain:'解释一',alternate:'替代解释',unknown:'未知'}[observation[1]]}`;
    const time=key.match(/^([ab])(Generate|Review|Fix)$/);if(time)return `${time[1]==='a'?'甲':'乙'} / ${{Generate:'生成分钟',Review:'审阅分钟',Fix:'修订分钟'}[time[2]]}`;
    return key;
  }
  function recordValue(game,key,value) {
    if(typeof value==='boolean')return value?'是':'否';
    if(game.engine==='timeline'&&key==='cutoff')return game.config.items[value]?.label||value;
    if(game.engine==='branch'&&key.startsWith('branch-')){const entry=game.config.items.find(i=>key===`branch-${i.id}`);return entry?.options.find(o=>o.id===value)?.label||value;}
    return value;
  }
  function markdown(selected) {
    const list=selected||games.filter(g=>store.sessions[g.id]?.openedAt);
    return `# Phoenix Chen · 决策游乐场个人记录\n\n导出：${new Date().toISOString()}\n\n此文件可能包含个人填写内容；分享前请脱敏。模拟记录不证明真实业务成果、心理特征或市场需求。\n\n`+list.map(g=>{
      const s=store.sessions[g.id]||session(g);
      return `## ${g.id} ${g.title}\n\n状态：${s.completed?'已归档':'进行中'}${s.inputs.reading?' / 仅阅读':''}\n更新：${s.updatedAt}\n情境：${g.scene}\n\n`+Object.entries(s.notes).filter(([,v])=>v).map(([k,v])=>`### ${recordLabel(g,k)}\n\n${v}\n`).join('\n')+`\n### 操作记录\n\n${Object.entries(s.inputs).map(([k,v])=>`- ${recordLabel(g,k)}：${recordValue(g,k,v)}`).join('\n')}\n\n揭示信息：${s.revealed.map(id=>g.config.items.find(i=>i.id===id)?.label||id).join('、')||'无'}\n迁移边界：${g.transfer}\n`;
    }).join('\n---\n\n');
  }
  function printGame(game) {
    const s=session(game);$('#print-zone').innerHTML=`<header><div class="print-tag">Phoenix Chen · 决策游乐场 / ${game.id} / ${s.completed?'已归档':'进行中'}</div><h1>${game.title}</h1><p>${game.subtitle}</p></header><p>${game.scene}</p><h2>本局选择与记录</h2>${Object.entries(s.notes).filter(([,v])=>v).map(([k,v])=>`<div class="print-item"><h3>${escape(recordLabel(game,k))}</h3><div class="print-answer">${escape(v)}</div></div>`).join('')}<h2>操作记录</h2><ul>${Object.entries(s.inputs).map(([k,v])=>`<li>${escape(recordLabel(game,k))}：${escape(recordValue(game,k,v))}</li>`).join('')}</ul><h2>复盘问题</h2><ol>${game.debrief.map(q=>`<li>${q}</li>`).join('')}</ol><h2>迁移边界</h2><p>${game.transfer}</p><p class="print-tag">所有情境与数字为虚构；记录不是能力认证或真实业务成果。${new Date().toLocaleDateString('zh-CN')}</p>`;window.print();
  }
  function clockText(seconds) {const n=Math.max(0,Math.floor(seconds));return `${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;}
  document.addEventListener('click',async e=>{
    const t=e.target.closest('button,[data-open],[data-nav],[data-step],[data-export]');if(!t)return;
    if(t.dataset.nav){$('#dialog').close();navigate(t.dataset.nav);return;}
    if(t.dataset.open){navigate(`game/${t.dataset.open}`);return;}
    if(t.dataset.filter){filter=t.dataset.filter;search='';statusFilter='all';if(view==='favorites'){library();}else navigate(filter==='all'?'library':`family-${filter}`);return;}
    if(t.dataset.star){const game=games.find(g=>g.id===t.dataset.star);let s=store.sessions[game.id];if(!s){s={step:0,notes:{},inputs:{},revealed:[],event:false,completed:false,starred:false,updatedAt:new Date().toISOString()};store.sessions[game.id]=s;}s.starred=!s.starred;persist();current?gamePage(current):library();return;}
    if(t.dataset.step!==undefined){setStep(Number(t.dataset.step));return;}
    if(t.dataset.route){const r=data.routes.find(r=>r.id===t.dataset.route);routeNotice=`当前路线：${r.title} / ${r.ids.join(' → ')}`;store.route=r.id;navigate(`game/${r.ids[0]}`);return;}
    if(t.dataset.export){const game=games.find(g=>g.id===t.dataset.export);download(`${game.id}-${game.title}-记录.md`,markdown([game]));return;}
    if(t.dataset.choice&&current){const s=session(current);const value=t.dataset.choice==='cutoff'?Number(t.dataset.value):t.dataset.value;s.inputs[t.dataset.choice]=value;persist(current);gamePage(current);return;}
    if(t.dataset.reveal&&current){const s=session(current);if(s.revealed.includes(t.dataset.reveal))return;if(current.config.limit&&s.revealed.length>=current.config.limit){toast('本轮信息预算已用完');return;}s.revealed.push(t.dataset.reveal);persist(current);gamePage(current);return;}
    const action=t.dataset.action;
    if(action==='close-dialog'){$('#dialog').close();return;}
    if(action==='type'){largeType=!largeType;document.body.classList.toggle('large-type',largeType);t.classList.toggle('on',largeType);return;}
    if(action==='backup'){backup();return;}
    if(action==='menu'){modal('游戏导航',`<div class="menu-drawer"><button class="nav-btn" data-nav="library">${icon('layout-grid')}全部游戏</button>${families.map(f=>`<button class="nav-btn" data-nav="family-${f.id}">${icon(f.icon)}${f.title}</button>`).join('')}<button class="nav-btn" data-nav="records">${icon('notebook-pen')}我的记录</button><button class="nav-btn" data-nav="favorites">${icon('bookmark')}收藏</button><button class="nav-btn" data-action="backup">${icon('folder-down')}备份与迁移</button><a class="nav-btn" href="完整游戏手册.html" target="_blank">${icon('book-open')}完整手册</a><button class="nav-btn" data-nav="about">${icon('circle-help')}边界与主持约定</button></div>`);return;}
    if(action==='export-json'){download('决策游乐场-个人记录.json',JSON.stringify({...store,exportedAt:new Date().toISOString()},null,2),'application/json');toast('记录已导出；分享前请脱敏');return;}
    if(action==='export-md'){download('决策游乐场-全部记录.md',markdown());return;}
    if(action==='import'){$('#import-file').click();return;}
    if(action==='copy-prompt'){const area=$('#prompt-text');try{await navigator.clipboard.writeText(area.value);toast('主持提示词已复制');}catch{area.focus();area.select();toast('浏览器限制自动复制，提示词已选中');}return;}
    if(action==='download-prompt'){download(`${current.id}-${current.title}-主持提示词.txt`,prompt(current));return;}
    if(!current)return;
    const game=current,s=session(game);
    if(action==='check'){check(game,s);return;}
    if(action==='event'){s.event=true;persist(game);gamePage(game);return;}
    if(action==='back-board'){setStep(1);return;}
    if(action==='prompt'){modal(`${game.id} · 完整主持提示词`,`<p>仅包含虚构材料，不附带你的记录。外部 AI 是可选扩展，页面自身没有实时模型。</p><textarea id="prompt-text" readonly aria-label="完整主持提示词">${escape(prompt(game))}</textarea><div class="button-row"><button class="btn" data-action="download-prompt">${icon('download')}下载文本</button><button class="btn primary" data-action="copy-prompt">${icon('copy')}复制提示词</button></div>`);return;}
    if(action==='save-offer'){const v=Object.fromEntries(Object.keys(game.config.defaults).map(k=>[k,val(s,k,game.config.defaults[k])]));const o=core.offer(v);s.notes.offers=(s.notes.offers||'')+`${s.notes.offers?'\n':''}${v.weeks} 周 / 范围 ${v.scope} / 支持 ${v.support} / 维护 ${v.ownership?'明确':'未明'}：所需 ${o.required}，可用 ${o.available}，${o.feasible?'模型可行':'需调整'}。`;persist(game);gamePage(game);toast('条件包已保留，可继续调整第二套');return;}
    if(action==='export-game'){download(`${game.id}-${game.title}-记录.md`,markdown([game]));return;}
    if(action==='print-game'){printGame(game);return;}
    if(action==='reset-game'){modal('重新开始这一局',`<p>将清空 ${game.id} 的当前笔记、选择和进度；收藏保留。重新开始前可先导出旧记录。</p><div class="button-row"><button class="btn" data-action="export-game">先导出旧记录</button><button class="btn danger" data-action="confirm-reset">确认重新开始</button></div>`);return;}
    if(action==='confirm-reset'){const star=s.starred;delete store.sessions[game.id];session(game).starred=star;persist(game);$('#dialog').close();navigate(`game/${game.id}/0`);return;}
    if(action==='complete'){
      if(!(s.notes.reflection||'').trim()||!(s.notes.transfer||'').trim()){toast('先留下一个判断与反证，以及下一次观察或停止的选择');return;}
      if(!s.inputs.reading&&!s.inputs.checked&&!s.revealed.length&&!Object.keys(s.inputs).some(k=>!['elapsed','reading'].includes(k))){toast('尚无操作记录；可以返回操作，或勾选本次仅阅读');return;}
      s.completed=true;persist(game);gamePage(game);toast('这一局已归档');return;
    }
    if(action==='next-game'){const r=data.routes.find(r=>r.id===store.route);const sequence=r&&r.ids.includes(game.id)?r.ids:games.map(g=>g.id);const next=sequence[sequence.indexOf(game.id)+1];next?navigate(`game/${next}`):navigate('records');return;}
    if(action==='timer'){if(timer.id!==game.id){timer={id:game.id,seconds:Number(s.inputs.elapsed)||0,running:false};}timer.running=!timer.running;gamePage(game);return;}
    if(action==='timer-reset'){timer={id:game.id,seconds:0,running:false};s.inputs.elapsed=0;persist(game);gamePage(game);return;}
  });
  document.addEventListener('input',e=>{
    const t=e.target;
    if(t.id==='search'){search=t.value;const pos=t.selectionStart;library();const field=$('#search');field.focus();field.setSelectionRange?.(pos,pos);return;}
    if(!current)return;const s=session(current);
    if(t.dataset.note){s.notes[t.dataset.note]=t.value;saveLater(current);if(current.engine==='transfer')live(current,s);}
    if(t.dataset.input){s.inputs[t.dataset.input]=readControl(t);saveLater(current);live(current,s);}
  });
  document.addEventListener('change',e=>{
    const t=e.target;if(t.id==='status-filter'){statusFilter=t.value;library();return;}
    if(t.dataset.input&&current){const game=current,s=session(game);s.inputs[t.dataset.input]=readControl(t);persist(game);if(['portable','interest'].includes(game.engine)&&t.type==='checkbox')gamePage(game);else live(game,s);}
  });
  document.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.dataset.open){e.preventDefault();navigate(`game/${e.target.dataset.open}`);}});
  $('#import-file').addEventListener('change',async e=>{
    const file=e.target.files[0];if(!file)return;
    try {if(file.size>2_000_000)throw new Error('文件过大，请使用本游戏库导出的 JSON');const incoming=core.validateImport(JSON.parse(await file.text()),games);let merged=0,kept=0;for(const [id,s]of Object.entries(incoming.sessions)){const old=store.sessions[id];if(!old||Date.parse(s.updatedAt||'1970-01-01')>Date.parse(old.updatedAt||'1970-01-01')){store.sessions[id]=s;merged++;}else kept++;}if(incoming.route&&!store.route)store.route=incoming.route;persist();$('#dialog').close();route();toast(`已合并 ${merged} 局，保留本地较新或相同的 ${kept} 局`);}catch(error){toast(`未导入：${error.message}`);}finally{e.target.value='';}
  });
  $('#dialog').addEventListener('click',e=>{if(e.target===$('#dialog'))$('#dialog').close();});
  window.addEventListener('hashchange',route);
  window.addEventListener('pagehide',()=>{if(timer.id&&timer.running){const g=games.find(g=>g.id===timer.id);session(g).inputs.elapsed=timer.seconds;persist(g);}persist();});
  setInterval(()=>{if(!timer.running||!timer.id)return;timer.seconds++;if(current?.id===timer.id&&$('#timer-value'))$('#timer-value').textContent=clockText(timer.seconds);const game=games.find(g=>g.id===timer.id);session(game).inputs.elapsed=timer.seconds;if(timer.seconds%10===0)persist(game);},1000);
  route();
})();
