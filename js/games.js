/* 单词小游戏：用每周主题的单词，图片是系统自带的彩色表情，读音用浏览器自带的英文朗读（不联网、无版权问题）。
   点一点听：点卡片读单词（动物再学叫声）；找一找：啾啾问一个词，三选一。
   依赖主脚本里的全局：view、go、render、esc、ic、toast；依赖 plan-app.js：todayTasks、chick。 */

// 单词 → [表情, 叫声/补充, 是不是“东西”（找一找时问 Where is the …?）]
const WORD_PIC = {
  hello: ['👋', '', 0], 'bye-bye': ['🙋', '', 0], mommy: ['👩', '', 1], daddy: ['👨', '', 1], baby: ['👶', '', 1], 'good night': ['🌙', '', 0],
  head: ['🙆', '', 1], nose: ['👃', '', 1], eyes: ['👀', '', 1], mouth: ['👄', '', 1], toes: ['🦶', '', 1], hands: ['👐', '', 1],
  dog: ['🐶', 'woof woof!', 1], cat: ['🐱', 'meow meow!', 1], duck: ['🦆', 'quack quack!', 1], cow: ['🐮', 'moo!', 1], bear: ['🐻', 'grr!', 1], bird: ['🐦', 'tweet tweet!', 1],
  pig: ['🐷', 'oink oink!', 1], sheep: ['🐑', 'baa baa!', 1],
  eat: ['🍽️', 'yum yum!', 0], milk: ['🥛', '', 1], water: ['💧', '', 1], apple: ['🍎', '', 1], banana: ['🍌', '', 1], 'all done': ['🙌', '', 0],
  bath: ['🛁', '', 1], bubbles: ['🧼', '', 1], bed: ['🛏️', '', 1], 'night night': ['😴', '', 0],
  red: ['🔴', '', 0], blue: ['🔵', '', 0], yellow: ['🟡', '', 0], green: ['🟢', '', 0], ball: ['⚽', '', 1], color: ['🎨', '', 0],
  one: ['1️⃣', '', 0], two: ['2️⃣', '', 0], three: ['3️⃣', '', 0], more: ['➕', '', 0], shoes: ['👟', '', 1],
  car: ['🚗', 'beep beep!', 1], bus: ['🚌', '', 1], go: ['🏃', '', 0], stop: ['🛑', '', 0], tree: ['🌳', '', 1], sun: ['☀️', '', 1],
};
const GAME_FALLBACK = ['dog', 'cat', 'duck', 'cow', 'pig', 'sheep'];
// 卡通图：Twemoji（CC-BY 4.0）文件放在 img/tw/，用 scripts/get-twemoji.mjs 下载；所有手机画风一致
const twCode = e => { const cps = [...e].map(c => c.codePointAt(0).toString(16)); return (cps.includes('200d') ? cps : cps.filter(c => c !== 'fe0f')).join('-'); };
// 人物类单词（妈妈、爸爸、宝宝、你好、再见、晚安）用原创的「啾啾一家」（js/chick-family.js），其余用 Twemoji
const pic = (w, cls = '') => { if (typeof CHICK_ART !== "undefined" && CHICK_ART[w]) return `<span class="tw cf ${cls}">${CHICK_ART[w]}</span>`; const e = (WORD_PIC[w] || ['⭐'])[0]; return `<img class="tw ${cls}" src="img/tw/${twCode(e)}.svg" alt="" draggable="false" onerror="this.replaceWith(document.createTextNode('${e}'))">`; };
// 贴纸卡的马卡龙色：[底色, 标签色]
const GPAL = [['#FFE1E6', '#F27A93'], ['#FFF1C2', '#E0A100'], ['#D9F1FF', '#3FA7D6'], ['#DDF6D8', '#4CB860'], ['#EBDDFF', '#9B6FE8'], ['#FFE4CC', '#F08A3C']];
const gpal = w => GPAL[Object.keys(WORD_PIC).indexOf(w) % GPAL.length];
// 这周能玩的词：本周单词里有图的；不够 3 个就用动物
function gameWords() {
  let T = null; try { T = todayTasks(); } catch (e) {}
  const ws = ((T && T.week.words) || []).filter(w => WORD_PIC[w]);
  // 本周的录音提前下载好（只下载一次），点卡片时马上出声
  const list = ws.length >= 3 ? ws.slice(0, 6) : GAME_FALLBACK;
  setTimeout(() => preloadVoices(gameLines(list)), 400);
  return { theme: ws.length >= 3 ? `第 ${T.w + 1} 周 · ${T.week.theme}` : '小动物', words: ws.length >= 3 ? ws.slice(0, 6) : GAME_FALLBACK };
}

/* 啾啾的声音：优先播提前录好的真人感语音（Azure 神经语音 Maisie，慢一点、音调高 10%，scripts/make-voices.mjs 生成，放在 audio/）。
   一次可以连着播几句；某句没有录音时，退回手机自带朗读。用同一个 <audio> 元素连续播放，苹果手机点一下后就能接着播。 */
const audioName = t => t.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');
const VOICE = new Audio();
VOICE.preload = 'auto';
let voiceQueue = [];
/* 为了点下去马上出声：进游戏就把本周要用的录音全部下载并解码好（Web Audio），播放时跳过开头的静音。
   苹果手机上 Web Audio 默认跟随静音键，设成 playback 让它和视频一样出声。 */
const AC = window.AudioContext || window.webkitAudioContext;
let actx = null, curSrc = null;
const BUF = new Map();   // 文件名 → { buf, start }
try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) {}
function getCtx() { if (!actx && AC) { try { actx = new AC(); } catch (e) {} } return actx; }
function preloadVoices(lines) {
  const c = getCtx(); if (!c) return;
  for (const t of lines) {
    const n = audioName(t); if (BUF.has(n)) continue;
    BUF.set(n, null);
    fetch(`audio/${n}.mp3`).then(r => r.ok ? r.arrayBuffer() : Promise.reject()).then(a => new Promise((ok, no) => c.decodeAudioData(a, ok, no)))
      .then(buf => {
        // 找到第一个有声音的位置，往前留 0.02 秒
        const d = buf.getChannelData(0); let i = 0; while (i < d.length && Math.abs(d[i]) < .01) i++;
        BUF.set(n, { buf, start: Math.max(0, i / buf.sampleRate - .02) });
      }).catch(() => BUF.delete(n));
  }
}
// 游戏会说的话：单词（带叫声）、问句、答错提示、夸奖
function gameLines(words) {
  const out = ['Great!'];
  for (const w of words) { const x = WORD_PIC[w] || []; out.push(x[1] ? `${w}! ${x[1]}` : `${w}!`, askText(w), `That's ${w}.`); }
  return out;
}
function stopVoice() {
  voiceQueue = [];
  try { if (curSrc) { curSrc.onended = null; curSrc.stop(); } } catch (e) {}
  curSrc = null; VOICE.pause();
}
function say(lines) {
  stopVoice();
  voiceQueue = (Array.isArray(lines) ? lines : [lines]).filter(Boolean);
  try { speechSynthesis.cancel(); } catch (e) {}
  const c = getCtx(); if (c && c.state !== 'running') c.resume().catch(() => {});   // 必须在点击里解锁
  playNext();
}
function playNext() {
  const t = voiceQueue.shift(); if (!t) return;
  const hit = BUF.get(audioName(t)), c = actx;
  if (hit && c) {
    try {
      const s = c.createBufferSource(); s.buffer = hit.buf; s.connect(c.destination);
      s.onended = () => { if (curSrc === s) { curSrc = null; playNext(); } };
      curSrc = s; s.start(0, hit.start); return;
    } catch (e) {}
  }
  // 还没下载好：用 <audio> 边下边播
  VOICE.onended = playNext;
  VOICE.onerror = () => { VOICE.onerror = null; speakTTS([t, ...voiceQueue].join(' ')); voiceQueue = []; };
  VOICE.src = `audio/${audioName(t)}.mp3`;
  const p = VOICE.play(); if (p && p.catch) p.catch(() => {});
}
function speak(text) { return say(text); }
function speakTTS(text) {
  try {
    const s = window.speechSynthesis; if (!s) { toast('这个浏览器不支持朗读'); return; }
    s.cancel();
    const u = new SpeechSynthesisUtterance(text);
    // 啾啾的声音：音调调高、语速放慢，优先用女声（系统语音做不出真正的童声，这样最接近）
    u.lang = 'en-US'; u.rate = .82; u.pitch = 1.7;
    const vs = s.getVoices().filter(x => /^en/i.test(x.lang)), us = vs.filter(x => /^en(-|_)US/i.test(x.lang));
    const female = /samantha|karen|moira|tessa|victoria|allison|ava|susan|zira|aria|jenny|female|google us english/i;
    const v = us.find(x => female.test(x.name)) || vs.find(x => female.test(x.name)) || us[0] || vs[0];
    if (v) u.voice = v;
    s.speak(u);
  } catch (e) {}
}
if (window.speechSynthesis) speechSynthesis.getVoices();   // 先加载语音列表

const G = { round: 0, order: [], opts: [], picked: null, wrong: [] };
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
function newFind() {
  const { words } = gameWords();
  G.order = shuffle(words); G.round = 0; nextRound();
}
function nextRound() {
  const { words } = gameWords(), w = G.order[G.round];
  G.opts = shuffle([w, ...shuffle(words.filter(x => x !== w)).slice(0, 2)]);
  G.picked = null; G.wrong = [];
}
const askText = w => WORD_PIC[w][2] ? `Where is the ${w}?` : `Find ${w}!`;

function gameView() {
  const kind = view.value === 'find' ? 'find' : 'listen', { theme, words } = gameWords();
  const seg = `<div class="gm-seg">${[['listen', '点一点听'], ['find', '找一找']].map(([k, l]) => `<button type="button" data-game="${k}" aria-pressed="${k === kind}">${l}</button>`).join('')}</div>`;
  const top = `<div class="gm-top"><button class="gm-x" type="button" data-gback="1" aria-label="返回">${ic('i-x')}</button>${seg}<span></span></div>`;
  if (kind === 'listen') {
    return `<div class="gm gm-listen">${top}
      <div class="gm-say">${chick()}<p>${esc(theme)}<br><b>点一张卡，听啾啾读 🔊</b></p></div>
      <div class="gm-cards">${words.map((w, i) => { const [bg, deep] = gpal(w);
        return `<button class="gm-card" type="button" data-say="${esc(w)}" style="--bg:${bg};--deep:${deep};--rot:${[-2, 1.5, -1, 2, -1.5, 1][i % 6]}deg">
          <span class="gm-spark" aria-hidden="true">⭐</span><span class="gm-circle">${pic(w)}</span><b${w.length > 7 ? ' class="long"' : ''}>${esc(w)}</b>${WORD_PIC[w][1] ? `<small>🔊 ${esc(WORD_PIC[w][1])}</small>` : ''}</button>`; }).join('')}</div>
      <p class="gm-tip"><b>家长：</b>读完和宝宝一起学一学，再指着家里的东西说一遍。</p></div>`;
  }
  if (!G.order.length || G.order.some(w => !words.includes(w))) newFind();
  const w = G.order[G.round], ok = G.picked === w, last = G.round >= G.order.length - 1;
  return `<div class="gm gm-find">${top}
    <div class="gm-prog">${G.order.map((_, i) => `<i class="${i < G.round || (i === G.round && ok) ? 'on' : i === G.round ? 'cur' : ''}"></i>`).join('')}</div>
    <div class="gm-ask">${chick(ok ? 'cheer' : 'hi')}
      <button class="gm-q" type="button" data-say-q="1"><b>${WORD_PIC[w][2] ? `Where is the <em>${esc(w)}</em>?` : `Find <em>${esc(w)}</em>!`}</b><span>🔊</span></button></div>
    <div class="gm-opts">${G.opts.map((x, i) => { const [bg, deep] = gpal(x);
      return `<button class="gm-opt${ok ? (x === w ? ' right' : ' dim') : G.wrong.includes(x) ? ' wrong' : ''}" type="button" data-pick="${esc(x)}" style="--bg:${bg};--deep:${deep};--rot:${[-2, 1.5, -1][i]}deg"${ok ? ' disabled' : ''}>
        ${ok && x === w ? '<span class="gm-ok" aria-hidden="true">✓</span><span class="gm-spark" aria-hidden="true">⭐</span>' : ''}<span class="gm-circle">${pic(x)}</span>${ok && x === w ? `<b>${esc(x)}</b>` : ''}</button>`; }).join('')}</div>
    <p class="gm-res">${ok ? `⭐ 答对啦！${esc(WORD_PIC[w][1] || w + '!')} ⭐` : G.wrong.length ? '再听一遍，找找看～' : '点一张图片'}</p>
    ${ok ? `<button class="gm-next" type="button" data-gnext="1">${last ? '再玩一次' : '下一个 ›'}</button>` : ''}
    <p class="gm-tip">点错了也没关系，啾啾会再读一遍</p></div>`;
}

document.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.gback) { try { speechSynthesis.cancel(); stopVoice(); } catch (x) {} const en = navStack.pop(); return go(en ? en.view : { mode: 'home' }, { dir: 'back' }); }
  if (b.dataset.game && view.mode === 'game') { if (b.dataset.game === 'find') newFind(); view = { mode: 'game', value: b.dataset.game }; render(); if (b.dataset.game === 'find') speak(askText(G.order[0])); return; }
  if (b.dataset.goGame) { if (b.dataset.goGame === 'find') { newFind(); say(askText(G.order[0])); } go({ mode: 'game', value: b.dataset.goGame }, { push: true, dir: 'fwd' }); return; }
  if (b.dataset.say) {
    const w = b.dataset.say, x = WORD_PIC[w] || [];
    say(x[1] ? `${w}! ${x[1]}` : `${w}!`);
    b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
    return;
  }
  if (b.dataset.sayQ) return speak(askText(G.order[G.round]));
  if (b.dataset.pick) {
    const w = G.order[G.round], x = b.dataset.pick;
    if (x === w) { G.picked = w; render(); say(['Great!', WORD_PIC[w][1] ? `${w}! ${WORD_PIC[w][1]}` : `${w}!`]); }
    else { if (!G.wrong.includes(x)) G.wrong.push(x); render(); say([`That's ${x}.`, askText(w)]); }
    return;
  }
  if (b.dataset.gnext) {
    if (G.round >= G.order.length - 1) newFind(); else { G.round++; nextRound(); }
    render(); speak(askText(G.order[G.round]));
  }
});
