/* @ds-bundle: {"format":4,"namespace":"SkyLetter","components":[{"name":"InkActions"},{"name":"CitySearch"},{"name":"PlaceRow"},{"name":"ObservationSheet"},{"name":"PaperNote"},{"name":"ForecastStrip"},{"name":"FactorGrid"},{"name":"StatusNote"},{"name":"WeatherStage"},{"name":"MoonPhase"}]} */
/* Native, local-only preview controllers. Not production forecast or persistence APIs. */
window.SkyLetter = Object.freeze({
InkActions(document) {

(() => {
  const choices = [...document.querySelectorAll('[data-period]')];
  const star = document.getElementById('ink-star');
  const feedback = document.getElementById('ink-feedback');
  function choose(button) {
    choices.forEach(item => {
      const selected = item === button;
      item.setAttribute('aria-pressed', String(selected));
      item.querySelector('.sl-choice-tick').textContent = selected ? '✓' : '·';
    });
  }
  choices.forEach(button => button.addEventListener('click', () => {
    choose(button);
    feedback.textContent = '已选择 ' + button.dataset.period + ' · 仅本页样例';
  }));
  star.addEventListener('click', () => {
    const saved = star.getAttribute('aria-pressed') !== 'true';
    star.setAttribute('aria-pressed', String(saved));
    star.setAttribute('aria-label', saved ? '取消收藏此样例' : '收藏此样例');
    feedback.textContent = saved ? '已收藏此样例 · 仅本页暂存' : '已取消收藏 · 仅本页暂存';
  });
  document.getElementById('ink-reset').addEventListener('click', () => {
    choose(choices[0]);
    star.setAttribute('aria-pressed', 'false'); star.setAttribute('aria-label', '收藏此样例');
    feedback.textContent = '已恢复初始样例；未写入本机存储。';
  });
  document.getElementById('ink-clear').addEventListener('click', () => { feedback.textContent = ''; });
})();

},
CitySearch(document) {

(() => {
  const cities = [
    {name:'杭州', detail:'浙江省 · 中国', match:'杭州 浙江 hangzhou zhejiang'},
    {name:'宁波', detail:'浙江省 · 中国', match:'宁波 浙江 ningbo zhejiang'},
    {name:'上海', detail:'上海市 · 中国', match:'上海 shanghai'},
    {name:'北京', detail:'北京市 · 中国', match:'北京 beijing'}
  ];
  const input = document.getElementById('city-query');
  const clear = document.getElementById('city-clear');
  const list = document.getElementById('city-results');
  const empty = document.getElementById('city-empty');
  const count = document.getElementById('city-count');
  const feedback = document.getElementById('city-feedback');
  function render() {
    const query = input.value.trim().toLocaleLowerCase();
    const matches = cities.filter(city => city.match.includes(query));
    clear.disabled = input.value.length === 0;
    list.replaceChildren();
    matches.forEach(city => {
      const li = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'sl-ink-button sl-search-result';
      const copy = document.createElement('span');
      const name = document.createElement('strong'); name.textContent = city.name;
      const detail = document.createElement('small'); detail.textContent = city.detail + ' · 非实时样例';
      const arrow = document.createElement('span'); arrow.className = 'sl-choose-arrow'; arrow.setAttribute('aria-hidden', 'true'); arrow.textContent = '→';
      copy.append(name, detail); button.append(copy, arrow); li.append(button); list.append(li);
      button.addEventListener('click', () => { feedback.textContent = '当前：' + city.name + ' · 非实时样例。未加载天气、未保存地点。'; });
    });
    count.textContent = '找到 ' + matches.length + ' 处 · 全部为非实时样例';
    empty.hidden = matches.length !== 0;
  }
  input.addEventListener('input', render);
  clear.addEventListener('click', () => { input.value = ''; render(); input.focus(); });
  render();
})();

},
PlaceRow(document) {

(() => {
  const rows = [...document.querySelectorAll('[data-city]')];
  const feedback = document.getElementById('place-feedback');
  let current = '杭州';
  const saved = new Set(['杭州', '上海']);
  function update(message) {
    rows.forEach(row => {
      const city = row.dataset.city;
      const pick = row.querySelector('.sl-place-pick');
      const star = row.querySelector('.sl-place-star');
      if (city === current) pick.setAttribute('aria-current', 'location');
      else pick.removeAttribute('aria-current');
      row.querySelector('.sl-place-current').hidden = city !== current;
      star.setAttribute('aria-pressed', String(saved.has(city)));
      star.setAttribute('aria-label', (saved.has(city) ? '取消收藏' : '收藏') + city);
    });
    feedback.textContent = message + ' 当前：' + current + ' · 已收藏 ' + saved.size + ' / 3 处。';
  }
  rows.forEach(row => {
    const city = row.dataset.city;
    row.querySelector('.sl-place-pick').addEventListener('click', () => { current = city; update('已切换本页地点样例；收藏未变。'); });
    row.querySelector('.sl-place-star').addEventListener('click', () => {
      const wasSaved = saved.has(city);
      if (wasSaved) saved.delete(city); else saved.add(city);
      update((wasSaved ? '已取消收藏' : '已收藏') + city + '；地点未变。');
    });
  });
})();

},
ObservationSheet(document) {

(() => {
  const dialog = document.getElementById('observation-sheet');
  const opener = document.getElementById('sheet-opener');
  opener.addEventListener('click', () => { dialog.showModal(); });
  document.getElementById('sheet-close').addEventListener('click', () => dialog.close());
  document.getElementById('sheet-finish').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    document.getElementById('sheet-feedback').textContent = '纸笺已收起 · 焦点返回打开按钮。临时样例未保存。';
    opener.focus({preventScroll:true});
  });
})();

},
PaperNote(document) {

(() => {
  const samples = {
    normal: { score: '77', grade: '值得追', advice: '中高云与地平光路条件较有利，可留意天际色彩变化', description: '杭州常规晚霞' },
    capped: { score: '8', grade: '平淡', advice: '低云较厚，光线可能受阻，晚霞观赏条件较弱', description: '混合边界示例：封顶 10 分，显示源样例 8 分' },
    missing: { score: '—', grade: '暂不可用', advice: '分层云量暂缺，请改选有数据的日期。', description: '必要分层云量缺失：不评分、不以零分代替' }
  };
  const area = document.getElementById('paper-sample');
  document.querySelectorAll('[data-sample]').forEach(button => {
    button.addEventListener('click', () => {
      const sample = samples[button.dataset.sample];
      const missing = button.dataset.sample === 'missing';
      document.querySelectorAll('[data-sample]').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      area.querySelector('.sl-fc-score').textContent = sample.score;
      area.querySelector('.sl-fc-grade').textContent = sample.grade;
      area.querySelector('.sl-fc-advice').textContent = sample.advice;
      area.querySelector('.sl-fc-event-state').textContent = missing ? '分层云量暂缺' : '预报时刻';
      area.querySelector('.sl-fc-window-range').textContent = missing ? '—' : '16:57–17:37';
      area.querySelector('.sl-fc-peak').textContent = missing ? '分层云量暂缺' : '余晖峰值 17:22';
      document.getElementById('paper-description').textContent = '非实时样例 · ' + sample.description;
    });
  });
})();

},
ForecastStrip(document) {
(()=>{const samples={"normal":[{"date":"2026-11-03","dateLabel":"03 周二","score":77,"grade":"值得追","time":"17:12","available":true,"reason":"分层云量暂缺","unavailableNote":"无法研判，非零分","far":false,"summary":"中高云与地平光路条件较有利，可留意天际色彩变化","window":"16:57–17:37","peak":"余晖峰值 17:22"},{"date":"2026-11-04","dateLabel":"04 周三","score":58,"grade":"有机会","time":"17:11","available":true,"reason":"分层云量暂缺","unavailableNote":"无法研判，非零分","far":false,"summary":"暮光可能映出柔和渐变，可留意晚霞变化","window":"16:56–17:36","peak":"余晖峰值 17:21"},{"date":"2026-11-05","dateLabel":"05 周四","score":95,"grade":"极佳","time":"17:10","available":true,"reason":"分层云量暂缺","unavailableNote":"无法研判，非零分","far":false,"summary":"云层与地平光路条件较好，可选择开阔处留意霞光变化","window":"16:55–17:35","peak":"余晖峰值 17:20"},{"date":"2026-11-06","dateLabel":"06 周五","score":42,"grade":"一般","time":"17:10","available":true,"reason":"分层云量暂缺","unavailableNote":"无法研判，非零分","far":false,"summary":"云量偏少，缺少映照暮光的云层，晚霞可能较淡","window":"16:55–17:35","peak":"余晖峰值 17:20"},{"date":"2026-11-07","dateLabel":"07 周六","score":22,"grade":"平淡","time":"17:09","available":true,"reason":"分层云量暂缺","unavailableNote":"无法研判，非零分","far":true,"summary":"云量偏少，缺少映照暮光的云层，晚霞可能较淡","window":"16:54–17:34","peak":"余晖峰值 17:19"},{"date":"2026-11-08","dateLabel":"08 周日","score":70,"grade":"值得追","time":"17:08","available":true,"reason":"分层云量暂缺","unavailableNote":"无法研判，非零分","far":true,"summary":"中高云与地平光路条件较有利，可留意天际色彩变化","window":"16:53–17:33","peak":"余晖峰值 17:18"},{"date":"2026-11-09","dateLabel":"09 周一","score":85,"grade":"极佳","time":"17:08","available":true,"reason":"分层云量暂缺","unavailableNote":"无法研判，非零分","far":true,"summary":"云层与地平光路条件较好，可选择开阔处留意霞光变化","window":"16:53–17:33","peak":"余晖峰值 17:18"}],"capped":[{"date":"2026-11-03","dateLabel":"03 周二","score":8,"grade":"平淡","time":"17:12","available":true,"reason":"分层云量暂缺","unavailableNote":"无法研判，非零分","far":false,"summary":"低云较厚，光线可能受阻，晚霞观赏条件较弱","window":"16:57–17:37","peak":"余晖峰值 17:22"},{"date":"2026-11-04","dateLabel":"04 周三","score":58,"grade":"有机会","time":"17:11","available":true,"reason":"分层云量暂缺","unavailableNote":"无法研判，非零分","far":false,"summary":"暮光可能映出柔和渐变，可留意晚霞变化","window":"16:56–17:36","peak":"余晖峰值 17:21"},{"date":"2026-11-05","dateLabel":"05 周四","score":95,"grade":"极佳","time":"17:10","available":true,"reason":"分层云量暂缺","unavailableNote":"无法研判，非零分","far":false,"summary":"云层与地平光路条件较好，可选择开阔处留意霞光变化","window":"16:55–17:35","peak":"余晖峰值 17:20"},{"date":"2026-11-06","dateLabel":"06 周五","score":"—","grade":"暂不可用","time":"—","available":false,"reason":"极昼/极夜 · 无对应事件","unavailableNote":"高纬地点样例","far":false,"summary":"极昼/极夜 · 无对应事件，请改选有数据的日期。","window":"—","peak":"极昼/极夜 · 无对应事件"},{"date":"2026-11-07","dateLabel":"07 周六","score":22,"grade":"平淡","time":"17:09","available":true,"reason":"分层云量暂缺","unavailableNote":"无法研判，非零分","far":true,"summary":"云量偏少，缺少映照暮光的云层，晚霞可能较淡","window":"16:54–17:34","peak":"余晖峰值 17:19"},{"date":"2026-11-08","dateLabel":"08 周日","score":"—","grade":"暂不可用","time":"17:08","available":false,"reason":"分层云量暂缺","unavailableNote":"无法研判，非零分","far":true,"summary":"分层云量暂缺，请改选有数据的日期。","window":"—","peak":"分层云量暂缺"},{"date":"2026-11-09","dateLabel":"09 周一","score":85,"grade":"极佳","time":"17:08","available":true,"reason":"分层云量暂缺","unavailableNote":"无法研判，非零分","far":true,"summary":"云层与地平光路条件较好，可选择开阔处留意霞光变化","window":"16:53–17:33","peak":"余晖峰值 17:18"}],"missing":[{"date":"2026-11-03","dateLabel":"03 周二","score":"—","grade":"暂不可用","time":"17:12","available":false,"reason":"分层云量暂缺","unavailableNote":"无法研判，非零分","far":false,"summary":"分层云量暂缺，请改选有数据的日期。","window":"—","peak":"分层云量暂缺"},{"date":"2026-11-04","dateLabel":"04 周三","score":58,"grade":"有机会","time":"17:11","available":true,"reason":"分层云量暂缺","unavailableNote":"无法研判，非零分","far":false,"summary":"暮光可能映出柔和渐变，可留意晚霞变化","window":"16:56–17:36","peak":"余晖峰值 17:21"},{"date":"2026-11-05","dateLabel":"05 周四","score":95,"grade":"极佳","time":"17:10","available":true,"reason":"分层云量暂缺","unavailableNote":"无法研判，非零分","far":false,"summary":"云层与地平光路条件较好，可选择开阔处留意霞光变化","window":"16:55–17:35","peak":"余晖峰值 17:20"},{"date":"2026-11-06","dateLabel":"06 周五","score":"—","grade":"暂不可用","time":"—","available":false,"reason":"极昼/极夜 · 无对应事件","unavailableNote":"高纬地点样例","far":false,"summary":"极昼/极夜 · 无对应事件，请改选有数据的日期。","window":"—","peak":"极昼/极夜 · 无对应事件"},{"date":"2026-11-07","dateLabel":"07 周六","score":22,"grade":"平淡","time":"17:09","available":true,"reason":"分层云量暂缺","unavailableNote":"无法研判，非零分","far":true,"summary":"云量偏少，缺少映照暮光的云层，晚霞可能较淡","window":"16:54–17:34","peak":"余晖峰值 17:19"},{"date":"2026-11-08","dateLabel":"08 周日","score":"—","grade":"暂不可用","time":"17:08","available":false,"reason":"分层云量暂缺","unavailableNote":"无法研判，非零分","far":true,"summary":"分层云量暂缺，请改选有数据的日期。","window":"—","peak":"分层云量暂缺"},{"date":"2026-11-09","dateLabel":"09 周一","score":85,"grade":"极佳","time":"17:08","available":true,"reason":"分层云量暂缺","unavailableNote":"无法研判，非零分","far":true,"summary":"云层与地平光路条件较好，可选择开阔处留意霞光变化","window":"16:53–17:33","peak":"余晖峰值 17:18"}]};let scenario='normal',selected=0;const fold=document.getElementById('week-fold');function render(){const days=samples[scenario];fold.innerHTML=days.map((day,index)=>'<button type="button" class="sl-fc-day" data-day="'+index+'" data-best="'+(day.available&&index===2)+'" aria-pressed="'+(index===selected)+'" '+(!day.available?'disabled ':'')+'aria-label="'+day.dateLabel+'，'+(day.available?day.score+' 分，'+day.grade:day.reason+'，'+day.unavailableNote)+'"><span class="sl-fc-day-date">'+day.dateLabel+'</span><strong class="sl-fc-day-score">'+day.score+'</strong><span class="sl-fc-day-grade">'+(day.available?day.grade:day.reason)+'</span><time datetime="'+day.date+(day.time==='—'?'':'T'+day.time+'+08:00')+'">'+day.time+'</time><span class="sl-fc-day-mark">'+(day.available?[index===selected?'当前':'',index===2?'本周最高':'',day.far?'远期':''].filter(Boolean).join(' · '):day.unavailableNote)+'</span></button>').join('');const day=days[selected];document.getElementById('week-summary').textContent=day.available?day.dateLabel+' · 晚霞 '+day.score+' · '+day.grade+'。观赏窗口 '+day.window+'，'+day.peak+'。'+day.summary:day.dateLabel+' · '+day.reason+'。'+day.unavailableNote+'；指数与窗口均为 —，不显示零分。';document.getElementById('week-foot').textContent='时刻为日落时间 · 第 5–7 日仅供参考'+(scenario==='normal'?'':' · 含高纬/缺测地点样例');}fold.addEventListener('click',event=>{const button=event.target.closest('[data-day]');if(!button||button.disabled)return;selected=Number(button.dataset.day);render();fold.querySelector('[data-day="'+selected+'"]').focus({preventScroll:true});});document.querySelectorAll('[data-sample]').forEach(button=>button.addEventListener('click',()=>{scenario=button.dataset.sample;document.querySelectorAll('[data-sample]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));render();}));document.getElementById('best-day').addEventListener('click',()=>{selected=2;render();fold.querySelector('[data-day="2"]').scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});});})();
},
FactorGrid(document) {
(()=>{const templates={"normal":"<header class=\"sl-fc-observation-heading\"><h2 id=\"factor-title\">天气批注</h2><span>影响因素 · 基准 89 分</span></header><div class=\"sl-paper sl-fc-observation\"><div class=\"sl-fc-factor-groups\"><section class=\"sl-fc-factor-group\"><h3>云层</h3><div class=\"sl-fc-factor-grid\"><div class=\"sl-fc-factor sl-fc-attention\"><span class=\"sl-fc-factor-name\">高云</span><div class=\"sl-fc-factor-value\"><span class=\"sl-fc-measurement\"><span>32</span><span class=\"sl-fc-unit\">%</span></span><span class=\"sl-fc-delta\" aria-label=\"计分变化 −4\">−4</span></div></div><div class=\"sl-fc-factor \"><span class=\"sl-fc-factor-name\">中云</span><div class=\"sl-fc-factor-value\"><span class=\"sl-fc-measurement\"><span>25</span><span class=\"sl-fc-unit\">%</span></span><span class=\"sl-fc-delta\" aria-label=\"计分变化 −1.6\">−1.6</span></div></div><div class=\"sl-fc-factor \"><span class=\"sl-fc-factor-name\">本地低云</span><div class=\"sl-fc-factor-value\"><span class=\"sl-fc-measurement\"><span>18</span><span class=\"sl-fc-unit\">%</span></span><span class=\"sl-fc-delta\" aria-label=\"计分变化 −2.3\">−2.3</span></div></div><div class=\"sl-fc-factor sl-fc-attention\"><span class=\"sl-fc-factor-name\">太阳方向低云</span><div class=\"sl-fc-factor-value\"><span class=\"sl-fc-measurement\"><span>40</span><span class=\"sl-fc-unit\">%</span></span><span class=\"sl-fc-delta\" aria-label=\"计分变化 −10\">−10</span></div></div></div></section><section class=\"sl-fc-factor-group\"><h3>空气</h3><div class=\"sl-fc-factor-grid\"><div class=\"sl-fc-factor \"><span class=\"sl-fc-factor-name\">湿度</span><div class=\"sl-fc-factor-value\"><span class=\"sl-fc-measurement\"><span>55</span><span class=\"sl-fc-unit\">%</span></span><span class=\"sl-fc-delta\" aria-label=\"计分变化 0\">0</span></div></div><div class=\"sl-fc-factor sl-fc-helpful\"><span class=\"sl-fc-factor-name\">能见度</span><div class=\"sl-fc-factor-value\"><span class=\"sl-fc-measurement\"><span>32</span><span class=\"sl-fc-unit\">km</span></span><span class=\"sl-fc-delta\" aria-label=\"计分变化 +6\">+6</span></div></div><div class=\"sl-fc-factor \"><span class=\"sl-fc-factor-name\">气溶胶 AOD</span><div class=\"sl-fc-factor-value\"><span class=\"sl-fc-measurement\"><span>0.18</span></span><span class=\"sl-fc-delta\" aria-label=\"计分变化 0\">0</span></div></div><div class=\"sl-fc-factor \"><span class=\"sl-fc-factor-name\">PM2.5</span><div class=\"sl-fc-factor-value\"><span class=\"sl-fc-measurement\"><span>18</span><span class=\"sl-fc-unit\">μg/m³</span></span><span class=\"sl-fc-delta\" aria-label=\"计分变化 0\">0</span></div></div></div></section></div><p class=\"sl-fc-factor-margin\">太阳方向低云是主要扣分项</p><details class=\"sl-fc-details\"><summary>理想区间与计分</summary><p>逐项原始值相加后四舍五入，指数范围 2–99；封顶规则优先。缺测项不当作实测零值。</p><p class=\"sl-fc-factor-reason\">高云 · 理想 20–65%<br>高云适中，受光后最易烧红</p><p class=\"sl-fc-factor-reason\">中云 · 理想 15–55%<br>中云丰富霞光层次</p><p class=\"sl-fc-factor-reason\">本地低云 · 理想 0–15%<br>本地低云有一定遮挡</p><p class=\"sl-fc-factor-reason\">太阳方向低云 · 理想 0–15%<br>远端有低云，光路部分受阻</p><p class=\"sl-fc-factor-reason\">湿度 · 理想 20–65%<br>湿度适中</p><p class=\"sl-fc-factor-reason\">能见度 · 理想 30–50 km<br>大气清朗，远处云霞清晰</p><p class=\"sl-fc-factor-reason\">气溶胶 AOD · 理想 0–0.3<br>空气洁净，色彩纯正</p><p class=\"sl-fc-factor-reason\">PM2.5 · 理想 0–35 μg/m³<br>颗粒物少</p></details><footer class=\"sl-fc-foot\"><span>样例更新 15:30 · UTC+8</span><span>晚霞观测手记 · 非实时样例</span></footer></div>","capped":"<header class=\"sl-fc-observation-heading\"><h2 id=\"factor-title\">天气批注</h2><span>影响因素 · 基准 89 分</span></header><div class=\"sl-paper sl-fc-observation\"><div class=\"sl-fc-factor-groups\"><section class=\"sl-fc-factor-group\"><h3>云层</h3><div class=\"sl-fc-factor-grid\"><div class=\"sl-fc-factor sl-fc-attention\"><span class=\"sl-fc-factor-name\">高云</span><div class=\"sl-fc-factor-value\"><span class=\"sl-fc-measurement\"><span>65</span><span class=\"sl-fc-unit\">%</span></span><span class=\"sl-fc-delta\" aria-label=\"计分变化 −17.7\">−17.7</span></div></div><div class=\"sl-fc-factor sl-fc-attention\"><span class=\"sl-fc-factor-name\">中云</span><div class=\"sl-fc-factor-value\"><span class=\"sl-fc-measurement\"><span>71</span><span class=\"sl-fc-unit\">%</span></span><span class=\"sl-fc-delta\" aria-label=\"计分变化 −11.8\">−11.8</span></div></div><div class=\"sl-fc-factor sl-fc-attention\"><span class=\"sl-fc-factor-name\">本地低云</span><div class=\"sl-fc-factor-value\"><span class=\"sl-fc-measurement\"><span>86</span><span class=\"sl-fc-unit\">%</span></span><span class=\"sl-fc-delta\" aria-label=\"计分变化 −53.3\">−53.3</span></div></div><div class=\"sl-fc-factor \"><span class=\"sl-fc-factor-name\">太阳方向低云</span><div class=\"sl-fc-factor-value\"><span class=\"sl-fc-measurement\"><span>18</span><span class=\"sl-fc-unit\">%</span></span><span class=\"sl-fc-delta\" aria-label=\"计分变化 −1.2\">−1.2</span></div></div></div></section><section class=\"sl-fc-factor-group\"><h3>空气</h3><div class=\"sl-fc-factor-grid\"><div class=\"sl-fc-factor \"><span class=\"sl-fc-factor-name\">湿度</span><div class=\"sl-fc-factor-value\"><span class=\"sl-fc-measurement\"><span>55</span><span class=\"sl-fc-unit\">%</span></span><span class=\"sl-fc-delta\" aria-label=\"计分变化 0\">0</span></div></div><div class=\"sl-fc-factor sl-fc-helpful\"><span class=\"sl-fc-factor-name\">能见度</span><div class=\"sl-fc-factor-value\"><span class=\"sl-fc-measurement\"><span>40</span><span class=\"sl-fc-unit\">km</span></span><span class=\"sl-fc-delta\" aria-label=\"计分变化 +6\">+6</span></div></div><div class=\"sl-fc-factor \"><span class=\"sl-fc-factor-name\">气溶胶 AOD</span><div class=\"sl-fc-factor-value\"><span class=\"sl-fc-measurement\"><span>—</span><span class=\"sl-fc-unit\">缺测</span></span><span class=\"sl-fc-delta\" aria-label=\"缺测，模型沿用默认值\">—</span></div></div><div class=\"sl-fc-factor \"><span class=\"sl-fc-factor-name\">PM2.5</span><div class=\"sl-fc-factor-value\"><span class=\"sl-fc-measurement\"><span>—</span><span class=\"sl-fc-unit\">缺测</span></span><span class=\"sl-fc-delta\" aria-label=\"缺测，模型沿用默认值\">—</span></div></div><div class=\"sl-fc-factor \"><span class=\"sl-fc-factor-name\">降水</span><div class=\"sl-fc-factor-value\"><span class=\"sl-fc-measurement\"><span>0.2</span><span class=\"sl-fc-unit\">mm</span></span><span class=\"sl-fc-delta\" aria-label=\"计分变化 −1.2\">−1.2</span></div></div><div class=\"sl-fc-factor \"><span class=\"sl-fc-factor-name\">沙尘</span><div class=\"sl-fc-factor-value\"><span class=\"sl-fc-measurement\"><span>35</span><span class=\"sl-fc-unit\">μg/m³</span></span><span class=\"sl-fc-delta\" aria-label=\"计分变化 −1.5\">−1.5</span></div></div></div></section></div><p class=\"sl-fc-factor-margin\">本地低云是主要扣分项</p><p class=\"sl-fc-cap\">低云与中云同时厚重，霞光指数封顶 10 分</p><details class=\"sl-fc-details\"><summary>理想区间与计分</summary><p>逐项原始值相加后四舍五入，指数范围 2–99；封顶规则优先。缺测项不当作实测零值。</p><p class=\"sl-fc-factor-reason\">高云 · 理想 20–65%<br>高云适中，受光后最易烧红</p><p class=\"sl-fc-factor-reason\">中云 · 理想 15–55%<br>中云偏厚，容易压暗天色</p><p class=\"sl-fc-factor-reason\">本地低云 · 理想 0–15%<br>本地低云厚，地平视线受阻</p><p class=\"sl-fc-factor-reason\">太阳方向低云 · 理想 0–15%<br>远端有低云，光路部分受阻</p><p class=\"sl-fc-factor-reason\">湿度 · 理想 20–65%<br>湿度适中</p><p class=\"sl-fc-factor-reason\">能见度 · 理想 30–50 km<br>大气清朗，远处云霞清晰</p><p class=\"sl-fc-factor-reason\">气溶胶 AOD · 理想 该要素暂缺<br>该要素暂缺；以中性项计分，不代表实测为零</p><p class=\"sl-fc-factor-reason\">PM2.5 · 理想 该要素暂缺<br>该要素暂缺；以中性项计分，不代表实测为零</p><p class=\"sl-fc-factor-reason\">降水 · 理想 0–0 mm<br>有降水，天色暗淡</p><p class=\"sl-fc-factor-reason\">沙尘 · 理想 0–20 μg/m³<br>沙尘偏多，色彩发黄发灰</p></details><footer class=\"sl-fc-foot\"><span>样例更新 15:30 · UTC+8</span><span>晚霞观测手记 · 非实时样例</span></footer></div>","missing":"<header class=\"sl-fc-observation-heading\"><h2 id=\"factor-title\">天气批注</h2><span>分层云量暂缺 · 暂不计分</span></header><div class=\"sl-paper sl-fc-observation\"><div class=\"sl-fc-factor-groups\"><section class=\"sl-fc-factor-group\"><h3>云层</h3><div class=\"sl-fc-factor-grid\"><div class=\"sl-fc-factor \"><span class=\"sl-fc-factor-name\">高云</span><div class=\"sl-fc-factor-value\"><span class=\"sl-fc-measurement\"><span>—</span></span><span class=\"sl-fc-delta\" aria-label=\"计分变化 —\">—</span></div></div><div class=\"sl-fc-factor \"><span class=\"sl-fc-factor-name\">中云</span><div class=\"sl-fc-factor-value\"><span class=\"sl-fc-measurement\"><span>—</span></span><span class=\"sl-fc-delta\" aria-label=\"计分变化 —\">—</span></div></div><div class=\"sl-fc-factor \"><span class=\"sl-fc-factor-name\">本地低云</span><div class=\"sl-fc-factor-value\"><span class=\"sl-fc-measurement\"><span>—</span></span><span class=\"sl-fc-delta\" aria-label=\"计分变化 —\">—</span></div></div><div class=\"sl-fc-factor \"><span class=\"sl-fc-factor-name\">太阳方向低云</span><div class=\"sl-fc-factor-value\"><span class=\"sl-fc-measurement\"><span>—</span></span><span class=\"sl-fc-delta\" aria-label=\"计分变化 —\">—</span></div></div></div></section><section class=\"sl-fc-factor-group\"><h3>空气</h3><div class=\"sl-fc-factor-grid\"><div class=\"sl-fc-factor \"><span class=\"sl-fc-factor-name\">湿度</span><div class=\"sl-fc-factor-value\"><span class=\"sl-fc-measurement\"><span>—</span></span><span class=\"sl-fc-delta\" aria-label=\"计分变化 —\">—</span></div></div><div class=\"sl-fc-factor \"><span class=\"sl-fc-factor-name\">能见度</span><div class=\"sl-fc-factor-value\"><span class=\"sl-fc-measurement\"><span>—</span></span><span class=\"sl-fc-delta\" aria-label=\"计分变化 —\">—</span></div></div><div class=\"sl-fc-factor \"><span class=\"sl-fc-factor-name\">气溶胶 AOD</span><div class=\"sl-fc-factor-value\"><span class=\"sl-fc-measurement\"><span>—</span></span><span class=\"sl-fc-delta\" aria-label=\"计分变化 —\">—</span></div></div><div class=\"sl-fc-factor \"><span class=\"sl-fc-factor-name\">PM2.5</span><div class=\"sl-fc-factor-value\"><span class=\"sl-fc-measurement\"><span>—</span></span><span class=\"sl-fc-delta\" aria-label=\"计分变化 —\">—</span></div></div></div></section></div><p class=\"sl-fc-factor-margin\">数据暂缺，暂不判断影响项</p><details class=\"sl-fc-details\"><summary>理想区间与计分</summary><p>必要云层数据或事件缺失时不计算指数，不以零分代替。</p><p class=\"sl-fc-factor-reason\">高云 · 理想 该要素暂缺<br>分层云量暂缺，不进行评分</p><p class=\"sl-fc-factor-reason\">中云 · 理想 15–55%<br>分层云量暂缺，不进行评分</p><p class=\"sl-fc-factor-reason\">本地低云 · 理想 0–15%<br>分层云量暂缺，不进行评分</p><p class=\"sl-fc-factor-reason\">太阳方向低云 · 理想 0–15%<br>分层云量暂缺，不进行评分</p><p class=\"sl-fc-factor-reason\">湿度 · 理想 20–65%<br>分层云量暂缺，不进行评分</p><p class=\"sl-fc-factor-reason\">能见度 · 理想 30–50 km<br>分层云量暂缺，不进行评分</p><p class=\"sl-fc-factor-reason\">气溶胶 AOD · 理想 0–0.3<br>分层云量暂缺，不进行评分</p><p class=\"sl-fc-factor-reason\">PM2.5 · 理想 0–35 μg/m³<br>分层云量暂缺，不进行评分</p></details><footer class=\"sl-fc-foot\"><span>样例更新 15:30 · UTC+8</span><span>晚霞观测手记 · 非实时样例</span></footer></div>"};document.querySelectorAll('[data-sample]').forEach(button=>button.addEventListener('click',()=>{const paper=document.getElementById('factor-paper');const expanded=paper.querySelector('details').open;paper.innerHTML=templates[button.dataset.sample];paper.querySelector('details').open=expanded;document.querySelectorAll('[data-sample]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));document.getElementById('factor-status').textContent='非实时样例 · '+({normal:'常规批注，霞光指数 77',capped:'封顶批注，霞光指数 8，AOD 与 PM2.5 缺测',missing:'分层云量暂缺，不进行评分'})[button.dataset.sample];}));})();
},
StatusNote(document) {
(() => {
  const states = {
    loading: { title: '正在读取天空', copy: '正在计算晚霞方向的云层…', meaning: '首次读取尚无可用手记，不显示分数、日落窗口或旧记录；此处停留在读取样例，不发送请求。' },
    empty: { title: '暂无晨昏视窗', copy: '极昼或极夜期间，未来三天没有对应的晨昏视窗。', meaning: '这是无对应事件，不是零分天气；没有可保留的当次预测，也不伪造日落时刻或观赏窗口。' },
    missing: { title: '云层资料暂缺', copy: '当地高空分层云量暂缺，暂不能给出可靠评分。', retry: true, meaning: '必要分层云量缺失时不研判，不把缺测当零分；与可选要素缺测仍可展示指数的情况不同。' },
    error: { title: '天空暂时失联', copy: '暂无可用预测，请稍后重试。', retry: true, meaning: '首次读取失败且无可用记录，不展示分数；已有记录的更新失败应保留双纸，不应清空手记。' },
    cached: { retained: true, copy: '尚未更新', action: '刷新', meaning: '从保存记录恢复，尚未确认新鲜度；两笺保留原日期，事件时刻静态展示，天气实况待更新。' },
    stale: { retained: true, copy: '更新未成功 · 沿用记录', action: '重试', meaning: '更新失败只改城市下的文字行；11/03 晚霞 77 分与静态窗口保持原位，不把保存的天气或事件状态当作此刻。' },
    refreshing: { retained: true, busy: true, copy: '正在更新…', action: '更新中…', meaning: '仅状态与动作原位变化；上次更新时间和两张纸的原日期、数值保持不变，不自动完成、不宣称数据已变新。' },
    switching: { retained: true, busy: true, copy: '11/04 朝霞读取中 · 暂留晚霞', action: '读取中…', meaning: '请求的是 11/04 朝霞，展示的仍是 11/03 晚霞；未确认前不改旧卡日期或倒计时，也不把旧城记录借给新城。' }
  };
  const retained = document.getElementById('status-retained');
  const blank = document.getElementById('status-blank');
  const refresh = document.getElementById('status-refresh');
  function setState(mode) {
    const state = states[mode];
    retained.hidden = !state.retained;
    blank.hidden = Boolean(state.retained);
    retained.setAttribute('aria-busy', String(Boolean(state.busy)));
    blank.setAttribute('aria-busy', String(mode === 'loading'));
    if (state.retained) {
      document.getElementById('status-row-message').textContent = state.copy;
      refresh.textContent = state.action;
      refresh.disabled = Boolean(state.busy);
      refresh.setAttribute('aria-busy', String(Boolean(state.busy)));
    } else {
      document.getElementById('status-blank-title').textContent = state.title;
      document.getElementById('status-blank-copy').textContent = state.copy;
      document.getElementById('status-loading-art').hidden = mode !== 'loading';
      document.getElementById('status-blank-art').hidden = mode === 'loading';
      document.getElementById('status-blank-actions').hidden = !state.retry;
    }
    document.getElementById('status-meaning').textContent = state.meaning;
    document.getElementById('status-announcement').textContent = '非实时样例 · ' + (state.retained ? state.copy + '。上次更新 11/03 15:30。' : state.title + '。' + state.copy);
    document.querySelectorAll('[data-state]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.state === mode)));
  }
  document.querySelectorAll('[data-state]').forEach(button => button.addEventListener('click', () => setState(button.dataset.state)));
  document.getElementById('status-stage').addEventListener('click', event => {
    const trigger = event.target.closest('[data-refresh], [data-retry]');
    if (!trigger || trigger.disabled) return;
    const next = trigger.hasAttribute('data-refresh') ? 'refreshing' : 'loading';
    setState(next);
    document.querySelector('[data-state="' + next + '"]').focus({ preventScroll: true });
  });
  setState('cached');
})();
},
WeatherStage(document) {

const stage = document.querySelector('#weather-stage');
const world = document.querySelector('#weather-world');
const weather = document.querySelector('#weather');
const light = document.querySelector('#weather-light');
const motionButton = document.querySelector('#weather-motion');
const status = document.querySelector('#weather-status');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const themes = ['day', 'dawn', 'dusk', 'night'];
let followTheme = true;
let motionRequested = true;
const timers = new Map();
const scenes = [];
const labels = Object.fromEntries([...weather.options].map(option => [option.value, option.text]));
function decoration(className, parent) {
  const element = document.createElement('i');
  element.className = className;
  parent.append(element);
  return element;
}
for (const weatherId of Object.keys(labels)) {
  for (const lightId of themes) {
    const scene = document.createElement('div');
    scene.className = 'sl-weather-scene';
    scene.dataset.weather = weatherId;
    scene.dataset.light = lightId;
    if (lightId === 'night') {
      for (let i = 0; i < 26; i++) {
        const star = decoration('sl-atmo-star', scene);
        star.style.cssText = `left:${(i * 37 + 7) % 100}%;top:${(i * 67 + 30) % 820}px;animation-delay:-${i % 7}s`;
      }
      const moon = document.createElement('div');
      moon.className = 'sl-atmo-moon';
      moon.innerHTML = '<i class="sl-atmo-moonhalo"></i><svg viewBox="0 0 80 80"><path d="M55 8 A33 33 0 1 0 55 72 A36 36 0 0 1 55 8Z" fill="currentColor"/></svg>';
      scene.append(moon);
    } else if (weatherId === 'clear' || weatherId === 'partly') decoration('sl-atmo-sun', scene);
    if (['partly','overcast','rain','thunder','hail'].includes(weatherId)) decoration('sl-atmo-cloud', scene);
    if (weatherId === 'fog') decoration('sl-atmo-fog', scene);
    if (weatherId === 'wind') {
      decoration('sl-atmo-wind', scene);
      decoration('sl-atmo-wind second', scene);
    }
    if (weatherId === 'thunder' || weatherId === 'hail') decoration('sl-atmo-storm', scene);
    const particle = weatherId === 'snow' ? 'snow' : weatherId === 'hail' ? 'hail' : ['rain','thunder'].includes(weatherId) ? 'rain' : null;
    if (particle) {
      for (let i = 0; i < (particle === 'hail' ? 16 : 22); i++) {
        const item = decoration(`sl-atmo-${particle}`, scene);
        const snow = particle === 'snow';
        item.style.cssText = `left:${(i * (snow ? 43 : 47) + (snow ? 5 : 9)) % 100}%;top:${(i * (snow ? 31 : 37)) % 440}px;animation-delay:-${(i % (snow ? 9 : 7)) * (snow ? .43 : .19)}s`;
      }
    }
    world.append(scene);
    scenes.push(scene);
  }
}
function clearEffects() {
  for (const timer of timers.values()) clearTimeout(timer);
  timers.clear();
  for (const effect of ['gust', 'strike', 'warm']) delete stage.dataset[effect];
}
function render() {
  stage.dataset.weather = weather.value;
  stage.dataset.light = light.value;
  stage.dataset.motion = String(motionRequested && !reduced.matches && !document.hidden);
  for (const scene of scenes) scene.classList.toggle('is-active', scene.dataset.weather === weather.value && scene.dataset.light === light.value);
  motionButton.setAttribute('aria-pressed', String(motionRequested));
  motionButton.textContent = reduced.matches ? '系统减弱动效' : motionRequested ? '动效 开' : '动效 关';
  status.textContent = `${labels[weather.value]} · ${light.selectedOptions[0].text} · 非实时样例 · ${stage.dataset.motion === 'true' ? '650 ms 交叠' : '静态天气与月相保留'}`;
}
function parentTheme() {
  if (!followTheme) return;
  const theme = document.documentElement.dataset.theme;
  light.value = themes.includes(theme) ? theme : 'day';
  clearEffects();
  render();
}
weather.addEventListener('change', () => { clearEffects(); render(); });
light.addEventListener('change', () => { followTheme = false; clearEffects(); render(); });
motionButton.addEventListener('click', () => { motionRequested = !motionRequested; clearEffects(); render(); });
reduced.addEventListener('change', () => { clearEffects(); render(); });
document.addEventListener('visibilitychange', () => { clearEffects(); render(); });
new MutationObserver(parentTheme).observe(document.documentElement, { attributes:true, attributeFilter:['data-theme'] });
function pulse(name, label, duration, event) {
  const keyboard = event.detail === 0;
  if (keyboard || stage.dataset.motion !== 'true') {
    clearEffects();
    status.textContent = `${keyboard ? '键盘操作仅文字反馈' : '动效已关闭'} · 非实时样例 · 纸面数值保持不变`;
    return;
  }
  clearTimeout(timers.get(name));
  stage.dataset[name] = 'true';
  timers.set(name, setTimeout(() => { delete stage.dataset[name]; timers.delete(name); render(); }, duration));
  status.textContent = `${label} · 非实时样例 · 数据不移动、不闪烁`;
}
document.querySelector('#weather-clip').addEventListener('click', event => pulse('strike', '夹端引雷', 650, event));
document.querySelector('#weather-annotation').addEventListener('click', event => pulse('warm', '圈注暖光', 3600, event));
document.querySelector('#weather-tape').addEventListener('click', event => pulse('gust', '胶带唤风，锚点不动', 2200, event));
for (const button of document.querySelectorAll('[data-day]')) button.addEventListener('click', () => {
  for (const other of document.querySelectorAll('[data-day]')) other.setAttribute('aria-pressed', String(other === button));
  document.querySelector('#forecast-note').textContent = `横笺选中 ${button.dataset.day === 'today' ? '03' : '05'} 日；主笺数值固定，不重算环境。`;
});
parentTheme();

},
MoonPhase(document) {

const presets = {
  quarter:{name:'上弦月',fraction:'50.0%',age:'7.4',altitude:'46.2°',azimuth:'190.4°',direction:'南',time:'18:10',visibility:'明暗交界分明，山海有了轮廓。',title:'宜看环形山',advice:'沿晨昏分界寻找环形山与月海，明暗的交界最有层次。',path:'M100 12 A88 88 0 0 1 100 188 L100 12 Z',date:'初八',elongation:'90.0',waxing:'盈月'},
  waning:{name:'下弦月',fraction:'50.0%',age:'22.1',altitude:'46.2°',azimuth:'169.6°',direction:'南',time:'06:10',visibility:'同样半轮明月，亮面已转向另一侧。',title:'宜看晨间月面',advice:'黎明前看明暗交界，留意亏月的山影与环形山。',path:'M100 12 A88 88 0 0 0 100 188 L100 12 Z',date:'廿三',elongation:'270.0',waxing:'亏月'},
  'waning-crescent':{name:'残月',fraction:'12.0%',age:'26.2',altitude:'12.8°',azimuth:'109.4°',direction:'东南偏东',time:'05:10',visibility:'破晓前的细月，亮面朝向东方。',title:'宜与破晓同框',advice:'日出前留意东方低空的细月；天亮后勿向太阳附近寻月。',path:'M100 12 A88 88 0 0 0 100 188 A66.88 88 0 0 1 100 12 Z',date:'廿七',elongation:'319.5',waxing:'亏月'},
  full:{name:'满月',fraction:'100.0%',age:'14.8',altitude:'34.6°',azimuth:'108.2°',direction:'东南偏东',time:'20:10',visibility:'一轮亮面，银辉落进夜色。',title:'宜赏月与地景',advice:'试着用长焦把月亮与远处地景放在一起，记录满月夜景。',path:'M100 12 A88 88 0 1 1 100 188 A88 88 0 1 1 100 12 Z',date:'十五',elongation:'180.0',waxing:'望'},
  crescent:{name:'蛾眉月',fraction:'12.0%',age:'3.3',altitude:'12.8°',azimuth:'250.6°',direction:'西南偏西',time:'18:10',visibility:'一弯银钩，暗面留有微弱地照。',title:'宜与暮色同框',advice:'趁暮光还未散尽，将细月与地景同框，留意暗面的地照微光。',path:'M100 12 A88 88 0 0 1 100 188 A66.88 88 0 0 0 100 12 Z',date:'初四',elongation:'40.5',waxing:'盈月'},
  new:{name:'新月',fraction:'0.0%',age:'0.0',altitude:'45.1°',azimuth:'180.3°',direction:'南',time:'12:10',visibility:'亮面不可见；暗圆仅为月相示意。',title:'宜等候暗夜',advice:'入夜后月光干扰少，适合深空观测与银河拍摄；勿向太阳附近寻月。',path:'M100 12 Z',date:'初一',elongation:'0.0',waxing:'朔'},
  below:{name:'上弦月',fraction:'50.0%',age:'7.4',altitude:'−8.4°',azimuth:'287.0°',direction:'西北偏西',time:'23:10',visibility:'月相仍在，当前观测位置不可见。',title:'月已落，先看星空',advice:'月亮已在地平线下，当前无法观月。可先寻找暗夜星空中的目标。',path:'M100 12 A88 88 0 0 1 100 188 L100 12 Z',date:'初八',elongation:'90.0',waxing:'盈月'}
};
const stage = document.querySelector('#moon-phase');
const phase = document.querySelector('#moon-state');
const light = document.querySelector('#moon-light');
const motion = document.querySelector('#moon-motion');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const themes = ['day','dawn','dusk','night'];
let followTheme = true;
let motionRequested = true;
function text(id, value) { document.getElementById(id).textContent = value; }
function render() {
  const sample = presets[phase.value];
  stage.dataset.phase = phase.value;
  stage.dataset.light = light.value;
  stage.dataset.motion = String(motionRequested && !reduced.matches && !document.hidden);
  motion.setAttribute('aria-pressed', String(motionRequested));
  motion.textContent = reduced.matches ? '系统减弱动效' : motionRequested ? '动效 开' : '动效 关';
  text('moon-name', sample.name);
  text('moon-visibility', sample.visibility);
  text('moon-sample-time', `杭州 · 此刻样例 · 11 月 03 日 ${sample.time}`);
  text('moon-metadata', `农历${sample.date}（样例） · 日月距角 ${sample.elongation}° · ${sample.waxing}`);
  for (const key of ['fraction','age','altitude','azimuth','direction','advice']) text(`moon-${key}`, key === 'direction' ? `${sample[key]} · 正北为 0°` : sample[key]);
  text('moon-advice-title', sample.title);
  text('moon-alt-label', phase.value === 'below' ? '已入地平' : '地平线上');
  text('moon-status', `${phase.value === 'below' ? '地平线下 · ' : ''}${sample.name} · 非实时样例 · ${stage.dataset.motion === 'true' ? '仅月晕与星光缓慢呼吸' : '静态月相保留'}`);
  for (const id of ['moon-mask','moon-lit']) document.getElementById(id).setAttribute('d', sample.path);
  document.querySelector('#moon-diagram').setAttribute('aria-label', `${sample.name}月相示意，照亮面${sample.fraction}，非天空位置`);
  document.querySelector('#moon-figure').hidden = phase.value === 'below';
  document.querySelector('#moon-below').hidden = phase.value !== 'below';
}
function parentTheme() {
  if (!followTheme) return;
  const theme = document.documentElement.dataset.theme;
  light.value = themes.includes(theme) ? theme : 'day';
  render();
}
phase.addEventListener('change', render);
light.addEventListener('change', () => { followTheme = false; render(); });
motion.addEventListener('click', () => { motionRequested = !motionRequested; render(); });
reduced.addEventListener('change', render);
document.addEventListener('visibilitychange', render);
new MutationObserver(parentTheme).observe(document.documentElement, { attributes:true, attributeFilter:['data-theme'] });
document.querySelector('#moon-forecast').addEventListener('change', event => {
  text('moon-forecast-context', event.target.value === 'today' ? '77 · 值得追 · 日落 17:12 · 窗口 16:57–17:37' : '84 · 极佳 · 日落 17:10 · 窗口 16:55–17:35');
});
parentTheme();

}
});
