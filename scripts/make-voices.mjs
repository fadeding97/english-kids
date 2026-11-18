// 用 Azure 语音服务（官方神经语音）生成啾啾的录音。
// 密钥放在 .claude/azure-speech.json（已在 .gitignore 里，不会上传）：{ "key": "...", "region": "eastasia" }
// 用法：
//   node scripts/make-voices.mjs samples        → 生成 4 种音色的试听，放到 .claude/voice-samples/
//   node scripts/make-voices.mjs words <音色>    → 用选定的音色生成全部单词录音到 audio/
import fs from 'node:fs';

const cfgFile = new URL('../.claude/azure-speech.json', import.meta.url);
if (!fs.existsSync(cfgFile)) { console.log('缺少 .claude/azure-speech.json，请先放好密钥和区域'); process.exit(1); }
const { key, region } = JSON.parse(fs.readFileSync(cfgFile, 'utf8'));

// 候选音色：[音色名, 语言, 额外语气（SSML）]
const VOICES = {
  ana: ['en-US-AnaNeural', 'en-US', ''],                         // 美式小女孩（真正的童声）
  maisie: ['en-GB-MaisieNeural', 'en-GB', ''],                   // 英式小女孩
  jenny: ['en-US-JennyNeural', 'en-US', 'cheerful'],             // 温柔年轻女声，开心语气
  emma: ['en-US-EmmaMultilingualNeural', 'en-US', ''],           // 亲切女声
};
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// 语速、音调：选定音色后在这里微调（pitch 用百分比，越高越像小孩）
const PROSODY = { rate: '-15%', pitch: '+10%' };   // 2026-11-18 选定：Maisie 第 2 版（慢一点、音调高 10%）
async function tts(v, text, out, p = PROSODY) {
  const [name, lang, style] = VOICES[v];
  const inner = `<prosody rate="${p.rate}" pitch="${p.pitch}">${esc(text)}</prosody>`;
  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="${lang}"><voice name="${name}">${style ? `<mstts:express-as style="${style}">${inner}</mstts:express-as>` : inner}</voice></speak>`;
  const r = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: 'POST',
    headers: { 'Ocp-Apim-Subscription-Key': key, 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3', 'User-Agent': 'english-start' },
    body: ssml,
  });
  if (!r.ok) throw new Error(`${v} 生成失败：HTTP ${r.status} ${await r.text()}`);
  fs.writeFileSync(out, Buffer.from(await r.arrayBuffer()));
}

const mode = process.argv[2] || 'samples';
if (mode === 'samples') {
  const dir = new URL('../.claude/voice-samples/', import.meta.url);
  fs.mkdirSync(dir, { recursive: true });
  const text = 'Dog! Woof woof! Where is the duck? Yes! Great job!';
  for (const v of Object.keys(VOICES)) { await tts(v, text, new URL(`${v}.mp3`, dir)); console.log('ok', v); }
} else if (mode === 'tune') {
  // 同一个音色的几种语速/音调组合：node scripts/make-voices.mjs tune maisie
  const v = process.argv[3] || 'maisie', dir = new URL('../.claude/voice-samples/', import.meta.url);
  fs.mkdirSync(dir, { recursive: true });
  const text = 'Dog! Woof woof! Where is the duck? Yes! Great job!';
  const SETS = { '1-original': { rate: '-8%', pitch: '+0%' }, '2-slow-high': { rate: '-15%', pitch: '+10%' }, '3-higher': { rate: '-10%', pitch: '+20%' }, '4-slow-higher': { rate: '-20%', pitch: '+25%' } };
  for (const [k, p] of Object.entries(SETS)) { await tts(v, text, new URL(`${v}-${k}.mp3`, dir), p); console.log('ok', k, p.rate, p.pitch); }
} else if (mode === 'words') {
  const v = process.argv[3];
  if (!VOICES[v]) { console.log('请指定音色：' + Object.keys(VOICES).join(' / ')); process.exit(1); }
  // 单词和叫声来自 js/games.js 的 WORD_PIC
  const src = fs.readFileSync(new URL('../js/games.js', import.meta.url), 'utf8');
  const block = src.slice(src.indexOf('const WORD_PIC'), src.indexOf('const GAME_FALLBACK'));
  // [单词, 叫声, 是不是东西]
  const words = [...block.matchAll(/'?([a-z][a-z -]*)'?: \['[^']+', '([^']*)', ([01])\]/g)].map(m => [m[1], m[2], m[3] === '1']);
  const dir = new URL('../audio/', import.meta.url);
  fs.mkdirSync(dir, { recursive: true });
  // 文件名规则和 js/games.js 里的 audioName 一致
  const name = t => t.toLowerCase().replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '');
  const lines = new Set(['Yes!', 'Great job!']);
  for (const [w, sound, thing] of words) {
    lines.add(w + '!'); if (sound) lines.add(`${w}! ${sound}`);
    lines.add(thing ? `Where is the ${w}?` : `Find ${w}!`); lines.add(`That's ${w}.`);
  }
  console.log('共', lines.size, '句');
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  for (const t of lines) {
    const out = new URL(`${name(t)}.mp3`, dir);
    if (fs.existsSync(out)) continue;
    // 免费档每分钟最多约 20 次，慢慢来；遇到 429 等一会儿再试
    for (let i = 0; ; i++) {
      try { await tts(v, t, out); break; } catch (e) { if (i < 5 && /429/.test(e.message)) { await sleep(15000); continue; } throw e; }
    }
    console.log('ok', t);
    await sleep(3200);
  }
}
