globalThis.PLAYGROUND_CORE = (() => {
  const nonnegative = value => Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0;
  const divide = (n, d) => d > 0 ? n / d * 100 : null;
  function cost(input) {
    const runs = nonnegative(input.runs);
    const perRun = nonnegative(input.before) - nonnegative(input.after) - nonnegative(input.review);
    const maintenance = nonnegative(input.maintenance);
    const setup = nonnegative(input.setup);
    return {perRun, net:runs * perRun - maintenance - setup, recurring:runs * perRun - maintenance,
      breakEven:perRun > 0 ? Math.ceil((maintenance + setup) / perRun) : null};
  }
  function rates(input) {
    const success = nonnegative(input.success), failed = nonnegative(input.failed), excluded = nonnegative(input.excluded), claimed = nonnegative(input.claimed);
    return {total:success + failed + excluded, complete:divide(success, success + failed + excluded), known:divide(success, success + failed), reported:divide(success, claimed), suspicious:claimed < success || claimed < success + failed};
  }
  function offer(input) {
    const available = nonnegative(input.weeks) + nonnegative(input.support) * 2 + nonnegative(input.ownership) * 2;
    const required = nonnegative(input.scope) * 3;
    return {available, required, feasible:available >= required};
  }
  function validateImport(data, games) {
    if (!data || typeof data !== 'object' || data.format !== 'chenfeng-decision-playground' || data.version !== 1) throw new Error('不是本游戏库的 v1 记录文件');
    if (!data.sessions || typeof data.sessions !== 'object' || Array.isArray(data.sessions)) throw new Error('记录结构不完整');
    const ids = new Set(games.map(g => g.id));
    const sessions = {};
    if (Object.keys(data.sessions).length > games.length) throw new Error('游戏记录数量异常');
    for (const [id, raw] of Object.entries(data.sessions)) {
      if (!ids.has(id) || !raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('存在未知游戏记录');
      const step = raw.step ?? 0;
      if (!Number.isInteger(step) || step < 0 || step > 4) throw new Error('阶段值不合法');
      for (const flag of ['event','completed','starred']) {
        if (raw[flag] !== undefined && typeof raw[flag] !== 'boolean') throw new Error('状态标记必须为布尔值');
      }
      const clean = {step,notes:{},inputs:{},revealed:[],event:Boolean(raw.event),completed:Boolean(raw.completed),starred:Boolean(raw.starred)};
      for (const section of ['notes','inputs']) {
        if (raw[section] === undefined) continue;
        if (!raw[section] || typeof raw[section] !== 'object' || Array.isArray(raw[section])) throw new Error('填写内容结构异常');
        if (Object.keys(raw[section]).length > 200) throw new Error('填写项目过多');
        for (const [key, value] of Object.entries(raw[section])) {
          if (!/^[a-zA-Z0-9_-]{1,80}$/.test(key) || ['__proto__','constructor','prototype'].includes(key)) throw new Error('记录键不合法');
          if (typeof value === 'string' && value.length <= 25000) clean[section][key] = value;
          else if (section === 'inputs' && (typeof value === 'boolean' || typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= (key === 'elapsed' ? 31536000 : 100000))) clean[section][key] = value;
          else throw new Error('填写值不合法');
        }
      }
      const game = games.find(g => g.id === id);
      if (game.engine === 'timeline' && clean.inputs.cutoff !== undefined && (!Number.isInteger(clean.inputs.cutoff) || clean.inputs.cutoff < 0 || clean.inputs.cutoff >= game.config.items.length)) throw new Error('观察截止日不合法');
      if (game.engine === 'offer') {
        for (const [key,min,max] of [['weeks',2,8],['scope',1,5],['support',0,3],['ownership',0,1]]) {
          const value = clean.inputs[key];
          if (value !== undefined && (!Number.isInteger(value) || value < min || value > max)) throw new Error('条件包参数超出本局规则');
        }
      }
      if (game.engine === 'negotiation' && game.config.kind === 'meso') {
        for (let i=0;i<3;i++) for (const [key,allowed] of [['scope',['1','2','3']],['weeks',['4','5','6','7','8']],['support',['0','1','2']],['maintenance',['A','shared','B']]]) {
          if(clean.inputs[`${key}${i}`]!==undefined&&!allowed.includes(String(clean.inputs[`${key}${i}`])))throw new Error('谈判条件包参数超界');
        }
      }
      if (raw.revealed !== undefined) {
        if (!Array.isArray(raw.revealed) || raw.revealed.length > 30 || raw.revealed.some(v => typeof v !== 'string' || v.length > 80)) throw new Error('揭示记录异常');
        const game = games.find(g => g.id === id);
        const allowed = new Set(game.config.items.map(i => i.id));
        if (raw.revealed.some(v => !allowed.has(v))) throw new Error('未知信息卡');
        clean.revealed = [...new Set(raw.revealed)];
      }
      for (const key of ['updatedAt','openedAt']) {
        if (raw[key] && (typeof raw[key] !== 'string' || Number.isNaN(Date.parse(raw[key])))) throw new Error('日期不合法');
        if (raw[key]) clean[key] = raw[key];
      }
      sessions[id] = clean;
    }
    const result = {format:data.format,version:1,sessions};
    if (data.route !== undefined) {
      if (!['first','craft','choice','holiday'].includes(data.route)) throw new Error('组合路线不合法');
      result.route = data.route;
    }
    return result;
  }
  return {cost,rates,offer,validateImport};
})();
