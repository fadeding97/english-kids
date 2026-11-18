/* 改版第二、三批：今天（每天 3 件事 + 打卡）、做任务、打卡完成与分享卡、计划（新版）、打印资料、成长会员（兑换码）、老人模式。
   这个文件在主脚本之前加载，只定义函数；用到的主脚本变量（ITEMS、stage、months、settings…）都在调用时才读取。 */

/* ---------- 本地存储 ---------- */
const pstore = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
};
const DAY = 864e5;
const midnight = (d = new Date()) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); };
const dkey = t => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const todayIso = () => dkey(midnight());
const WEEKDAY = ['日', '一', '二', '三', '四', '五', '六'];

/* ---------- 会员（兑换码） ----------
   兑换码格式：QMY-XXXX-CCCC（年卡）/ QMM-XXXX-CCCC（月卡）。CCCC 是校验位，用 scripts/make-codes.mjs 生成。
   校验在网页里完成，懂技术的人能破解；起步阶段只用来验证有没有人愿意买。 */
const CODE_ABC = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function codeCheck(s) {
  let h = 2166136261;
  for (const c of 'qmkids-2026|' + s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  let out = '';
  for (let i = 0; i < 4; i++) { out += CODE_ABC[h % CODE_ABC.length]; h = (Math.floor(h / CODE_ABC.length) ^ (h << 5)) >>> 0; }
  return out;
}
function parseCode(raw) {
  const c = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const m = c.match(/^QM([YM])([A-Z0-9]{4})([A-Z0-9]{4})$/);
  if (!m) return null;
  return codeCheck(m[1] + m[2]) === m[3] ? { type: m[1], code: `QM${m[1]}-${m[2]}-${m[3]}` } : null;
}
const vipInfo = () => pstore.get('vip', { until: '' });
const isVip = () => { const v = vipInfo(); return !!v.until && v.until >= todayIso(); };
function redeem(raw) {
  const r = parseCode(raw);
  if (!r) return '兑换码不正确，请检查后再试';
  const v = vipInfo();
  const base = isVip() ? new Date(v.until + 'T00:00:00').getTime() : midnight();
  const until = dkey(base + (r.type === 'Y' ? 365 : 31) * DAY);
  pstore.set('vip', { until, code: r.code });
  return '';
}

/* ---------- 每周计划 ---------- */
// 没有手写计划的月龄：按阶段自动生成 6 周通用安排
function genericWeeks(st) {
  const s = stageById(st);
  const pick = t => ITEMS.filter(i => i.s.includes(st) && i.t === t && media(i)).map(i => i.n);
  let songs = pick('song'), books = pick('book'), plays = pick('play');
  const videos = pick('video');
  if (!books.length) books = videos.length ? videos : songs;
  if (!plays.length) plays = videos.length ? videos : songs;
  const colors = ['#F7A541', '#FF8FA3', '#6AA8FF', '#5ED47F', '#A78BFA', '#4FD1E0'];
  return Array.from({ length: 6 }, (_, w) => ({
    theme: `${s.title}`, en: `Week ${w + 1}`, cover: (s.phrases[w % s.phrases.length] || 'Hello').split(/[ ?!.,]/)[0] + '!', color: colors[w % colors.length],
    words: [], focus: s.how[w % s.how.length],
    phrases: Array.from({ length: 7 }, (_, d) => [s.phrases[(w * 7 + d) % s.phrases.length], '日常生活中随时说']),
    song: rotate(songs, w), book: rotate(books, w), play: rotate(plays, w),
    tips: { song: '边听边跟着节奏拍手，不用要求宝宝开口。', book: '一边读一边指着画面，读慢一点。', play: '照着做，每天固定时间重复。' },
    generic: true,
  }));
}
const rotate = (a, n) => a.length ? a.slice(n % a.length).concat(a.slice(0, n % a.length)) : a;
/* 家里经常说英语或双语家庭：计划提前用下一个阶段的内容 */
const advanced = () => ['经常说', '双语家庭'].includes(profile.env);
function planStage() { const i = STAGES.findIndex(x => x.id === stage); return advanced() && STAGES[i + 1] ? STAGES[i + 1].id : stage; }
const weeksFor = st => (PLAN_WEEKS[st] && PLAN_WEEKS[st].length) ? PLAN_WEEKS[st] : genericWeeks(st);

// 计划从哪天开始：第一次打开（或换了月龄阶段）的那天
function planStart() {
  const ps = pstore.get('plan-start', {});
  const st = planStage();
  if (!ps[st]) { ps[st] = midnight(); pstore.set('plan-start', ps); }
  return ps[st];
}
function planPos() {
  const ws = weeksFor(planStage()), start = planStart();
  const diff = Math.max(0, Math.round((midnight() - start) / DAY));
  const w = Math.min(ws.length - 1, Math.floor(diff / 7));
  return { ws, w, d: diff % 7, dayN: diff + 1, weekStart: start + w * 7 * DAY };
}
const weekLocked = w => w >= PLAN_FREE_WEEKS && !isVip();

const SLOTS = [['song', '儿歌', 5], ['book', '绘本跟读', 3], ['play', '亲子游戏', 5]];
// 集名清理：去掉前面的编号（012. / 0A 1. / 第1季•第12集）和后面的说明（_ Nursery Rhymes、| …）
const cleanEp = t => {
  const s = String(t).replace(/Knees - Toes/i, 'Knees & Toes').replace(/^第\d+季•第\d+集/, '').replace(/^\s*(\d+[A-Z]?\s+)?\d+[.、]\s*/, '').replace(/^.*?Unit\d+\s*/, '').replace(/^\d+-\d+\s+/, '');
  const segs = s.split(/\s+[_|]\s+|\s+-\s+|\s+_\s*$/).map(x => x.split('(')[0].replace(/[-–\s,_]+$/, '').trim()).filter(Boolean);
  const brand = /^(little baby bum|the wiggles( nursery rhymes)?|mother goose club|super simple songs|english rhymes|nursery rhymes)$/i;
  return segs.find(x => !brand.test(x)) || segs[0] || t;
};
function todayTasks() {
  const pos = planPos();
  const locked = weekLocked(pos.w);
  const week = locked ? Object.assign(genericWeeks(planStage())[pos.w % 6], { theme: '自由练习', en: 'Free practice', locked: true }) : pos.ws[pos.w];
  const tasks = SLOTS.map(([t, label, min], k) => {
    const list = week[t] && week[t].length ? week[t] : [];
    let it = null, ep = null, epTitle = '';
    for (let j = 0; j < list.length && !it; j++) {
      const x = list[(pos.d + j) % list.length], n = typeof x === 'string' ? x : x.n;
      const cand = ITEMS.find(i => i.n === n && media(i));
      if (!cand) continue;
      if (typeof x !== 'string' && x.t) {   // 固定播放这一集（这周要学的词就在这首歌里）
        const eps = media(cand).episodes, i = eps.findIndex(e => e.title.toLowerCase().includes(x.t.toLowerCase()));
        if (i < 0) continue;
        ep = i; epTitle = cleanEp(eps[i].title);
      }
      it = cand;
    }
    if (!it) it = ITEMS.find(i => i.s.includes(planStage()) && media(i) && (i.t === t || i.t === 'song')) || ITEMS.find(i => media(i));
    return { k, t, label, min, it, ep, name: epTitle || it.cn, from: epTitle ? it.cn : '', tip: (week.tips && week.tips[t]) || '' };
  });
  return Object.assign({}, pos, { week, locked, tasks });
}

/* ---------- 打卡 ---------- */
const checks = () => pstore.get('checks', {});
const doneToday = () => checks()[todayIso()] || [];
function markDone(k) {
  const c = checks(), d = c[todayIso()] || [];
  if (!d.includes(k)) d.push(k);
  c[todayIso()] = d; pstore.set('checks', c);
  return d.length >= 3;
}
const dayDone = t => (checks()[dkey(t)] || []).length >= 3;
function streak() {
  let n = 0, t = midnight();
  if (!dayDone(t)) t -= DAY;
  while (dayDone(t)) { n++; t -= DAY; }
  return n;
}
// 每天听英语的分钟数（播放器计时，主脚本每 5 秒写一次）
const useHist = () => pstore.get('use-hist', {});
function logUse(sec) { const h = useHist(); h[todayIso()] = sec; pstore.set('use-hist', h); }
function weekStats(pos) {
  const h = useHist(); let sec = 0, days = 0;
  for (let i = 0; i < 7; i++) { const t = pos.weekStart + i * DAY; sec += h[dkey(t)] || 0; if (dayDone(t)) days++; }
  return { min: Math.round(sec / 60), days };
}

/* ---------- 今天（新首页） ---------- */
function todayView() {
  const T = todayTasks(), done = doneToday(), left = 3 - done.length;
  const s = stageById(stage);
  const ph = T.week.phrases[T.d % T.week.phrases.length] || ['Hello!', ''];
  const now = new Date(), st = streak(), ws = weekStats(T);
  const recent = Object.entries(progress).map(([n, p]) => ({ it: ITEMS.find(i => i.n === n), p }))
    .filter(x => x.it && media(x.it)).sort((a, b) => b.p.at - a.p.at).slice(0, 8);
  return `<header class="page-h td-h"><div><p class="td-date">${now.getMonth() + 1}月${now.getDate()}日 星期${WEEKDAY[now.getDay()]}</p><h1>今天</h1></div>
      <button class="gear h-search m-only" type="button" data-ch="search" aria-label="搜索">${ic('i-search')}</button></header>
    <section class="td-card">
      <div class="td-top">
        <div><span class="td-sub">今日启蒙 · 第 ${T.dayN} 天</span><b class="td-title">${left ? `还差 ${left} 件事` : '今天都完成啦'}</b></div>
        ${st ? `<span class="td-streak">${ic('i-flame')}连续 ${st} 天</span>` : ''}
      </div>
      <div class="td-bar"><i style="width:${Math.round(done.length / 3 * 100)}%"></i></div>
      <div class="td-tasks">${T.tasks.map(x => {
        const ok = done.includes(x.k);
        return `<button class="td-task${ok ? ' ok' : ''}" type="button" data-task="${x.k}">
          <span class="td-thumb">${art(x.it, '', 120)}</span>
          <span class="td-txt"><small>${'①②③'[x.k]} ${x.label} · ${x.min} 分钟${x.from ? ' · ' + esc(x.from) : ''}</small><b>${esc(x.name)}</b></span>
          <span class="td-state" aria-label="${ok ? '已完成' : '开始'}">${ok ? ic('i-check') : ic('i-play')}</span></button>`;
      }).join('')}</div>
      ${T.locked ? `<button class="td-lock" type="button" data-go-vip="1">第 ${PLAN_FREE_WEEKS + 1} 周起的主题计划是会员内容，现在是自由练习 · 了解会员 ›</button>` : ''}
    </section>
    <section class="td-phrase"><span class="td-tag">今天一句</span><div><b>${esc(ph[0])}</b><span>${esc(ph[1])}</span></div></section>
    <section class="sec">
      <div class="td-sechead"><h2 class="sec-h">本周计划 · 第 ${T.w + 1} 周</h2><button type="button" data-ch="plan">全部计划</button></div>
      <button class="td-week" type="button" data-ch="plan"><span><b>主题：${esc(T.week.theme)}</b><small>${esc(T.week.en)}</small></span><em>${ws.days} / 7 天</em></button>
    </section>
    ${recent.length ? `<section class="sec">${head('继续观看', { mode: 'me' })}${pagers('recent')}<div class="row sq" id="row-recent">${recent.map(({ it, p }) => {
      const m = media(it), e = m.episodes[p.ep] || m.episodes[0];
      const pct = e.duration ? Math.min(100, Math.round(p.t / e.duration * 100)) : 0;
      return `<button class="tile" type="button" data-id="${it.id}">${art(it, `<span class="a-progress"><i style="width:${pct}%"></i></span>${play}`)}
        <span class="t-name">${esc(it.cn)}</span><span class="t-sub">${m.episodes.length > 1 ? `看到第 ${p.ep + 1} 集` : '看到 ' + fmtDur(p.t)}</span></button>`;
    }).join('')}</div></section>` : ''}`;
}

/* ---------- 做任务：在详情页上方加任务说明，下方加「完成」 ---------- */
function taskPanel(it) {
  if (view.task == null) return '';
  const T = todayTasks(), x = T.tasks[view.task];
  if (!x || x.it.id !== it.id) return '';
  const ok = doneToday().includes(x.k), last = doneToday().filter(k => k !== x.k).length >= 2;
  return `<section class="tk">
      <div class="tk-head"><span>任务 ${x.k + 1} / 3 · ${x.label}${x.from ? '：' + esc(x.name) : ''}</span>${ok ? '<em>已完成</em>' : ''}</div>
      ${x.tip ? `<div class="tk-tip"><b>家长怎么陪</b><span>${esc(x.tip)}</span></div>` : ''}
      ${T.week.words && T.week.words.length ? `<div class="tk-words"><b>这周会听到的词</b><div>${T.week.words.map(w => `<span>${esc(w)}</span>`).join('')}</div></div>` : ''}
      <button class="btn btn-accent tk-done" type="button" data-task-done="${x.k}">${last ? '完成，今天打卡' : '完成，下一件事'}</button>
    </section>`;
}
function finishTask(k) {
  const all = markDone(k);
  if (all) { navStack = []; return go({ mode: 'done' }, { dir: 'fwd' }); }
  const next = [0, 1, 2].find(i => !doneToday().includes(i));
  const T = todayTasks();
  navStack = [{ view: { mode: 'home' }, y: 0, rows: {} }];
  go({ mode: 'detail', value: T.tasks[next].it.id, task: next, ep: T.tasks[next].ep }, { dir: 'fwd' });
}
function openTask(k) {
  const T = todayTasks(), x = T.tasks[k];
  if (!x) return;
  go({ mode: 'detail', value: x.it.id, task: k, ep: x.ep }, { push: true, dir: 'fwd' });
}

/* ---------- 打卡完成 + 分享卡 ---------- */
function doneView() {
  const T = todayTasks(), st = streak(), sec = (useHist()[todayIso()] || 0);
  const words = (T.week.words || []).slice(0, 4);
  return `<div class="dn">
    <span class="dn-ok">${ic('i-check')}</span>
    <h1>今天的 3 件事都完成啦</h1>
    <p>已连续打卡 ${st} 天</p>
    <div class="dn-card" id="shareCard">
      <div class="dn-row"><b>${esc(profile.name || '宝宝')}的英语时间</b><span>第 ${T.dayN} 天</span></div>
      <div class="dn-stats"><div><b>${Math.max(1, Math.round(sec / 60))}</b><span>今天（分钟）</span></div><div><b>${st}</b><span>连续打卡</span></div><div><b>${T.w + 1}</b><span>计划第几周</span></div></div>
      <p class="dn-words">本周主题：${esc(T.week.theme)}${words.length ? ' · ' + words.map(esc).join(' · ') : ''}</p>
      <div class="dn-foot"><b>英语启蒙地图</b><span>fadeding97.github.io/english-kids</span></div>
    </div>
    <div class="dn-acts">
      <button class="btn btn-accent" type="button" data-share="1">保存图片，分享给朋友</button>
      <button class="btn btn-gray" type="button" data-ch="home">回到今天</button>
    </div>
  </div>`;
}
// 把分享卡画成图片：能用系统分享就分享，否则弹出图片让用户长按保存
async function shareCard() {
  const T = todayTasks(), st = streak(), sec = (useHist()[todayIso()] || 0);
  const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'), F = '"PingFang SC","Microsoft YaHei",sans-serif';
  const rr = (x, y, w, h, r, fill) => { g.beginPath(); g.roundRect(x, y, w, h, r); g.fillStyle = fill; g.fill(); };
  rr(0, 0, W, H, 0, '#FFFFFF');
  rr(60, 60, W - 120, H - 120, 56, '#FFF6E5');
  g.fillStyle = '#4A3200'; g.font = `800 64px ${F}`; g.fillText(`${profile.name || '宝宝'}的英语时间`, 120, 210);
  g.fillStyle = '#8A4B00'; g.font = `700 40px ${F}`; g.fillText(`第 ${T.dayN} 天 · 连续打卡 ${st} 天`, 120, 280);
  const stats = [[Math.max(1, Math.round(sec / 60)), '今天（分钟）'], [st, '连续打卡'], [T.w + 1, '计划第几周']];
  stats.forEach(([v, l], i) => { const x = 120 + i * 290; rr(x, 350, 260, 240, 32, '#FFFFFF'); g.fillStyle = '#1D1D1F'; g.font = `800 96px ${F}`; g.textAlign = 'center'; g.fillText(String(v), x + 130, 480); g.fillStyle = '#6E6E73'; g.font = `500 32px ${F}`; g.fillText(l, x + 130, 545); g.textAlign = 'left'; });
  g.fillStyle = '#4A3200'; g.font = `700 44px ${F}`; g.fillText(`本周主题：${T.week.theme}`, 120, 700);
  g.font = `500 40px ${F}`; g.fillStyle = '#6E5A2E'; g.fillText((T.week.words || []).slice(0, 5).join(' · '), 120, 770);
  const ph = T.week.phrases[T.d % T.week.phrases.length] || ['', ''];
  rr(120, 840, W - 240, 220, 32, '#FFFFFF'); g.fillStyle = '#6E6E73'; g.font = `600 32px ${F}`; g.fillText('今天一句', 160, 905);
  g.fillStyle = '#1D1D1F'; g.font = `800 60px ${F}`; g.fillText(ph[0], 160, 990);
  g.strokeStyle = '#E8CF9E'; g.setLineDash([12, 12]); g.lineWidth = 3; g.beginPath(); g.moveTo(120, 1130); g.lineTo(W - 120, 1130); g.stroke(); g.setLineDash([]);
  g.fillStyle = '#4A3200'; g.font = `800 40px ${F}`; g.fillText('英语启蒙地图', 120, 1205);
  g.fillStyle = '#6E5A2E'; g.font = `500 32px ${F}`; g.fillText('fadeding97.github.io/english-kids', 120, 1255);
  const blob = await new Promise(r => c.toBlob(r, 'image/png'));
  const file = new File([blob], 'english-time.png', { type: 'image/png' });
  try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: '宝宝的英语时间' }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
  const url = URL.createObjectURL(blob);
  openSheet(`<div class="settings"><div class="set-head"><h3>长按图片保存</h3><button class="btn btn-gray sm" type="button" data-close-share="1">完成</button></div>
    <img class="share-img" src="${url}" alt="宝宝的英语时间分享卡">
    <a class="btn btn-gray share-dl" href="${url}" download="english-time.png">下载图片</a></div>`)
    .querySelector('[data-close-share]').addEventListener('click', () => closeSheet(true));
}

/* ---------- 计划（新版） ---------- */
function planView2() {
  const T = todayTasks(), pos = planPos(), ws = pos.ws, stt = weekStats(pos), s = stageById(stage);
  const pct = Math.min(100, months / 72 * 100), vip = isVip(), wk = ws[pos.w];
  const dots = Array.from({ length: 7 }, (_, i) => {
    const t = pos.weekStart + i * DAY, isToday = t === midnight(), ok = dayDone(t);
    const lab = isToday ? '今天' : WEEKDAY[new Date(t).getDay()];
    return `<div class="pw-day${isToday ? ' now' : ''}"><span>${lab}</span><i class="${ok ? 'ok' : isToday ? 'cur' : ''}">${ok ? ic('i-check') : isToday ? `${doneToday().length}/3` : ''}</i></div>`;
  }).join('');
  const covers = ws.map((w, i) => ({ w, i })).filter(x => x.i > pos.w).slice(0, 8).map(({ w, i }) => {
    const lk = weekLocked(i);
    return `<button class="pc${lk ? ' lk' : ''}" type="button" ${lk ? 'data-go-vip="1"' : 'data-ch="plan"'}>
      <span class="pc-cv" style="background:${w.color}"><em aria-hidden="true">${esc(w.cover)}</em>${lk ? `<span class="pc-lock">${ic('i-lock')}会员</span>` : ''}</span>
      <small>第 ${i + 1} 周</small><b>${esc(w.theme)}</b></button>`;
  }).join('');
  return `${pageHead('计划', '按月龄的英语启蒙路线')}
  <div class="plan-age">
    <div class="pa-bar"><i style="width:${pct}%"></i><b style="left:${pct}%"></b></div>
    <div class="pa-ticks"><span>0 岁</span><span>2 岁</span><span>4 岁</span><span>6 岁</span></div>
    <p><b>宝宝 ${fmtAge(months)}</b> · ${s.age}：${esc(s.title)} <button type="button" data-guide="1">本阶段怎么做 ›</button></p>
    ${advanced() && planStage() !== stage ? `<p class="pl-adv">英语环境是「${esc(profile.env)}」，计划提前用 ${stageById(planStage()).age} 的内容。可在「我的 → 英语环境」修改。</p>` : ''}
  </div>
  <section class="pw">
    <div class="pw-top"><b>本周已打卡 ${stt.days} 天</b><span>听了 ${stt.min} 分钟${wk.words && wk.words.length ? ` · ${wk.words.length} 个新词` : ''}</span></div>
    <div class="pw-days">${dots}</div>
  </section>
  <section class="sec"><h2 class="sec-h">本周主题</h2>
    <div class="pt">
      <div class="pt-cv" style="background:${wk.color}"><em aria-hidden="true">${esc(wk.cover)}</em><div><small>第 ${pos.w + 1} 周</small><b>${esc(wk.theme)}</b></div></div>
      <div class="pt-body">
        ${wk.words && wk.words.length ? `<div class="pt-words">${wk.words.map(w => `<span>${esc(w)}</span>`).join('')}</div>` : ''}
        <p>家长重点：${esc(wk.focus)}</p>
        <button type="button" data-ch="home">查看今天的 3 件事 ›</button>
      </div>
    </div>
  </section>
  ${covers ? `<section class="sec"><div class="td-sechead"><h2 class="sec-h">接下来</h2><span class="pc-count">共 ${ws.length} 周${ws[0].generic ? ' · 通用安排' : ''}</span></div><div class="pcs">${covers}</div></section>` : ''}
  <button class="pl-lib" type="button" data-ch="lib"><span>${ic('i-download')}</span><div><b>打印资料</b><small>单词卡、亲子游戏卡、家长指南</small></div><em>›</em></button>
  ${vip ? `<p class="pl-vip">已是成长会员，全部 ${ws.length} 周计划已解锁（到 ${vipInfo().until}）</p>`
    : `<button class="pl-unlock" type="button" data-go-vip="1"><b>解锁全部 ${ws.length} 周计划</b><small>前 ${PLAN_FREE_WEEKS} 周免费体验</small></button>`}`;
}
function openGuide() {
  const s = stageById(stage);
  openSheet(`<div class="settings"><div class="set-head"><h3>本阶段怎么做</h3><button class="btn btn-gray sm" type="button" data-close-guide="1">完成</button></div>
    <div class="guide guide-sheet"><div><h3>${esc(s.title)}</h3><p class="goal">${esc(s.goal)}</p><p class="screen">${ic('i-clock')}<span>${esc(s.screen)}</span></p></div>
    <div><div class="steps">${s.how.map((h, i) => `<div class="step"><em>${i + 1}</em><span>${esc(h)}</span></div>`).join('')}</div>
    <div class="phr">${s.phrases.map(p => `<span>${esc(p)}</span>`).join('')}</div></div></div></div>`)
    .querySelector('[data-close-guide]').addEventListener('click', () => closeSheet(true));
}

/* ---------- 打印资料 ---------- */
const LIB = [
  { kind: 'card', title: '身体部位单词卡', sub: '12 张', cover: 'Head', bg: '#FDE8EC', fg: '#B8203F', free: true, href: 'print/body-cards.html' },
  { kind: 'guide', title: '睡前英语 10 句', sub: '家长指南', cover: 'Night night', bg: '#FFF1DD', fg: '#8A4B00', free: true, href: 'print/bedtime-10.html' },
  { kind: 'card', title: '动物叫声单词卡', sub: '12 张', cover: 'Moo!', bg: '#E8F0FD', fg: '#2952B3', free: false, href: 'print/animal-cards.html' },
  { kind: 'game', title: '亲子英语游戏卡', sub: '12 张', cover: 'Play!', bg: '#E3F5E8', fg: '#1E7A3E', free: false, href: 'print/play-cards.html' },
];
function libView() {
  const f = view.value || 'all', vip = isVip();
  const kinds = [['all', '全部'], ['card', '单词卡'], ['game', '游戏卡'], ['guide', '家长指南']];
  const list = LIB.filter(x => f === 'all' || x.kind === f);
  return `${pageHead('打印资料', '打印出来，离开屏幕也能玩')}
  <div class="rseg" role="radiogroup" aria-label="资料类型">${kinds.map(([k, l]) => `<button type="button" role="radio" aria-checked="${k === f}" data-lib="${k}">${l}</button>`).join('')}</div>
  <div class="lib">${list.map(x => {
    const open = x.free || vip;
    return `<${open ? `a href="${x.href}" target="_blank" rel="noopener"` : 'button type="button" data-go-vip="1"'} class="lb">
      <span class="lb-cv" style="background:${x.bg};color:${x.fg}">${esc(x.cover)}</span>
      <b>${esc(x.title)} · ${esc(x.sub)}</b>
      <small class="${open ? 'ok' : ''}">${x.free ? '免费下载' : vip ? '会员 · 已解锁' : '会员'}</small></${open ? 'a' : 'button'}>`;
  }).join('')}</div>
  ${vip ? '' : `<button class="pl-unlock" type="button" data-go-vip="1"><b>会员可下载全部资料</b><small>单词卡、游戏卡、家长指南</small></button>`}`;
}

/* ---------- 成长会员 ---------- */
function vipView() {
  const v = vipInfo(), on = isVip();
  const perks = [['i-cal', '全部每周计划', '每天 3 件事，跟着月龄自动更新'], ['i-download', '全部打印资料', '单词卡、亲子游戏卡、家长指南'], ['i-star', '后续新功能', '每周成长报告等，开通后自动解锁']];
  return `${pageHead('成长会员', '视频永远免费。会员解锁的是计划和资料。')}
  <div class="vp">
    ${on ? `<div class="vp-on">${ic('i-check')}<div><b>已开通成长会员</b><span>有效期到 ${v.until}</span></div></div>` : ''}
    <div class="vp-perks">${perks.map(([i, t, d]) => `<div><span>${ic(i)}</span><p><b>${t}</b><small>${d}</small></p></div>`).join('')}</div>
    <div class="vp-prices"><div class="rec"><em>推荐</em><span>年卡</span><b>¥68</b></div><div><span>月卡</span><b>¥9.9</b></div></div>
    <p class="vp-how">怎么开通：向我购买兑换码，在下面输入即可。[你的联系方式，待填写]</p>
    <div class="vp-code">
      <label for="vipCode">输入兑换码</label>
      <div><input id="vipCode" type="text" autocomplete="off" autocapitalize="characters" placeholder="QMY-XXXX-XXXX"><button class="btn btn-accent" type="button" data-redeem="1">兑换</button></div>
      <p class="vp-err" id="vipErr" role="alert"></p>
    </div>
    <p class="vp-note">不自动续费 · 兑换码只保存在这台设备上</p>
  </div>`;
}

/* ---------- 老人模式 ---------- */
function elderView() {
  const T = todayTasks(), done = doneToday();
  const next = [0, 1, 2].find(i => !done.includes(i));
  const min = Math.round(((useHist()[todayIso()]) || 0) / 60), lim = settings.limit || 0;
  return `<div class="el">
    <div class="el-h"><h1>宝宝的英语时间</h1><button type="button" data-elder-exit="1">${ic('i-lock')}家长</button></div>
    <button class="el-go" type="button" data-task="${next == null ? 0 : next}">
      <span>${ic('i-play')}</span><b>${next == null ? '今天都完成啦，再听一遍' : '开始今天的英语'}</b><small>按一下就放，做完一件接下一件</small></button>
    <div class="el-two">
      <button type="button" data-task="0">${ic('i-music')}<b>听儿歌</b></button>
      <button type="button" data-task="1">${ic('i-book')}<b>听绘本</b></button>
    </div>
    <div class="el-prog"><div><b>今天已听 ${min} 分钟</b>${lim ? `<span>共 ${lim} 分钟</span>` : ''}</div>
      <i><em style="width:${lim ? Math.min(100, min / lim * 100) : Math.min(100, done.length / 3 * 100)}%"></em></i></div>
    <p class="el-note">内容是爸爸妈妈提前设好的${lim ? '，到时间会自动停' : ''}</p>
  </div>`;
}
async function exitElder() {
  if (!(await askPin('输入家长密码', '退出老人模式'))) return;
  settings.elder = false; saveJSON('settings', settings);
  toast('已退出老人模式'); navStack = []; go({ mode: 'me' });
}

/* ---------- 点击 ---------- */
document.addEventListener('click', async e => {
  const t = e.target.closest('button'); if (!t) return;
  if (t.dataset.task != null) return openTask(Number(t.dataset.task));
  if (t.dataset.taskDone != null) return finishTask(Number(t.dataset.taskDone));
  if (t.dataset.share) return shareCard();
  if (t.dataset.goVip) { navStack = []; return go({ mode: 'vip' }); }
  if (t.dataset.guide) return openGuide();
  if (t.dataset.lib) { view = { mode: 'lib', value: t.dataset.lib }; return render(); }
  if (t.dataset.elderExit) return exitElder();
  if (t.dataset.elderToggle) {
    settings.elder = !settings.elder; saveJSON('settings', settings);
    if (settings.elder) { toast('已进入老人模式'); navStack = []; return go({ mode: 'home' }); }
    return render();
  }
  if (t.dataset.redeem) {
    const err = redeem(document.getElementById('vipCode').value);
    if (err) { document.getElementById('vipErr').textContent = err; return; }
    toast('兑换成功，成长会员已开通'); return render();
  }
});
